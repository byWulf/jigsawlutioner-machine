<?php

namespace App\Entity;

use App\Repository\StationRepository;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Serializer\Annotation\Groups;

#[ORM\Entity(repositoryClass: StationRepository::class)]
class Station
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: 'integer')]
    #[Groups('setup')]
    private $id;

    #[ORM\ManyToOne(targetEntity: Setup::class, inversedBy: 'stations')]
    #[ORM\JoinColumn(nullable: false)]
    private $setup;

    #[ORM\ManyToOne(targetEntity: Controller::class, inversedBy: 'stations')]
    #[ORM\JoinColumn]
    #[Groups('setup')]
    private $controller;

    #[ORM\Column(type: 'integer')]
    #[Groups('setup')]
    private $position;

    #[ORM\Column(type: 'string', length: 255)]
    #[Groups('setup')]
    private $strategy;

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getSetup(): ?Setup
    {
        return $this->setup;
    }

    public function setSetup(?Setup $setup): self
    {
        $this->setup = $setup;

        return $this;
    }

    public function getController(): ?Controller
    {
        return $this->controller;
    }

    public function setController(?Controller $controller): self
    {
        $this->controller = $controller;

        return $this;
    }

    public function getPosition(): ?int
    {
        return $this->position;
    }

    public function setPosition(int $position): self
    {
        $this->position = $position;

        return $this;
    }

    public function getStrategy(): ?string
    {
        return $this->strategy;
    }

    public function setStrategy(string $strategy): self
    {
        $this->strategy = $strategy;

        return $this;
    }
}
