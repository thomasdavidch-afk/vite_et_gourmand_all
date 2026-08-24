<?php

namespace App\Document;

use Doctrine\ODM\MongoDB\Mapping\Attribute as ODM;

#[ODM\Document(collection: 'stat_commandes')]
class StatCommande
{
    #[ODM\Id]
    private ?string $id = null;

    #[ODM\Field(type: 'int')]
    private ?int $idMenu = null;

    #[ODM\Field(type: 'string')]
    private ?string $menuTitre = null;

    #[ODM\Field(type: 'float')]
    private ?float $montantTotal = null;

    #[ODM\Field(type: 'string')]
    private ?string $dateCommande = null;

    #[ODM\Field(type: 'string')]
    private ?string $commandeId = null;

    public function getId(): ?string
    {
        return $this->id;
    }

    public function getIdMenu(): ?int
    {
        return $this->idMenu;
    }

    public function setIdMenu(int $idMenu): self
    {
        $this->idMenu = $idMenu;
        return $this;
    }

    public function getMenuTitre(): ?string
    {
        return $this->menuTitre;
    }

    public function setMenuTitre(string $menuTitre): self
    {
        $this->menuTitre = $menuTitre;
        return $this;
    }

    public function getMontantTotal(): ?float
    {
        return $this->montantTotal;
    }

    public function setMontantTotal(float $montantTotal): self
    {
        $this->montantTotal = $montantTotal;
        return $this;
    }

    public function getDateCommande(): ?string
    {
        return $this->dateCommande;
    }

    public function setDateCommande(string $dateCommande): self
    {
        $this->dateCommande = $dateCommande;
        return $this;
    }
    public function getCommandeId(): ?string
    {
        return $this->commandeId;
    }

    public function setCommandeId(string $commandeId): self
    {
        $this->commandeId = $commandeId;
        return $this;
    }
}