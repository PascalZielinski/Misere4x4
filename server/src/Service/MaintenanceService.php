<?php

declare(strict_types=1);

namespace App\Service;

use App\Repository\RoomRepository;
use App\Repository\UserRepository;
use Doctrine\ORM\EntityManagerInterface;

final readonly class MaintenanceService
{
    private const USER_INACTIVE_AFTER_MINUTES = 30;

    public function __construct(
        private EntityManagerInterface $entityManager,
        private UserRepository $users,
        private RoomRepository $rooms,
    ) {
    }

    /**
     * @return array{deactivatedUsers: int, deletedRooms: int}
     */
    public function run(): array
    {
        $now = new \DateTimeImmutable('now', new \DateTimeZone('UTC'));
        $inactiveSince = $now->modify(sprintf('-%d minutes', self::USER_INACTIVE_AFTER_MINUTES));

        return $this->entityManager->wrapInTransaction(fn (): array => [
            'deactivatedUsers' => $this->users->deactivateInactiveUsers($inactiveSince),
            'deletedRooms' => $this->rooms->deleteExpired($now),
        ]);
    }
}
