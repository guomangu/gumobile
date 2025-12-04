<?php

namespace App\StateProcessor;

use ApiPlatform\Metadata\Operation;
use ApiPlatform\State\ProcessorInterface;
use App\Entity\User;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;

final class UserPasswordHasher implements ProcessorInterface
{
    public function __construct(
        private readonly ProcessorInterface $processor,
        private readonly UserPasswordHasherInterface $passwordHasher,
        private readonly EntityManagerInterface $entityManager
    ) {
    }

    public function process(mixed $data, Operation $operation, array $uriVariables = [], array $context = []): mixed
    {
        error_log('[UserPasswordHasher] Début du process');
        
        if (!$data instanceof User) {
            error_log('[UserPasswordHasher] Data n\'est pas une instance de User');
            return $this->processor->process($data, $operation, $uriVariables, $context);
        }

        error_log('[UserPasswordHasher] Utilisateur reçu: pseudo=' . ($data->getPseudo() ?? 'null') . ', mail=' . ($data->getMail() ?? 'null'));

        // Sauvegarder les groupes temporairement
        $groupes = $data->getGroupes()->toArray();
        error_log('[UserPasswordHasher] Nombre de groupes à lier: ' . count($groupes));
        
        // Retirer les groupes pour la création
        foreach ($groupes as $groupe) {
            error_log('[UserPasswordHasher] Retrait du groupe ID: ' . ($groupe->getId() ?? 'null'));
            $data->removeGroupe($groupe);
        }

        // Hasher le mot de passe si fourni
        if (null !== $data->getPassword()) {
            error_log('[UserPasswordHasher] Hash du mot de passe');
            try {
                $hashedPassword = $this->passwordHasher->hashPassword(
                    $data,
                    $data->getPassword()
                );
                $data->setPassword($hashedPassword);
                error_log('[UserPasswordHasher] Mot de passe hashé avec succès');
            } catch (\Exception $e) {
                error_log('[UserPasswordHasher] Erreur lors du hash du mot de passe: ' . $e->getMessage());
                throw $e;
            }
        } else {
            error_log('[UserPasswordHasher] Pas de mot de passe à hasher');
        }

        // Créer l'utilisateur sans les groupes
        error_log('[UserPasswordHasher] Appel du processor pour créer l\'utilisateur');
        try {
            $result = $this->processor->process($data, $operation, $uriVariables, $context);
            error_log('[UserPasswordHasher] Utilisateur créé avec succès, ID: ' . ($result instanceof User ? ($result->getId() ?? 'null') : 'non-User'));
        } catch (\Exception $e) {
            error_log('[UserPasswordHasher] Erreur lors de la création de l\'utilisateur: ' . $e->getMessage());
            error_log('[UserPasswordHasher] Stack trace: ' . $e->getTraceAsString());
            throw $e;
        }

        // Si c'est une nouvelle création, lier les groupes après
        if ($result instanceof User && null !== $result->getId() && count($groupes) > 0) {
            error_log('[UserPasswordHasher] Liaison des groupes après création');
            try {
                foreach ($groupes as $groupe) {
                    error_log('[UserPasswordHasher] Ajout du groupe ID: ' . ($groupe->getId() ?? 'null'));
                    $result->addGroupe($groupe);
                }
                // Flush pour sauvegarder les relations
                error_log('[UserPasswordHasher] Flush des relations');
                $this->entityManager->flush();
                error_log('[UserPasswordHasher] Relations sauvegardées avec succès');
            } catch (\Exception $e) {
                error_log('[UserPasswordHasher] Erreur lors de la liaison des groupes: ' . $e->getMessage());
                error_log('[UserPasswordHasher] Stack trace: ' . $e->getTraceAsString());
                throw $e;
            }
        } else {
            error_log('[UserPasswordHasher] Pas de groupes à lier ou utilisateur non créé');
        }

        error_log('[UserPasswordHasher] Fin du process');
        return $result;
    }
}

