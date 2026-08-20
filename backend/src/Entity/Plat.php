<?php

namespace App\Entity;

use App\Repository\PlatRepository;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Serializer\Attribute\Groups;

#[ORM\Entity(repositoryClass: PlatRepository::class)]
#[ORM\Table(name: 'plat')]
class Plat
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(name: 'plat_id', type: 'integer')]
    #[Groups(['menu:read', 'plat:read'])]
    private ?int $platId = null;

    #[ORM\Column(name: 'titre_plat', type: 'string', length: 50, nullable: true)]
    #[Groups(['menu:read', 'plat:read', 'plat:write'])]
    private ?string $titrePlat = null;

    #[ORM\Column(name: 'type', type: 'string', length: 50, nullable: true)]
    #[Groups(['menu:read', 'plat:read', 'plat:write'])]
    private ?string $type = null;

    #[ORM\Column(name: 'photo', type: 'string', length: 255, nullable: true)]
    #[Groups(['menu:read', 'plat:read', 'plat:write'])]
    private ?string $photo = null;

    #[ORM\ManyToMany(targetEntity: Allergene::class, inversedBy: 'plats')]
    #[ORM\JoinTable(
        name: 'contient',
        joinColumns: [new ORM\JoinColumn(name: 'plat_id', referencedColumnName: 'plat_id')],
        inverseJoinColumns: [new ORM\JoinColumn(name: 'allergene_id', referencedColumnName: 'allergene_id')]
    )]
    #[Groups(['menu:read', 'plat:read', 'plat:write'])]
    private Collection $allergenes;

    #[ORM\ManyToMany(targetEntity: Menu::class, mappedBy: 'plats')]
    private Collection $menus;

    public function __construct()
    {
        $this->allergenes = new ArrayCollection();
        $this->menus = new ArrayCollection();
    }

    public function getPlatId(): ?int
    {
        return $this->platId;
    }

    public function getTitrePlat(): ?string
    {
        return $this->titrePlat;
    }

    public function setTitrePlat(?string $titrePlat): self
    {
        $this->titrePlat = $titrePlat;
        return $this;
    }

    public function getType(): ?string
    {
        return $this->type;
    }

    public function setType(?string $type): self
    {
        $this->type = $type;
        return $this;
    }

    public function getPhoto(): ?string
    {
        return $this->photo;
    }

    public function setPhoto(?string $photo): self
    {
        $this->photo = $photo;
        return $this;
    }

    public function getAllergenes(): Collection
    {
        return $this->allergenes;
    }

    public function addAllergene(Allergene $allergene): self
    {
        if (!$this->allergenes->contains($allergene)) {
            $this->allergenes->add($allergene);
        }
        return $this;
    }

    public function removeAllergene(Allergene $allergene): self
    {
        $this->allergenes->removeElement($allergene);
        return $this;
    }

    public function getMenus(): Collection
    {
        return $this->menus;
    }

    public function addMenu(Menu $menu): self
    {
        if (!$this->menus->contains($menu)) {
            $this->menus->add($menu);
            $menu->addPlat($this); // Maintient la relation côté propriétaire
        }
        return $this;
    }

    public function removeMenu(Menu $menu): self
    {
        if ($this->menus->removeElement($menu)) {
            $menu->removePlat($this); // Maintient la relation côté propriétaire
        }
        return $this;
    }
}