<?php

declare(strict_types=1);

namespace App\EventSubscriber;

use Symfony\Component\EventDispatcher\EventSubscriberInterface;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Event\RequestEvent;
use Symfony\Component\HttpKernel\Event\ResponseEvent;
use Symfony\Component\HttpKernel\KernelEvents;

final class ApiCorsSubscriber implements EventSubscriberInterface
{
    /**
     * @var list<string>
     */
    private array $allowedOrigins;

    public function __construct(string $allowedOrigins)
    {
        $this->allowedOrigins = array_values(array_filter(array_map('trim', explode(',', $allowedOrigins))));
    }

    public static function getSubscribedEvents(): array
    {
        return [
            KernelEvents::REQUEST => ['handlePreflight', 1000],
            KernelEvents::RESPONSE => ['addCorsHeaders', -1000],
        ];
    }

    public function handlePreflight(RequestEvent $event): void
    {
        $request = $event->getRequest();
        if (!$event->isMainRequest() || 'OPTIONS' !== $request->getMethod() || !$this->isApiRequest($request->getPathInfo())) {
            return;
        }

        $origin = $request->headers->get('Origin');
        if (null !== $origin && !in_array($origin, $this->allowedOrigins, true)) {
            $event->setResponse(new Response('', Response::HTTP_FORBIDDEN));

            return;
        }

        $response = new Response('', Response::HTTP_NO_CONTENT);
        if (null !== $origin) {
            $this->addHeaders($response, $origin);
        }
        $event->setResponse($response);
    }

    public function addCorsHeaders(ResponseEvent $event): void
    {
        $request = $event->getRequest();
        if (!$this->isApiRequest($request->getPathInfo())) {
            return;
        }

        $event->getResponse()->headers->set('Cache-Control', 'no-store');

        $origin = $request->headers->get('Origin');
        if (null !== $origin && in_array($origin, $this->allowedOrigins, true)) {
            $this->addHeaders($event->getResponse(), $origin);
        }
    }

    private function addHeaders(Response $response, string $origin): void
    {
        $response->headers->set('Access-Control-Allow-Origin', $origin);
        $response->headers->set('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
        $response->headers->set('Access-Control-Allow-Headers', 'Authorization, Content-Type');
        $response->headers->set('Access-Control-Max-Age', '600');
        $response->setVary('Origin', false);
    }

    private function isApiRequest(string $path): bool
    {
        return '/api' === $path || str_starts_with($path, '/api/');
    }
}
