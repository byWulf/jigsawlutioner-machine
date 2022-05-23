<?php

namespace App\Entity;

use App\Repository\PieceRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Serializer\Annotation\Groups;

#[ORM\Entity(repositoryClass: PieceRepository::class)]
class Piece
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: 'integer')]
    #[Groups('project')]
    private $id;

    #[ORM\Column(type: 'integer')]
    #[Groups('project')]
    private $pieceIndex;

    #[ORM\Column(type: 'json', nullable: true)]
    #[Groups('project')]
    private $data = [];

    #[ORM\ManyToOne(targetEntity: Project::class, inversedBy: 'pieces')]
    #[ORM\JoinColumn(nullable: false)]
    private $project;

    #[ORM\Column(type: 'integer', nullable: true)]
    #[Groups('project')]
    private $groupIndex;

    #[ORM\Column(type: 'integer', nullable: true)]
    #[Groups('project')]
    private $x;

    #[ORM\Column(type: 'integer', nullable: true)]
    #[Groups('project')]
    private $y;

    #[ORM\Column(type: 'integer', nullable: true)]
    #[Groups('project')]
    private $topSide;

    #[ORM\Column(type: 'json')]
    #[Groups('project')]
    private $images = [];

    #[ORM\Column(type: Types::INTEGER, nullable: true)]
    #[Groups('project')]
    private $box = null;

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

    public function getImages(): ?array
    {
        return $this->images;
    }

    public function setImages(array $images): self
    {
        $this->images = $images;

        return $this;
    }

    public function getBox(): ?int
    {
        return $this->box;
    }

    public function setBox(?int $box): self
    {
        $this->box = $box;

        return $this;
    }
}
