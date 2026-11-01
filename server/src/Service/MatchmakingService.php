<?php

declare(strict_types=1);

namespace App\Service;

use App\Entity\QueueEntry;
use App\Entity\Room;
use App\Entity\RoomParticipant;
use App\Entity\User;
use App\Repository\QueueEntryRepository;
use App\Repository\RoomRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;

final readonly class MatchmakingService
{
    private const ROOM_TTL_SECONDS = 60;

    public function __construct(
        private EntityManagerInterface $entityManager,
        private QueueEntryRepository $queueEntries,
        private RoomRepository $rooms,
        private MisereGameLogic $gameLogic,
    ) {
    }

    public function join(User $user): array
    {
        $this->entityManager->wrapInTransaction(function () use ($user): void {
            $entry = $this->queueEntries->findOneBy(['user' => $user]);
            if (!$entry instanceof QueueEntry) {
                $entry = new QueueEntry($user, $this->now());
                $this->entityManager->persist($entry);
            } elseif ($entry->getRoom() !== null) {
                $matchedRoom = $entry->getRoom();
                $gameState = $matchedRoom->getGameState();
                if (
                    $matchedRoom->getExpiresAt() > $this->now() &&
                    ($gameState['status'] ?? null) === 'playing'
                ) {
                    return;
                }
                $entry->setRoom(null)->setCreatedAt($this->now());
            }

            $this->entityManager->flush();
            $this->matchWaitingPlayers();
        });

        return $this->status($user);
    }

    public function status(User $user): array
    {
        $this->entityManager->wrapInTransaction(function (): void {
            $this->matchWaitingPlayers();
        });

        $entry = $this->queueEntries->findOneBy(['user' => $user]);
        if (!$entry instanceof QueueEntry) {
            return ['status' => 'idle', 'queueCount' => $this->queueEntries->countWaiting()];
        }

        $room = $entry->getRoom();
        if ($room !== null && ($room->getGameState()['status'] ?? null) === 'playing') {
            return [
                'status' => 'matched',
                'roomUuid' => $room->getRoomUuid(),
                'queueCount' => $this->queueEntries->countWaiting(),
            ];
        }

        return ['status' => 'waiting', 'queueCount' => $this->queueEntries->countWaiting()];
    }

    public function leave(User $user): void
    {
        $entry = $this->queueEntries->findOneBy(['user' => $user]);
        if (!$entry instanceof QueueEntry) {
            return;
        }
        if ($entry->getRoom() !== null && ($entry->getRoom()->getGameState()['status'] ?? null) === 'playing') {
            throw new ConflictHttpException('You cannot leave the queue after a match has started.');
        }

        $this->entityManager->remove($entry);
        $this->entityManager->flush();
    }

    public function requeueParticipants(Room $room): void
    {
        foreach ($room->getRoomParticipants() as $participant) {
            $user = $participant->getUser();
            if (!$user instanceof User) {
                continue;
            }

            $entry = $this->queueEntries->findOneBy(['user' => $user]);
            if (!$entry instanceof QueueEntry) {
                $entry = new QueueEntry($user, $this->now());
                $this->entityManager->persist($entry);
            } elseif ($entry->getRoom() === null || $entry->getRoom() === $room) {
                $entry->setRoom(null)->setCreatedAt($this->now());
            }
        }
    }

    private function matchWaitingPlayers(): void
    {
        $this->removeExpiredRooms();
        $waiting = $this->queueEntries->findWaitingForUpdate();
        while (count($waiting) >= 2) {
            $first = array_shift($waiting);
            $second = array_shift($waiting);
            if (!$first instanceof QueueEntry || !$second instanceof QueueEntry) {
                break;
            }

            $now = $this->now();
            $room = (new Room())
                ->setRoomCode($this->availableCode())
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

            $this->entityManager->persist($room);
            foreach ($room->getRoomParticipants() as $participant) {
                $this->entityManager->persist($participant);
            }
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

    private function now(): \DateTimeImmutable
    {
        return new \DateTimeImmutable('now', new \DateTimeZone('UTC'));
    }
}
