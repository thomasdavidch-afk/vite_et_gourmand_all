<?php

namespace App\Entity;

use App\Repository\UtilisateurRepository;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Security\Core\User\UserInterface;
use Symfony\Component\Security\Core\User\PasswordAuthenticatedUserInterface;
use Symfony\Component\Serializer\Attribute\Groups;

#[ORM\Entity(repositoryClass: UtilisateurRepository::class)]
#[ORM\Table(name: 'utilisateur')]
class Utilisateur implements UserInterface, PasswordAuthenticatedUserInterface
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(name: 'utilisateur_id', type: 'integer')]
    #[Groups(['utilisateur:read'])]
    private ?int $utilisateurId = null;

    #[ORM\Column(name: 'email', type: 'string', length: 180, unique: true)]
    #[Groups(['utilisateur:read', 'utilisateur:write'])]
    private ?string $email = null;

    #[ORM\Column(name: 'password', type: 'string', length: 255)]
    #[Groups(['utilisateur:write'])]
    private ?string $password = null;

    #[ORM\Column(name: 'nom', type: 'string', length: 50, nullable: true)]
    #[Groups(['utilisateur:read', 'utilisateur:write'])]
    private ?string $nom = null;

    #[ORM\Column(name: 'prenom', type: 'string', length: 50, nullable: true)]
    #[Groups(['utilisateur:read', 'utilisateur:write'])]
    private ?string $prenom = null;

    #[ORM\Column(name: 'telephone', type: 'string', length: 20, nullable: true)]
    #[Groups(['utilisateur:read', 'utilisateur:write'])]
    private ?string $telephone = null;

    #[ORM\Column(name: 'adresse_postale', type: 'string', length: 255, nullable: true)]
    #[Groups(['utilisateur:read', 'utilisateur:write'])]
    private ?string $adressePostale = null;

    #[ORM\Column(name: 'ville', type: 'string', length: 50, nullable: true)]
    #[Groups(['utilisateur:read', 'utilisateur:write'])]
    private ?string $ville = null;

    #[ORM\Column(name: 'code_postal', type: 'string', length: 10, nullable: true)]
    #[Groups(['utilisateur:read', 'utilisateur:write'])]
    private ?string $codePostal = null;

    #[ORM\Column(name: 'api_token', type: 'string', length: 255, unique: true, nullable: true)]
    #[Groups(['utilisateur:read'])]
    private ?string $apiToken = null;

    // Permet de désactiver le compte d'un employé qui quitte l'entreprise
    #[ORM\Column(name: 'is_active', type: 'boolean', options: ['default' => true])]
    #[Groups(['utilisateur:read', 'utilisateur:write'])]
    private bool $isActive = true;

    #[ORM\ManyToMany(targetEntity: Role::class, inversedBy: 'utilisateurs')]
    #[ORM\JoinTable(
        name: 'possede',
        joinColumns: [new ORM\JoinColumn(name: 'utilisateur_id', referencedColumnName: 'utilisateur_id')],
        inverseJoinColumns: [new ORM\JoinColumn(name: 'role_id', referencedColumnName: 'role_id')]
    )]
    #[Groups(['utilisateur:read'])]
    private Collection $roleEntities;

    // Un utilisateur peut publier plusieurs avis (OneToMany)
    #[ORM\OneToMany(mappedBy: 'utilisateur', targetEntity: Avis::class)]
    #[Groups(['utilisateur:read'])]
    private Collection $avis;

    // Un utilisateur peut passer plusieurs commandes (OneToMany)
    #[ORM\OneToMany(mappedBy: 'utilisateur', targetEntity: Commande::class)]
    private Collection $commandes;

    public function __construct()
    {
        $this->roleEntities = new ArrayCollection();
        $this->avis = new ArrayCollection();
        $this->commandes = new ArrayCollection();
    }

    public function getUtilisateurId(): ?int
    {
        return $this->utilisateurId;
    }

    public function getEmail(): ?string
    {
        return $this->email;
    }

    public function setEmail(string $email): self
    {
        $this->email = $email;
        return $this;
    }

    public function getPassword(): ?string
    {
        return $this->password;
    }

    public function setPassword(string $password): self
    {
        $this->password = $password;
        return $this;
    }

    public function getNom(): ?string
    {
        return $this->nom;
    }

    public function setNom(?string $nom): self
    {
        $this->nom = $nom;
        return $this;
    }

    public function getPrenom(): ?string
    {
        return $this->prenom;
    }

    public function setPrenom(?string $prenom): self
    {
        $this->prenom = $prenom;
        return $this;
    }

    public function getTelephone(): ?string
    {
        return $this->telephone;
    }

    public function setTelephone(?string $telephone): self
    {
        $this->telephone = $telephone;
        return $this;
    }

    public function getAdressePostale(): ?string
    {
        return $this->adressePostale;
    }

    public function setAdressePostale(?string $adressePostale): self
    {
        $this->adressePostale = $adressePostale;
        return $this;
    }

    public function getVille(): ?string
    {
        return $this->ville;
    }

    public function setVille(?string $ville): self
    {
        $this->ville = $ville;
        return $this;
    }

    public function getCodePostal(): ?string
    {
        return $this->codePostal;
    }

    public function setCodePostal(?string $codePostal): self
    {
        $this->codePostal = $codePostal;
        return $this;
    }

    public function getApiToken(): ?string
    {
        return $this->apiToken;
    }

    public function setApiToken(?string $apiToken): self
    {
        $this->apiToken = $apiToken;
        return $this;
    }

    public function isIsActive(): bool
    {
        return $this->isActive;
    }

    public function setIsActive(bool $isActive): self
    {
        $this->isActive = $isActive;
        return $this;
    }

    public function getRoleEntities(): Collection
    {
        return $this->roleEntities;
    }

    public function addRole(Role $role): self
    {
        if (!$this->roleEntities->contains($role)) {
            $this->roleEntities[] = $role;
        }
        return $this;
    }

    public function removeRole(Role $role): self
    {
        $this->roleEntities->removeElement($role);
        return $this;
    }

    /**
     * @return Collection<int, Avis>
     */
    public function getAvis(): Collection
    {
        return $this->avis;
    }

    public function addAvis(Avis $avis): self
    {
        if (!$this->avis->contains($avis)) {
            $this->avis[] = $avis;
            $avis->setUtilisateur($this);
        }
        return $this;
    }

    public function removeAvis(Avis $avis): self
    {
        if ($this->avis->removeElement($avis)) {
            if ($avis->getUtilisateur() === $this) {
                $avis->setUtilisateur(null);
            }
        }
        return $this;
    }

    /**
     * @return Collection<int, Commande>
     */
    public function getCommandes(): Collection
    {
        return $this->commandes;
    }

    public function addCommande(Commande $commande): self
    {
        if (!$this->commandes->contains($commande)) {
            $this->commandes[] = $commande;
            $commande->setUtilisateur($this);
        }
        return $this;
    }

    public function removeCommande(Commande $commande): self
    {
        if ($this->commandes->removeElement($commande)) {
            if ($commande->getUtilisateur() === $this) {
                $commande->setUtilisateur(null);
            }
        }
        return $this;
    }

    public function getUserIdentifier(): string
    {
        return (string) $this->email;
    }

    public function getRoles(): array
    {
        $roles = [];
        foreach ($this->roleEntities as $role) {
            $libelle = strtoupper((string) $role->getLibelle());
            if (!str_starts_with($libelle, 'ROLE_')) {
                $libelle = 'ROLE_' . $libelle;
            }
            $roles[] = $libelle;
        }

        $roles[] = 'ROLE_USER';

        return array_unique($roles);
    }

    public function eraseCredentials(): void
    {
    }

    public function isActive(): ?bool
    {
        return $this->isActive;
    }

    public function addRoleEntity(Role $roleEntity): static
    {
        if (!$this->roleEntities->contains($roleEntity)) {
            $this->roleEntities->add($roleEntity);
        }

        return $this;
    }

    public function removeRoleEntity(Role $roleEntity): static
    {
        $this->roleEntities->removeElement($roleEntity);

        return $this;
    }

    public function addAvi(Avis $avi): static
    {
        if (!$this->avis->contains($avi)) {
            $this->avis->add($avi);
            $avi->setUtilisateur($this);
        }

        return $this;
    }

    public function removeAvi(Avis $avi): static
    {
        if ($this->avis->removeElement($avi)) {
            // set the owning side to null (unless already changed)
            if ($avi->getUtilisateur() === $this) {
                $avi->setUtilisateur(null);
            }
        }

        return $this;
    }
}