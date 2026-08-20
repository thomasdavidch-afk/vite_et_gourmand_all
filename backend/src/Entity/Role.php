<?php

namespace App\Entity;

use App\Repository\RoleRepository;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: RoleRepository::class)]
#[ORM\Table(name: 'role')]
class Role
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(name: 'role_id', type: 'integer')]
    private ?int $roleId = null;

    #[ORM\Column(name: 'libelle', type: 'string', length: 50, nullable: true)]
    private ?string $libelle = null;

    #[ORM\ManyToMany(targetEntity: Utilisateur::class, mappedBy: 'roleEntities')]
    private Collection $utilisateurs;

    public function __construct()
    {
        $this->utilisateurs = new ArrayCollection();
    }

    public function getRoleId(): ?int { return $this->roleId; }

    public function getLibelle(): ?string { return $this->libelle; }
    public function setLibelle(?string $libelle): self { $this->libelle = $libelle; return $this; }

    public function getUtilisateurs(): Collection { return $this->utilisateurs; }
    public function addUtilisateur(Utilisateur $utilisateur): self { if (!$this->utilisateurs->contains($utilisateur)) { $this->utilisateurs[] = $utilisateur; } return $this; }
    public function removeUtilisateur(Utilisateur $utilisateur): self { $this->utilisateurs->removeElement($utilisateur); return $this; }
}
