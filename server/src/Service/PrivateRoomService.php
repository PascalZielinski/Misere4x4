<?php

declare(strict_types=1);

namespace App\Service;

use App\Entity\QueueEntry;
use App\Entity\Room;
use App\Entity\RoomParticipant;
use App\Entity\User;
use App\Repository\RoomRepository;
use Doctrine\DBAL\Exception\UniqueConstraintViolationException;
use Doctrine\DBAL\LockMode;
use Doctrine\ORM\EntityManagerInterface;
use Doctrine\ORM\Query;
use Doctrine\Persistence\ManagerRegistry;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;
use Symfony\Component\HttpKernel\Exception\GoneHttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Symfony\Component\Mercure\HubInterface;
use Symfony\Component\Mercure\Update;

final readonly class PrivateRoomService
{
    private const WAITING_TTL_SECONDS = 600;
    private const TURN_TTL_SECONDS = 60;
    private const ROOM_CODE_SELECTION_ATTEMPTS = 32;

    public function __construct(
        private ManagerRegistry $doctrine,
        private MatchmakingService $matchmaking,
        private MisereGameLogic $gameLogic,
        private HubInterface $hub,
    ) {
    }

    /**
     * @return array<string, mixed>
     */
    public function create(User $user): array
    {
        $this->removeExpiredRooms();
        $userId = $user->getId();
        if (null === $userId) {
            throw new \LogicException('A persisted user is required to create a room.');
        }

        for ($attempt = 0; $attempt < 3; ++$attempt) {
            try {
                [$room, $state] = $this->entityManager()->wrapInTransaction(function () use ($userId): array {
                    $managedUser = $this->lockUserForUpdate($userId);
                    $this->assertCanStartGame($managedUser);

                    $now = $this->now();
                    $room = new Room();
                    $room->setRoomCode($this->availableCode())
                        ->setCreatedAt($now)
                        ->setLastMoveAt($now)
                        ->setExpiresAt($now->modify(sprintf('+%d seconds', self::WAITING_TTL_SECONDS)))
                        ->setGameState($this->gameLogic->waitingState());

                    $participant = (new RoomParticipant())
                        ->setUser($managedUser)
                        ->setSide('A');
                    $room->addRoomParticipant($participant);

                    $entityManager = $this->entityManager();
                    $entityManager->persist($room);
                    $entityManager->persist($participant);

                    return [$room, $this->roomState($room, $managedUser)];
                });
            } catch (UniqueConstraintViolationException $exception) {
                $this->doctrine->resetManager();
                if ($attempt < 2) {
                    continue;
                }

                throw new ConflictHttpException('Could not allocate a unique room code. Please try again.', $exception);
            }

            $this->publish($room);

            return $state;
        }

        throw new ConflictHttpException('Could not allocate a unique room code. Please try again.');
    }

    /**
     * @return array<string, mixed>
     */
    public function join(int $code, User $user): array
    {
        $this->removeExpiredRooms();

        $userId = $user->getId();
        if (null === $userId) {
            throw new \LogicException('A persisted user is required to join a room.');
        }

        [$room, $state] = $this->entityManager()->wrapInTransaction(function () use ($code, $userId): array {
            $managedUser = $this->lockUserForUpdate($userId);
            $room = $this->findRoomForUpdate((string) $code, 'No active room exists with this code.');
            $this->assertNotExpired($room);

            $existingSide = $this->sideFor($room, $managedUser);
            if (null !== $existingSide) {
                return [$room, $this->roomState($room, $managedUser)];
            }

            $this->assertCanStartGame($managedUser, $room->getId());
            if ($room->getRoomParticipants()->count() >= 2) {
                throw new ConflictHttpException('This room already has two participants.');
            }

            $participant = (new RoomParticipant())
                ->setUser($managedUser)
                ->setSide('B');
            $room->addRoomParticipant($participant);
            $this->entityManager()->persist($participant);

            $now = $this->now();
            $room->setGameState($this->gameLogic->newRound(1))
                ->setLastMoveAt($now)
                ->setExpiresAt($now->modify(sprintf('+%d seconds', self::TURN_TTL_SECONDS)));

            return [$room, $this->roomState($room, $managedUser)];
        });

        $this->publish($room);

        return $state;
    }

    /**
     * @return array<string, mixed>
     */
    public function get(string $identifier, User $user): array
    {
        $room = $this->findRoom($identifier);
        $this->assertMember($room, $user);

        return $this->roomState($room, $user);
    }

    /**
     * @return array<string, mixed>
     */
    public function place(string $identifier, int $index, User $user): array
    {
        $userIds = $this->participantUserIds($identifier, $user);

        [$room, $state] = $this->entityManager()->wrapInTransaction(function () use ($identifier, $index, $userIds, $user): array {
            $lockedUsers = $this->lockUsersForUpdate($userIds);
            $currentUserId = $user->getId();
            $currentUser = null === $currentUserId ? null : ($lockedUsers[$currentUserId] ?? null);
            if (!$currentUser instanceof User) {
                throw new NotFoundHttpException('You are not a participant in this room.');
            }

            $room = $this->findRoomForUpdate($identifier);
            $this->assertNotExpired($room);
            $this->assertParticipantsLocked($room, $lockedUsers);
            $side = $this->sideFor($room, $currentUser);
            if (null === $side) {
                throw new NotFoundHttpException('You are not a participant in this room.');
            }
            if (2 !== $room->getRoomParticipants()->count()) {
                throw new ConflictHttpException('The second participant has not joined yet.');
            }

            $game = $this->gameLogic->place($room->getGameState(), $side, $index);
            $now = $this->now();
            $room->setGameState($game)
                ->setLastMoveAt($now)
                ->setExpiresAt($now->modify(sprintf('+%d seconds', self::TURN_TTL_SECONDS)));

            if ($room->isMatchmade() && in_array($game['status'], ['lost', 'draw'], true)) {
                if ('lost' === $game['status']) {
                    $winnerSide = $game['result']['winner'] ?? null;
                    if (null === $winnerSide) {
                        throw new \LogicException('A lost round must have a winner.');
                    }
                    foreach ($room->getRoomParticipants() as $participant) {
                        if ($participant->getSide() === $winnerSide) {
                            $winner = $participant->getUser();
                            if ($winner instanceof User) {
                                $winner->setScore($winner->getScore() + 1);
                            }
                            break;
                        }
                    }
                }
                $this->matchmaking->requeueParticipants($room);
            }

            return [$room, $this->roomState($room, $currentUser)];
        });

        $this->publish($room);

        return $state;
    }

    /**
     * @return array<string, mixed>
     */
    public function restart(string $identifier, User $user): array
    {
        $currentUserId = $user->getId();
        if (null === $currentUserId) {
            throw new \LogicException('A persisted user is required to restart a room.');
        }

        $userIds = $this->participantUserIds($identifier, $user);

        [$room, $state] = $this->entityManager()->wrapInTransaction(function () use ($identifier, $currentUserId, $userIds): array {
            $lockedUsers = $this->lockUsersForUpdate($userIds);
            $currentUser = $lockedUsers[$currentUserId] ?? null;
            if (!$currentUser instanceof User) {
                throw new NotFoundHttpException('User not found.');
            }

            $room = $this->findRoomForUpdate($identifier);
            $this->assertNotExpired($room);
            $this->assertParticipantsLocked($room, $lockedUsers);
            if (null === $this->sideFor($room, $currentUser)) {
                throw new NotFoundHttpException('You are not a participant in this room.');
            }
            foreach ($lockedUsers as $lockedUser) {
                $this->assertCanStartGame($lockedUser, $room->getId());
            }
            if (2 !== $room->getRoomParticipants()->count()) {
                throw new ConflictHttpException('The second participant has not joined yet.');
            }
            if ('playing' === $room->getGameState()['status']) {
                throw new ConflictHttpException('The current game has not finished.');
            }

            $round = (int) $room->getGameState()['round'] + 1;
            $now = $this->now();
            $room->setGameState($this->gameLogic->newRound($round))
                ->setLastMoveAt($now)
                ->setExpiresAt($now->modify(sprintf('+%d seconds', self::TURN_TTL_SECONDS)));

            return [$room, $this->roomState($room, $currentUser)];
        });

        $this->publish($room);

        return $state;
    }

    private function removeExpiredRooms(): void
    {
        $expired = $this->rooms()->findExpired($this->now());
        foreach ($expired as $room) {
            $this->entityManager()->remove($room);
        }
        if ([] !== $expired) {
            $this->entityManager()->flush();
        }
    }

    private function availableCode(): int
    {
        for ($attempt = 0; $attempt < self::ROOM_CODE_SELECTION_ATTEMPTS; ++$attempt) {
            $code = random_int(100000, 999999);
            if (!$this->rooms()->roomCodeExists($code)) {
                return $code;
            }
        }

        throw new ConflictHttpException('Could not allocate a unique room code. Please try again.');
    }

    private function findRoom(string $identifier): Room
    {
        $criteria = ctype_digit($identifier)
            ? ['roomCode' => (int) $identifier]
            : ['roomUuid' => $identifier];
        $room = $this->rooms()->findOneBy($criteria);
        if (!$room instanceof Room) {
            throw new NotFoundHttpException('Room not found.');
        }
        if ($room->getExpiresAt() <= $this->now()) {
            $this->entityManager()->remove($room);
            $this->entityManager()->flush();
            throw new GoneHttpException('This room has expired.');
        }

        return $room;
    }

    private function findRoomForUpdate(string $identifier, string $notFoundMessage = 'Room not found.'): Room
    {
        $field = ctype_digit($identifier) ? 'roomCode' : 'roomUuid';
        $value = ctype_digit($identifier) ? (int) $identifier : $identifier;
        $room = $this->rooms()->createQueryBuilder('room')
            ->andWhere(sprintf('room.%s = :identifier', $field))
            ->setParameter('identifier', $value)
            ->getQuery()
            ->setHint(Query::HINT_REFRESH, true)
            ->setLockMode(LockMode::PESSIMISTIC_WRITE)
            ->getOneOrNullResult();

        if (!$room instanceof Room) {
            throw new NotFoundHttpException($notFoundMessage);
        }

        return $room;
    }

    private function assertNotExpired(Room $room): void
    {
        if ($this->expiresAt($room) <= $this->now()) {
            throw new GoneHttpException('This room has expired.');
        }
    }

    private function expiresAt(Room $room): \DateTimeImmutable
    {
        return $room->getExpiresAt()
            ?? throw new \LogicException('The room expiration time is not configured.');
    }

    private function entityManager(): EntityManagerInterface
    {
        $manager = $this->doctrine->getManager();
        if (!$manager instanceof EntityManagerInterface) {
            throw new \LogicException('The Doctrine manager must be an ORM entity manager.');
        }

        return $manager;
    }

    private function rooms(): RoomRepository
    {
        return $this->entityManager()->getRepository(Room::class);
    }

    private function lockUserForUpdate(int $userId): User
    {
        $user = $this->entityManager()->find(User::class, $userId, LockMode::PESSIMISTIC_WRITE);
        if (!$user instanceof User) {
            throw new NotFoundHttpException('User not found.');
        }

        return $user;
    }

    /**
     * @param list<int> $userIds
     *
     * @return array<int, User>
     */
    private function lockUsersForUpdate(array $userIds): array
    {
        sort($userIds);
        $lockedUsers = [];
        foreach (array_unique($userIds) as $userId) {
            $lockedUsers[$userId] = $this->lockUserForUpdate($userId);
        }

        return $lockedUsers;
    }

    /**
     * @return list<int>
     */
    private function participantUserIds(string $identifier, User $user): array
    {
        $room = $this->findRoom($identifier);
        $userIds = [];
        foreach ($room->getRoomParticipants() as $participant) {
            $participantId = $participant->getUser()?->getId();
            if (null !== $participantId) {
                $userIds[] = $participantId;
            }
        }
        $userId = $user->getId();
        if (null === $userId) {
            throw new \LogicException('A persisted user is required for room actions.');
        }
        $userIds[] = $userId;
        $userIds = array_values(array_unique($userIds));
        sort($userIds);

        return $userIds;
    }

    /**
     * @param array<int, User> $lockedUsers
     */
    private function assertParticipantsLocked(Room $room, array $lockedUsers): void
    {
        foreach ($room->getRoomParticipants() as $participant) {
            $userId = $participant->getUser()?->getId();
            if (null !== $userId && !isset($lockedUsers[$userId])) {
                throw new ConflictHttpException('The room participants changed. Please retry the request.');
            }
        }
    }

    private function assertCanStartGame(User $user, ?int $exceptRoomId = null): void
    {
        if ($this->rooms()->findActiveForUser($user, $this->now(), $exceptRoomId) instanceof Room) {
            throw new ConflictHttpException('You already have an active game.');
        }

        $waitingEntry = $this->entityManager()->getRepository(QueueEntry::class)
            ->findOneBy(['user' => $user, 'room' => null]);
        if ($waitingEntry instanceof QueueEntry) {
            throw new ConflictHttpException('Leave the matchmaking queue before starting another game.');
        }
    }

    private function assertMember(Room $room, User $user): void
    {
        if (null === $this->sideFor($room, $user)) {
            throw new NotFoundHttpException('Room not found.');
        }
    }

    /**
     * @return 'A'|'B'|null
     */
    private function sideFor(Room $room, User $user): ?string
    {
        foreach ($room->getRoomParticipants() as $participant) {
            if ($participant->getUser()?->getId() === $user->getId()) {
                $side = $participant->getSide();
                if ('A' !== $side && 'B' !== $side) {
                    throw new \LogicException('The room participant has an invalid side.');
                }

                return $side;
            }
        }

        return null;
    }

    /**
     * @return array<string, mixed>
     */
    private function roomState(Room $room, User $user): array
    {
        $participants = [];
        foreach ($room->getRoomParticipants() as $participant) {
            $participants[] = [
                'side' => $participant->getSide(),
                'name' => $participant->getUser()?->getName(),
            ];
        }

        return [
            'code' => (string) $room->getRoomCode(),
            'roomUuid' => $room->getRoomUuid(),
            'matchmade' => $room->isMatchmade(),
            'topic' => $this->topic($room),
            'mercureUrl' => $this->hub->getPublicUrl(),
            'playerSide' => $this->sideFor($room, $user),
            'participants' => $participants,
            'game' => $room->getGameState(),
            'expiresAt' => $this->expiresAt($room)->format(DATE_ATOM),
        ];
    }

    private function publish(Room $room): void
    {
        $this->hub->publish(new Update(
            $this->topic($room),
            json_encode([
                'code' => $room->getRoomCode(),
                'expiresAt' => $this->expiresAt($room)->format(DATE_ATOM),
            ], JSON_THROW_ON_ERROR),
            true,
        ));
    }

    private function topic(Room $room): string
    {
        return sprintf('private-room/%d', $room->getId());
    }

    private function now(): \DateTimeImmutable
    {
        return new \DateTimeImmutable('now', new \DateTimeZone('UTC'));
    }
}
