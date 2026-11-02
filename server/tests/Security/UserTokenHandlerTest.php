<?php

declare(strict_types=1);

namespace App\Tests\Security;

use App\Entity\User;
use App\Repository\UserRepository;
use App\Security\UserTokenHandler;
use Doctrine\ORM\EntityManagerInterface;
use PHPUnit\Framework\TestCase;
use Symfony\Component\Security\Core\Exception\BadCredentialsException;

final class UserTokenHandlerTest extends TestCase
{
    public function testValidTokenRemainsStableAndOnlyItsHashIsStored(): void
    {
        $token = bin2hex(random_bytes(32));
        $user = $this->userWithToken($token);
        $handler = $this->handlerForUser(
            $user,
            1,
            static fn (array $params): bool => $params['currentToken'] === hash('sha256', $token),
        );
        $badge = $handler->getUserBadgeFrom($token);

        self::assertSame($user->getUserIdentifier(), $badge->getUserIdentifier());
        self::assertSame(hash('sha256', $token), $user->getSessionTokenHash());
    }

    public function testRepeatedRequestsDoNotRotateTheSessionToken(): void
    {
        $token = bin2hex(random_bytes(32));
        $user = $this->userWithToken($token);
        $handler = $this->handlerForUser($user, 1, expectedUpdates: 2);

        $handler->getUserBadgeFrom($token);
        $firstResponseToken = $user->getResponseToken();
        $handler->getUserBadgeFrom($token);

        self::assertNull($firstResponseToken);
        self::assertSame($firstResponseToken, $user->getResponseToken());
        self::assertSame(hash('sha256', $token), $user->getSessionTokenHash());
    }

    public function testSameSecondLastSeenUpdateDoesNotInvalidateAnOtherwiseValidToken(): void
    {
        $token = bin2hex(random_bytes(32));
        $user = $this->userWithToken($token);

        $handler = $this->handlerForUser($user, 0);

        self::assertSame($user->getUserIdentifier(), $handler->getUserBadgeFrom($token)->getUserIdentifier());
    }

    public function testTokenIsAcceptedWhileLastSeenIsWithinTenMinutes(): void
    {
        $token = bin2hex(random_bytes(32));
        $user = $this->userWithToken($token);
        $user->setLastSeenAt(new \DateTimeImmutable('-9 minutes', new \DateTimeZone('UTC')));
        $handler = $this->handlerForUser($user, 1);

        self::assertSame($user->getUserIdentifier(), $handler->getUserBadgeFrom($token)->getUserIdentifier());
    }

    public function testInactiveUserCannotAuthenticate(): void
    {
        $user = $this->userWithToken('inactive-token');
        $user->setActive(false);
        $handler = $this->handlerForUser($user, null);

        $this->expectException(BadCredentialsException::class);
        $handler->getUserBadgeFrom('inactive-token');
    }

    public function testExpiredUserCannotAuthenticate(): void
    {
        $user = $this->userWithToken('expired-token');
        $user->setLastSeenAt(new \DateTimeImmutable('-11 minutes', new \DateTimeZone('UTC')));
        $handler = $this->handlerForUser($user, null);

        $this->expectException(BadCredentialsException::class);
        $handler->getUserBadgeFrom('expired-token');
    }

    public function testUnknownTokenCannotAuthenticate(): void
    {
        $userRepository = $this->createMock(UserRepository::class);
        $userRepository->expects(self::once())
            ->method('findOneBy')
            ->willReturn(null);
        $entityManager = $this->createMock(EntityManagerInterface::class);
        $entityManager->expects(self::never())->method('getConnection');

        $handler = new UserTokenHandler($userRepository, $entityManager);

        $this->expectException(BadCredentialsException::class);
        $handler->getUserBadgeFrom('unknown-token');
    }

    /**
     * @param callable(array<string, mixed>): bool|null $statementMatcher
     */
    private function handlerForUser(
        User $user,
        ?int $updateResult,
        ?callable $statementMatcher = null,
        int $expectedUpdates = 1,
    ): UserTokenHandler {
        $userRepository = $this->createMock(UserRepository::class);
        $userRepository->method('findOneBy')->willReturn($user);

        $connection = $this->createMock(\Doctrine\DBAL\Connection::class);
        if (null === $updateResult) {
            $connection->expects(self::never())->method('executeStatement');
        } else {
            $expectation = $connection->expects(self::exactly($expectedUpdates))->method('executeStatement');
            if (null !== $statementMatcher) {
                $expectation->with(
                    self::callback(static fn (string $sql): bool => str_contains($sql, 'UPDATE `user` SET last_seen_at')),
                    self::callback($statementMatcher),
                );
            }
            $expectation->willReturn($updateResult);
        }

        $entityManager = $this->createMock(EntityManagerInterface::class);
        $entityManager->method('getConnection')->willReturn($connection);

        return new UserTokenHandler($userRepository, $entityManager);
    }

    private function userWithToken(string $token): User
    {
        return (new User())
            ->setName('test-player')
            ->setResponseToken(null)
            ->setSessionTokenHash(hash('sha256', $token))
            ->setLastSeenAt(new \DateTimeImmutable('now', new \DateTimeZone('UTC')));
    }
}
