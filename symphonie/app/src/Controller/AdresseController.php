<?php

namespace App\Controller;

use App\Entity\Adresse;
use App\Entity\Groupe;
use App\Enum\TypeTagAdresse;
use App\Repository\AdresseRepository;
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
        private HttpClientInterface $httpClient,
        private AdresseRepository $adresseRepository
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

            // Création automatique d'un groupe
            $groupe = new Groupe();
            $groupe->setNom('Groupe de ' . ($properties['label'] ?? $query));
            $this->entityManager->persist($groupe);

            // Extraction des composants de l'adresse
            $pays = $properties['context'] ?? 'France';
            $region = $this->extractRegion($properties);
            $ville = $properties['city'] ?? '';
            $rue = $properties['street'] ?? '';
            $numRue = $properties['housenumber'] ?? '';

            // Création de la hiérarchie de tags
            $tags = [];
            $parent = null;

            // Pays
            if (!empty($pays)) {
                $tagPays = $this->findOrCreateTag(
                    TypeTagAdresse::PAYS,
                    $pays,
                    null,
                    null,
                    null,
                    $groupe
                );
                $tags[] = $tagPays;
                $parent = $tagPays;
            }

            // Région
            if (!empty($region) && $parent) {
                $tagRegion = $this->findOrCreateTag(
                    TypeTagAdresse::REGION,
                    $region,
                    $parent,
                    null,
                    null,
                    $groupe
                );
                $tags[] = $tagRegion;
                $parent = $tagRegion;
            }

            // Ville
            if (!empty($ville) && $parent) {
                $tagVille = $this->findOrCreateTag(
                    TypeTagAdresse::VILLE,
                    $ville,
                    $parent,
                    $coordinates[1] ?? null,
                    $coordinates[0] ?? null,
                    $groupe
                );
                $tags[] = $tagVille;
                $parent = $tagVille;
            }

            // Rue
            if (!empty($rue) && $parent) {
                $tagRue = $this->findOrCreateTag(
                    TypeTagAdresse::RUE,
                    $rue,
                    $parent,
                    $coordinates[1] ?? null,
                    $coordinates[0] ?? null,
                    $groupe
                );
                $tags[] = $tagRue;
                $parent = $tagRue;
            }

            // Numéro de rue
            if (!empty($numRue) && $parent) {
                $tagNumRue = $this->findOrCreateTag(
                    TypeTagAdresse::NUMRUE,
                    $numRue,
                    $parent,
                    $coordinates[1] ?? null,
                    $coordinates[0] ?? null,
                    $groupe
                );
                $tags[] = $tagNumRue;
            }

            $this->entityManager->flush();

            // Retourner le groupe avec tous ses tags
            return new JsonResponse([
                'id' => $groupe->getId(),
                'nom' => $groupe->getNom(),
                'adresses' => array_map(function (Adresse $tag) {
                    return [
                        'id' => $tag->getId(),
                        'type' => $tag->getType()?->value,
                        'valeur' => $tag->getValeur(),
                        'latitude' => $tag->getLatitude(),
                        'longitude' => $tag->getLongitude(),
                        'parent_id' => $tag->getParent()?->getId(),
                    ];
                }, $tags),
            ], Response::HTTP_CREATED);

        } catch (\Exception $e) {
            return new JsonResponse(
                ['error' => 'Erreur lors de l\'import de l\'adresse: ' . $e->getMessage()],
                Response::HTTP_INTERNAL_SERVER_ERROR
            );
        }
    }

    /**
     * Recherche un tag existant ou en crée un nouveau
     */
    private function findOrCreateTag(
        TypeTagAdresse $type,
        string $valeur,
        ?Adresse $parent,
        ?float $latitude,
        ?float $longitude,
        Groupe $groupe
    ): Adresse {
        // Si le parent existe mais n'a pas d'ID, on doit d'abord le flush
        if ($parent && $parent->getId() === null) {
            $this->entityManager->flush();
        }

        // Recherche d'un tag existant avec le même type, valeur et parent
        $existingTag = $this->adresseRepository->findExistingTag($type, $valeur, $parent);

        if ($existingTag) {
            // Si le tag existe, on l'ajoute au groupe (s'il n'y est pas déjà)
            if ($existingTag->getGroupe() !== $groupe) {
                $groupe->addAdresse($existingTag);
            }
            return $existingTag;
        }

        // Création d'un nouveau tag
        $tag = new Adresse();
        $tag->setType($type);
        $tag->setValeur($valeur);
        $tag->setParent($parent);
        $tag->setLatitude($latitude);
        $tag->setLongitude($longitude);
        $tag->setGroupe($groupe);

        $this->entityManager->persist($tag);
        // Flush immédiatement pour que le tag ait un ID pour les recherches suivantes
        $this->entityManager->flush();

        return $tag;
    }

    /**
     * Extrait la région depuis les propriétés de l'API BAN
     */
    private function extractRegion(array $properties): string
    {
        // L'API BAN peut retourner la région dans différents champs
        if (isset($properties['context'])) {
            $context = $properties['context'];
            // Le contexte est généralement au format "XX, Région, Pays"
            $parts = explode(',', $context);
            if (count($parts) >= 2) {
                return trim($parts[1]);
            }
        }
        return '';
    }
}
