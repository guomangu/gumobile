<?php

namespace App\Entity;

use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Get;
use ApiPlatform\Metadata\GetCollection;
use ApiPlatform\Metadata\Post;
use App\Repository\CompetenceRepository;
use App\StateProcessor\CompetenceUniqueValidator;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Serializer\Annotation\Groups;

#[ORM\Entity(repositoryClass: CompetenceRepository::class)]
#[ApiResource(
    operations: [
        new GetCollection(normalizationContext: ['groups' => ['competence:read']]),
        new Get(normalizationContext: ['groups' => ['competence:read']]),
        new Post(processor: CompetenceUniqueValidator::class),
    ],
    formats: ['json' => ['application/json']]
)]
class Competence
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    #[Groups(['competence:read', 'demande:read', 'groupe:read'])]
    private ?int $id = null;

    #[ORM\Column(length: 255, unique: true)]
    #[Groups(['competence:read', 'demande:read', 'groupe:read'])]
    private ?string $nom = null;

    #[ORM\ManyToMany(targetEntity: Demande::class, inversedBy: 'competences')]
    #[Groups(['competence:read'])]
    private Collection $demandes;

    public function __construct()
    {
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
        }

        return $this;
    }

    public function removeDemande(Demande $demande): static
    {
        $this->demandes->removeElement($demande);

        return $this;
    }
}

