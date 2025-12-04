<?php

namespace App\Entity;

use ApiPlatform\Metadata\ApiResource;
use App\Repository\GroupeRepository;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Serializer\Annotation\Groups;

#[ORM\Entity(repositoryClass: GroupeRepository::class)]
#[ApiResource(
    formats: ['json' => ['application/json']]
)]
class Groupe
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    #[Groups(['adresse:read', 'groupe:read'])]
    private ?int $id = null;

    #[ORM\Column(length: 255)]
    #[Groups(['adresse:read', 'groupe:read'])]
    private ?string $nom = null;

    #[ORM\OneToMany(targetEntity: Adresse::class, mappedBy: 'groupe', cascade: ['persist', 'remove'], orphanRemoval: true)]
    #[Groups(['groupe:read'])]
    private Collection $adresses;

    #[ORM\OneToMany(targetEntity: Demande::class, mappedBy: 'groupe', cascade: ['persist', 'remove'], orphanRemoval: true)]
    #[Groups(['groupe:read'])]
    private Collection $demandes;

    public function __construct()
    {
        $this->adresses = new ArrayCollection();
        $this->demandes = new ArrayCollection();
    }

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getNom(): ?string
    {
        return $this->nom;
    }

    public function setNom(string $nom): static
    {
        $this->nom = $nom;

        return $this;
    }

    /**
     * @return Collection<int, Adresse>
     */
    public function getAdresses(): Collection
    {
        return $this->adresses;
    }

    public function addAdresse(Adresse $adresse): static
    {
        if (!$this->adresses->contains($adresse)) {
            $this->adresses->add($adresse);
            $adresse->setGroupe($this);
        }

        return $this;
    }

    public function removeAdresse(Adresse $adresse): static
    {
        if ($this->adresses->removeElement($adresse)) {
            if ($adresse->getGroupe() === $this) {
                $adresse->setGroupe(null);
            }
        }

        return $this;
    }

    /**
     * @return Collection<int, Demande>
     */
    public function getDemandes(): Collection
    {
        return $this->demandes;
    }

    public function addDemande(Demande $demande): static
    {
        if (!$this->demandes->contains($demande)) {
            $this->demandes->add($demande);
            $demande->setGroupe($this);
        }

        return $this;
    }

    public function removeDemande(Demande $demande): static
    {
        if ($this->demandes->removeElement($demande)) {
            if ($demande->getGroupe() === $this) {
                $demande->setGroupe(null);
            }
        }

        return $this;
    }
}
