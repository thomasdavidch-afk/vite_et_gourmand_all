<?php

namespace App\Controller;

use App\Document\StatCommande;
use Doctrine\ODM\MongoDB\DocumentManager;
use OpenApi\Attributes as OA;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/api/admin/stats')]
#[OA\Tag(name: 'Statistiques (NoSQL)')]
class AdminStatsController extends AbstractController
{
    /**
     * Récupérer toutes les statistiques de commandes (NoSQL)
     */
    #[Route('', name: 'admin_stats_root', methods: ['GET'])]
    #[Route('/orders', name: 'admin_stats_orders', methods: ['GET'])]
    #[IsGranted('ROLE_ADMIN')]
    #[OA\Get(
        summary: 'Obtenir les statistiques des commandes depuis NoSQL',
        responses: [
            new OA\Response(response: 200, description: 'Statistiques récupérées avec succès')
        ]
    )]
    public function getStats(DocumentManager $dm): JsonResponse
    {
        $stats = $dm->getRepository(StatCommande::class)->findAll();

        $data = array_map(function (StatCommande $stat) {
            return [
                'id'           => $stat->getId(),
                'idMenu'       => $stat->getIdMenu(),
                'menuTitre'    => $stat->getMenuTitre(),
                'montantTotal' => $stat->getMontantTotal(),
                'dateCommande' => $stat->getDateCommande(),
            ];
        }, $stats);

        return new JsonResponse($data, Response::HTTP_OK);
    }
}