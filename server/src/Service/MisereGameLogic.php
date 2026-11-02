<?php

declare(strict_types=1);

namespace App\Service;

// #region Imports
// MARK: - Imports
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;
use Symfony\Component\HttpKernel\Exception\UnprocessableEntityHttpException;

// #endregion

// #region Game state types
// MARK: - Game state types
/**
 * @phpstan-type Side 'A'|'B'
 * @phpstan-type Mark 'X'|'O'
 * @phpstan-type GameResult array{status: 'waiting'|'playing'|'draw'}|LostResult
 * @phpstan-type LostResult array{status: 'lost', loser: Side, winner: Side, chains: non-empty-list<array{cells: list<int>, angle: int}>}
 * @phpstan-type GameState array{
 *     round: int,
 *     status: 'waiting'|'playing'|'lost'|'draw',
 *     firstPlayer: Side|null,
 *     turn: Side|null,
 *     board: list<Mark|null>,
 *     moves: list<array{side: Side, index: int}>,
 *     result: GameResult
 * }
 */
// #endregion
final class MisereGameLogic
{
    // #region Board configuration
    // MARK: - Board configuration
    private const DIRECTIONS = [
        [0, 1, 0],
        [1, 0, 90],
        [1, 1, 45],
        [1, -1, -45],
    ];
    // #endregion

    // #region Game state creation
    // MARK: - Game state creation
    /**
     * @return GameState
     */
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

    /**
     * @return GameState
     */
    public function newRound(int $round): array
    {
        $firstPlayer = 0 === random_int(0, 1) ? 'A' : 'B';

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
    // #endregion

    // #region Move handling
    // MARK: - Move handling
    /**
     * @param GameState $game
     * @param Side      $side
     *
     * @return GameState
     */
    public function place(array $game, string $side, int $index): array
    {
        if ('playing' !== $game['status']) {
            throw new ConflictHttpException('This game is not accepting moves.');
        }
        if ($game['turn'] !== $side) {
            throw new ConflictHttpException('It is not your turn.');
        }
        if ($index < 0 || $index >= 16) {
            throw new UnprocessableEntityHttpException('The cell index must be between 0 and 15.');
        }
        if (null !== $game['board'][$index]) {
            throw new ConflictHttpException('That cell is already occupied.');
        }

        $mark = 'A' === $side ? 'X' : 'O';
        $game['board'][$index] = $mark;
        $game['moves'][] = ['side' => $side, 'index' => $index];
        $game['turn'] = 'A' === $side ? 'B' : 'A';
        $game['result'] = $this->result($game['board'], $index, $side);
        $game['status'] = $game['result']['status'];

        return $game;
    }
    // #endregion

    // #region Result evaluation
    // MARK: - Result evaluation
    /**
     * @param list<Mark|null> $board
     * @param Side            $side
     *
     * @return GameResult
     */
    private function result(array $board, int $lastIndex, string $side): array
    {
        $chains = $this->chainsThrough($board, $lastIndex);
        if ([] !== $chains) {
            return [
                'status' => 'lost',
                'loser' => $side,
                'winner' => 'A' === $side ? 'B' : 'A',
                'chains' => $chains,
            ];
        }

        return in_array(null, $board, true)
            ? ['status' => 'playing']
            : ['status' => 'draw'];
    }

    /**
     * @param list<Mark|null> $board
     *
     * @return list<array{cells: list<int>, angle: int}>
     */
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
    // #endregion
}
