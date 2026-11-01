<?php

namespace App\Security;

use App\Repository\UserRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Security\Core\Exception\BadCredentialsException;
use Symfony\Component\Security\Http\AccessToken\AccessTokenHandlerInterface;
use Symfony\Component\Security\Http\Authenticator\Passport\Badge\UserBadge;

class UserTokenHandler implements AccessTokenHandlerInterface
{
    private const TTL = '-30 minutes';

    public function __construct(
        private UserRepository $users,
        private EntityManagerInterface $em,
    ) {}

    public function getUserBadgeFrom(#[\SensitiveParameter] string $accessToken): UserBadge
    {
        $user = $this->users->findOneBy(['sessionToken' => $accessToken]);
        $now = new \DateTimeImmutable('now', new \DateTimeZone('UTC'));

        if (null === $user || $user->getLastSeenAt() < $now->modify(self::TTL)) {
            throw new BadCredentialsException('Invalid or expired token.');
        }

        $user->setLastSeenAt($now);
        $this->em->flush();

        return new UserBadge($user->getUserIdentifier(), fn () => $user);
    }
}