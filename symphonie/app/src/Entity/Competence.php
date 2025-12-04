<?php

namespace App\Entity;

use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Get;
use ApiPlatform\Metadata\GetCollection;
use ApiPlatform\Metadata\Post;
use App\Repository\CompetenceRepository;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Serializer\Annotation\Groups;

#[ORM\Entity(repositoryClass: CompetenceRepository::class)]
#[ApiResource(
    operations: [
        new GetCollection(normalizationContext: ['groups' => ['competence:read']]),
        new Get(normalizationContext: ['groups' => ['competence:read']]),
        new Post(),
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

    #[ORM\Column(length: 255)]
    #[Groups(['competence:read', 'demande:read', 'groupe:read'])]
    private ?string $nom = null;

    #[ORM\ManyToOne(targetEntity: Demande::class, inversedBy: 'competences')]
    #[ORM\JoinColumn(nullable: false)]
    #[Groups(['competence:read'])]
    private ?Demande $demande = null;

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

    public function getDemande(): ?Demande
    {
        return $this->demande;
    }

    public function setDemande(?Demande $demande): static
    {
        $this->demande = $demande;

        return $this;
    }
}

