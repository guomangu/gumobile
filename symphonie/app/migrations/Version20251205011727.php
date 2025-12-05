<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20251205011727 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Change la relation Competence-Demande de ManyToOne à ManyToMany';
    }

    public function up(Schema $schema): void
    {
        // Créer la table de jointure ManyToMany
        $this->addSql('CREATE TABLE competence_demande (
            competence_id INTEGER NOT NULL,
            demande_id INTEGER NOT NULL,
            PRIMARY KEY(competence_id, demande_id),
            FOREIGN KEY (competence_id) REFERENCES competence(id) ON DELETE CASCADE,
            FOREIGN KEY (demande_id) REFERENCES demande(id) ON DELETE CASCADE
        )');

        // Migrer les données existantes de l'ancienne relation ManyToOne vers ManyToMany
        $this->addSql('INSERT INTO competence_demande (competence_id, demande_id)
            SELECT id, demande_id FROM competence WHERE demande_id IS NOT NULL');

        // Supprimer l'ancienne colonne demande_id
        $this->addSql('CREATE TABLE competence_new (
            id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
            nom VARCHAR(255) NOT NULL,
            UNIQUE(nom)
        )');
        
        $this->addSql('INSERT INTO competence_new (id, nom)
            SELECT id, nom FROM competence');
        
        $this->addSql('DROP TABLE competence');
        $this->addSql('ALTER TABLE competence_new RENAME TO competence');
    }

    public function down(Schema $schema): void
    {
        // Recréer la colonne demande_id
        $this->addSql('CREATE TABLE competence_old (
            id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
            nom VARCHAR(255) NOT NULL,
            demande_id INTEGER NOT NULL,
            UNIQUE(nom),
            FOREIGN KEY (demande_id) REFERENCES demande(id)
        )');
        
        // Migrer les données (prendre la première demande pour chaque compétence)
        $this->addSql('INSERT INTO competence_old (id, nom, demande_id)
            SELECT c.id, c.nom, MIN(cd.demande_id)
            FROM competence c
            INNER JOIN competence_demande cd ON c.id = cd.competence_id
            GROUP BY c.id, c.nom');
        
        $this->addSql('DROP TABLE competence');
        $this->addSql('ALTER TABLE competence_old RENAME TO competence');
        
        // Supprimer la table de jointure
        $this->addSql('DROP TABLE competence_demande');
    }
}
