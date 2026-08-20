<?php

namespace App\Entity;

use App\Repository\MenuRepository;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Serializer\Attribute\Groups;

#[ORM\Entity(repositoryClass: MenuRepository::class)]
#[ORM\Table(name: 'menu')]
class Menu
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(name: 'menu_id', type: 'integer')]
    #[Groups(['menu:read', 'commande:read'])]
    private ?int $menuId = null;

    #[ORM\Column(name: 'titre', type: 'string', length: 150)]
    #[Groups(['menu:read', 'menu:write', 'commande:read'])]
    private ?string $titre = null;

    #[ORM\Column(name: 'nombre_personne_minimum', type: 'integer')]
    #[Groups(['menu:read', 'menu:write'])]
    private ?int $nombrePersonneMinimum = null;

    #[ORM\Column(name: 'prix_par_personne', type: 'decimal', precision: 10, scale: 2)]
    #[Groups(['menu:read', 'menu:write', 'commande:read'])]
    private ?string $prixParPersonne = null;

    #[ORM\Column(name: 'description', type: Types::TEXT, nullable: true)]
    #[Groups(['menu:read', 'menu:write'])]
    private ?string $description = null;

    #[ORM\Column(name: 'quantite_restante', type: 'integer', nullable: true)]
    #[Groups(['menu:read', 'menu:write'])]
    private ?int $quantiteRestante = null;

    #[ORM\ManyToMany(targetEntity: Regime::class, inversedBy: 'menus')]
    #[ORM\JoinTable(
        name: 'adapte',
        joinColumns: [new ORM\JoinColumn(name: 'menu_id', referencedColumnName: 'menu_id')],
        inverseJoinColumns: [new ORM\JoinColumn(name: 'regime_id', referencedColumnName: 'regime_id')]
    )]
    #[Groups(['menu:read', 'menu:write'])]
    private Collection $regimes;

    #[ORM\ManyToMany(targetEntity: Theme::class, inversedBy: 'menus')]
    #[ORM\JoinTable(
        name: 'propose',
        joinColumns: [new ORM\JoinColumn(name: 'menu_id', referencedColumnName: 'menu_id')],
        inverseJoinColumns: [new ORM\JoinColumn(name: 'theme_id', referencedColumnName: 'theme_id')]
    )]
    #[Groups(['menu:read', 'menu:write'])]
    private Collection $themes;

    #[ORM\ManyToMany(targetEntity: Plat::class, inversedBy: 'menus')]
    #[ORM\JoinTable(
        name: 'propose_plat',
        joinColumns: [new ORM\JoinColumn(name: 'menu_id', referencedColumnName: 'menu_id')],
        inverseJoinColumns: [new ORM\JoinColumn(name: 'plat_id', referencedColumnName: 'plat_id')]
    )]
    #[Groups(['menu:read', 'menu:write'])]
    private Collection $plats;

    #[ORM\OneToMany(mappedBy: 'menu', targetEntity: Image::class, cascade: ['persist', 'remove'])]
    #[Groups(['menu:read', 'menu:write'])]
    private Collection $images;

    public function __construct()
    {
        $this->regimes = new ArrayCollection();
        $this->themes = new ArrayCollection();
        $this->plats = new ArrayCollection();
        $this->images = new ArrayCollection();
    }

    public function getMenuId(): ?int
    {
        return $this->menuId;
    }

    public function getTitre(): ?string
    {
        return $this->titre;
    }

    public function setTitre(string $titre): self
    {
        $this->titre = $titre;
        return $this;
    }

    public function getNombrePersonneMinimum(): ?int
    {
        return $this->nombrePersonneMinimum;
    }

    public function setNombrePersonneMinimum(int $n): self
    {
        $this->nombrePersonneMinimum = $n;
        return $this;
    }

    public function getPrixParPersonne(): ?string
    {
        return $this->prixParPersonne;
    }

    public function setPrixParPersonne(string $p): self
    {
        $this->prixParPersonne = $p;
        return $this;
    }

    public function getDescription(): ?string
    {
        return $this->description;
    }

    public function setDescription(?string $description): self
    {
        $this->description = $description;
        return $this;
    }

    public function getQuantiteRestante(): ?int
    {
        return $this->quantiteRestante;
    }

    public function setQuantiteRestante(?int $q): self
    {
        $this->quantiteRestante = $q;
        return $this;
    }

    /**
     * @return Collection<int, Regime>
     */
    public function getRegimes(): Collection
    {
        return $this->regimes;
    }

    public function addRegime(Regime $regime): self
    {
        if (!$this->regimes->contains($regime)) {
            $this->regimes->add($regime);
        }
        return $this;
    }

    public function removeRegime(Regime $regime): self
    {
        $this->regimes->removeElement($regime);
        return $this;
    }

    /**
     * @return Collection<int, Theme>
     */
    public function getThemes(): Collection
    {
        return $this->themes;
    }

    public function addTheme(Theme $theme): self
    {
        if (!$this->themes->contains($theme)) {
            $this->themes->add($theme);
        }
        return $this;
    }

    public function removeTheme(Theme $theme): self
    {
        $this->themes->removeElement($theme);
        return $this;
    }

    /**
     * @return Collection<int, Plat>
     */
    public function getPlats(): Collection
    {
        return $this->plats;
    }

    public function addPlat(Plat $plat): self
    {
        if (!$this->plats->contains($plat)) {
            $this->plats->add($plat);
        }
        return $this;
    }

    public function removePlat(Plat $plat): self
    {
        $this->plats->removeElement($plat);
        return $this;
    }

    /**
     * @return Collection<int, Image>
     */
    public function getImages(): Collection
    {
        return $this->images;
    }

    public function addImage(Image $image): self
    {
        if (!$this->images->contains($image)) {
            $this->images->add($image);
            $image->setMenu($this);
        }
        return $this;
    }

    public function removeImage(Image $image): self
    {
        if ($this->images->removeElement($image)) {
            if ($image->getMenu() === $this) {
                $image->setMenu(null);
            }
        }
        return $this;
    }
}