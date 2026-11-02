<?php

namespace App\Repository;

use App\Entity\Room;
use App\Entity\User;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\DBAL\LockMode;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<Room>
 */
class RoomRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, Room::class);
    }

    /**
     * @return Room[]
     */
    public function findExpired(\DateTimeImmutable $now): array
    {
        return $this->createQueryBuilder('room')
            ->andWhere('room.expiresAt <= :now')
            ->setParameter('now', $now)
            ->getQuery()
            ->getResult();
    }

    public function roomCodeExists(int $code): bool
    {
        return (int) $this->createQueryBuilder('room')
            ->select('COUNT(room.id)')
            ->andWhere('room.roomCode = :code')
            ->setParameter('code', $code)
            ->getQuery()
            ->getSingleScalarResult() > 0;
    }

    public function deleteExpired(\DateTimeImmutable $now): int
    {
        return $this->createQueryBuilder('room')
            ->delete()
            ->andWhere('room.expiresAt <= :now')
            ->setParameter('now', $now)
            ->getQuery()
            ->execute();
    }

    public function findActiveForUser(User $user, \DateTimeImmutable $now, ?int $exceptRoomId = null): ?Room
    {
        $query = $this->createQueryBuilder('room')
            ->innerJoin('room.roomParticipants', 'participant')
            ->andWhere('participant.user = :user')
            ->andWhere('room.expiresAt > :now')
            ->setParameter('user', $user)
            ->setParameter('now', $now);
        if (null !== $exceptRoomId) {
            $query->andWhere('room.id != :exceptRoomId')
                ->setParameter('exceptRoomId', $exceptRoomId);
        }
        $rooms = $query->getQuery()
            ->setLockMode(LockMode::PESSIMISTIC_READ)
            ->getResult();

        foreach ($rooms as $room) {
            if (
                $room instanceof Room
                && in_array($room->getGameState()['status'], ['waiting', 'playing'], true)
            ) {
                return $room;
            }
        }

        return null;
    }
}
