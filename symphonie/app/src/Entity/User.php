<?php

namespace App\Entity;

use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Get;
use ApiPlatform\Metadata\GetCollection;
use ApiPlatform\Metadata\Post;
use App\Repository\UserRepository;
use App\StateProcessor\UserPasswordHasher;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Security\Core\User\PasswordAuthenticatedUserInterface;
use Symfony\Component\Security\Core\User\UserInterface;
use Symfony\Component\Serializer\Annotation\Groups;

#[ORM\Entity(repositoryClass: UserRepository::class)]
#[ApiResource(
    operations: [
        new GetCollection(normalizationContext: ['groups' => ['user:read']]),
        new Get(normalizationContext: ['groups' => ['user:read']]),
        new Post(
            denormalizationContext: ['groups' => ['user:write']],
            processor: UserPasswordHasher::class
        ),
    ],
    formats: ['json' => ['application/json']]
)]
class User implements UserInterface, PasswordAuthenticatedUserInterface
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    #[Groups(['user:read', 'groupe:read'])]
    private ?int $id = null;

    #[ORM\Column(length: 180, unique: true)]
    #[Groups(['user:read', 'user:write'])]
    private ?string $pseudo = null;

    #[ORM\Column(length: 255)]
    #[Groups(['user:write'])]
    private ?string $password = null;

    #[ORM\Column(length: 255, unique: true)]
    #[Groups(['user:read', 'user:write'])]
    private ?string $mail = null;

    #[ORM\ManyToMany(targetEntity: Groupe::class, inversedBy: 'users')]
    #[ORM\JoinTable(name: 'user_groupe')]
    #[Groups(['user:write'])]
    private Collection $groupes;

    public function __construct()
    {
        $this->groupes = new ArrayCollection();
    }

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getPseudo(): ?string
    {
        return $this->pseudo;
    }

    public function setPseudo(string $pseudo): static
    {
        $this->pseudo = $pseudo;

        return $this;
    }

    /**
     * @see PasswordAuthenticatedUserInterface
     */
    public function getPassword(): ?string
    {
        return $this->password;
    }

    public function setPassword(string $password): static
    {
        $this->password = $password;

        return $this;
    }

    public function getMail(): ?string
    {
        return $this->mail;
    }

    public function setMail(string $mail): static
    {
        $this->mail = $mail;

        return $this;
    }

    /**
     * @return Collection<int, Groupe>
     */
    public function getGroupes(): Collection
    {
        return $this->groupes;
    }

    /**
     * Méthode pour obtenir les groupes sans référence circulaire (pour la sérialisation)
     * @return array<int, array{id: int, nom: string}>
     */
    #[Groups(['user:read'])]
    public function getGroupesData(): array
    {
        return $this->groupes->map(function ($groupe) {
            return [
                'id' => $groupe->getId(),
                'nom' => $groupe->getNom(),
            ];
        })->toArray();
    }

    public function addGroupe(Groupe $groupe): static
    {
        if (!$this->groupes->contains($groupe)) {
            $this->groupes->add($groupe);
            // Ne pas appeler addUser pour éviter la référence circulaire
            // La relation sera gérée par Doctrine
        }

        return $this;
    }

    public function removeGroupe(Groupe $groupe): static
    {
        if ($this->groupes->removeElement($groupe)) {
            $groupe->removeUser($this);
        }

        return $this;
    }

    /**
     * @see UserInterface
     */
    public function getUserIdentifier(): string
    {
        return (string) $this->pseudo;
    }

    /**
     * @see UserInterface
     */
    public function getRoles(): array
    {
        return ['ROLE_USER'];
    }

    /**
     * @see UserInterface
     */
    public function eraseCredentials(): void
    {
        // If you store any temporary, sensitive data on the user, clear it here
    }
}

