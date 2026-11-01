<?php

namespace App\Entity;

use App\Repository\RoomRepository;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Uid\Uuid;

#[ORM\Entity(repositoryClass: RoomRepository::class)]
class Room
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\Column(type: 'uuid')]
    private ?Uuid $roomUuid = null;

    #[ORM\Column]
    private ?\DateTimeImmutable $createdAt = null;

    #[ORM\Column]
    private ?\DateTimeImmutable $lastMoveAt = null;

    #[ORM\Column]
    private ?\DateTimeImmutable $expiresAt = null;

    /**
     * @var Collection<int, RoomParticipant>
     */
    #[ORM\OneToMany(targetEntity: RoomParticipant::class, mappedBy: 'Room')]
    private Collection $roomParticipants;

    public function __construct()
    {
        $this->roomParticipants = new ArrayCollection();
    }

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getRoomUuid(): ?Uuid
    {
        return $this->roomUuid;
    }

    public function setRoomUuid(Uuid $roomUuid): static
    {
        $this->roomUuid = $roomUuid;

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

    public function removeRoomParticipant(RoomParticipant $roomParticipant): static
    {
        if ($this->roomParticipants->removeElement($roomParticipant)) {
            // set the owning side to null (unless already changed)
            if ($roomParticipant->getRoom() === $this) {
                $roomParticipant->setRoom(null);
            }
        }

        return $this;
    }
}
