<?php

namespace App\Command;

use Doctrine\DBAL\Connection;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;

#[AsCommand(
    name: 'app:clean-duplicate-competences',
    description: 'Supprime les compétences en doublon en gardant seulement la première pour chaque nom',
)]
class CleanDuplicateCompetencesCommand extends Command
{
    public function __construct(
        private Connection $connection
    ) {
        parent::__construct();
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $io = new SymfonyStyle($input, $output);

        $io->title('Nettoyage des compétences en doublon');

        // Compter les doublons
        $duplicates = $this->connection->executeQuery("
            SELECT nom, COUNT(*) as count
            FROM competence
            GROUP BY nom
            HAVING COUNT(*) > 1
        ")->fetchAllAssociative();

        if (empty($duplicates)) {
            $io->success('Aucun doublon trouvé.');
            return Command::SUCCESS;
        }

        $totalDuplicates = 0;
        foreach ($duplicates as $duplicate) {
            $totalDuplicates += $duplicate['count'] - 1; // -1 car on garde une compétence
            $io->writeln(sprintf('  - "%s": %d occurrence(s)', $duplicate['nom'], $duplicate['count']));
        }

        $io->warning(sprintf('Total de %d compétence(s) en doublon à supprimer', $totalDuplicates));

        if (!$io->confirm('Voulez-vous continuer ?', true)) {
            $io->info('Opération annulée.');
            return Command::SUCCESS;
        }

        // Supprimer les doublons en gardant seulement le premier ID pour chaque nom
        // Compatible SQLite et PostgreSQL
        $platform = $this->connection->getDatabasePlatform();
        $platformClass = get_class($platform);
        
        if (str_contains($platformClass, 'SQLite')) {
            // SQLite
            $deleted = $this->connection->executeStatement("
                DELETE FROM competence
                WHERE id NOT IN (
                    SELECT MIN(id)
                    FROM competence
                    GROUP BY nom
                )
            ");
        } else {
            // PostgreSQL ou autres
            $deleted = $this->connection->executeStatement("
                DELETE FROM competence c1
                WHERE EXISTS (
                    SELECT 1 FROM competence c2
                    WHERE c2.nom = c1.nom
                    AND c2.id < c1.id
                )
            ");
        }

        $io->success(sprintf('%d compétence(s) en doublon supprimée(s) avec succès.', $deleted));

        return Command::SUCCESS;
    }
}

