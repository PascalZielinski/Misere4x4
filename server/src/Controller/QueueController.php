<?php

declare(strict_types=1);

namespace App\Controller;

use App\Entity\User;
use App\Service\MatchmakingService;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\CurrentUser;

#[Route('/api/queue')]
final class QueueController extends AbstractController
{
    #[Route('', name: 'api_queue_join', methods: ['POST'])]
    public function join(#[CurrentUser] User $user, MatchmakingService $matchmaking): JsonResponse
    {
        return $this->respond(fn (): array => $matchmaking->join($user));
    }

    #[Route('', name: 'api_queue_status', methods: ['GET'])]
    public function status(#[CurrentUser] User $user, MatchmakingService $matchmaking): JsonResponse
    {
        return $this->respond(fn (): array => $matchmaking->status($user));
    }

    #[Route('', name: 'api_queue_leave', methods: ['DELETE'])]
    public function leave(#[CurrentUser] User $user, MatchmakingService $matchmaking): JsonResponse
    {
        return $this->respond(function () use ($user, $matchmaking): array {
            $matchmaking->leave($user);

            return ['status' => 'idle'];
        });
    }

    private function respond(callable $action): JsonResponse
    {
        try {
            return $this->json($action());
        } catch (HttpExceptionInterface $exception) {
            return $this->json(
                ['error' => $exception->getMessage()],
                $exception->getStatusCode(),
            );
        }
    }
}
