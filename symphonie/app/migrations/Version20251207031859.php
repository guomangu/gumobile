<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20251207031859 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Change la relation Adresse-Groupe de ManyToOne à ManyToMany et ajoute une contrainte unique sur (type, valeur, parent_id)';
    }

    public function up(Schema $schema): void
    {
        // Vérifier si la table adresse_groupe existe déjà et la supprimer si nécessaire
        $this->addSql('DROP TABLE IF EXISTS adresse_groupe');
        
        // Créer la table de jointure ManyToMany
        $this->addSql('CREATE TABLE adresse_groupe (adresse_id INTEGER NOT NULL, groupe_id INTEGER NOT NULL, PRIMARY KEY (adresse_id, groupe_id), CONSTRAINT FK_CB6C59C94DE7DC5C FOREIGN KEY (adresse_id) REFERENCES adresse (id) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE, CONSTRAINT FK_CB6C59C97A45358C FOREIGN KEY (groupe_id) REFERENCES groupe (id) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE)');
        $this->addSql('CREATE INDEX IDX_CB6C59C94DE7DC5C ON adresse_groupe (adresse_id)');
        $this->addSql('CREATE INDEX IDX_CB6C59C97A45358C ON adresse_groupe (groupe_id)');
        
        // Note: Si des données existent avec l'ancienne relation ManyToOne (colonne groupe_id),
        // elles doivent être migrées manuellement avant d'exécuter cette migration
        $this->addSql('CREATE TEMPORARY TABLE __temp__adresse AS SELECT id, type, valeur, latitude, longitude, parent_id FROM adresse');
        $this->addSql('DROP TABLE adresse');
        $this->addSql('CREATE TABLE adresse (id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, type VARCHAR(255) NOT NULL, valeur VARCHAR(255) NOT NULL, latitude DOUBLE PRECISION DEFAULT NULL, longitude DOUBLE PRECISION DEFAULT NULL, parent_id INTEGER DEFAULT NULL, CONSTRAINT FK_C35F0816727ACA70 FOREIGN KEY (parent_id) REFERENCES adresse (id) ON UPDATE NO ACTION ON DELETE NO ACTION NOT DEFERRABLE INITIALLY IMMEDIATE)');
        $this->addSql('INSERT INTO adresse (id, type, valeur, latitude, longitude, parent_id) SELECT id, type, valeur, latitude, longitude, parent_id FROM __temp__adresse');
        $this->addSql('DROP TABLE __temp__adresse');
        $this->addSql('CREATE INDEX IDX_C35F0816727ACA70 ON adresse (parent_id)');
        $this->addSql('CREATE UNIQUE INDEX unique_tag ON adresse (type, valeur, parent_id)');
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql('DROP TABLE adresse_groupe');
        $this->addSql('CREATE TEMPORARY TABLE __temp__adresse AS SELECT id, type, valeur, latitude, longitude, parent_id FROM adresse');
        $this->addSql('DROP TABLE adresse');
        $this->addSql('CREATE TABLE adresse (id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, type VARCHAR(255) NOT NULL, valeur VARCHAR(255) NOT NULL, latitude DOUBLE PRECISION DEFAULT NULL, longitude DOUBLE PRECISION DEFAULT NULL, parent_id INTEGER DEFAULT NULL, groupe_id INTEGER NOT NULL, CONSTRAINT FK_C35F0816727ACA70 FOREIGN KEY (parent_id) REFERENCES adresse (id) NOT DEFERRABLE INITIALLY IMMEDIATE, CONSTRAINT FK_C35F08167A45358C FOREIGN KEY (groupe_id) REFERENCES groupe (id) ON UPDATE NO ACTION ON DELETE NO ACTION NOT DEFERRABLE INITIALLY IMMEDIATE)');
        $this->addSql('INSERT INTO adresse (id, type, valeur, latitude, longitude, parent_id) SELECT id, type, valeur, latitude, longitude, parent_id FROM __temp__adresse');
        $this->addSql('DROP TABLE __temp__adresse');
        $this->addSql('CREATE INDEX IDX_C35F0816727ACA70 ON adresse (parent_id)');
        $this->addSql('CREATE INDEX IDX_C35F08167A45358C ON adresse (groupe_id)');
    }
}
