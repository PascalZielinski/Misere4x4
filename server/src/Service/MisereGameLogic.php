<?php

declare(strict_types=1);

namespace App\Service;

use Symfony\Component\HttpKernel\Exception\ConflictHttpException;
use Symfony\Component\HttpKernel\Exception\UnprocessableEntityHttpException;

final class MisereGameLogic
{
    private const WINDOWS = [
        [0, 1, 2], [1, 2, 3], [4, 5, 6], [5, 6, 7],
        [8, 9, 10], [9, 10, 11], [12, 13, 14], [13, 14, 15],
        [0, 4, 8], [4, 8, 12], [1, 5, 9], [5, 9, 13],
        [2, 6, 10], [6, 10, 14], [3, 7, 11], [7, 11, 15],
        [0, 5, 10], [5, 10, 15], [1, 6, 11], [4, 9, 14],
        [2, 5, 8], [6, 9, 12], [3, 6, 9], [7, 10, 13],
    ];

    private const DIRECTIONS = [
        [0, 1, 0],
        [1, 0, 90],
        [1, 1, 45],
        [1, -1, -45],
    ];

    public function waitingState(): array
    {
        return [
            'round' => 1,
            'status' => 'waiting',
            'firstPlayer' => null,
            'turn' => null,
            'board' => array_fill(0, 16, null),
            'moves' => [],
            'result' => ['status' => 'waiting'],
        ];
    }

    public function newRound(int $round): array
    {
        $firstPlayer = random_int(0, 1) === 0 ? 'A' : 'B';

        return [
            'round' => $round,
            'status' => 'playing',
            'firstPlayer' => $firstPlayer,
            'turn' => $firstPlayer,
            'board' => array_fill(0, 16, null),
            'moves' => [],
            'result' => ['status' => 'playing'],
        ];
    }

    public function place(array $game, string $side, int $index): array
    {
        if ($game['status'] !== 'playing') {
            throw new ConflictHttpException('This game is not accepting moves.');
        }
        if ($game['turn'] !== $side) {
            throw new ConflictHttpException('It is not your turn.');
        }
        if ($index < 0 || $index >= 16) {
            throw new UnprocessableEntityHttpException('The cell index must be between 0 and 15.');
        }
        if ($game['board'][$index] !== null) {
            throw new ConflictHttpException('That cell is already occupied.');
        }

        $mark = $side === 'A' ? 'X' : 'O';
        $game['board'][$index] = $mark;
        $game['moves'][] = ['side' => $side, 'index' => $index];
        $game['turn'] = $side === 'A' ? 'B' : 'A';
        $game['result'] = $this->result($game['board'], $index, $side, $mark);
        $game['status'] = $game['result']['status'];

        return $game;
    }

    private function result(array $board, int $lastIndex, string $side, string $mark): array
    {
        $chains = $this->chainsThrough($board, $lastIndex);
        if ($chains !== []) {
            return [
                'status' => 'lost',
                'loser' => $side,
                'winner' => $side === 'A' ? 'B' : 'A',
                'chains' => $chains,
            ];
        }

        foreach (self::WINDOWS as $window) {
            $marks = array_unique(array_filter(array_map(
                static fn (int $cell): ?string => $board[$cell],
                $window,
            )));
            if (count($marks) <= 1) {
                return ['status' => 'playing'];
            }
        }

        return ['status' => 'draw'];
    }

    private function chainsThrough(array $board, int $index): array
    {
        $mark = $board[$index];
        $row = intdiv($index, 4);
        $column = $index % 4;
        $chains = [];

        foreach (self::DIRECTIONS as [$dr, $dc, $angle]) {
            $cells = [$index];
            for ($r = $row + $dr, $c = $column + $dc; $this->inBoard($r, $c) && $board[$r * 4 + $c] === $mark; $r += $dr, $c += $dc) {
                $cells[] = $r * 4 + $c;
            }
            for ($r = $row - $dr, $c = $column - $dc; $this->inBoard($r, $c) && $board[$r * 4 + $c] === $mark; $r -= $dr, $c -= $dc) {
                array_unshift($cells, $r * 4 + $c);
            }
            if (count($cells) >= 3) {
                $chains[] = ['cells' => $cells, 'angle' => $angle];
            }
        }

        return $chains;
    }

    private function inBoard(int $row, int $column): bool
    {
        return $row >= 0 && $row < 4 && $column >= 0 && $column < 4;
    }
}
