<?php

namespace App\Entity;

use App\Repository\AllergeneRepository;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: AllergeneRepository::class)]
#[ORM\Table(name: 'allergene')]
class Allergene
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(name: 'allergene_id', type: 'integer')]
    private ?int $allergeneId = null;

    #[ORM\Column(name: 'libelle', type: 'string', length: 50, nullable: true)]
    private ?string $libelle = null;

    #[ORM\ManyToMany(targetEntity: Plat::class, mappedBy: 'allergenes')]
    private Collection $plats;

    public function __construct()
    {
        $this->plats = new ArrayCollection();
    }

    public function getAllergeneId(): ?int { return $this->allergeneId; }

    public function getLibelle(): ?string { return $this->libelle; }
    public function setLibelle(?string $libelle): self { $this->libelle = $libelle; return $this; }

    public function getPlats(): Collection { return $this->plats; }
    public function addPlat(Plat $plat): self { if (!$this->plats->contains($plat)) { $this->plats[] = $plat; } return $this; }
    public function removePlat(Plat $plat): self { $this->plats->removeElement($plat); return $this; }
}
