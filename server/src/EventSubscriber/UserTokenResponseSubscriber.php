<?php

declare(strict_types=1);

namespace App\EventSubscriber;

use App\Entity\User;
use Symfony\Component\EventDispatcher\EventSubscriberInterface;
use Symfony\Component\HttpKernel\Event\ResponseEvent;
use Symfony\Component\HttpKernel\KernelEvents;
use Symfony\Component\Security\Core\Authentication\Token\Storage\TokenStorageInterface;

final class UserTokenResponseSubscriber implements EventSubscriberInterface
{
    public function __construct(private TokenStorageInterface $tokenStorage) {}

    public static function getSubscribedEvents(): array
    {
        return [
            KernelEvents::RESPONSE => ['addRotatedToken', -10],
        ];
    }

    public function addRotatedToken(ResponseEvent $event): void
    {
        if (
            !$event->isMainRequest() ||
            !str_starts_with($event->getRequest()->getPathInfo(), '/api/')
        ) {
            return;
        }

        $user = $this->tokenStorage->getToken()?->getUser();
        if (!$user instanceof User || $user->getSessionToken() === null) {
            return;
        }

        $event->getResponse()->headers->set('X-User-Token', $user->getSessionToken());
    }
}
