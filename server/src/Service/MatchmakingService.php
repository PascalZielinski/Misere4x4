<?php

declare(strict_types=1);

namespace App\Service;

// #region Imports
// MARK: - Imports
use App\Entity\QueueEntry;
use App\Entity\Room;
use App\Entity\RoomParticipant;
use App\Entity\User;
use App\Repository\QueueEntryRepository;
use App\Repository\RoomRepository;
use Doctrine\DBAL\Exception\UniqueConstraintViolationException;
use Doctrine\DBAL\LockMode;
use Doctrine\ORM\EntityManagerInterface;
use Doctrine\Persistence\ManagerRegistry;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;

// #endregion

final readonly class MatchmakingService
{
    // #region Matchmaking configuration
    // MARK: - Matchmaking configuration
    private const ROOM_TTL_SECONDS = 60;
    private const MAX_ROOM_CODE_ATTEMPTS = 3;
    private const ROOM_CODE_SELECTION_ATTEMPTS = 32;
    // #endregion

    // #region Dependencies
    // MARK: - Dependencies
    public function __construct(
        private ManagerRegistry $doctrine,
        private MisereGameLogic $gameLogic,
    ) {
    }
    // #endregion

    // #region Queue actions
    // MARK: - Queue actions
    /**
     * @return array<string, mixed>
     */
    public function join(User $user): array
    {
        $userId = $this->userId($user);
        for ($attempt = 0; $attempt < self::MAX_ROOM_CODE_ATTEMPTS; ++$attempt) {
            $entityManager = $this->entityManager();
            try {
                $entityManager->wrapInTransaction(function () use ($userId, $entityManager): void {
                    $managedUser = $entityManager->find(User::class, $userId, LockMode::PESSIMISTIC_WRITE);
                    if (!$managedUser instanceof User) {
                        throw new \LogicException('The authenticated user could not be reloaded.');
                    }

                    $entry = $this->queueEntries()->findOneBy(['user' => $managedUser]);
                    $activeRoom = $this->rooms()->findActiveForUser($managedUser, $this->now());
                    if ($activeRoom instanceof Room) {
                        if ($entry instanceof QueueEntry && $entry->getRoom()?->getId() === $activeRoom->getId()) {
                            return;
                        }
                        throw new ConflictHttpException('You already have an active game.');
                    }

                    if (!$entry instanceof QueueEntry) {
                        $entry = new QueueEntry($managedUser, $this->now());
                        $entityManager->persist($entry);
                    } elseif (null !== $entry->getRoom()) {
                        $matchedRoom = $entry->getRoom();
                        $gameState = $matchedRoom->getGameState();
                        if (
                            $matchedRoom->getExpiresAt() > $this->now()
                            && 'playing' === $gameState['status']
                        ) {
                            return;
                        }
                        $entry->setRoom(null)->setCreatedAt($this->now());
                    }

                    $entityManager->flush();
                });
            } catch (UniqueConstraintViolationException $exception) {
                $this->doctrine->resetManager();
                if ($attempt + 1 < self::MAX_ROOM_CODE_ATTEMPTS) {
                    continue;
                }

                throw new ConflictHttpException('Could not allocate a unique room code. Please try again.', $exception);
            }

            return $this->status($this->reloadUser($userId));
        }

        throw new ConflictHttpException('Could not allocate a unique room code. Please try again.');
    }

    /**
     * @return array<string, mixed>
     */
    public function status(User $user): array
    {
        $userId = $this->userId($user);
        for ($attempt = 0; $attempt < self::MAX_ROOM_CODE_ATTEMPTS; ++$attempt) {
            $entityManager = $this->entityManager();
            $managedUser = $entityManager->find(User::class, $userId);
            if (!$managedUser instanceof User) {
                throw new \LogicException('The authenticated user could not be reloaded.');
            }

            try {
                $entityManager->wrapInTransaction(function (): void {
                    $this->matchWaitingPlayers();
                });
            } catch (UniqueConstraintViolationException $exception) {
                $this->doctrine->resetManager();
                if ($attempt + 1 < self::MAX_ROOM_CODE_ATTEMPTS) {
                    continue;
                }

                throw new ConflictHttpException('Could not allocate a unique room code. Please try again.', $exception);
            }

            $entries = $this->queueEntries();
            $entry = $entries->findOneBy(['user' => $managedUser]);
            if (!$entry instanceof QueueEntry) {
                return ['status' => 'idle', 'queueCount' => $entries->countWaiting()];
            }

            $room = $entry->getRoom();
            if (null !== $room && 'playing' === $room->getGameState()['status']) {
                return [
                    'status' => 'matched',
                    'roomUuid' => $room->getRoomUuid(),
                    'queueCount' => $entries->countWaiting(),
                ];
            }

            return ['status' => 'waiting', 'queueCount' => $entries->countWaiting()];
        }

        throw new ConflictHttpException('Could not allocate a unique room code. Please try again.');
    }

    public function leave(User $user): void
    {
        $userId = $this->userId($user);
        $this->entityManager()->wrapInTransaction(function () use ($userId): void {
            $entityManager = $this->entityManager();
            $managedUser = $entityManager->find(User::class, $userId, LockMode::PESSIMISTIC_WRITE);
            if (!$managedUser instanceof User) {
                throw new \LogicException('The authenticated user could not be reloaded.');
            }

            $entry = $this->queueEntries()->findOneBy(['user' => $managedUser]);
            if (!$entry instanceof QueueEntry) {
                return;
            }
            if (null !== $entry->getRoom() && 'playing' === $entry->getRoom()->getGameState()['status']) {
                throw new ConflictHttpException('You cannot leave the queue after a match has started.');
            }

            $entityManager->remove($entry);
        });
    }

    public function requeueParticipants(Room $room): void
    {
        foreach ($room->getRoomParticipants() as $participant) {
            $user = $participant->getUser();
            if (!$user instanceof User) {
                continue;
            }

            $entry = $this->queueEntries()->findOneBy(['user' => $user]);
            if (!$entry instanceof QueueEntry) {
                $entry = new QueueEntry($user, $this->now());
                $this->entityManager()->persist($entry);
            } elseif (null === $entry->getRoom() || $entry->getRoom() === $room) {
                $entry->setRoom(null)->setCreatedAt($this->now());
            }
        }
    }
    // #endregion

    // #region Player matching
    // MARK: - Player matching
    private function matchWaitingPlayers(): void
    {
        $this->removeExpiredRooms();
        $waiting = $this->queueEntries()->findWaiting();
        $userIds = [];
        foreach ($waiting as $entry) {
            $id = $entry->getUser()?->getId();
            if (null !== $id) {
                $userIds[] = $id;
            }
        }
        $userIds = array_values(array_unique($userIds));
        sort($userIds);
        $entityManager = $this->entityManager();
        foreach ($userIds as $userId) {
            $entityManager->find(User::class, $userId, LockMode::PESSIMISTIC_WRITE);
        }

        $waiting = $this->queueEntries()->lockWaitingForUpdate();
        foreach ($waiting as $key => $entry) {
            $user = $entry->getUser();
            if ($user instanceof User && $this->rooms()->findActiveForUser($user, $this->now()) instanceof Room) {
                $entityManager->remove($entry);
                unset($waiting[$key]);
            }
        }
        $waiting = array_values($waiting);
        if ([] !== $waiting) {
            $entityManager->flush();
        }

        $reservedCodes = [];
        while (count($waiting) >= 2) {
            $first = array_shift($waiting);
            $second = array_shift($waiting);
            $now = $this->now();
            $roomCode = $this->availableCode($reservedCodes);
            $reservedCodes[$roomCode] = true;
            $room = (new Room())
                ->setRoomCode($roomCode)
                ->setMatchmade(true)
                ->setCreatedAt($now)
                ->setLastMoveAt($now)
                ->setExpiresAt($now->modify(sprintf('+%d seconds', self::ROOM_TTL_SECONDS)))
                ->setGameState($this->gameLogic->newRound(1));

            $room->addRoomParticipant(
                (new RoomParticipant())->setUser($first->getUser())->setSide('A'),
            );
            $room->addRoomParticipant(
                (new RoomParticipant())->setUser($second->getUser())->setSide('B'),
            );
            $first->setRoom($room);
            $second->setRoom($room);

            $entityManager = $this->entityManager();
            $entityManager->persist($room);
            foreach ($room->getRoomParticipants() as $participant) {
                $entityManager->persist($participant);
            }
        }
    }
    // #endregion

    // #region Room and persistence helpers
    // MARK: - Room and persistence helpers
    /**
     * @param array<int, true> $reservedCodes
     */
    private function availableCode(array $reservedCodes = []): int
    {
        for ($attempt = 0; $attempt < self::ROOM_CODE_SELECTION_ATTEMPTS; ++$attempt) {
            $code = random_int(100000, 999999);
            if (!isset($reservedCodes[$code]) && !$this->rooms()->roomCodeExists($code)) {
                return $code;
            }
        }

        throw new ConflictHttpException('Could not allocate a unique room code. Please try again.');
    }

    private function removeExpiredRooms(): void
    {
        $expired = $this->rooms()->findExpired($this->now());
        $entityManager = $this->entityManager();
        foreach ($expired as $room) {
            $entityManager->remove($room);
        }
        if ([] !== $expired) {
            $entityManager->flush();
        }
    }

    private function entityManager(): EntityManagerInterface
    {
        $manager = $this->doctrine->getManager();
        if (!$manager instanceof EntityManagerInterface) {
            throw new \LogicException('The Doctrine manager must be an ORM entity manager.');
        }

        return $manager;
    }

    private function queueEntries(): QueueEntryRepository
    {
        return $this->entityManager()->getRepository(QueueEntry::class);
    }

    private function rooms(): RoomRepository
    {
        return $this->entityManager()->getRepository(Room::class);
    }

    private function reloadUser(int $id): User
    {
        $user = $this->entityManager()->find(User::class, $id);
        if (!$user instanceof User) {
            throw new \LogicException('The authenticated user could not be reloaded.');
        }

        return $user;
    }

    private function userId(User $user): int
    {
        $id = $user->getId();
        if (null === $id) {
            throw new \LogicException('A persisted user is required for matchmaking.');
        }

        return $id;
    }

    private function now(): \DateTimeImmutable
    {
        return new \DateTimeImmutable('now', new \DateTimeZone('UTC'));
    }
    // #endregion
}
