<?php

namespace App\Document;

use Doctrine\ODM\MongoDB\Mapping\Annotations as MongoDB;

#[MongoDB\Document(collection: 'horaires')]
class Horaire
{
    #[MongoDB\Id]
    private ?string $id = null;

    #[MongoDB\Field(type: 'string')]
    private ?string $jour = null;

    #[MongoDB\Field(type: 'string')]
    private ?string $heureOuverture = null;

    #[MongoDB\Field(type: 'string')]
    private ?string $heureFermeture = null;

    #[MongoDB\Field(type: 'boolean')]
    private bool $ferme = false;

    // --- GETTERS & SETTERS ---

    public function getId(): ?string
    {
        return $this->id;
    }

    public function getJour(): ?string
    {
        return $this->jour;
    }

    public function setJour(?string $jour): static
    {
        $this->jour = $jour;
        return $this;
    }

    public function getHeureOuverture(): ?string
    {
        return $this->heureOuverture;
    }

    public function setHeureOuverture(?string $heureOuverture): static
    {
        $this->heureOuverture = $heureOuverture;
        return $this;
    }

    public function getHeureFermeture(): ?string
    {
        return $this->heureFermeture;
    }

    public function setHeureFermeture(?string $heureFermeture): static
    {
        $this->heureFermeture = $heureFermeture;
        return $this;
    }

    public function isFerme(): bool
    {
        return $this->ferme;
    }

    public function setFerme(bool $ferme): static
    {
        $this->ferme = $ferme;
        return $this;
    }
}