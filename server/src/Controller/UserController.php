<?php

namespace App\Controller;

use App\Service\LeaderBoardService;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

final class UserController extends AbstractController
{
    #[Route('/api/users', name: 'api_users_create', methods: ['POST'])]
    public function create(Request $request, LeaderBoardService $LeaderBoard): JsonResponse
    {
        return $this->response($LeaderBoard->create($request->toArray()));
    }

    #[Route('/api/users', name: 'api_users_list', methods: ['GET'])]
    public function list(LeaderBoardService $leaderBoard): JsonResponse
    {
        return $this->response($leaderBoard->listUsers());
    }

    #[Route('/api/users/search', name: 'api_users_search', methods: ['GET'])]
    public function search(Request $request, LeaderBoardService $leaderBoard): JsonResponse
    {
        return $this->response($leaderBoard->searchUsers((string) $request->query->get('name', '')));
    }


    private function response(array $result): JsonResponse
    {
        return $this->json($result, Response::HTTP_OK);
    }
}