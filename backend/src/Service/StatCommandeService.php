<?php

namespace App\Service;

use App\Document\StatCommande;
use App\Entity\Commande;
use Doctrine\ODM\MongoDB\DocumentManager;

class StatCommandeService
{
    public function __construct(
        private DocumentManager $dm
    ) {}

    public function synchroniserCommandeTerminee(Commande $commande): void
    {
        // 1. Récupération de l'identifiant / numéro de commande de façon sécurisée
        $cmdId = null;
        if (method_exists($commande, 'getNumeroCommande')) {
            $cmdId = $commande->getNumeroCommande();
        } elseif (method_exists($commande, 'getCommandeId')) {
            $cmdId = $commande->getCommandeId();
        } elseif (method_exists($commande, 'getId')) {
            $cmdId = $commande->getId();
        }

        if (!$cmdId) {
            return;
        }

        $cmdIdStr = (string) $cmdId;

        // 2. Vérifier si cette commande a déjà été insérée dans MongoDB pour éviter les doublons
        $existant = $this->dm->getRepository(StatCommande::class)->findOneBy([
            'commandeId' => $cmdIdStr
        ]);

        if ($existant) {
            return; // Déjà synchronisée, on évite les doublons
        }

        // 3. Récupération du menu associé
        $menu = $commande->getMenu();
        if (!$menu) {
            return;
        }

        // Récupération de l'ID du menu
        $menuId = method_exists($menu, 'getMenuId') ? $menu->getMenuId() : (method_exists($menu, 'getId') ? $menu->getId() : null);

        // 4. Calcul du montant total (prixMenu + prixLivraison)
        $prixMenu = (float) $commande->getPrixMenu();
        $prixLivraison = (float) $commande->getPrixLivraison();
        $montantTotal = round($prixMenu + $prixLivraison, 2);

        // Date de la commande au format string YYYY-MM-DD
        $dateStr = $commande->getDateCommande() ? $commande->getDateCommande()->format('Y-m-d') : date('Y-m-d');

        // 5. Instanciation et persistance dans MongoDB
        $stat = new StatCommande();
        $stat->setCommandeId($cmdIdStr);
        $stat->setIdMenu($menuId ? (int) $menuId : 0);
        $stat->setMenuTitre($menu->getTitre() ?? 'Menu sans titre');
        $stat->setMontantTotal($montantTotal);
        $stat->setDateCommande($dateStr);

        $this->dm->persist($stat);
        $this->dm->flush();
    }
}