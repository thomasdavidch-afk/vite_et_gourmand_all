<?php

namespace App\Entity;

use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Get;
use ApiPlatform\Metadata\GetCollection;
use ApiPlatform\Metadata\Post;
use ApiPlatform\Metadata\Patch;
use ApiPlatform\Metadata\Delete;
use App\Repository\CommandeRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Serializer\Annotation\Groups;
use Symfony\Component\Uid\Uuid;

#[ORM\Entity(repositoryClass: CommandeRepository::class)]
#[ORM\Table(name: 'commande')]
#[ApiResource(
    operations: [
        new GetCollection(),
        new Get(),
        new Post(),
        new Patch(),
        new Delete()
    ],
    normalizationContext: ['groups' => ['commande:read']],
    denormalizationContext: ['groups' => ['commande:write']]
)]
class Commande
{
    #[ORM\Id]
    #[ORM\Column(name: 'numero_commande', type: 'string', length: 50)]
    #[Groups(['commande:read', 'commande:write'])]
    private ?string $numeroCommande = null;

    #[ORM\Column(name: 'date_commande', type: 'date', nullable: true)]
    #[Groups(['commande:read', 'commande:write'])]
    private ?\DateTimeInterface $dateCommande = null;

    #[ORM\Column(name: 'date_prestation', type: 'date', nullable: true)]
    #[Groups(['commande:read', 'commande:write'])]
    private ?\DateTimeInterface $datePrestation = null;

    #[ORM\Column(name: 'heure_livraison', type: 'string', length: 50, nullable: true)]
    #[Groups(['commande:read', 'commande:write'])]
    private ?string $heureLivraison = null;

    #[ORM\Column(name: 'prix_menu', type: 'decimal', precision: 10, scale: 2, nullable: true)]
    #[Groups(['commande:read', 'commande:write'])]
    private ?string $prixMenu = null;

    #[ORM\Column(name: 'nombre_personne', type: 'integer', nullable: true)]
    #[Groups(['commande:read', 'commande:write'])]
    private ?int $nombrePersonne = null;

    #[ORM\Column(name: 'prix_livraison', type: 'decimal', precision: 10, scale: 2, nullable: true)]
    #[Groups(['commande:read', 'commande:write'])]
    private ?string $prixLivraison = null;

    #[ORM\Column(name: 'statut', type: 'string', length: 50, nullable: true)]
    #[Groups(['commande:read', 'commande:write'])]
    private ?string $statut = null;

    #[ORM\Column(name: 'pret_materiel', type: 'boolean', nullable: true)]
    #[Groups(['commande:read', 'commande:write'])]
    private ?bool $pretMateriel = null;

    #[ORM\Column(name: 'restitution_materiel', type: 'boolean', nullable: true)]
    #[Groups(['commande:read', 'commande:write'])]
    private ?bool $restitutionMateriel = null;

    #[ORM\ManyToOne(targetEntity: Menu::class)]
    #[ORM\JoinColumn(name: 'menu_id', referencedColumnName: 'menu_id', nullable: true)]
    #[Groups(['commande:read', 'commande:write'])]
    private ?Menu $menu = null;

    #[ORM\ManyToOne(targetEntity: Utilisateur::class, inversedBy: 'commandes')]
    #[ORM\JoinColumn(name: 'utilisateur_id', referencedColumnName: 'utilisateur_id', nullable: true)]
    #[Groups(['commande:read', 'commande:write'])]
    private ?Utilisateur $utilisateur = null;

    public function __construct()
    {
        $this->numeroCommande = Uuid::v4()->toRfc4122();
    }

    public function getNumeroCommande(): ?string { return $this->numeroCommande; }
    public function setNumeroCommande(string $n): self { $this->numeroCommande = $n; return $this; }

    public function getDateCommande(): ?\DateTimeInterface { return $this->dateCommande; }
    public function setDateCommande(?\DateTimeInterface $d): self { $this->dateCommande = $d; return $this; }

    public function getDatePrestation(): ?\DateTimeInterface { return $this->datePrestation; }
    public function setDatePrestation(?\DateTimeInterface $d): self { $this->datePrestation = $d; return $this; }

    public function getHeureLivraison(): ?string { return $this->heureLivraison; }
    public function setHeureLivraison(?string $h): self { $this->heureLivraison = $h; return $this; }

    public function getPrixMenu(): ?string { return $this->prixMenu; }
    public function setPrixMenu(?string $p): self { $this->prixMenu = $p; return $this; }

    public function getNombrePersonne(): ?int { return $this->nombrePersonne; }
    public function setNombrePersonne(?int $n): self { $this->nombrePersonne = $n; return $this; }

    public function getPrixLivraison(): ?string { return $this->prixLivraison; }
    public function setPrixLivraison(?string $p): self { $this->prixLivraison = $p; return $this; }

    public function getStatut(): ?string { return $this->statut; }
    public function setStatut(?string $s): self { $this->statut = $s; return $this; }

    public function getPretMateriel(): ?bool { return $this->pretMateriel; }
    public function setPretMateriel(?bool $p): self { $this->pretMateriel = $p; return $this; }

    public function getRestitutionMateriel(): ?bool { return $this->restitutionMateriel; }
    public function setRestitutionMateriel(?bool $r): self { $this->restitutionMateriel = $r; return $this; }

    public function getMenu(): ?Menu { return $this->menu; }
    public function setMenu(?Menu $menu): self { $this->menu = $menu; return $this; }

    public function getUtilisateur(): ?Utilisateur { return $this->utilisateur; }
    public function setUtilisateur(?Utilisateur $u): self { $this->utilisateur = $u; return $this; }

    public function isPretMateriel(): ?bool
    {
        return $this->pretMateriel;
    }

    public function isRestitutionMateriel(): ?bool
    {
        return $this->restitutionMateriel;
    }
}