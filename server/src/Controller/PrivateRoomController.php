<?php

declare(strict_types=1);

namespace App\Controller;

use App\Entity\User;
use App\Service\PrivateRoomService;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Exception\BadRequestHttpException;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;
use Symfony\Component\Mercure\HubInterface;
use Symfony\Component\Mercure\Jwt\Grant;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\CurrentUser;

#[Route('/api/private-rooms')]
final class PrivateRoomController extends AbstractController
{
    public function __construct(private readonly HubInterface $hub)
    {
    }

    #[Route('', name: 'api_private_rooms_create', methods: ['POST'])]
    public function create(
        Request $request,
        #[CurrentUser] User $user,
        PrivateRoomService $privateRooms,
    ): JsonResponse {
        return $this->respond(fn (): JsonResponse => $this->roomResponse(
            $privateRooms->create($user),
            Response::HTTP_CREATED,
        ));
    }

    #[Route('/join', name: 'api_private_rooms_join', methods: ['POST'])]
    public function join(
        Request $request,
        #[CurrentUser] User $user,
        PrivateRoomService $privateRooms,
    ): JsonResponse {
        return $this->respond(function () use ($request, $user, $privateRooms): JsonResponse {
            $payload = $this->payload($request);
            $code = $payload['code'] ?? null;
            if (!is_string($code) || !preg_match('/^\d{4}$/D', $code)) {
                throw new BadRequestHttpException('Room code must contain exactly four digits.');
            }

            return $this->roomResponse($privateRooms->join((int) $code, $user));
        });
    }

    #[Route(
        '/{identifier}',
        name: 'api_private_rooms_get',
        requirements: ['identifier' => '\d{4}|[0-9a-fA-F-]{36}'],
        methods: ['GET'],
    )]
    public function get(
        Request $request,
        string $identifier,
        #[CurrentUser] User $user,
        PrivateRoomService $privateRooms,
    ): JsonResponse {
        return $this->respond(fn (): JsonResponse => $this->roomResponse(
            $privateRooms->get($identifier, $user),
        ));
    }

    #[Route(
        '/{identifier}/moves',
        name: 'api_private_rooms_move',
        requirements: ['identifier' => '\d{4}|[0-9a-fA-F-]{36}'],
        methods: ['POST'],
    )]
    public function move(
        Request $request,
        string $identifier,
        #[CurrentUser] User $user,
        PrivateRoomService $privateRooms,
    ): JsonResponse {
        return $this->respond(function () use ($request, $identifier, $user, $privateRooms): JsonResponse {
            $index = $this->payload($request)['index'] ?? null;
            if (!is_int($index)) {
                throw new BadRequestHttpException('Cell index must be an integer.');
            }

            return $this->roomResponse($privateRooms->place($identifier, $index, $user));
        });
    }

    #[Route(
        '/{identifier}/restart',
        name: 'api_private_rooms_restart',
        requirements: ['identifier' => '\d{4}|[0-9a-fA-F-]{36}'],
        methods: ['POST'],
    )]
    public function restart(
        Request $request,
        string $identifier,
        #[CurrentUser] User $user,
        PrivateRoomService $privateRooms,
    ): JsonResponse {
        return $this->respond(fn (): JsonResponse => $this->roomResponse(
            $privateRooms->restart($identifier, $user),
        ));
    }

    private function roomResponse(array $state, int $status = Response::HTTP_OK): JsonResponse
    {
        $factory = $this->hub->getFactory();
        if ($factory === null) {
            throw new \LogicException('The Mercure hub must have a JWT token factory configured.');
        }

        $state['mercureToken'] = $factory->create(
            [new Grant([Grant::ACTION_SUBSCRIBE], [$state['topic']])],
            ['exp' => new \DateTimeImmutable($state['expiresAt'])],
        );

        return $this->json($state, $status);
    }

    private function respond(callable $action): JsonResponse
    {
        try {
            return $action();
        } catch (HttpExceptionInterface $exception) {
            return $this->json(
                ['error' => $exception->getMessage()],
                $exception->getStatusCode(),
            );
        }
    }

    private function payload(Request $request): array
    {
        try {
            return $request->toArray();
        } catch (\JsonException $exception) {
            throw new BadRequestHttpException('Request body must be valid JSON.', $exception);
        }
    }
}