<?php

namespace App\Controller;

use App\Entity\Theme;
use App\Repository\ThemeRepository;
use Doctrine\ORM\EntityManagerInterface;
use OpenApi\Attributes as OA;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/api/themes')]
#[OA\Tag(name: 'Thèmes')]
class ThemeController extends AbstractController
{
    /**
     * Obtenir la liste de tous les thèmes
     */
    #[Route('', name: 'theme_index', methods: ['GET'])]
    #[OA\Get(
        path: '/api/themes',
        summary: 'Obtenir la liste de tous les thèmes',
        responses: [
            new OA\Response(response: 200, description: 'Liste des thèmes récupérée avec succès')
        ]
    )]
    public function index(ThemeRepository $themeRepository): JsonResponse
    {
        $themes = $themeRepository->findAll();

        $data = array_map(function (Theme $theme) {
            return $this->serializeTheme($theme);
        }, $themes);

        return new JsonResponse($data, Response::HTTP_OK);
    }

    /**
     * Obtenir les détails d'un thème par son ID
     */
    #[Route('/{id}', name: 'theme_show', methods: ['GET'])]
    #[OA\Get(
        path: '/api/themes/{id}',
        summary: 'Obtenir les détails d\'un thème',
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))
        ],
        responses: [
            new OA\Response(response: 200, description: 'Détails du thème'),
            new OA\Response(response: 404, description: 'Thème non trouvé')
        ]
    )]
    public function show(int $id, ThemeRepository $themeRepository): JsonResponse
    {
        $theme = $themeRepository->find($id);

        if (!$theme) {
            return new JsonResponse(['error' => 'Thème non trouvé.'], Response::HTTP_NOT_FOUND);
        }

        return new JsonResponse($this->serializeTheme($theme), Response::HTTP_OK);
    }

    /**
     * Créer un nouveau thème (Admin uniquement)
     */
    #[Route('', name: 'theme_create', methods: ['POST'])]
    #[IsGranted('ROLE_ADMIN', message: 'Accès refusé. Seul un administrateur peut ajouter un thème.')]
    #[OA\Post(
        path: '/api/themes',
        summary: 'Créer un nouveau thème (Admin uniquement)',
        requestBody: new OA\RequestBody(
            content: new OA\JsonContent(
                required: ['libelle'],
                properties: [
                    new OA\Property(property: 'libelle', type: 'string', example: 'Gastronomique')
                ]
            )
        ),
        responses: [
            new OA\Response(response: 201, description: 'Thème créé avec succès'),
            new OA\Response(response: 400, description: 'Libellé obligatoire'),
            new OA\Response(response: 403, description: 'Accès refusé')
        ]
    )]
    public function create(Request $request, EntityManagerInterface $em): JsonResponse
    {
        $data = json_decode($request->getContent(), true);

        if (empty($data['libelle'])) {
            return new JsonResponse(['error' => 'Le libellé du thème est obligatoire.'], Response::HTTP_BAD_REQUEST);
        }

        $theme = new Theme();
        $theme->setLibelle($data['libelle']);

        $em->persist($theme);
        $em->flush();

        return new JsonResponse([
            'message' => 'Thème créé avec succès.',
            'theme' => $this->serializeTheme($theme)
        ], Response::HTTP_CREATED);
    }

    /**
     * Modifier un thème (Admin uniquement)
     */
    #[Route('/{id}', name: 'theme_update', methods: ['PUT', 'PATCH'])]
    #[IsGranted('ROLE_ADMIN', message: 'Accès refusé. Seul un administrateur peut modifier un thème.')]
    #[OA\Put(
        path: '/api/themes/{id}',
        summary: 'Modifier un thème (Admin uniquement)',
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))
        ],
        requestBody: new OA\RequestBody(
            content: new OA\JsonContent(
                properties: [
                    new OA\Property(property: 'libelle', type: 'string', example: 'Champêtre')
                ]
            )
        ),
        responses: [
            new OA\Response(response: 200, description: 'Thème mis à jour avec succès'),
            new OA\Response(response: 404, description: 'Thème non trouvé')
        ]
    )]
    public function update(int $id, Request $request, ThemeRepository $themeRepository, EntityManagerInterface $em): JsonResponse
    {
        $theme = $themeRepository->find($id);

        if (!$theme) {
            return new JsonResponse(['error' => 'Thème non trouvé.'], Response::HTTP_NOT_FOUND);
        }

        $data = json_decode($request->getContent(), true);

        if (isset($data['libelle'])) {
            $theme->setLibelle($data['libelle']);
        }

        $em->flush();

        return new JsonResponse([
            'message' => 'Thème mis à jour avec succès.',
            'theme' => $this->serializeTheme($theme)
        ], Response::HTTP_OK);
    }

    /**
     * Supprimer un thème (Admin uniquement)
     */
    #[Route('/{id}', name: 'theme_delete', methods: ['DELETE'])]
    #[IsGranted('ROLE_ADMIN', message: 'Accès refusé. Seul un administrateur peut supprimer un thème.')]
    #[OA\Delete(
        path: '/api/themes/{id}',
        summary: 'Supprimer un thème (Admin uniquement)',
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))
        ],
        responses: [
            new OA\Response(response: 200, description: 'Thème supprimé avec succès'),
            new OA\Response(response: 404, description: 'Thème non trouvé')
        ]
    )]
    public function delete(int $id, ThemeRepository $themeRepository, EntityManagerInterface $em): JsonResponse
    {
        $theme = $themeRepository->find($id);

        if (!$theme) {
            return new JsonResponse(['error' => 'Thème non trouvé.'], Response::HTTP_NOT_FOUND);
        }

        $em->remove($theme);
        $em->flush();

        return new JsonResponse(['message' => 'Thème supprimé avec succès.'], Response::HTTP_OK);
    }

    /**
     * Sérialisation de l'objet Theme en tableau JSON
     */
    private function serializeTheme(Theme $theme): array
    {
        return [
            'themeId' => $theme->getThemeId(),
            'libelle' => $theme->getLibelle(),
        ];
    }
}