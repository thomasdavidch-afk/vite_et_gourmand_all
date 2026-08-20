<?php

namespace App\Entity;

use App\Repository\ImageRepository;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Serializer\Attribute\Groups;

#[ORM\Entity(repositoryClass: ImageRepository::class)]
#[ORM\Table(name: 'image')]
class Image
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(name: 'image_id', type: 'integer')]
    #[Groups(['menu:read'])]
    private ?int $imageId = null;

    #[ORM\Column(name: 'path', type: 'string', length: 255)]
    #[Groups(['menu:read'])]
    private ?string $path = null;

    #[ORM\ManyToOne(targetEntity: Menu::class, inversedBy: 'images')]
    #[ORM\JoinColumn(name: 'menu_id', referencedColumnName: 'menu_id', nullable: true, onDelete: 'CASCADE')]
    private ?Menu $menu = null;

    public function getImageId(): ?int { return $this->imageId; }

    public function getPath(): ?string { return $this->path; }
    public function setPath(string $path): self { $this->path = $path; return $this; }

    public function getMenu(): ?Menu { return $this->menu; }
    public function setMenu(?Menu $menu): self { $this->menu = $menu; return $this; }
}