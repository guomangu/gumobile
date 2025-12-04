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

    #[Route('/login', name: 'api_login', methods: ['POST'])]
    public function login(Request $request): JsonResponse
    {
        $data = json_decode($request->getContent(), true);
        
        if (!isset($data['pseudo']) || !isset($data['password'])) {
            return new JsonResponse(
                ['error' => 'Pseudo et mot de passe requis'],
                Response::HTTP_BAD_REQUEST
            );
        }

        $pseudo = $data['pseudo'];
        $password = $data['password'];

        $user = $this->entityManager->getRepository(User::class)->findOneBy(['pseudo' => $pseudo]);

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
                'pseudo' => $user->getPseudo(),
                'mail' => $user->getMail(),
            ],
        ]);
    }
}

