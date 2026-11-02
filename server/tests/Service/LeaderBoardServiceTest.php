<?php

declare(strict_types=1);

namespace App\Tests\Service;

use App\Entity\User;
use App\Repository\UserRepository;
use App\Service\LeaderBoardService;
use Doctrine\DBAL\Exception\UniqueConstraintViolationException;
use Doctrine\ORM\EntityManagerInterface;
use PHPUnit\Framework\TestCase;
use Symfony\Component\HttpKernel\Exception\BadRequestHttpException;
use Symfony\Component\HttpKernel\Exception\UnprocessableEntityHttpException;
use Symfony\Component\Validator\ConstraintViolation;
use Symfony\Component\Validator\ConstraintViolationList;
use Symfony\Component\Validator\Validator\ValidatorInterface;

final class LeaderBoardServiceTest extends TestCase
{
    public function testCreationTrimsAndNormalizesNicknameAndReturnsRawTokenOnlyInResponse(): void
    {
        $persistedUser = null;
        $entityManager = $this->createMock(EntityManagerInterface::class);
        $entityManager->expects(self::once())
            ->method('persist')
            ->with(self::callback(static function (User $user) use (&$persistedUser): bool {
                $persistedUser = $user;

                return 'mixed player' === $user->getName();
            }));
        $entityManager->expects(self::once())->method('flush');
        $validator = $this->createMock(ValidatorInterface::class);
        $validator->expects(self::once())
            ->method('validate')
            ->with(self::callback(static fn (User $user): bool => 'mixed player' === $user->getName()))
            ->willReturn(new ConstraintViolationList());

        $service = new LeaderBoardService($entityManager, $this->createMock(UserRepository::class), $validator);
        $result = $service->create(['name' => '  MiXeD Player  ']);

        self::assertInstanceOf(User::class, $persistedUser);
        self::assertSame('mixed player', $result['name']);
        self::assertSame($persistedUser->getResponseToken(), $result['token']);
        self::assertSame(hash('sha256', (string) $result['token']), $persistedUser->getSessionTokenHash());
        self::assertNotSame($result['token'], $persistedUser->getSessionTokenHash());
    }

    public function testInvalidNicknameIsRejectedBeforePersistence(): void
    {
        $entityManager = $this->createMock(EntityManagerInterface::class);
        $entityManager->expects(self::never())->method('persist');
        $validator = $this->createMock(ValidatorInterface::class);
        $validator->method('validate')->willReturn(new ConstraintViolationList([
            new ConstraintViolation('This value should not be blank.', null, [], null, 'name', ''),
        ]));

        $service = new LeaderBoardService($entityManager, $this->createMock(UserRepository::class), $validator);

        try {
            $service->create(['name' => ' ']);
            self::fail('Blank nicknames must be rejected.');
        } catch (UnprocessableEntityHttpException $exception) {
            self::assertSame('This value should not be blank.', $exception->getMessage());
        }
    }

    public function testConcurrentDuplicateNicknameIsReturnedAsValidationError(): void
    {
        $entityManager = $this->createMock(EntityManagerInterface::class);
        $entityManager->expects(self::once())->method('persist');
        $entityManager->expects(self::once())
            ->method('flush')
            ->willThrowException($this->createMock(UniqueConstraintViolationException::class));
        $validator = $this->createMock(ValidatorInterface::class);
        $validator->method('validate')->willReturn(new ConstraintViolationList());

        $service = new LeaderBoardService($entityManager, $this->createMock(UserRepository::class), $validator);

        try {
            $service->create(['name' => 'player']);
            self::fail('A duplicate nickname must be rejected.');
        } catch (UnprocessableEntityHttpException $exception) {
            self::assertSame('This nickname is already taken.', $exception->getMessage());
        }
    }

    public function testSearchRejectsAnEmptyQueryWithoutCallingRepository(): void
    {
        $userRepository = $this->createMock(UserRepository::class);
        $userRepository->expects(self::never())->method('searchByNameOrderedByScore');
        $service = new LeaderBoardService(
            $this->createMock(EntityManagerInterface::class),
            $userRepository,
            $this->createMock(ValidatorInterface::class),
        );

        $this->expectException(BadRequestHttpException::class);
        $service->searchUsers('  ');
    }
}
