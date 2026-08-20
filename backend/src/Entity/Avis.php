<?php

namespace App\Entity;

use App\Repository\AvisRepository;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Serializer\Attribute\Groups;

#[ORM\Entity(repositoryClass: AvisRepository::class)]
#[ORM\Table(name: 'avis')]
class Avis
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(name: 'avis_id', type: 'integer')]
    #[Groups(['avis:read', 'avis:write'])]
    private ?int $avisId = null;

    #[ORM\Column(name: 'note', type: 'integer', nullable: true)]
    #[Groups(['avis:read', 'avis:write'])]
    private ?int $note = null;

    #[ORM\Column(name: 'description', type: 'string', length: 50, nullable: true)]
    #[Groups(['avis:read', 'avis:write'])]
    private ?string $description = null;

    #[ORM\Column(name: 'statut', type: 'string', length: 50, nullable: true)]
    #[Groups(['avis:read', 'avis:write'])]
    private ?string $statut = null;

    #[ORM\ManyToOne(targetEntity: Utilisateur::class, inversedBy: 'avis')]
    #[ORM\JoinColumn(name: 'utilisateur_id', referencedColumnName: 'utilisateur_id')]
    #[Groups(['avis:read', 'avis:write'])]
    private ?Utilisateur $utilisateur = null;

    public function getAvisId(): ?int { return $this->avisId; }

    public function getNote(): ?int { return $this->note; }
    public function setNote(?int $note): self { $this->note = $note; return $this; }

    public function getDescription(): ?string { return $this->description; }
    public function setDescription(?string $description): self { $this->description = $description; return $this; }

    public function getStatut(): ?string { return $this->statut; }
    public function setStatut(?string $statut): self { $this->statut = $statut; return $this; }

    public function getUtilisateur(): ?Utilisateur { return $this->utilisateur; }
    public function setUtilisateur(?Utilisateur $utilisateur): self { $this->utilisateur = $utilisateur; return $this; }
}