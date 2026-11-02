<?php

namespace App\Entity;

use App\Repository\RoomRepository;
use App\Service\MisereGameLogic;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Uid\Uuid;

/**
 * @phpstan-import-type GameState from MisereGameLogic
 */
#[ORM\Table(
    indexes: [
        new ORM\Index(name: 'IDX_ROOM_EXPIRES_AT', columns: ['expires_at']),
    ],
    uniqueConstraints: [
        new ORM\UniqueConstraint(name: 'UNIQ_ROOM_CODE', columns: ['room_code']),
    ],
)]
#[ORM\Entity(repositoryClass: RoomRepository::class)]
class Room
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\Column]
    private ?int $roomCode = null;

    #[ORM\Column(length: 36, unique: true)]
    private string $roomUuid;

    #[ORM\Column(options: ['default' => false])]
    private bool $matchmade = false;

    #[ORM\Column]
    private ?\DateTimeImmutable $createdAt = null;

    #[ORM\Column]
    private ?\DateTimeImmutable $lastMoveAt = null;

    #[ORM\Column]
    private ?\DateTimeImmutable $expiresAt = null;

    /** @var GameState */
    #[ORM\Column(type: 'json')]
    private array $gameState = [
        'round' => 1,
        'status' => 'waiting',
        'firstPlayer' => null,
        'turn' => null,
        'board' => [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null],
        'moves' => [],
        'result' => ['status' => 'waiting'],
    ];

    /**
     * @var Collection<int, RoomParticipant>
     */
    #[ORM\OneToMany(targetEntity: RoomParticipant::class, mappedBy: 'room', cascade: ['remove'], orphanRemoval: true)]
    private Collection $roomParticipants;

    public function __construct()
    {
        $this->roomParticipants = new ArrayCollection();
        $this->roomUuid = Uuid::v4()->toRfc4122();
    }

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getRoomCode(): ?int
    {
        return $this->roomCode;
    }

    public function getRoomUuid(): string
    {
        return $this->roomUuid;
    }

    public function isMatchmade(): bool
    {
        return $this->matchmade;
    }

    public function setMatchmade(bool $matchmade): static
    {
        $this->matchmade = $matchmade;

        return $this;
    }

    public function setRoomCode(int $roomCode): static
    {
        $this->roomCode = $roomCode;

        return $this;
    }

    public function getCreatedAt(): ?\DateTimeImmutable
    {
        return $this->createdAt;
    }

    public function setCreatedAt(\DateTimeImmutable $createdAt): static
    {
        $this->createdAt = $createdAt;

        return $this;
    }

    public function getLastMoveAt(): ?\DateTimeImmutable
    {
        return $this->lastMoveAt;
    }

    public function setLastMoveAt(\DateTimeImmutable $lastMoveAt): static
    {
        $this->lastMoveAt = $lastMoveAt;

        return $this;
    }

    public function getExpiresAt(): ?\DateTimeImmutable
    {
        return $this->expiresAt;
    }

    public function setExpiresAt(\DateTimeImmutable $expiresAt): static
    {
        $this->expiresAt = $expiresAt;

        return $this;
    }

    /** @return GameState */
    public function getGameState(): array
    {
        return $this->gameState;
    }

    /** @param GameState $gameState */
    public function setGameState(array $gameState): static
    {
        $this->gameState = $gameState;

        return $this;
    }

    /**
     * @return Collection<int, RoomParticipant>
     */
    public function getRoomParticipants(): Collection
    {
        return $this->roomParticipants;
    }

    public function addRoomParticipant(RoomParticipant $roomParticipant): static
    {
        if (!$this->roomParticipants->contains($roomParticipant)) {
            $this->roomParticipants->add($roomParticipant);
            $roomParticipant->setRoom($this);
        }

        return $this;
    }
}
