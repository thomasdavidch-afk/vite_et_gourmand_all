<?php

namespace App\Controller;

use App\Entity\Regime;
use App\Repository\RegimeRepository;
use Doctrine\ORM\EntityManagerInterface;
use OpenApi\Attributes as OA;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/api/regimes')]
#[OA\Tag(name: 'Régimes')]
class RegimeController extends AbstractController
{
    /**
     * Obtenir la liste de tous les régimes
     */
    #[Route('', name: 'regime_index', methods: ['GET'])]
    #[OA\Get(
        path: '/api/regimes',
        summary: 'Obtenir la liste de tous les régimes',
        responses: [
            new OA\Response(response: 200, description: 'Liste des régimes récupérée avec succès')
        ]
    )]
    public function index(RegimeRepository $regimeRepository): JsonResponse
    {
        $regimes = $regimeRepository->findAll();

        $data = array_map(function (Regime $regime) {
            return $this->serializeRegime($regime);
        }, $regimes);

        return new JsonResponse($data, Response::HTTP_OK);
    }

    /**
     * Obtenir les détails d'un régime par son ID
     */
    #[Route('/{id}', name: 'regime_show', methods: ['GET'])]
    #[OA\Get(
        path: '/api/regimes/{id}',
        summary: 'Obtenir les détails d\'un régime',
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))
        ],
        responses: [
            new OA\Response(response: 200, description: 'Détails du régime'),
            new OA\Response(response: 404, description: 'Régime non trouvé')
        ]
    )]
    public function show(int $id, RegimeRepository $regimeRepository): JsonResponse
    {
        $regime = $regimeRepository->find($id);

        if (!$regime) {
            return new JsonResponse(['error' => 'Régime non trouvé.'], Response::HTTP_NOT_FOUND);
        }

        return new JsonResponse($this->serializeRegime($regime), Response::HTTP_OK);
    }

    /**
     * Créer un nouveau régime (Admin uniquement)
     */
    #[Route('', name: 'regime_create', methods: ['POST'])]
    #[IsGranted('ROLE_ADMIN', message: 'Accès refusé. Seul un administrateur peut ajouter un régime.')]
    #[OA\Post(
        path: '/api/regimes',
        summary: 'Créer un nouveau régime (Admin uniquement)',
        requestBody: new OA\RequestBody(
            content: new OA\JsonContent(
                required: ['libelle'],
                properties: [
                    new OA\Property(property: 'libelle', type: 'string', example: 'Végétarien')
                ]
            )
        ),
        responses: [
            new OA\Response(response: 201, description: 'Régime créé avec succès'),
            new OA\Response(response: 400, description: 'Libellé obligatoire'),
            new OA\Response(response: 403, description: 'Accès refusé')
        ]
    )]
    public function create(Request $request, EntityManagerInterface $em): JsonResponse
    {
        $data = json_decode($request->getContent(), true);

        if (empty($data['libelle'])) {
            return new JsonResponse(['error' => 'Le libellé du régime est obligatoire.'], Response::HTTP_BAD_REQUEST);
        }

        $regime = new Regime();
        $regime->setLibelle($data['libelle']);

        $em->persist($regime);
        $em->flush();

        return new JsonResponse([
            'message' => 'Régime créé avec succès.',
            'regime' => $this->serializeRegime($regime)
        ], Response::HTTP_CREATED);
    }

    /**
     * Modifier un régime (Admin uniquement)
     */
    #[Route('/{id}', name: 'regime_update', methods: ['PUT', 'PATCH'])]
    #[IsGranted('ROLE_ADMIN', message: 'Accès refusé. Seul un administrateur peut modifier un régime.')]
    #[OA\Put(
        path: '/api/regimes/{id}',
        summary: 'Modifier un régime (Admin uniquement)',
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))
        ],
        requestBody: new OA\RequestBody(
            content: new OA\JsonContent(
                properties: [
                    new OA\Property(property: 'libelle', type: 'string', example: 'Végétalien')
                ]
            )
        ),
        responses: [
            new OA\Response(response: 200, description: 'Régime mis à jour avec succès'),
            new OA\Response(response: 404, description: 'Régime non trouvé')
        ]
    )]
    public function update(int $id, Request $request, RegimeRepository $regimeRepository, EntityManagerInterface $em): JsonResponse
    {
        $regime = $regimeRepository->find($id);

        if (!$regime) {
            return new JsonResponse(['error' => 'Régime non trouvé.'], Response::HTTP_NOT_FOUND);
        }

        $data = json_decode($request->getContent(), true);

        if (isset($data['libelle'])) {
            $regime->setLibelle($data['libelle']);
        }

        $em->flush();

        return new JsonResponse([
            'message' => 'Régime mis à jour avec succès.',
            'regime' => $this->serializeRegime($regime)
        ], Response::HTTP_OK);
    }

    /**
     * Supprimer un régime (Admin uniquement)
     */
    #[Route('/{id}', name: 'regime_delete', methods: ['DELETE'])]
    #[IsGranted('ROLE_ADMIN', message: 'Accès refusé. Seul un administrateur peut supprimer un régime.')]
    #[OA\Delete(
        path: '/api/regimes/{id}',
        summary: 'Supprimer un régime (Admin uniquement)',
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))
        ],
        responses: [
            new OA\Response(response: 200, description: 'Régime supprimé avec succès'),
            new OA\Response(response: 404, description: 'Régime non trouvé')
        ]
    )]
    public function delete(int $id, RegimeRepository $regimeRepository, EntityManagerInterface $em): JsonResponse
    {
        $regime = $regimeRepository->find($id);

        if (!$regime) {
            return new JsonResponse(['error' => 'Régime non trouvé.'], Response::HTTP_NOT_FOUND);
        }

        $em->remove($regime);
        $em->flush();

        return new JsonResponse(['message' => 'Régime supprimé avec succès.'], Response::HTTP_OK);
    }

    /**
     * Sérialisation de l'objet Regime en tableau JSON
     */
    private function serializeRegime(Regime $regime): array
    {
        return [
            'regimeId' => $regime->getRegimeId(),
            'libelle' => $regime->getLibelle(),
        ];
    }
}