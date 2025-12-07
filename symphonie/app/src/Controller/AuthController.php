<?php

namespace App\Controller;

use App\Entity\User;
use Lexik\Bundle\JWTAuthenticationBundle\Services\JWTTokenManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;
use Symfony\Component\Routing\Annotation\Route;
use Doctrine\ORM\EntityManagerInterface;

#[Route('/api')]
class AuthController extends AbstractController
{
    public function __construct(
        private readonly JWTTokenManagerInterface $jwtManager,
        private readonly UserPasswordHasherInterface $passwordHasher,
        private readonly EntityManagerInterface $entityManager
    ) {
    }

    /**
     * Endpoint unique pour l'authentification
     * - Si l'email existe → connexion (vérifie le mot de passe)
     * - Si l'email n'existe pas → création du compte
     */
    #[Route('/auth', name: 'api_auth', methods: ['POST'])]
    public function auth(Request $request): JsonResponse
    {
        $data = json_decode($request->getContent(), true);
        
        if (!isset($data['mail']) || !isset($data['password'])) {
            return new JsonResponse(
                ['error' => 'Email et mot de passe requis'],
                Response::HTTP_BAD_REQUEST
            );
        }

        $mail = trim($data['mail']);
        $password = $data['password'];

        // Validation email
        if (!filter_var($mail, FILTER_VALIDATE_EMAIL)) {
            return new JsonResponse(
                ['error' => 'Format d\'email invalide'],
                Response::HTTP_BAD_REQUEST
            );
        }

        // Validation mot de passe (minimum 4 caractères)
        if (strlen($password) < 4) {
            return new JsonResponse(
                ['error' => 'Le mot de passe doit contenir au moins 4 caractères'],
                Response::HTTP_BAD_REQUEST
            );
        }

        // Chercher si l'utilisateur existe
        $user = $this->entityManager->getRepository(User::class)->findOneBy(['mail' => $mail]);

        if ($user) {
            // L'utilisateur existe → vérifier le mot de passe
            if (!$this->passwordHasher->isPasswordValid($user, $password)) {
                return new JsonResponse(
                    ['error' => 'Mot de passe incorrect'],
                    Response::HTTP_UNAUTHORIZED
                );
            }
            
            $isNewUser = false;
        } else {
            // L'utilisateur n'existe pas → créer le compte
            $user = new User();
            $user->setMail($mail);
            $user->setPassword($this->passwordHasher->hashPassword($user, $password));
            
            $this->entityManager->persist($user);
            $this->entityManager->flush();
            
            $isNewUser = true;
        }

        // Générer le token JWT
        $token = $this->jwtManager->create($user);

        return new JsonResponse([
            'token' => $token,
            'user' => [
                'id' => $user->getId(),
                'mail' => $user->getMail(),
                'pseudo' => $user->getPseudo(),
            ],
            'isNewUser' => $isNewUser,
        ], $isNewUser ? Response::HTTP_CREATED : Response::HTTP_OK);
    }

    /**
     * Endpoint de connexion classique (compatibilité)
     */
    #[Route('/login', name: 'api_login', methods: ['POST'])]
    public function login(Request $request): JsonResponse
    {
        $data = json_decode($request->getContent(), true);
        
        // Support des deux formats : mail ou pseudo
        $identifier = $data['mail'] ?? $data['pseudo'] ?? null;
        $password = $data['password'] ?? null;
        
        if (!$identifier || !$password) {
            return new JsonResponse(
                ['error' => 'Email et mot de passe requis'],
                Response::HTTP_BAD_REQUEST
            );
        }

        // Chercher par mail
        $user = $this->entityManager->getRepository(User::class)->findOneBy(['mail' => $identifier]);

        if (!$user || !$this->passwordHasher->isPasswordValid($user, $password)) {
            return new JsonResponse(
                ['error' => 'Identifiants invalides'],
                Response::HTTP_UNAUTHORIZED
            );
        }

        $token = $this->jwtManager->create($user);

        return new JsonResponse([
            'token' => $token,
            'user' => [
                'id' => $user->getId(),
                'mail' => $user->getMail(),
                'pseudo' => $user->getPseudo(),
            ],
        ]);
    }
}
