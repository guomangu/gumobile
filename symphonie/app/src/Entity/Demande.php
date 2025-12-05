<?php

namespace App\Entity;

use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Get;
use ApiPlatform\Metadata\GetCollection;
use ApiPlatform\Metadata\Post;
use App\Repository\DemandeRepository;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Serializer\Annotation\Groups;

#[ORM\Entity(repositoryClass: DemandeRepository::class)]
#[ApiResource(
    operations: [
        new GetCollection(normalizationContext: ['groups' => ['demande:read']]),
        new Get(normalizationContext: ['groups' => ['demande:read']]),
        new Post(),
    ],
    formats: ['json' => ['application/json']]
)]
class Demande
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    #[Groups(['demande:read', 'groupe:read'])]
    private ?int $id = null;

    #[ORM\Column(type: 'text')]
    #[Groups(['demande:read', 'groupe:read'])]
    private ?string $texte = null;

    #[ORM\ManyToOne(targetEntity: Groupe::class, inversedBy: 'demandes')]
    #[ORM\JoinColumn(nullable: false)]
    #[Groups(['demande:read'])]
    private ?Groupe $groupe = null;

    #[ORM\ManyToMany(targetEntity: Competence::class, mappedBy: 'demandes')]
    #[Groups(['demande:read', 'groupe:read'])]
    private Collection $competences;

    public function __construct()
    {
        $this->competences = new ArrayCollection();
    }

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getTexte(): ?string
    {
        return $this->texte;
    }

    public function setTexte(string $texte): static
    {
        $this->texte = $texte;

        return $this;
    }

    public function getGroupe(): ?Groupe
    {
        return $this->groupe;
    }

    public function setGroupe(?Groupe $groupe): static
    {
        $this->groupe = $groupe;

        return $this;
    }

    /**
     * @return Collection<int, Competence>
     */
    public function getCompetences(): Collection
    {
        return $this->competences;
    }

    public function addCompetence(Competence $competence): static
    {
        if (!$this->competences->contains($competence)) {
            $this->competences->add($competence);
            $competence->addDemande($this);
        }

        return $this;
    }

    public function removeCompetence(Competence $competence): static
    {
        if ($this->competences->removeElement($competence)) {
            $competence->removeDemande($this);
        }

        return $this;
    }
}

