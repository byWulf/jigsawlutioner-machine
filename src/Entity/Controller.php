<?php

namespace App\Entity;

use App\Repository\ControllerRepository;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: ControllerRepository::class)]
class Controller
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: 'integer')]
    private $id;

    #[ORM\Column(type: 'string', length: 255)]
    private $name;

    #[ORM\Column(type: 'string', length: 255)]
    private $baseUri;

    #[ORM\Column(type: 'json')]
    private $parameters = [];

    private bool $up = false;

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

    public function getBaseUri(): ?string
    {
        return $this->baseUri;
    }

    public function setBaseUri(string $baseUri): self
    {
        $this->baseUri = $baseUri;

        return $this;
    }

    public function getParameters(): ?array
    {
        return $this->parameters;
    }

    public function setParameters(array $parameters): self
    {
        $this->parameters = $parameters;

        return $this;
    }

    public function isUp(): bool
    {
        return $this->up;
    }

    public function setUp(bool $up): Controller
    {
        $this->up = $up;
        return $this;
    }
}
