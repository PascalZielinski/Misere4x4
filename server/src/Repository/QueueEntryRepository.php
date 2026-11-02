<?php

declare(strict_types=1);

namespace App\Repository;

use App\Entity\QueueEntry;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\DBAL\LockMode;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<QueueEntry>
 */
class QueueEntryRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, QueueEntry::class);
    }

    /**
     * @return QueueEntry[]
     */
    public function findWaiting(): array
    {
        return $this->createQueryBuilder('entry')
            ->andWhere('entry.room IS NULL')
            ->orderBy('entry.createdAt', 'ASC')
            ->addOrderBy('entry.id', 'ASC')
            ->setMaxResults(100)
            ->getQuery()
            ->getResult();
    }

    /**
     * @return QueueEntry[]
     */
    public function lockWaitingForUpdate(): array
    {
        return $this->createQueryBuilder('entry')
            ->andWhere('entry.room IS NULL')
            ->orderBy('entry.createdAt', 'ASC')
            ->addOrderBy('entry.id', 'ASC')
            ->setMaxResults(100)
            ->getQuery()
            ->setLockMode(LockMode::PESSIMISTIC_WRITE)
            ->getResult();
    }

    public function countWaiting(): int
    {
        return (int) $this->createQueryBuilder('entry')
            ->select('COUNT(entry.id)')
            ->andWhere('entry.room IS NULL')
            ->getQuery()
            ->getSingleScalarResult();
    }
}
