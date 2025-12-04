<?php

namespace App\EventSubscriber;

use App\Entity\User;
use App\Repository\UserRepository;
use Lexik\Bundle\JWTAuthenticationBundle\Services\JWTTokenManagerInterface;
use Symfony\Component\EventDispatcher\EventSubscriberInterface;
use Symfony\Component\HttpFoundation\JsonResponse;
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
        error_log('[UserCreatedSubscriber] Début de onKernelResponse');
        
        $request = $event->getRequest();
        $response = $event->getResponse();

        error_log('[UserCreatedSubscriber] Méthode: ' . $request->getMethod());
        error_log('[UserCreatedSubscriber] Path: ' . $request->getPathInfo());
        error_log('[UserCreatedSubscriber] Response type: ' . get_class($response));
        error_log('[UserCreatedSubscriber] Status code: ' . ($response ? $response->getStatusCode() : 'null'));

        // Vérifier si c'est une création d'utilisateur (POST sur /api/users) avec succès (201)
        if (
            'POST' === $request->getMethod()
            && str_contains($request->getPathInfo(), '/api/users')
            && $response instanceof JsonResponse
            && 201 === $response->getStatusCode()
        ) {
            error_log('[UserCreatedSubscriber] Conditions remplies pour générer le token');
            
            try {
                $data = $response->getData();
                error_log('[UserCreatedSubscriber] Données de la réponse: ' . json_encode($data));
                
                // Vérifier si la réponse contient un utilisateur avec un ID
                if (is_array($data) && isset($data['id']) && is_numeric($data['id'])) {
                    error_log('[UserCreatedSubscriber] ID utilisateur trouvé: ' . $data['id']);
                    
                    // Récupérer l'utilisateur depuis la base de données
                    $user = $this->userRepository->find($data['id']);
                    
                    if ($user instanceof User) {
                        error_log('[UserCreatedSubscriber] Utilisateur récupéré depuis la DB');
                        
                        // Générer le token JWT
                        error_log('[UserCreatedSubscriber] Génération du token JWT');
                        $token = $this->jwtManager->create($user);
                        error_log('[UserCreatedSubscriber] Token généré avec succès');

                        // Remplacer le contenu de la réponse par une réponse avec le token
                        $response->setData([
                            'token' => $token,
                            'user' => [
                                'id' => $user->getId(),
                                'pseudo' => $user->getPseudo(),
                                'mail' => $user->getMail(),
                            ],
                        ]);
                        error_log('[UserCreatedSubscriber] Réponse modifiée avec le token');
                    } else {
                        error_log('[UserCreatedSubscriber] Utilisateur non trouvé dans la DB avec l\'ID: ' . $data['id']);
                    }
                } else {
                    error_log('[UserCreatedSubscriber] Pas d\'ID utilisateur dans la réponse ou format invalide');
                }
            } catch (\Exception $e) {
                // En cas d'erreur, laisser la réponse par défaut et logger l'erreur
                error_log('[UserCreatedSubscriber] Erreur lors de la génération du token JWT: ' . $e->getMessage());
                error_log('[UserCreatedSubscriber] Stack trace: ' . $e->getTraceAsString());
            }
        } else {
            error_log('[UserCreatedSubscriber] Conditions non remplies pour générer le token');
        }
        
        error_log('[UserCreatedSubscriber] Fin de onKernelResponse');
    }
}

