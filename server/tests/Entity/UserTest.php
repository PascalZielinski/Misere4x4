<?php

declare(strict_types=1);

namespace App\Tests\Entity;

use App\Entity\User;
use PHPUnit\Framework\TestCase;

final class UserTest extends TestCase
{
    public function testNewUserStoresOnlyAHashOfItsResponseToken(): void
    {
        $user = new User();
        $responseToken = $user->getResponseToken();

        self::assertNotNull($responseToken);
        self::assertSame(hash('sha256', $responseToken), $user->getSessionTokenHash());
        self::assertNotSame($responseToken, $user->getSessionTokenHash());
        self::assertSame(64, strlen((string) $user->getSessionTokenHash()));
    }

    public function testUserDefaultsToActiveWithZeroScoreAndUtcTimestamps(): void
    {
        $user = new User();

        self::assertTrue($user->isActive());
        self::assertSame(0, $user->getScore());
        self::assertSame('UTC', $user->getCreatedAt()?->getTimezone()->getName());
        self::assertSame('UTC', $user->getLastSeenAt()?->getTimezone()->getName());
    }

    public function testRotatedTokenCanBeReturnedWithoutChangingTheStoredHash(): void
    {
        $user = new User();
        $storedHash = $user->getSessionTokenHash();
        $nextToken = bin2hex(random_bytes(32));

        $user->setResponseToken($nextToken);

        self::assertSame($nextToken, $user->getResponseToken());
        self::assertSame($storedHash, $user->getSessionTokenHash());
    }
}
