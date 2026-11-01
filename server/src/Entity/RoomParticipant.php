<?php

namespace App\Entity;

use App\Repository\RoomParticipantRepository;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Table(
    uniqueConstraints: [
        new ORM\UniqueConstraint(name: 'UNIQ_ROOM_PARTICIPANT_SIDE', columns: ['room_id', 'side']),
        new ORM\UniqueConstraint(name: 'UNIQ_ROOM_PARTICIPANT_USER', columns: ['room_id', 'name_id']),
    ],
)]
#[ORM\Entity(repositoryClass: RoomParticipantRepository::class)]
class RoomParticipant
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\ManyToOne(inversedBy: 'roomParticipants')]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private ?Room $room = null;

    #[ORM\ManyToOne]
    #[ORM\JoinColumn(name: 'name_id', nullable: false, onDelete: 'CASCADE')]
    private ?User $user = null;

    #[ORM\Column(length: 1)]
    private string $side = 'A';

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getRoom(): ?Room
    {
        return $this->room;
    }

    public function setRoom(Room $Room): static
    {
        $this->room = $Room;

        return $this;
    }

    public function getUser(): ?User
    {
        return $this->user;
    }

    public function setUser(?User $user): static
    {
        $this->user = $user;

        return $this;
    }

    public function getSide(): string
    {
        return $this->side;
    }

    public function setSide(string $side): static
    {
        $this->side = $side;

        return $this;
    }
}
