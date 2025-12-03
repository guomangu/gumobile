<?php

namespace App\Controller;

use App\Entity\Adresse;
use App\Entity\Groupe;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Contracts\HttpClient\HttpClientInterface;

#[Route('/api/adresses')]
class AdresseController extends AbstractController
{
    private const BAN_API_URL = 'https://api-adresse.data.gouv.fr/search/';

    public function __construct(
        private EntityManagerInterface $entityManager,
        private HttpClientInterface $httpClient
    ) {
    }

    #[Route('/import', name: 'api_adresses_import', methods: ['POST'])]
    public function import(Request $request): JsonResponse
    {
        $data = json_decode($request->getContent(), true);

        if (!isset($data['query']) || empty($data['query'])) {
            return new JsonResponse(
                ['error' => 'Le champ "query" est requis'],
                Response::HTTP_BAD_REQUEST
            );
        }

        $query = $data['query'];
        $complement = $data['complement'] ?? null;

        try {
            // Recherche de l'adresse via l'API BAN
            $response = $this->httpClient->request('GET', self::BAN_API_URL, [
                'query' => [
                    'q' => $query,
                    'limit' => 1,
                ],
            ]);

            $banData = $response->toArray();

            if (empty($banData['features'])) {
                return new JsonResponse(
                    ['error' => 'Aucune adresse trouvée pour cette recherche'],
                    Response::HTTP_NOT_FOUND
                );
            }

            $feature = $banData['features'][0];
            $properties = $feature['properties'];
            $coordinates = $feature['geometry']['coordinates'];

            // Création de l'adresse
            $adresse = new Adresse();
            $adresse->setAdresseComplete($properties['label'] ?? $query);
            $adresse->setLatitude($coordinates[1] ?? null);
            $adresse->setLongitude($coordinates[0] ?? null);
            $adresse->setComplement($complement);

            // Création automatique d'un groupe enfant
            $groupe = new Groupe();
            $groupe->setNom('Groupe de ' . ($properties['label'] ?? $query));
            $groupe->setAdresse($adresse);
            $adresse->setGroupe($groupe);

            $this->entityManager->persist($adresse);
            $this->entityManager->persist($groupe);
            $this->entityManager->flush();

            // Retourner l'adresse avec le groupe
            return new JsonResponse([
                'id' => $adresse->getId(),
                'adresse_complete' => $adresse->getAdresseComplete(),
                'latitude' => $adresse->getLatitude(),
                'longitude' => $adresse->getLongitude(),
                'complement' => $adresse->getComplement(),
                'groupe' => [
                    'id' => $groupe->getId(),
                    'nom' => $groupe->getNom(),
                ],
            ], Response::HTTP_CREATED);

        } catch (\Exception $e) {
            return new JsonResponse(
                ['error' => 'Erreur lors de l\'import de l\'adresse: ' . $e->getMessage()],
                Response::HTTP_INTERNAL_SERVER_ERROR
            );
        }
    }
}

