<?php

namespace App\Repository;

use App\Entity\Adresse;
use App\Enum\TypeTagAdresse;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<Adresse>
 */
class AdresseRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, Adresse::class);
    }

    /**
     * Recherche un tag d'adresse existant par type, valeur et parent
     */
    public function findExistingTag(
        TypeTagAdresse $type,
        string $valeur,
        ?Adresse $parent = null
    ): ?Adresse {
        $qb = $this->createQueryBuilder('a')
            ->where('a.type = :type')
            ->andWhere('a.valeur = :valeur')
            ->setParameter('type', $type)
            ->setParameter('valeur', $valeur);

        if ($parent === null) {
            $qb->andWhere('a.parent IS NULL');
        } else {
            // Si le parent a un ID, on l'utilise directement
            if ($parent->getId() !== null) {
                $qb->andWhere('a.parent = :parentId')
                    ->setParameter('parentId', $parent->getId());
            } else {
                // Si le parent n'a pas d'ID, on cherche par type et valeur du parent
                $qb->andWhere('a.parent IS NOT NULL')
                    ->andWhere('a.parent.type = :parentType')
                    ->andWhere('a.parent.valeur = :parentValeur')
                    ->setParameter('parentType', $parent->getType())
                    ->setParameter('parentValeur', $parent->getValeur());
            }
        }

        return $qb->getQuery()->getOneOrNullResult();
    }

    /**
     * Recherche tous les tags d'un groupe
     */
    public function findByGroupe($groupe): array
    {
        return $this->createQueryBuilder('a')
            ->where('a.groupe = :groupe')
            ->setParameter('groupe', $groupe)
            ->orderBy('a.type', 'ASC')
            ->getQuery()
            ->getResult();
    }
}
