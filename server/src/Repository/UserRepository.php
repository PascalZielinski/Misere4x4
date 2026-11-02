<?php

namespace App\Repository;

use App\Entity\User;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<User>
 */
class UserRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, User::class);
    }

    /**
     * @return User[]
     */
    public function findAllOrderedByScore(): array
    {
        return $this->createQueryBuilder('user')
            ->orderBy('user.score', 'DESC')
            ->getQuery()
            ->getResult();
    }

    /**
     * @return User[]
     */
    public function searchByNameOrderedByScore(string $name): array
    {
        return $this->createQueryBuilder('user')
            ->andWhere('LOWER(user.name) LIKE :name')
            ->setParameter('name', '%'.mb_strtolower($name).'%')
            ->orderBy('user.score', 'DESC')
            ->getQuery()
            ->getResult();
    }

    public function deactivateInactiveUsers(\DateTimeImmutable $inactiveSince): int
    {
        return $this->createQueryBuilder('user')
            ->update()
            ->set('user.active', ':inactive')
            ->andWhere('user.active = :active')
            ->andWhere('user.lastSeenAt <= :inactiveSince')
            ->setParameter('inactive', false)
            ->setParameter('active', true)
            ->setParameter('inactiveSince', $inactiveSince)
            ->getQuery()
            ->execute();
    }

    //    /**
    //     * @return User[] Returns an array of User objects
    //     */
    //    public function findByExampleField($value): array
    //    {
    //        return $this->createQueryBuilder('u')
    //            ->andWhere('u.exampleField = :val')
    //            ->setParameter('val', $value)
    //            ->orderBy('u.id', 'ASC')
    //            ->setMaxResults(10)
    //            ->getQuery()
    //            ->getResult()
    //        ;
    //    }

    //    public function findOneBySomeField($value): ?User
    //    {
    //        return $this->createQueryBuilder('u')
    //            ->andWhere('u.exampleField = :val')
    //            ->setParameter('val', $value)
    //            ->getQuery()
    //            ->getOneOrNullResult()
    //        ;
    //    }
}
