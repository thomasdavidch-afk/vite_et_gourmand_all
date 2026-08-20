<?php

namespace App\Entity;

use App\Repository\ThemeRepository;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: ThemeRepository::class)]
#[ORM\Table(name: 'theme')]
class Theme
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(name: 'theme_id', type: 'integer')]
    private ?int $themeId = null;

    #[ORM\Column(name: 'libelle', type: 'string', length: 50, nullable: true)]
    private ?string $libelle = null;

    #[ORM\ManyToMany(targetEntity: Menu::class, mappedBy: 'themes')]
    private Collection $menus;

    public function __construct()
    {
        $this->menus = new ArrayCollection();
    }

    public function getThemeId(): ?int { return $this->themeId; }

    public function getLibelle(): ?string { return $this->libelle; }
    public function setLibelle(?string $libelle): self { $this->libelle = $libelle; return $this; }

    public function getMenus(): Collection { return $this->menus; }
    public function addMenu(Menu $menu): self { if (!$this->menus->contains($menu)) { $this->menus[] = $menu; } return $this; }
    public function removeMenu(Menu $menu): self { $this->menus->removeElement($menu); return $this; }
}
