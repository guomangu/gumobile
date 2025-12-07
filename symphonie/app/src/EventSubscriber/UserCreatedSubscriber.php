<?php

namespace App\EventSubscriber;

use App\Entity\User;
use App\Repository\UserRepository;
use Lexik\Bundle\JWTAuthenticationBundle\Services\JWTTokenManagerInterface;
use Symfony\Component\EventDispatcher\EventSubscriberInterface;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Event\ResponseEvent;
use Symfony\Component\HttpKernel\KernelEvents;

class UserCreatedSubscriber implements EventSubscriberInterface
{
    public function __construct(
        private readonly JWTTokenManagerInterface $jwtManager,
        private readonly UserRepository $userRepository
    ) {
    }

    public static function getSubscribedEvents(): array
    {
        return [
            KernelEvents::RESPONSE => ['onKernelResponse', -10],
        ];
    }

    public function onKernelResponse(ResponseEvent $event): void
    {
        $request = $event->getRequest();
        $response = $event->getResponse();

        // Vérifier si c'est une création d'utilisateur (POST sur /api/users) avec succès (201)
        if (
            'POST' !== $request->getMethod()
            || !str_contains($request->getPathInfo(), '/api/users')
            || 201 !== $response->getStatusCode()
        ) {
            return;
        }

        try {
            // Récupérer les données de la réponse (compatible Response et JsonResponse)
            $content = $response->getContent();
            $data = json_decode($content, true);
            
            if (!is_array($data) || !isset($data['id']) || !is_numeric($data['id'])) {
                error_log('[UserCreatedSubscriber] Pas d\'ID utilisateur dans la réponse');
                return;
            }

            // Récupérer l'utilisateur depuis la base de données
            $user = $this->userRepository->find($data['id']);
            
            if (!$user instanceof User) {
                error_log('[UserCreatedSubscriber] Utilisateur non trouvé: ' . $data['id']);
                return;
            }

            // Générer le token JWT
            $token = $this->jwtManager->create($user);

            // Créer une nouvelle réponse JSON avec le token
            $newResponse = new JsonResponse([
                'token' => $token,
                'user' => [
                    'id' => $user->getId(),
                    'pseudo' => $user->getPseudo(),
                    'mail' => $user->getMail(),
                ],
            ], 201);

            // Copier les headers importants
            $newResponse->headers->set('Content-Type', 'application/json');
            
            // Remplacer la réponse
            $event->setResponse($newResponse);
            
            error_log('[UserCreatedSubscriber] Token JWT généré pour l\'utilisateur: ' . $user->getId());
            
        } catch (\Exception $e) {
            error_log('[UserCreatedSubscriber] Erreur: ' . $e->getMessage());
        }
    }
}

