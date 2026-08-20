<?php

namespace App\Controller;

use App\Entity\Allergene;
use App\Repository\AllergeneRepository;
use Doctrine\ORM\EntityManagerInterface;
use OpenApi\Attributes as OA;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/api/allergenes')]
#[OA\Tag(name: 'Allergènes')]
class AllergeneController extends AbstractController
{
    /**
     * Obtenir la liste de tous les allergènes
     */
    #[Route('', name: 'allergene_index', methods: ['GET'])]
    #[OA\Get(
        path: '/api/allergenes',
        summary: 'Obtenir la liste de tous les allergènes',
        responses: [
            new OA\Response(response: 200, description: 'Liste des allergènes récupérée avec succès')
        ]
    )]
    public function index(AllergeneRepository $allergeneRepository): JsonResponse
    {
        $allergenes = $allergeneRepository->findAll();

        $data = array_map(function (Allergene $allergene) {
            return $this->serializeAllergene($allergene);
        }, $allergenes);

        return new JsonResponse($data, Response::HTTP_OK);
    }

    /**
     * Obtenir les détails d'un allergène par son ID
     */
    #[Route('/{id}', name: 'allergene_show', methods: ['GET'])]
    #[OA\Get(
        path: '/api/allergenes/{id}',
        summary: 'Obtenir les détails d\'un allergène',
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))
        ],
        responses: [
            new OA\Response(response: 200, description: 'Détails de l\'allergène'),
            new OA\Response(response: 404, description: 'Allergène non trouvé')
        ]
    )]
    public function show(int $id, AllergeneRepository $allergeneRepository): JsonResponse
    {
        $allergene = $allergeneRepository->find($id);

        if (!$allergene) {
            return new JsonResponse(['error' => 'Allergène non trouvé.'], Response::HTTP_NOT_FOUND);
        }

        return new JsonResponse($this->serializeAllergene($allergene), Response::HTTP_OK);
    }

    /**
     * Créer un ou plusieurs allergènes (Admin uniquement)
     */
    #[Route('', name: 'allergene_create', methods: ['POST'])]
    #[IsGranted('ROLE_ADMIN', message: 'Accès refusé. Seul un administrateur peut ajouter un allergène.')]
    #[OA\Post(
        path: '/api/allergenes',
        summary: 'Créer un ou plusieurs allergènes (Admin uniquement)',
        requestBody: new OA\RequestBody(
            content: new OA\JsonContent(
                oneOf: [
                    new OA\Schema(
                        title: 'Ajout unique',
                        required: ['libelle'],
                        properties: [
                            new OA\Property(property: 'libelle', type: 'string', example: 'Gluten')
                        ]
                    ),
                    new OA\Schema(
                        title: 'Ajout multiple',
                        type: 'array',
                        items: new OA\Items(
                            required: ['libelle'],
                            properties: [
                                new OA\Property(property: 'libelle', type: 'string', example: 'Gluten')
                            ]
                        )
                    )
                ]
            )
        ),
        responses: [
            new OA\Response(response: 201, description: 'Allergène(s) créé(s) avec succès'),
            new OA\Response(response: 400, description: 'Données invalides ou libellé manquant'),
            new OA\Response(response: 403, description: 'Accès refusé')
        ]
    )]
    public function create(Request $request, EntityManagerInterface $em): JsonResponse
    {
        $data = json_decode($request->getContent(), true);

        if (!$data) {
            return new JsonResponse(['error' => 'Données JSON invalides.'], Response::HTTP_BAD_REQUEST);
        }

        // Cas 1 : Ajout multiple (tableau d'objets)
        if (array_is_list($data)) {
            $createdAllergenes = [];

            foreach ($data as $item) {
                if (!empty($item['libelle'])) {
                    $allergene = new Allergene();
                    $allergene->setLibelle($item['libelle']);
                    $em->persist($allergene);
                    $createdAllergenes[] = $allergene;
                }
            }

            if (empty($createdAllergenes)) {
                return new JsonResponse(['error' => 'Aucun libellé valide n\'a été fourni.'], Response::HTTP_BAD_REQUEST);
            }

            $em->flush();

            $result = array_map(fn(Allergene $a) => $this->serializeAllergene($a), $createdAllergenes);

            return new JsonResponse([
                'message' => count($createdAllergenes) . ' allergène(s) créé(s) avec succès.',
                'allergenes' => $result
            ], Response::HTTP_CREATED);
        }

        // Cas 2 : Ajout unique (objet simple)
        if (!empty($data['libelle'])) {
            $allergene = new Allergene();
            $allergene->setLibelle($data['libelle']);

            $em->persist($allergene);
            $em->flush();

            return new JsonResponse([
                'message' => 'Allergène créé avec succès.',
                'allergene' => $this->serializeAllergene($allergene)
            ], Response::HTTP_CREATED);
        }

        return new JsonResponse(['error' => 'Le libellé de l\'allergène est obligatoire.'], Response::HTTP_BAD_REQUEST);
    }

    /**
     * Modifier un allergène (Admin uniquement)
     */
    #[Route('/{id}', name: 'allergene_update', methods: ['PUT', 'PATCH'])]
    #[IsGranted('ROLE_ADMIN', message: 'Accès refusé. Seul un administrateur peut modifier un allergène.')]
    #[OA\Put(
        path: '/api/allergenes/{id}',
        summary: 'Modifier un allergène (Admin uniquement)',
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))
        ],
        requestBody: new OA\RequestBody(
            content: new OA\JsonContent(
                properties: [
                    new OA\Property(property: 'libelle', type: 'string', example: 'Arachides')
                ]
            )
        ),
        responses: [
            new OA\Response(response: 200, description: 'Allergène mis à jour avec succès'),
            new OA\Response(response: 404, description: 'Allergène non trouvé')
        ]
    )]
    public function update(int $id, Request $request, AllergeneRepository $allergeneRepository, EntityManagerInterface $em): JsonResponse
    {
        $allergene = $allergeneRepository->find($id);

        if (!$allergene) {
            return new JsonResponse(['error' => 'Allergène non trouvé.'], Response::HTTP_NOT_FOUND);
        }

        $data = json_decode($request->getContent(), true);

        if (isset($data['libelle'])) {
            $allergene->setLibelle($data['libelle']);
        }

        $em->flush();

        return new JsonResponse([
            'message' => 'Allergène mis à jour avec succès.',
            'allergene' => $this->serializeAllergene($allergene)
        ], Response::HTTP_OK);
    }

    /**
     * Supprimer un allergène (Admin uniquement)
     */
    #[Route('/{id}', name: 'allergene_delete', methods: ['DELETE'])]
    #[IsGranted('ROLE_ADMIN', message: 'Accès refusé. Seul un administrateur peut supprimer un allergène.')]
    #[OA\Delete(
        path: '/api/allergenes/{id}',
        summary: 'Supprimer un allergène (Admin uniquement)',
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))
        ],
        responses: [
            new OA\Response(response: 200, description: 'Allergène supprimé avec succès'),
            new OA\Response(response: 404, description: 'Allergène non trouvé')
        ]
    )]
    public function delete(int $id, AllergeneRepository $allergeneRepository, EntityManagerInterface $em): JsonResponse
    {
        $allergene = $allergeneRepository->find($id);

        if (!$allergene) {
            return new JsonResponse(['error' => 'Allergène non trouvé.'], Response::HTTP_NOT_FOUND);
        }

        $em->remove($allergene);
        $em->flush();

        return new JsonResponse(['message' => 'Allergène supprimé avec succès.'], Response::HTTP_OK);
    }

    /**
     * Sérialisation de l'objet Allergene en tableau JSON
     */
    private function serializeAllergene(Allergene $allergene): array
    {
        return [
            'allergeneId' => $allergene->getAllergeneId(),
            'libelle' => $allergene->getLibelle(),
        ];
    }
}