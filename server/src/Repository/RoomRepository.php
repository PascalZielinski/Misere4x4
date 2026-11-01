<?php

namespace App\Repository;

use App\Entity\Room;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
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

    /**
     * @return int[]
     */
    public function findRoomCodes(): array
    {
        return array_map(
            'intval',
            $this->createQueryBuilder('room')
                ->select('room.roomCode')
                ->getQuery()
                ->getSingleColumnResult(),
        );
    }
}
