<?php

declare(strict_types=1);

namespace App\Entity;

use App\Repository\QueueEntryRepository;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: QueueEntryRepository::class)]
#[ORM\Table(
    name: 'online_queue',
    indexes: [
        new ORM\Index(name: 'IDX_ONLINE_QUEUE_WAITING', columns: ['room_id', 'created_at']),
    ],
    uniqueConstraints: [
        new ORM\UniqueConstraint(name: 'UNIQ_ONLINE_QUEUE_USER', columns: ['user_id']),
    ],
)]
class QueueEntry
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\OneToOne]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private ?User $user = null;

    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: true, onDelete: 'SET NULL')]
    private ?Room $room = null;

    #[ORM\Column]
    private \DateTimeImmutable $createdAt;

    public function __construct(User $user, \DateTimeImmutable $createdAt)
    {
        $this->user = $user;
        $this->createdAt = $createdAt;
    }

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getUser(): ?User
    {
        return $this->user;
    }

    public function getRoom(): ?Room
    {
        return $this->room;
    }

    public function setRoom(?Room $room): static
    {
        $this->room = $room;

        return $this;
    }

    public function getCreatedAt(): \DateTimeImmutable
    {
        return $this->createdAt;
    }

    public function setCreatedAt(\DateTimeImmutable $createdAt): static
    {
        $this->createdAt = $createdAt;

        return $this;
    }
}
