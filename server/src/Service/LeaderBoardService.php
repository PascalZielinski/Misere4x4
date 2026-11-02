<?php

namespace App\Service;

// #region Imports
// MARK: - Imports
use App\Entity\User;
use App\Repository\UserRepository;
use Doctrine\DBAL\Exception\UniqueConstraintViolationException;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\HttpKernel\Exception\BadRequestHttpException;
use Symfony\Component\HttpKernel\Exception\UnprocessableEntityHttpException;
use Symfony\Component\Validator\Validator\ValidatorInterface;

// #endregion

final readonly class LeaderBoardService
{
    // #region Validation configuration
    // MARK: - Validation configuration
    // Nur mockup kein gibt kein echten wirklichen grund hier mit irgenwelchen packages api oder sonst was zu arbeiten
    private const BAD_WORDS = ['badword1', 'badword2', 'badword3'];
    private const LEET = ['0' => 'o', '1' => 'i', '3' => 'e', '4' => 'a', '5' => 's', '@' => 'a', '$' => 's'];
    // #endregion

    // #region Dependencies
    // MARK: - Dependencies
    public function __construct(
        private EntityManagerInterface $entityManager,
        private UserRepository $userRepository,
        private ValidatorInterface $validator,
    ) {
    }
    // #endregion

    // #region User creation
    // MARK: - User creation
    /**
     * @param array<string, mixed> $data
     *
     * @return array<string, mixed>
     */
    public function create(array $data): array
    {
        $user = (new User())->setName(mb_strtolower(trim((string) ($data['name'] ?? ''))));

        $this->validateName($user);

        $this->entityManager->persist($user);
        try {
            $this->entityManager->flush();
        } catch (UniqueConstraintViolationException $exception) {
            throw new UnprocessableEntityHttpException('This nickname is already taken.', $exception);
        }

        return $this->userData($user);
    }
    // #endregion

    // #region Name validation
    // MARK: - Name validation
    private function validateName(User $user): void
    {
        $text = strtr((string) $user->getName(), ['ä' => 'a', 'ö' => 'o', 'ü' => 'u', 'ß' => 'ss']);
        $text = strtr($text, self::LEET);
        $text = preg_replace('/(.)\1{2,}/u', '$1', $text) ?? $text;

        foreach (preg_split('/[^a-z]+/', $text, -1, PREG_SPLIT_NO_EMPTY) ?: [] as $word) {
            if (in_array($word, self::BAD_WORDS, true)) {
                throw new UnprocessableEntityHttpException('This nickname is not allowed.');
            }
        }

        $violations = $this->validator->validate($user);
        if (count($violations) > 0) {
            throw new UnprocessableEntityHttpException((string) $violations->get(0)->getMessage());
        }
    }
    // #endregion

    // #region User queries
    // MARK: - User queries
    /**
     * @return array<array-key, array{name: string|null, score: int, createdAt: string|null, active: bool}>
     */
    public function listUsers(): array
    {
        return $this->formatUsers($this->userRepository->findAllOrderedByScore());
    }

    /**
     * @return array<array-key, array{name: string|null, score: int, createdAt: string|null, active: bool}>
     */
    public function searchUsers(string $name): array
    {
        $name = trim($name);
        if ('' === $name) {
            throw new BadRequestHttpException('A name is required to search users.');
        }

        return $this->formatUsers($this->userRepository->searchByNameOrderedByScore($name));
    }
    // #endregion

    // #region Response formatting
    // MARK: - Response formatting
    /**
     * @param array<User> $users
     *
     * @return array<array-key, array{name: string|null, score: int, createdAt: string|null, active: bool}>
     */
    private function formatUsers(array $users): array
    {
        return array_map(
            fn (User $user): array => [
                'name' => $user->getName(),
                'score' => $user->getScore(),
                'createdAt' => $user->getCreatedAt()?->format(\DateTimeInterface::ATOM),
                'active' => $user->isActive(),
            ],
            $users,
        );
    }

    /**
     * @return array{id: int|null, name: string|null, token: string|null, score: int, lastSeenAt: string|null}
     */
    private function userData(User $user): array
    {
        return [
            'id' => $user->getId(),
            'name' => $user->getName(),
            'token' => $user->getResponseToken(),
            'score' => $user->getScore(),
            'lastSeenAt' => $user->getLastSeenAt()?->format('d.m.Y H:i:s'),
        ];
    }
    // #endregion
}
