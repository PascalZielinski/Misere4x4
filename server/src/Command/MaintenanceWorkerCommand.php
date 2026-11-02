<?php

declare(strict_types=1);

namespace App\Command;

use App\Service\MaintenanceService;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Input\InputOption;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;

#[AsCommand(
    name: 'app:maintenance:work',
    description: 'Marks inactive users and deletes expired rooms.',
)]
final class MaintenanceWorkerCommand extends Command
{
    private const DEFAULT_INTERVAL_SECONDS = 60;

    public function __construct(private readonly MaintenanceService $maintenance)
    {
        parent::__construct();
    }

    protected function configure(): void
    {
        $this->addOption(
            'interval',
            null,
            InputOption::VALUE_REQUIRED,
            'Seconds to wait between maintenance runs.',
            self::DEFAULT_INTERVAL_SECONDS,
        );
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $interval = filter_var($input->getOption('interval'), FILTER_VALIDATE_INT);
        if (false === $interval || $interval < 1) {
            (new SymfonyStyle($input, $output))->error('The interval must be a positive integer.');

            return Command::INVALID;
        }

        $io = new SymfonyStyle($input, $output);
        $io->comment(sprintf('Maintenance worker started; running every %d seconds.', $interval));

        while (0 === connection_aborted()) {
            $counts = $this->maintenance->run();
            $io->writeln(sprintf(
                '[%s] Deactivated users: %d; deleted rooms: %d.',
                (new \DateTimeImmutable('now', new \DateTimeZone('UTC')))->format(\DateTimeInterface::ATOM),
                $counts['deactivatedUsers'],
                $counts['deletedRooms'],
            ));

            sleep($interval);
        }

        return Command::SUCCESS;
    }
}
