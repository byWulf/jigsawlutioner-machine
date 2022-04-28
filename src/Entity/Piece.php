<?php

namespace App\Entity;

use App\Repository\PieceRepository;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: PieceRepository::class)]
class Piece
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: 'integer')]
    private $id;

    #[ORM\Column(type: 'integer')]
    private $pieceIndex;

    #[ORM\Column(type: 'json', nullable: true)]
    private $data = [];

    #[ORM\ManyToOne(targetEntity: Project::class, inversedBy: 'pieces')]
    #[ORM\JoinColumn(nullable: false)]
    private $project;

    #[ORM\Column(type: 'integer', nullable: true)]
    private $groupIndex;

    #[ORM\Column(type: 'integer', nullable: true)]
    private $x;

    #[ORM\Column(type: 'integer', nullable: true)]
    private $y;

    #[ORM\Column(type: 'integer', nullable: true)]
    private $topSide;

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getPieceIndex(): ?int
    {
        return $this->pieceIndex;
    }

    public function setPieceIndex(int $pieceIndex): self
    {
        $this->pieceIndex = $pieceIndex;

        return $this;
    }

    public function getData(): ?array
    {
        return $this->data;
    }

    public function setData(?array $data): self
    {
        $this->data = $data;

        return $this;
    }

    public function getProject(): ?Project
    {
        return $this->project;
    }

    public function setProject(?Project $project): self
    {
        $this->project = $project;

        return $this;
    }

    public function getGroupIndex(): ?int
    {
        return $this->groupIndex;
    }

    public function setGroupIndex(?int $groupIndex): self
    {
        $this->groupIndex = $groupIndex;

        return $this;
    }

    public function getX(): ?int
    {
        return $this->x;
    }

    public function setX(?int $x): self
    {
        $this->x = $x;

        return $this;
    }

    public function getY(): ?int
    {
        return $this->y;
    }

    public function setY(?int $y): self
    {
        $this->y = $y;

        return $this;
    }

    public function getTopSide(): ?int
    {
        return $this->topSide;
    }

    public function setTopSide(?int $topSide): self
    {
        $this->topSide = $topSide;

        return $this;
    }
}
