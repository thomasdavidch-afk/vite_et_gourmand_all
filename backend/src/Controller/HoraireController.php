<?php

namespace App\Controller;

use App\Document\Horaire;
use Doctrine\ODM\MongoDB\DocumentManager;
use OpenApi\Attributes as OA;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/api/horaires')]
#[OA\Tag(name: 'Horaires (NoSQL)')]
class HoraireController extends AbstractController
{
    /**
     * Récupérer la liste de tous les horaires (Accès public)
     */
    #[Route('', name: 'horaire_index', methods: ['GET'])]
    #[OA\Get(
        summary: 'Obtenir tous les horaires d\'ouverture (NoSQL)',
        responses: [
            new OA\Response(response: 200, description: 'Liste des horaires récupérée avec succès')
        ]
    )]
    public function index(DocumentManager $dm): JsonResponse
    {
        $horaires = $dm->getRepository(Horaire::class)->findAll();

        $data = array_map(fn(Horaire $h) => $this->serializeHoraire($h), $horaires);

        return new JsonResponse($data, Response::HTTP_OK);
    }

    /**
     * Récupérer un horaire spécifique par son ID MongoDB
     */
    #[Route('/{id}', name: 'horaire_show', methods: ['GET'])]
    #[OA\Get(
        summary: 'Obtenir un horaire par son ID MongoDB',
        responses: [
            new OA\Response(response: 200, description: 'Détails de l\'horaire'),
            new OA\Response(response: 404, description: 'Horaire non trouvé')
        ]
    )]
    public function show(string $id, DocumentManager $dm): JsonResponse
    {
        $horaire = $dm->getRepository(Horaire::class)->find($id);

        if (!$horaire) {
            return new JsonResponse(['error' => 'Horaire non trouvé.'], Response::HTTP_NOT_FOUND);
        }

        return new JsonResponse($this->serializeHoraire($horaire), Response::HTTP_OK);
    }

    /**
     * Ajouter un nouvel horaire (Réservé aux ADMIN / EMPLOYE)
     */
    #[Route('', name: 'horaire_create', methods: ['POST'])]
    #[IsGranted('ROLE_EMPLOYE')]
    #[OA\Post(
        summary: 'Créer un horaire (Réservé aux Employés/Admins)',
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                properties: [
                    new OA\Property(property: 'jour', type: 'string', example: 'Lundi'),
                    new OA\Property(property: 'heureOuverture', type: 'string', example: '12:00'),
                    new OA\Property(property: 'heureFermeture', type: 'string', example: '14:30'),
                    new OA\Property(property: 'ferme', type: 'boolean', example: false)
                ]
            )
        ),
        responses: [
            new OA\Response(response: 201, description: 'Horaire créé'),
            new OA\Response(response: 400, description: 'Données invalides')
        ]
    )]
    public function create(Request $request, DocumentManager $dm): JsonResponse
    {
        $data = json_decode($request->getContent(), true);

        if (empty($data['jour'])) {
            return new JsonResponse(['error' => 'Le champ "jour" est obligatoire.'], Response::HTTP_BAD_REQUEST);
        }

        $horaire = new Horaire();
        $horaire->setJour($data['jour']);
        $horaire->setHeureOuverture($data['heureOuverture'] ?? null);
        $horaire->setHeureFermeture($data['heureFermeture'] ?? null);
        $horaire->setFerme($data['ferme'] ?? false);

        $dm->persist($horaire);
        $dm->flush();

        return new JsonResponse([
            'message' => 'Horaire créé avec succès dans la base NoSQL.',
            'horaire' => $this->serializeHoraire($horaire)
        ], Response::HTTP_CREATED);
    }

    /**
     * Mettre à jour un horaire existant (Réservé aux ADMIN / EMPLOYE)
     */
    #[Route('/{id}', name: 'horaire_update', methods: ['PUT', 'PATCH'])]
    #[IsGranted('ROLE_EMPLOYE')]
    #[OA\Put(
        summary: 'Modifier un horaire (Réservé aux Employés/Admins)',
        responses: [
            new OA\Response(response: 200, description: 'Horaire mis à jour'),
            new OA\Response(response: 404, description: 'Horaire non trouvé')
        ]
    )]
    public function update(string $id, Request $request, DocumentManager $dm): JsonResponse
    {
        $horaire = $dm->getRepository(Horaire::class)->find($id);

        if (!$horaire) {
            return new JsonResponse(['error' => 'Horaire non trouvé.'], Response::HTTP_NOT_FOUND);
        }

        $data = json_decode($request->getContent(), true);

        if (isset($data['jour'])) {
            $horaire->setJour($data['jour']);
        }
        if (array_key_exists('heureOuverture', $data)) {
            $horaire->setHeureOuverture($data['heureOuverture']);
        }
        if (array_key_exists('heureFermeture', $data)) {
            $horaire->setHeureFermeture($data['heureFermeture']);
        }
        if (isset($data['ferme'])) {
            $horaire->setFerme((bool)$data['ferme']);
        }

        $dm->flush();

        return new JsonResponse([
            'message' => 'Horaire mis à jour avec succès.',
            'horaire' => $this->serializeHoraire($horaire)
        ], Response::HTTP_OK);
    }

    /**
     * Supprimer un horaire (Réservé aux ADMIN / EMPLOYE)
     */
    #[Route('/{id}', name: 'horaire_delete', methods: ['DELETE'])]
    #[IsGranted('ROLE_EMPLOYE')]
    #[OA\Delete(
        summary: 'Supprimer un horaire (Réservé aux Employés/Admins)',
        responses: [
            new OA\Response(response: 200, description: 'Horaire supprimé'),
            new OA\Response(response: 404, description: 'Horaire non trouvé')
        ]
    )]
    public function delete(string $id, DocumentManager $dm): JsonResponse
    {
        $horaire = $dm->getRepository(Horaire::class)->find($id);

        if (!$horaire) {
            return new JsonResponse(['error' => 'Horaire non trouvé.'], Response::HTTP_NOT_FOUND);
        }

        $dm->remove($horaire);
        $dm->flush();

        return new JsonResponse(['message' => 'Horaire supprimé avec succès de NoSQL.'], Response::HTTP_OK);
    }

    /**
     * Helper de sérialisation
     */
    private function serializeHoraire(Horaire $horaire): array
    {
        return [
            'id'             => $horaire->getId(),
            'jour'           => $horaire->getJour(),
            'heureOuverture' => $horaire->getHeureOuverture(),
            'heureFermeture' => $horaire->getHeureFermeture(),
            'ferme'          => $horaire->isFerme(),
        ];
    }
}