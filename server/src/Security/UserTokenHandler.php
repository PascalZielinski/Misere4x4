<?php

namespace App\Security;

use App\Repository\UserRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Security\Core\Exception\BadCredentialsException;
use Symfony\Component\Security\Http\AccessToken\AccessTokenHandlerInterface;
use Symfony\Component\Security\Http\Authenticator\Passport\Badge\UserBadge;
use Symfony\Component\Uid\Uuid;

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

        if (
            $user !== null &&
            $user->getLastSeenAt() !== null &&
            $user->getLastSeenAt() >= $now->modify(self::TTL)
        ) {
            $nextToken = Uuid::v4()->toRfc4122();
            $updated = $this->em->getConnection()->executeStatement(
                'UPDATE `user` SET used_token = :usedToken, session_token = :sessionToken, last_seen_at = :lastSeenAt WHERE id = :id AND session_token = :currentToken',
                [
                    'usedToken' => $accessToken,
                    'sessionToken' => $nextToken,
                    'lastSeenAt' => $now->format('Y-m-d H:i:s'),
                    'id' => $user->getId(),
                    'currentToken' => $accessToken,
                ],
            );

            if ($updated === 1) {
                $user->setUsedToken($accessToken)
                    ->setSessionToken($nextToken)
                    ->setLastSeenAt($now);

                return new UserBadge($user->getUserIdentifier(), fn () => $user);
            }
        }

        $user = $this->users->findOneBy(['usedToken' => $accessToken]);
        if (
            $user === null ||
            $user->getLastSeenAt() === null ||
            $user->getLastSeenAt() < $now->modify(self::TTL)
        ) {
            throw new BadCredentialsException('Invalid or expired token.');
        }

        $this->em->getConnection()->executeStatement(
            'UPDATE `user` SET last_seen_at = :lastSeenAt WHERE id = :id AND used_token = :usedToken',
            [
                'lastSeenAt' => $now->format('Y-m-d H:i:s'),
                'id' => $user->getId(),
                'usedToken' => $accessToken,
            ],
        );
        $user->setLastSeenAt($now);

        return new UserBadge($user->getUserIdentifier(), fn () => $user);
    }
}