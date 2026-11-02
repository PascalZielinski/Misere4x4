<?php

declare(strict_types=1);

namespace App\Tests\Service;

use App\Service\MisereGameLogic;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;
use Symfony\Component\HttpKernel\Exception\UnprocessableEntityHttpException;

final class MisereGameLogicTest extends TestCase
{
    private MisereGameLogic $gameLogic;

    protected function setUp(): void
    {
        $this->gameLogic = new MisereGameLogic();
    }

    public function testWaitingStateHasEmptyBoardAndNoTurn(): void
    {
        $game = $this->gameLogic->waitingState();

        self::assertSame(1, $game['round']);
        self::assertSame('waiting', $game['status']);
        self::assertNull($game['firstPlayer']);
        self::assertNull($game['turn']);
        self::assertSame(array_fill(0, 16, null), $game['board']);
        self::assertSame([], $game['moves']);
        self::assertSame(['status' => 'waiting'], $game['result']);
    }

    public function testNewRoundStartsWithAnEmptyBoardAndFirstPlayersTurn(): void
    {
        $game = $this->gameLogic->newRound(3);

        self::assertSame(3, $game['round']);
        self::assertSame('playing', $game['status']);
        self::assertContains($game['firstPlayer'], ['A', 'B']);
        self::assertSame($game['firstPlayer'], $game['turn']);
        self::assertSame(array_fill(0, 16, null), $game['board']);
        self::assertSame([], $game['moves']);
    }

    public function testValidMovePlacesCorrectMarkAndAlternatesTurn(): void
    {
        $game = $this->gameLogic->newRound(1);
        $game['firstPlayer'] = 'A';
        $game['turn'] = 'A';
        $game = $this->gameLogic->place($game, 'A', 5);

        self::assertSame('X', $game['board'][5]);
        self::assertSame('B', $game['turn']);
        self::assertSame([['side' => 'A', 'index' => 5]], $game['moves']);
        self::assertSame('playing', $game['status']);
    }

    /**
     * @param list<int> $cells
     */
    #[DataProvider('winningLines')]
    public function testCompletingAnyThreeInARowLosesTheRound(array $cells, int $lastCell): void
    {
        $game = $this->gameLogic->waitingState();
        $game['status'] = 'playing';
        $game['turn'] = 'A';
        foreach (array_slice($cells, 0, 2) as $cell) {
            $game['board'][$cell] = 'X';
        }
        $game['board'] = array_values($game['board']);

        $result = $this->gameLogic->place($game, 'A', $lastCell);

        self::assertSame('lost', $result['status']);
        self::assertSame('A', $result['result']['loser'] ?? null);
        self::assertSame('B', $result['result']['winner']);
        self::assertSame([['cells' => $cells, 'angle' => self::angleForLine($cells)]], $result['result']['chains']);
    }

    /**
     * @return iterable<string, array{list<int>, int}>
     */
    public static function winningLines(): iterable
    {
        yield 'horizontal' => [[4, 5, 6], 6];
        yield 'vertical' => [[1, 5, 9], 9];
        yield 'diagonal down' => [[0, 5, 10], 10];
        yield 'diagonal up' => [[2, 5, 8], 8];
    }

    public function testFourInARowReportsTheWholeChain(): void
    {
        $game = $this->gameLogic->waitingState();
        $game['status'] = 'playing';
        $game['turn'] = 'A';
        $game['board'][4] = 'X';
        $game['board'][5] = 'X';
        $game['board'][6] = 'X';
        $game['board'] = array_values($game['board']);

        $result = $this->gameLogic->place($game, 'A', 7);

        self::assertSame([['cells' => [4, 5, 6, 7], 'angle' => 0]], $result['result']['chains'] ?? null);
    }

    public function testMoveThatCompletesMoreThanOneChainReportsBoth(): void
    {
        $game = $this->gameLogic->waitingState();
        $game['status'] = 'playing';
        $game['turn'] = 'A';
        foreach ([1, 3, 4, 6, 9] as $cell) {
            $game['board'][$cell] = 'X';
        }
        $game['board'] = array_values($game['board']);

        $result = $this->gameLogic->place($game, 'A', 5);

        self::assertSame('lost', $result['status']);
        self::assertCount(2, $result['result']['chains'] ?? []);
    }

    public function testFullBoardWithoutAnyThreeInARowIsADraw(): void
    {
        $pattern = 'OXOXXXOOOOXXXXOO';
        $xCells = [];
        $oCells = [];
        foreach (str_split($pattern) as $index => $mark) {
            if ('X' === $mark) {
                $xCells[] = $index;
            } else {
                $oCells[] = $index;
            }
        }
        array_shift($oCells);

        $game = $this->gameLogic->newRound(1);
        $game['firstPlayer'] = 'A';
        $game['turn'] = 'A';
        $nextCells = ['A' => $xCells, 'B' => $oCells];
        while ([] !== $nextCells['A'] || [] !== $nextCells['B']) {
            $currentPlayer = $game['turn'];
            if (null === $currentPlayer) {
                self::fail('A running game must have an active player.');
            }
            $cell = array_shift($nextCells[$currentPlayer]);
            self::assertNotNull($cell);
            $game = $this->gameLogic->place($game, $currentPlayer, $cell);
        }

        self::assertSame('playing', $game['status']);
        self::assertSame(15, count($game['moves']));
        self::assertNull($game['board'][0]);

        $game = $this->gameLogic->place($game, 'B', 0);

        self::assertSame('draw', $game['status']);
        self::assertSame('draw', $game['result']['status']);
    }

    public function testCannotMoveAfterRoundEnds(): void
    {
        $game = $this->gameLogic->waitingState();
        $game['status'] = 'draw';

        $this->expectException(ConflictHttpException::class);
        $this->gameLogic->place($game, 'A', 0);
    }

    public function testCannotPlayOutOfTurn(): void
    {
        $game = $this->gameLogic->newRound(1);
        $wrongSide = 'A' === $game['turn'] ? 'B' : 'A';

        $this->expectException(ConflictHttpException::class);
        $this->gameLogic->place($game, $wrongSide, 0);
    }

    #[DataProvider('invalidCellIndexes')]
    public function testRejectsCellIndexesOutsideTheBoard(int $index): void
    {
        $this->expectException(UnprocessableEntityHttpException::class);
        $game = $this->gameLogic->newRound(1);
        $side = $game['turn'];
        if (null === $side) {
            self::fail('A new round must have an active player.');
        }
        $this->gameLogic->place($game, $side, $index);
    }

    /**
     * @return iterable<string, array{int}>
     */
    public static function invalidCellIndexes(): iterable
    {
        yield 'negative index' => [-1];
        yield 'index past board' => [16];
    }

    public function testCannotPlayInAnOccupiedCell(): void
    {
        $game = $this->gameLogic->newRound(1);
        $side = $game['turn'];
        if (null === $side) {
            self::fail('A new round must have an active player.');
        }
        $game['board'][0] = 'A' === $side ? 'X' : 'O';

        $this->expectException(ConflictHttpException::class);
        $this->gameLogic->place($game, $side, 0);
    }

    /**
     * @param list<int> $cells
     */
    private static function angleForLine(array $cells): int
    {
        $first = $cells[0];
        $last = $cells[2];
        if (intdiv($first, 4) === intdiv($last, 4)) {
            return 0;
        }
        if ($first % 4 === $last % 4) {
            return 90;
        }

        return $last % 4 > $first % 4 ? 45 : -45;
    }
}
