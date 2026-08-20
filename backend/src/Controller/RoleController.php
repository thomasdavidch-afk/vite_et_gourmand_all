<?php

namespace App\Controller;

use App\Entity\Role;
use App\Entity\Utilisateur;
use App\Repository\RoleRepository;
use Doctrine\ORM\EntityManagerInterface;
use OpenApi\Attributes as OA;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/api/roles')]
#[OA\Tag(name: 'Rôles')]
class RoleController extends AbstractController
{
    /**
     * Obtenir la liste de tous les rôles
     */
    #[Route('', name: 'role_index', methods: ['GET'])]
    #[IsGranted('ROLE_ADMIN', message: 'Accès refusé. Seul un administrateur peut voir la liste des rôles.')]
    #[OA\Get(
        path: '/api/roles',
        summary: 'Obtenir la liste de tous les rôles (Admin uniquement)',
        responses: [
            new OA\Response(response: 200, description: 'Liste des rôles récupérée avec succès'),
            new OA\Response(response: 403, description: 'Accès refusé')
        ]
    )]
    public function index(RoleRepository $roleRepository): JsonResponse
    {
        $roles = $roleRepository->findAll();

        $data = array_map(function (Role $role) {
            return $this->serializeRole($role);
        }, $roles);

        return new JsonResponse($data, Response::HTTP_OK);
    }

    /**
     * Obtenir les détails d'un rôle par son ID
     */
    #[Route('/{id}', name: 'role_show', methods: ['GET'])]
    #[IsGranted('ROLE_ADMIN', message: 'Accès refusé. Seul un administrateur peut voir un rôle.')]
    #[OA\Get(
        path: '/api/roles/{id}',
        summary: 'Obtenir les détails d\'un rôle (Admin uniquement)',
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))
        ],
        responses: [
            new OA\Response(response: 200, description: 'Détails du rôle'),
            new OA\Response(response: 404, description: 'Rôle non trouvé'),
            new OA\Response(response: 403, description: 'Accès refusé')
        ]
    )]
    public function show(int $id, RoleRepository $roleRepository): JsonResponse
    {
        $role = $roleRepository->find($id);

        if (!$role) {
            return new JsonResponse(['error' => 'Rôle non trouvé.'], Response::HTTP_NOT_FOUND);
        }

        return new JsonResponse($this->serializeRole($role), Response::HTTP_OK);
    }

    /**
     * Créer un nouveau rôle (Admin uniquement)
     */
    #[Route('', name: 'role_create', methods: ['POST'])]
    #[IsGranted('ROLE_ADMIN', message: 'Accès refusé. Seul un administrateur peut ajouter un rôle.')]
    #[OA\Post(
        path: '/api/roles',
        summary: 'Créer un nouveau rôle (Admin uniquement)',
        requestBody: new OA\RequestBody(
            content: new OA\JsonContent(
                required: ['libelle'],
                properties: [
                    new OA\Property(property: 'libelle', type: 'string', example: 'ROLE_ADMIN')
                ]
            )
        ),
        responses: [
            new OA\Response(response: 201, description: 'Rôle créé avec succès'),
            new OA\Response(response: 400, description: 'Libellé obligatoire'),
            new OA\Response(response: 403, description: 'Accès refusé')
        ]
    )]
    public function create(Request $request, EntityManagerInterface $em): JsonResponse
    {
        $data = json_decode($request->getContent(), true);

        if (empty($data['libelle'])) {
            return new JsonResponse(['error' => 'Le libellé du rôle est obligatoire.'], Response::HTTP_BAD_REQUEST);
        }

        $role = new Role();
        $role->setLibelle($data['libelle']);

        $em->persist($role);
        $em->flush();

        return new JsonResponse([
            'message' => 'Rôle créé avec succès.',
            'role' => $this->serializeRole($role)
        ], Response::HTTP_CREATED);
    }

    /**
     * Modifier un rôle (Admin uniquement)
     */
    #[Route('/{id}', name: 'role_update', methods: ['PUT', 'PATCH'])]
    #[IsGranted('ROLE_ADMIN', message: 'Accès refusé. Seul un administrateur peut modifier un rôle.')]
    #[OA\Put(
        path: '/api/roles/{id}',
        summary: 'Modifier un rôle (Admin uniquement)',
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))
        ],
        requestBody: new OA\RequestBody(
            content: new OA\JsonContent(
                properties: [
                    new OA\Property(property: 'libelle', type: 'string', example: 'ROLE_USER')
                ]
            )
        ),
        responses: [
            new OA\Response(response: 200, description: 'Rôle mis à jour avec succès'),
            new OA\Response(response: 404, description: 'Rôle non trouvé'),
            new OA\Response(response: 403, description: 'Accès refusé')
        ]
    )]
    public function update(int $id, Request $request, RoleRepository $roleRepository, EntityManagerInterface $em): JsonResponse
    {
        $role = $roleRepository->find($id);

        if (!$role) {
            return new JsonResponse(['error' => 'Rôle non trouvé.'], Response::HTTP_NOT_FOUND);
        }

        $data = json_decode($request->getContent(), true);

        if (isset($data['libelle'])) {
            $role->setLibelle($data['libelle']);
        }

        $em->flush();

        return new JsonResponse([
            'message' => 'Rôle mis à jour avec succès.',
            'role' => $this->serializeRole($role)
        ], Response::HTTP_OK);
    }

    /**
     * Supprimer un rôle (Admin uniquement)
     */
    #[Route('/{id}', name: 'role_delete', methods: ['DELETE'])]
    #[IsGranted('ROLE_ADMIN', message: 'Accès refusé. Seul un administrateur peut supprimer un rôle.')]
    #[OA\Delete(
        path: '/api/roles/{id}',
        summary: 'Supprimer un rôle (Admin uniquement)',
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))
        ],
        responses: [
            new OA\Response(response: 200, description: 'Rôle supprimé avec succès'),
            new OA\Response(response: 404, description: 'Rôle non trouvé'),
            new OA\Response(response: 403, description: 'Accès refusé')
        ]
    )]
    public function delete(int $id, RoleRepository $roleRepository, EntityManagerInterface $em): JsonResponse
    {
        $role = $roleRepository->find($id);

        if (!$role) {
            return new JsonResponse(['error' => 'Rôle non trouvé.'], Response::HTTP_NOT_FOUND);
        }

        $em->remove($role);
        $em->flush();

        return new JsonResponse(['message' => 'Rôle supprimé avec succès.'], Response::HTTP_OK);
    }

    /**
     * Sérialisation de l'objet Role en tableau JSON
     */
    private function serializeRole(Role $role): array
    {
        $utilisateursData = [];
        foreach ($role->getUtilisateurs() as $utilisateur) {
            $utilisateursData[] = [
                'utilisateurId' => method_exists($utilisateur, 'getUtilisateurId') ? $utilisateur->getUtilisateurId() : $utilisateur->getId(),
                'email'         => method_exists($utilisateur, 'getEmail') ? $utilisateur->getEmail() : null,
                'nom'           => method_exists($utilisateur, 'getNom') ? $utilisateur->getNom() : null,
                'prenom'        => method_exists($utilisateur, 'getPrenom') ? $utilisateur->getPrenom() : null,
            ];
        }

        return [
            'roleId'       => $role->getRoleId(),
            'libelle'      => $role->getLibelle(),
            'utilisateurs' => $utilisateursData,
        ];
    }
}