<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20251205010339 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Ajoute une contrainte d\'unicité sur le nom de Competence et supprime les doublons';
    }

    public function up(Schema $schema): void
    {
        // Supprimer les doublons en gardant seulement le premier ID pour chaque nom
        // Syntaxe compatible PostgreSQL
        $this->addSql("
            DELETE FROM competence c1
            WHERE EXISTS (
                SELECT 1 FROM competence c2
                WHERE c2.nom = c1.nom
                AND c2.id < c1.id
            )
        ");

        // Ajouter la contrainte d'unicité sur le nom
        $this->addSql('CREATE UNIQUE INDEX IF NOT EXISTS UNIQ_competence_nom ON competence (nom)');
    }

    public function down(Schema $schema): void
    {
        // Supprimer la contrainte d'unicité
        $this->addSql('DROP INDEX IF EXISTS UNIQ_competence_nom');
    }
}
