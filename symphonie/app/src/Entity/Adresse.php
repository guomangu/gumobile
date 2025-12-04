<?php

namespace App\Entity;

use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Get;
use ApiPlatform\Metadata\GetCollection;
use ApiPlatform\Metadata\Post;
use App\Enum\TypeTagAdresse;
use App\Repository\AdresseRepository;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Serializer\Annotation\Groups;

#[ORM\Entity(repositoryClass: AdresseRepository::class)]
#[ApiResource(
    operations: [
        new GetCollection(normalizationContext: ['groups' => ['adresse:read']]),
        new Get(normalizationContext: ['groups' => ['adresse:read']]),
        new Post(),
    ],
    formats: ['json' => ['application/json']]
)]
class Adresse
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    #[Groups(['adresse:read', 'groupe:read'])]
    private ?int $id = null;

    #[ORM\Column(enumType: TypeTagAdresse::class)]
    #[Groups(['adresse:read', 'groupe:read'])]
    private ?TypeTagAdresse $type = null;

    #[ORM\Column(length: 255)]
    #[Groups(['adresse:read', 'groupe:read'])]
    private ?string $valeur = null;

    #[ORM\Column(nullable: true)]
    #[Groups(['adresse:read', 'groupe:read'])]
    private ?float $latitude = null;

    #[ORM\Column(nullable: true)]
    #[Groups(['adresse:read', 'groupe:read'])]
    private ?float $longitude = null;

    #[ORM\ManyToOne(targetEntity: Adresse::class, inversedBy: 'enfants')]
    #[ORM\JoinColumn(nullable: true)]
    #[Groups(['adresse:read'])]
    private ?Adresse $parent = null;

    #[ORM\OneToMany(targetEntity: Adresse::class, mappedBy: 'parent', cascade: ['persist', 'remove'])]
    #[Groups(['adresse:read'])]
    private Collection $enfants;

    #[ORM\ManyToOne(targetEntity: Groupe::class, inversedBy: 'adresses')]
    #[ORM\JoinColumn(nullable: false)]
    #[Groups(['adresse:read'])]
    private ?Groupe $groupe = null;

    public function __construct()
    {
        $this->enfants = new ArrayCollection();
    }

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getType(): ?TypeTagAdresse
    {
        return $this->type;
    }

    public function setType(TypeTagAdresse $type): static
    {
        $this->type = $type;

        return $this;
    }

    public function getValeur(): ?string
    {
        return $this->valeur;
    }

    public function setValeur(string $valeur): static
    {
        $this->valeur = $valeur;

        return $this;
    }

    public function getLatitude(): ?float
    {
        return $this->latitude;
    }

    public function setLatitude(?float $latitude): static
    {
        $this->latitude = $latitude;

        return $this;
    }

    public function getLongitude(): ?float
    {
        return $this->longitude;
    }

    public function setLongitude(?float $longitude): static
    {
        $this->longitude = $longitude;

        return $this;
    }

    public function getParent(): ?self
    {
        return $this->parent;
    }

    public function setParent(?self $parent): static
    {
        $this->parent = $parent;

        return $this;
    }

    /**
     * @return Collection<int, self>
     */
    public function getEnfants(): Collection
    {
        return $this->enfants;
    }

    public function addEnfant(self $enfant): static
    {
        if (!$this->enfants->contains($enfant)) {
            $this->enfants->add($enfant);
            $enfant->setParent($this);
        }

        return $this;
    }

    public function removeEnfant(self $enfant): static
    {
        if ($this->enfants->removeElement($enfant)) {
            if ($enfant->getParent() === $this) {
                $enfant->setParent(null);
            }
        }

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
}
