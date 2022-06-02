<?php

namespace App\Entity;

use App\Repository\ProjectRepository;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Serializer\Annotation\Groups;

#[ORM\Entity(repositoryClass: ProjectRepository::class)]
class Project
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: 'integer')]
    #[Groups('project')]
    private $id;

    #[ORM\Column(type: 'string', length: 255)]
    #[Groups('project')]
    private $name;

    #[ORM\OneToMany(mappedBy: 'project', targetEntity: Piece::class, orphanRemoval: true)]
    #[Groups('project')]
    private $pieces;

    #[ORM\Column(type: 'boolean')]
    #[Groups('project')]
    private $solved = false;

    #[ORM\Column(type: 'text', nullable: true)]
    #[Groups('project')]
    private $solvingStatus;

    #[ORM\Column(type: 'integer')]
    #[Groups('project')]
    private $solvedGroups = 0;

    #[ORM\Column(type: 'integer')]
    #[Groups('project')]
    private $biggestGroup = 0;

    public function __construct()
    {
        $this->pieces = new ArrayCollection();
    }

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getName(): ?string
    {
        return $this->name;
    }

    public function setName(string $name): self
    {
        $this->name = $name;

        return $this;
    }

    /**
     * @return Collection<int, Piece>
     */
    public function getPieces(): Collection
    {
        return $this->pieces;
    }

    public function addPiece(Piece $piece): self
    {
        if (!$this->pieces->contains($piece)) {
            $this->pieces[] = $piece;
            $piece->setProject($this);
        }

        return $this;
    }

    public function removePiece(Piece $piece): self
    {
        if ($this->pieces->removeElement($piece)) {
            // set the owning side to null (unless already changed)
            if ($piece->getProject() === $this) {
                $piece->setProject(null);
            }
        }

        return $this;
    }

    public function isSolved(): bool
    {
        return $this->solved;
    }

    public function setSolved(bool $solved): Project
    {
        $this->solved = $solved;
        return $this;
    }

    public function getSolvingStatus(): ?string
    {
        return $this->solvingStatus;
    }

    public function setSolvingStatus(?string $solvingStatus): Project
    {
        $this->solvingStatus = $solvingStatus;
        return $this;
    }

    public function getSolvedGroups(): int
    {
        return $this->solvedGroups;
    }

    public function setSolvedGroups(int $solvedGroups): self
    {
        $this->solvedGroups = $solvedGroups;
        return $this;
    }

    public function getBiggestGroup(): int
    {
        return $this->biggestGroup;
    }

    public function setBiggestGroup(int $biggestGroup): self
    {
        $this->biggestGroup = $biggestGroup;
        return $this;
    }
}
