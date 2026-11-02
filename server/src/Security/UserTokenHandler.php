<?php

namespace App\Security;

use App\Repository\UserRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Security\Core\Exception\BadCredentialsException;
use Symfony\Component\Security\Http\AccessToken\AccessTokenHandlerInterface;
use Symfony\Component\Security\Http\Authenticator\Passport\Badge\UserBadge;

class UserTokenHandler implements AccessTokenHandlerInterface
{
    private const TTL = '-10 minutes';

    public function __construct(
        private UserRepository $users,
        private EntityManagerInterface $em,
    ) {
    }

    public function getUserBadgeFrom(#[\SensitiveParameter] string $accessToken): UserBadge
    {
        $tokenHash = hash('sha256', $accessToken);
        $user = $this->users->findOneBy(['sessionToken' => $tokenHash]);
        $now = new \DateTimeImmutable('now', new \DateTimeZone('UTC'));

        if (
            null !== $user
            && $user->isActive()
            && null !== $user->getLastSeenAt()
            && $user->getLastSeenAt() >= $now->modify(self::TTL)
        ) {
            $this->em->getConnection()->executeStatement(
                'UPDATE `user` SET last_seen_at = :lastSeenAt WHERE id = :id AND session_token = :currentToken AND active = 1',
                [
                    'lastSeenAt' => $now->format('Y-m-d H:i:s'),
                    'id' => $user->getId(),
                    'currentToken' => $tokenHash,
                ],
            );

            $user->setLastSeenAt($now);

            return new UserBadge($user->getUserIdentifier(), fn () => $user);
        }

        throw new BadCredentialsException('Invalid or expired token.');
    }
}
