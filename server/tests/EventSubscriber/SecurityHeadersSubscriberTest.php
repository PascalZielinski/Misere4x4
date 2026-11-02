<?php

declare(strict_types=1);

namespace App\Tests\EventSubscriber;

use App\EventSubscriber\SecurityHeadersSubscriber;
use PHPUnit\Framework\TestCase;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Event\ResponseEvent;
use Symfony\Component\HttpKernel\HttpKernelInterface;

final class SecurityHeadersSubscriberTest extends TestCase
{
    public function testAddsSecurityHeadersToMainResponses(): void
    {
        $request = Request::create('http://game.example/api/queue');
        $response = new Response();
        $event = new ResponseEvent(
            $this->createMock(HttpKernelInterface::class),
            $request,
            HttpKernelInterface::MAIN_REQUEST,
            $response,
        );

        (new SecurityHeadersSubscriber())->addSecurityHeaders($event);

        self::assertSame('nosniff', $response->headers->get('X-Content-Type-Options'));
        self::assertSame('DENY', $response->headers->get('X-Frame-Options'));
        self::assertSame('strict-origin-when-cross-origin', $response->headers->get('Referrer-Policy'));
        self::assertSame('camera=(), geolocation=(), microphone=(), payment=(), usb=()', $response->headers->get('Permissions-Policy'));
        self::assertStringContainsString("default-src 'none'", (string) $response->headers->get('Content-Security-Policy'));
        self::assertStringContainsString("frame-ancestors 'none'", (string) $response->headers->get('Content-Security-Policy'));
        self::assertSame('same-origin', $response->headers->get('Cross-Origin-Opener-Policy'));
        self::assertSame('none', $response->headers->get('X-Permitted-Cross-Domain-Policies'));
        self::assertNull($response->headers->get('Strict-Transport-Security'));
    }

    public function testEnablesHstsOnlyForHttpsRequests(): void
    {
        $request = Request::create('https://game.example/api/queue');
        $response = new Response();
        $event = new ResponseEvent(
            $this->createMock(HttpKernelInterface::class),
            $request,
            HttpKernelInterface::MAIN_REQUEST,
            $response,
        );

        (new SecurityHeadersSubscriber())->addSecurityHeaders($event);

        self::assertSame('max-age=31536000', $response->headers->get('Strict-Transport-Security'));
    }

    public function testDoesNotModifySubrequestResponses(): void
    {
        $request = Request::create('https://game.example/api/queue');
        $response = new Response();
        $event = new ResponseEvent(
            $this->createMock(HttpKernelInterface::class),
            $request,
            HttpKernelInterface::SUB_REQUEST,
            $response,
        );

        (new SecurityHeadersSubscriber())->addSecurityHeaders($event);

        self::assertNull($response->headers->get('X-Content-Type-Options'));
        self::assertNull($response->headers->get('Strict-Transport-Security'));
    }
}
