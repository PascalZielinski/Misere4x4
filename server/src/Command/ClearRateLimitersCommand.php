<?php

declare(strict_types=1);

namespace App\Command;

use Psr\Cache\CacheItemPoolInterface;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;
use Symfony\Component\DependencyInjection\Attribute\Autowire;

/**
 * Run with: docker-compose exec server php bin/console app:rate-limiters:clear.
 */
#[AsCommand(
    name: 'app:rate-limiters:clear',
    description: 'Clears all stored rate limiter states.',
)]
final class ClearRateLimitersCommand extends Command
{
    public function __construct(
        #[Autowire(service: 'cache.rate_limiter')]
        private readonly CacheItemPoolInterface $rateLimiterPool,
    ) {
        parent::__construct();
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $io = new SymfonyStyle($input, $output);
        if (!$this->rateLimiterPool->clear()) {
            $io->error('Could not clear the rate limiter cache.');

            return Command::FAILURE;
        }

        $io->success('All rate limiter states have been cleared.');

        return Command::SUCCESS;
    }
}
