<?php

namespace App\Command;

use App\Repository\CompetenceRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;

#[AsCommand(
    name: 'app:delete-web-competences',
    description: 'Supprime toutes les compétences avec le nom "web" de la base de données',
)]
class DeleteWebCompetencesCommand extends Command
{
    public function __construct(
        private CompetenceRepository $competenceRepository,
        private EntityManagerInterface $entityManager
    ) {
        parent::__construct();
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $io = new SymfonyStyle($input, $output);

        $io->title('Suppression des compétences "web"');

        // Rechercher toutes les compétences avec le nom "web"
        $competences = $this->competenceRepository->findBy(['nom' => 'web']);

        if (empty($competences)) {
            $io->success('Aucune compétence avec le nom "web" trouvée.');
            return Command::SUCCESS;
        }

        $count = count($competences);
        $io->warning(sprintf('Trouvé %d compétence(s) avec le nom "web"', $count));

        // Supprimer les compétences
        foreach ($competences as $competence) {
            $this->entityManager->remove($competence);
        }

        $this->entityManager->flush();

        $io->success(sprintf('%d compétence(s) "web" supprimée(s) avec succès.', $count));

        return Command::SUCCESS;
    }
}

