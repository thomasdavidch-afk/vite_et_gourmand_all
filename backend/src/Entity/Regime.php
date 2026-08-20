<?php

namespace App\Entity;

use App\Repository\RegimeRepository;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: RegimeRepository::class)]
#[ORM\Table(name: 'regime')]
class Regime
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(name: 'regime_id', type: 'integer')]
    private ?int $regimeId = null;

    #[ORM\Column(name: 'libelle', type: 'string', length: 50, nullable: true)]
    private ?string $libelle = null;

    #[ORM\ManyToMany(targetEntity: Menu::class, mappedBy: 'regimes')]
    private Collection $menus;

    public function __construct()
    {
        $this->menus = new ArrayCollection();
    }

    public function getRegimeId(): ?int { return $this->regimeId; }

    public function getLibelle(): ?string { return $this->libelle; }
    public function setLibelle(?string $libelle): self { $this->libelle = $libelle; return $this; }

    public function getMenus(): Collection { return $this->menus; }
    public function addMenu(Menu $menu): self { if (!$this->menus->contains($menu)) { $this->menus[] = $menu; } return $this; }
    public function removeMenu(Menu $menu): self { $this->menus->removeElement($menu); return $this; }
}
