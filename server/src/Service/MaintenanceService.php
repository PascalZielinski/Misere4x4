<?php

declare(strict_types=1);

namespace App\Service;

// #region Imports
// MARK: - Imports
use App\Repository\RoomRepository;
use App\Repository\UserRepository;
use Doctrine\ORM\EntityManagerInterface;

// #endregion

final readonly class MaintenanceService
{
    // #region Maintenance configuration
    // MARK: - Maintenance configuration
    private const USER_INACTIVE_AFTER_MINUTES = 30;
    // #endregion

    // #region Dependencies
    // MARK: - Dependencies
    public function __construct(
        private EntityManagerInterface $entityManager,
        private UserRepository $users,
        private RoomRepository $rooms,
    ) {
    }
    // #endregion

    // #region Maintenance run
    // MARK: - Maintenance run
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
    // #endregion
}
