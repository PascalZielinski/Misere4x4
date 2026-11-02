<?php

declare(strict_types=1);

namespace App\Tests\Command;

use App\Command\ClearRateLimitersCommand;
use PHPUnit\Framework\TestCase;
use Psr\Cache\CacheItemPoolInterface;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Tester\CommandTester;

final class ClearRateLimitersCommandTest extends TestCase
{
    public function testClearsLimiterPoolAndReportsSuccess(): void
    {
        $pool = $this->createMock(CacheItemPoolInterface::class);
        $pool->expects(self::once())->method('clear')->willReturn(true);
        $tester = new CommandTester(new ClearRateLimitersCommand($pool));

        self::assertSame(Command::SUCCESS, $tester->execute([]));
        self::assertStringContainsString('All rate limiter states have been cleared.', $tester->getDisplay());
    }

    public function testReportsFailureWhenLimiterPoolCannotBeCleared(): void
    {
        $pool = $this->createMock(CacheItemPoolInterface::class);
        $pool->expects(self::once())->method('clear')->willReturn(false);
        $tester = new CommandTester(new ClearRateLimitersCommand($pool));

        self::assertSame(Command::FAILURE, $tester->execute([]));
        self::assertStringContainsString('Could not clear the rate limiter cache.', $tester->getDisplay());
    }
}
