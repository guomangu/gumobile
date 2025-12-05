<?php

namespace App\StateProcessor;

use ApiPlatform\Metadata\Operation;
use ApiPlatform\State\ProcessorInterface;
use App\Entity\Competence;
use App\Entity\Demande;
use App\Repository\CompetenceRepository;
use App\Repository\DemandeRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\HttpKernel\Exception\BadRequestHttpException;
use Symfony\Component\HttpFoundation\RequestStack;

final class CompetenceUniqueValidator implements ProcessorInterface
{
    public function __construct(
        private readonly ProcessorInterface $processor,
        private readonly CompetenceRepository $competenceRepository,
        private readonly DemandeRepository $demandeRepository,
        private readonly EntityManagerInterface $entityManager,
        private readonly RequestStack $requestStack
    ) {
    }

    public function process(mixed $data, Operation $operation, array $uriVariables = [], array $context = []): mixed
    {
        if (!$data instanceof Competence) {
            return $this->processor->process($data, $operation, $uriVariables, $context);
        }

        // Normaliser le nom (trim et lowercase pour la comparaison)
        $nom = trim($data->getNom() ?? '');
        if (empty($nom)) {
            throw new BadRequestHttpException('Le nom de la compétence ne peut pas être vide.');
        }

        // Vérifier si une compétence avec le même nom existe déjà (comparaison insensible à la casse)
        $existingCompetence = $this->competenceRepository->createQueryBuilder('c')
            ->where('LOWER(TRIM(c.nom)) = LOWER(:nom)')
            ->setParameter('nom', $nom)
            ->getQuery()
            ->getOneOrNullResult();

        if ($existingCompetence !== null) {
            // Si c'est la même compétence (mise à jour), on continue
            if ($data->getId() !== null && $existingCompetence->getId() === $data->getId()) {
                return $this->processor->process($data, $operation, $uriVariables, $context);
            }

            // Si une compétence avec ce nom existe déjà, on lie la demande à la compétence existante
            // Récupérer la demande depuis la collection de la compétence en cours de création
            $newDemande = null;
            if ($data->getDemandes()->count() > 0) {
                $newDemande = $data->getDemandes()->first();
            }

            // Si pas de demande dans la collection, essayer de la récupérer depuis la requête JSON
            if ($newDemande === null) {
                $request = $this->requestStack->getCurrentRequest();
                if ($request !== null) {
                    $requestData = json_decode($request->getContent(), true);
                    if (isset($requestData['demandes']) && is_array($requestData['demandes']) && count($requestData['demandes']) > 0) {
                        // Extraire l'ID de la demande depuis l'IRI
                        $demandeIri = $requestData['demandes'][0];
                        if (preg_match('#/api/demandes/(\d+)#', $demandeIri, $matches)) {
                            $demandeId = (int)$matches[1];
                            $newDemande = $this->demandeRepository->find($demandeId);
                        }
                    } elseif (isset($requestData['demande'])) {
                        // Support de l'ancien format pour compatibilité
                        $demandeIri = $requestData['demande'];
                        if (preg_match('#/api/demandes/(\d+)#', $demandeIri, $matches)) {
                            $demandeId = (int)$matches[1];
                            $newDemande = $this->demandeRepository->find($demandeId);
                        }
                    }
                }
            }

            // Si on a une demande
            if ($newDemande !== null && $newDemande->getId() !== null) {
                // Vérifier si la compétence existante est déjà liée à cette demande
                $isAlreadyLinked = $existingCompetence->getDemandes()->exists(
                    fn($key, $demande) => $demande->getId() === $newDemande->getId()
                );

                if ($isAlreadyLinked) {
                    // La compétence est déjà liée à cette demande, on retourne la compétence existante
                    return $existingCompetence;
                }

                // Ajouter le lien entre la compétence existante et la nouvelle demande
                $existingCompetence->addDemande($newDemande);
                $this->entityManager->flush();

                // Retourner la compétence existante avec le nouveau lien
                // IMPORTANT: On ne passe PAS par le processor par défaut pour éviter la création d'un doublon
                return $existingCompetence;
            }

            // Si on arrive ici, la compétence existe mais on n'a pas pu récupérer la demande
            // On doit quand même éviter que le processor par défaut ne crée un doublon
            // On retourne la compétence existante sans créer de lien (le lien pourra être créé plus tard)
            // IMPORTANT: On ne passe PAS par le processor par défaut
            return $existingCompetence;
        }

        // S'assurer que le nom est bien trimé avant la sauvegarde
        $data->setNom($nom);

        // Aucun doublon, on peut créer la compétence
        return $this->processor->process($data, $operation, $uriVariables, $context);
    }
}

