<?php

namespace App\Command;

use App\Entity\Commande;
use App\Service\StatCommandeService;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;

#[AsCommand(name: 'app:sync-stats', description: 'Synchronise les commandes SQL vers MongoDB')]
class SyncStatsCommand extends Command
{
    public function __construct(
        private EntityManagerInterface $em,
        private StatCommandeService $statService
    ) {
        parent::__construct();
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $commandes = $this->em->getRepository(Commande::class)->findAll();
        $count = 0;

        foreach ($commandes as $commande) {
            $this->statService->synchroniserCommandeTerminee($commande);
            $count++;
        }

        $output->writeln("<info>Synchronisation réussie : $count commande(s) traitée(s) vers MongoDB.</info>");
        return Command::SUCCESS;
    }
}