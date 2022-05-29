<?php

namespace App\Entity;

use App\Repository\ControllerRepository;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\ORM\Mapping as ORM;
use Stringable;
use Symfony\Component\Serializer\Annotation\Groups;

#[ORM\Entity(repositoryClass: ControllerRepository::class)]
class Controller implements Stringable
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: 'integer')]
    #[Groups(['controller', 'setup'])]
    private $id;

    #[ORM\Column(type: 'string', length: 255)]
    #[Groups(['controller', 'setup'])]
    private $name;

    #[ORM\Column(type: 'string', length: 255)]
    private $baseUri;

    #[ORM\Column(type: 'json')]
    #[Groups(['controller', 'setup'])]
    private $parameters = [];

    private bool $up = false;

    #[ORM\OneToMany(mappedBy: 'controller', targetEntity: Station::class, orphanRemoval: true)]
    private $stations;

    public function __construct()
    {
        $this->stations = new ArrayCollection();
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
        $this->parameters = array_values($parameters);

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

    /**
     * @return Collection<int, Station>
     */
    public function getStations(): Collection
    {
        return $this->stations;
    }

    public function addStation(Station $station): self
    {
        if (!$this->stations->contains($station)) {
            $this->stations[] = $station;
            $station->setController($this);
        }

        return $this;
    }

    public function removeStation(Station $station): self
    {
        if ($this->stations->removeElement($station)) {
            // set the owning side to null (unless already changed)
            if ($station->getController() === $this) {
                $station->setController(null);
            }
        }

        return $this;
    }

    public function __toString(): string
    {
        return $this->getName();
    }
}
