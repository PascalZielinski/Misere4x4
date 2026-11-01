<?php

declare(strict_types=1);

namespace App\Service;

use App\Entity\Room;
use App\Entity\RoomParticipant;
use App\Entity\User;
use App\Repository\RoomRepository;
use Doctrine\DBAL\LockMode;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;
use Symfony\Component\HttpKernel\Exception\GoneHttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Symfony\Component\Mercure\HubInterface;
use Symfony\Component\Mercure\Update;

final readonly class PrivateRoomService
{
    private const WAITING_TTL_SECONDS = 600;
    private const TURN_TTL_SECONDS = 60;

    public function __construct(
        private EntityManagerInterface $entityManager,
        private RoomRepository $rooms,
        private MatchmakingService $matchmaking,
        private MisereGameLogic $gameLogic,
        private HubInterface $hub,
    ) {
    }

    public function create(User $user): array
    {
        $this->removeExpiredRooms();
        $now = $this->now();
        $room = new Room();
        $room->setRoomCode($this->availableCode())
            ->setCreatedAt($now)
            ->setLastMoveAt($now)
            ->setExpiresAt($now->modify(sprintf('+%d seconds', self::WAITING_TTL_SECONDS)))
            ->setGameState($this->gameLogic->waitingState());

        $participant = (new RoomParticipant())
            ->setUser($user)
            ->setSide('A');
        $room->addRoomParticipant($participant);

        $this->entityManager->persist($room);
        $this->entityManager->persist($participant);
        $this->entityManager->flush();
        $this->publish($room);

        return $this->roomState($room, $user);
    }

    public function join(int $code, User $user): array
    {
        $this->removeExpiredRooms();

        $room = $this->rooms->findOneBy(['roomCode' => $code]);
        if (!$room instanceof Room) {
            throw new NotFoundHttpException('No active room exists with this code.');
        }

        $state = $this->entityManager->wrapInTransaction(function () use ($room, $user): array {
            $this->entityManager->lock($room, LockMode::PESSIMISTIC_WRITE);
            $this->assertNotExpired($room);

            $existingSide = $this->sideFor($room, $user);
            if ($existingSide !== null) {
                return $this->roomState($room, $user);
            }

            if ($room->getRoomParticipants()->count() >= 2) {
                throw new ConflictHttpException('This room already has two participants.');
            }

            $participant = (new RoomParticipant())
                ->setUser($user)
                ->setSide('B');
            $room->addRoomParticipant($participant);
            $this->entityManager->persist($participant);

            $now = $this->now();
            $room->setGameState($this->gameLogic->newRound(1))
                ->setLastMoveAt($now)
                ->setExpiresAt($now->modify(sprintf('+%d seconds', self::TURN_TTL_SECONDS)));

            return $this->roomState($room, $user);
        });

        $this->publish($room);

        return $state;
    }

    public function get(string $identifier, User $user): array
    {
        $room = $this->findRoom($identifier);
        $this->assertMember($room, $user);

        return $this->roomState($room, $user);
    }

    public function place(string $identifier, int $index, User $user): array
    {
        $room = $this->findRoom($identifier);

        $state = $this->entityManager->wrapInTransaction(function () use ($room, $index, $user): array {
            $this->entityManager->lock($room, LockMode::PESSIMISTIC_WRITE);
            $this->assertNotExpired($room);
            $side = $this->sideFor($room, $user);
            if ($side === null) {
                throw new NotFoundHttpException('You are not a participant in this room.');
            }
            if ($room->getRoomParticipants()->count() !== 2) {
                throw new ConflictHttpException('The second participant has not joined yet.');
            }

            $game = $this->gameLogic->place($room->getGameState(), $side, $index);
            $now = $this->now();
            $room->setGameState($game)
                ->setLastMoveAt($now)
                ->setExpiresAt($now->modify(sprintf('+%d seconds', self::TURN_TTL_SECONDS)));

            if ($room->isMatchmade() && in_array($game['status'], ['lost', 'draw'], true)) {
                if ($game['status'] === 'lost') {
                    foreach ($room->getRoomParticipants() as $participant) {
                        if ($participant->getSide() === $game['result']['winner']) {
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

            return $this->roomState($room, $user);
        });

        $this->publish($room);

        return $state;
    }

    public function restart(string $identifier, User $user): array
    {
        $room = $this->findRoom($identifier);

        $state = $this->entityManager->wrapInTransaction(function () use ($room, $user): array {
            $this->entityManager->lock($room, LockMode::PESSIMISTIC_WRITE);
            $this->assertNotExpired($room);
            if ($this->sideFor($room, $user) === null) {
                throw new NotFoundHttpException('You are not a participant in this room.');
            }
            if ($room->getRoomParticipants()->count() !== 2) {
                throw new ConflictHttpException('The second participant has not joined yet.');
            }
            if ($room->getGameState()['status'] === 'playing') {
                throw new ConflictHttpException('The current game has not finished.');
            }

            $round = (int) $room->getGameState()['round'] + 1;
            $now = $this->now();
            $room->setGameState($this->gameLogic->newRound($round))
                ->setLastMoveAt($now)
                ->setExpiresAt($now->modify(sprintf('+%d seconds', self::TURN_TTL_SECONDS)));

            return $this->roomState($room, $user);
        });

        $this->publish($room);

        return $state;
    }

    private function removeExpiredRooms(): void
    {
        $expired = $this->rooms->findExpired($this->now());
        foreach ($expired as $room) {
            $this->entityManager->remove($room);
        }
        if ($expired !== []) {
            $this->entityManager->flush();
        }
    }

    private function availableCode(): int
    {
        $usedCodes = array_fill_keys($this->rooms->findRoomCodes(), true);
        $start = random_int(1000, 9999);
        for ($offset = 0; $offset < 9000; ++$offset) {
            $code = 1000 + (($start - 1000 + $offset) % 9000);
            if (!isset($usedCodes[$code])) {
                return $code;
            }
        }

        throw new ConflictHttpException('All four-digit room codes are currently in use.');
    }

    private function findRoom(string $identifier): Room
    {
        $criteria = ctype_digit($identifier)
            ? ['roomCode' => (int) $identifier]
            : ['roomUuid' => $identifier];
        $room = $this->rooms->findOneBy($criteria);
        if (!$room instanceof Room) {
            throw new NotFoundHttpException('Room not found.');
        }
        if ($room->getExpiresAt() <= $this->now()) {
            $this->entityManager->remove($room);
            $this->entityManager->flush();
            throw new GoneHttpException('This room has expired.');
        }

        return $room;
    }

    private function assertNotExpired(Room $room): void
    {
        if ($room->getExpiresAt() <= $this->now()) {
            throw new GoneHttpException('This room has expired.');
        }
    }

    private function assertMember(Room $room, User $user): void
    {
        if ($this->sideFor($room, $user) === null) {
            throw new NotFoundHttpException('Room not found.');
        }
    }

    private function sideFor(Room $room, User $user): ?string
    {
        foreach ($room->getRoomParticipants() as $participant) {
            if ($participant->getUser()?->getId() === $user->getId()) {
                return $participant->getSide();
            }
        }

        return null;
    }

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
            'expiresAt' => $room->getExpiresAt()->format(DATE_ATOM),
        ];
    }

    private function publish(Room $room): void
    {
        $this->hub->publish(new Update(
            $this->topic($room),
            json_encode([
                'code' => $room->getRoomCode(),
                'expiresAt' => $room->getExpiresAt()->format(DATE_ATOM),
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