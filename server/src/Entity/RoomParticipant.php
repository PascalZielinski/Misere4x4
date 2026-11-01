<?php

namespace App\Entity;

use App\Repository\RoomParticipantRepository;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: RoomParticipantRepository::class)]
class RoomParticipant
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\ManyToOne(inversedBy: 'roomParticipants')]
    private ?Room $Room = null;

    #[ORM\OneToOne(cascade: ['persist', 'remove'])]
    private ?User $name = null;

    #[ORM\Column]
    private ?int $PrivateRoomId = null;

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getRoom(): ?Room
    {
        return $this->Room;
    }

    public function setRoom(?Room $Room): static
    {
        $this->Room = $Room;

        return $this;
    }

    public function getName(): ?User
    {
        return $this->name;
    }

    public function setName(?User $name): static
    {
        $this->name = $name;

        return $this;
    }

    public function getPrivateRoomId(): ?int
    {
        return $this->PrivateRoomId;
    }

    public function setPrivateRoomId(int $PrivateRoomId): static
    {
        $this->PrivateRoomId = $PrivateRoomId;

        return $this;
    }
}
