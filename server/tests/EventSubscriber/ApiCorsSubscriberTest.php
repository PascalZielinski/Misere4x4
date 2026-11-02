<?php

declare(strict_types=1);

namespace App\Tests\EventSubscriber;

use App\EventSubscriber\ApiCorsSubscriber;
use PHPUnit\Framework\TestCase;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Event\RequestEvent;
use Symfony\Component\HttpKernel\Event\ResponseEvent;
use Symfony\Component\HttpKernel\HttpKernelInterface;

final class ApiCorsSubscriberTest extends TestCase
{
    public function testAllowedPreflightReturnsNoContentAndAllowsDelete(): void
    {
        $request = Request::create('/api/queue', 'OPTIONS', server: [
            'HTTP_ORIGIN' => 'https://game.example',
        ]);
        $event = new RequestEvent($this->createMock(HttpKernelInterface::class), $request, HttpKernelInterface::MAIN_REQUEST);

        (new ApiCorsSubscriber('https://game.example'))->handlePreflight($event);

        $response = $event->getResponse();
        self::assertNotNull($response);
        self::assertSame(Response::HTTP_NO_CONTENT, $response->getStatusCode());
        self::assertSame('https://game.example', $response->headers->get('Access-Control-Allow-Origin'));
        self::assertStringContainsString('DELETE', (string) $response->headers->get('Access-Control-Allow-Methods'));
        self::assertNull($response->headers->get('Access-Control-Allow-Credentials'));
    }

    public function testDisallowedOriginIsRejected(): void
    {
        $request = Request::create('/api/users', 'OPTIONS', server: [
            'HTTP_ORIGIN' => 'https://attacker.example',
        ]);
        $event = new RequestEvent($this->createMock(HttpKernelInterface::class), $request, HttpKernelInterface::MAIN_REQUEST);

        (new ApiCorsSubscriber('https://game.example'))->handlePreflight($event);

        self::assertSame(Response::HTTP_FORBIDDEN, $event->getResponse()?->getStatusCode());
    }

    public function testApiResponsesAreNeverCachedAndOnlyAllowConfiguredOrigins(): void
    {
        $request = Request::create('/api/users', 'GET', server: [
            'HTTP_ORIGIN' => 'https://attacker.example',
        ]);
        $response = new Response();
        $event = new ResponseEvent(
            $this->createMock(HttpKernelInterface::class),
            $request,
            HttpKernelInterface::MAIN_REQUEST,
            $response,
        );

        (new ApiCorsSubscriber('https://game.example'))->addCorsHeaders($event);

        self::assertStringContainsString('no-store', (string) $response->headers->get('Cache-Control'));
        self::assertNull($response->headers->get('Access-Control-Allow-Origin'));
    }

    public function testNonApiResponseDoesNotReceiveApiHeaders(): void
    {
        $request = Request::create('/health', 'GET');
        $response = new Response();
        $event = new ResponseEvent(
            $this->createMock(HttpKernelInterface::class),
            $request,
            HttpKernelInterface::MAIN_REQUEST,
            $response,
        );

        (new ApiCorsSubscriber('https://game.example'))->addCorsHeaders($event);

        self::assertStringNotContainsString('no-store', (string) $response->headers->get('Cache-Control'));
        self::assertNull($response->headers->get('Access-Control-Allow-Origin'));
    }
}
