<?php

namespace App\Controller;

use App\Entity\Avis;
use App\Repository\AvisRepository;
use Doctrine\ORM\EntityManagerInterface;
use OpenApi\Attributes as OA;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/api/avis')]
#[OA\Tag(name: 'Avis')]
class AvisController extends AbstractController
{
    /**
     * Obtenir la liste de tous les avis (ou filtrer par état de validation)
     */
    #[Route('', name: 'avis_index', methods: ['GET'])]
    #[OA\Get(
        path: '/api/avis',
        summary: 'Obtenir la liste des avis',
        parameters: [
            new OA\Parameter(
                name: 'valide',
                in: 'query',
                description: 'Filtrer par statut de validation (true/false)',
                required: false,
                schema: new OA\Schema(type: 'boolean')
            )
        ],
        responses: [
            new OA\Response(response: 200, description: 'Liste des avis récupérée avec succès')
        ]
    )]
    public function index(Request $request, AvisRepository $avisRepository): JsonResponse
    {
        try {
            $valideFilter = $request->query->get('valide');

            if ($valideFilter !== null) {
                $isValide = filter_var($valideFilter, FILTER_VALIDATE_BOOLEAN);
                // Tentative de recherche par le champ 'valide'
                try {
                    $avisList = $avisRepository->findBy(['valide' => $isValide]);
                } catch (\Throwable $e) {
                    // Si le champ s'appelle 'statut' ou autre dans l'entité
                    $avisList = $avisRepository->findAll();
                    $avisList = array_filter($avisList, function (Avis $a) use ($isValide) {
                        return $this->extractValideState($a) === $isValide;
                    });
                }
            } else {
                $avisList = $avisRepository->findAll();
            }

            $data = [];
            foreach ($avisList as $avis) {
                $data[] = $this->serializeAvis($avis);
            }

            return new JsonResponse($data, Response::HTTP_OK);
        } catch (\Throwable $e) {
            return new JsonResponse([
                'error' => 'Erreur lors de la récupération des avis',
                'details' => $e->getMessage()
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Obtenir les détails d'un avis par son ID
     */
    #[Route('/{id}', name: 'avis_show', methods: ['GET'])]
    #[OA\Get(
        path: '/api/avis/{id}',
        summary: 'Obtenir les détails d\'un avis',
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))
        ],
        responses: [
            new OA\Response(response: 200, description: 'Détails de l\'avis'),
            new OA\Response(response: 404, description: 'Avis non trouvé')
        ]
    )]
    public function show(int $id, AvisRepository $avisRepository): JsonResponse
    {
        $avis = $avisRepository->find($id);

        if (!$avis) {
            return new JsonResponse(['error' => 'Avis non trouvé.'], Response::HTTP_NOT_FOUND);
        }

        return new JsonResponse($this->serializeAvis($avis), Response::HTTP_OK);
    }

    /**
     * Publier un nouvel avis (Utilisateur connecté)
     */
    #[Route('', name: 'avis_create', methods: ['POST'])]
    #[IsGranted('ROLE_USER', message: 'Vous devez être connecté pour déposer un avis.')]
    #[OA\Post(
        path: '/api/avis',
        summary: 'Déposer un nouvel avis',
        requestBody: new OA\RequestBody(
            content: new OA\JsonContent(
                required: ['note', 'commentaire'],
                properties: [
                    new OA\Property(property: 'note', type: 'integer', example: 5),
                    new OA\Property(property: 'commentaire', type: 'string', example: 'Super expérience, repas délicieux !')
                ]
            )
        ),
        responses: [
            new OA\Response(response: 201, description: 'Avis enregistré avec succès (en attente de modération)'),
            new OA\Response(response: 400, description: 'Données invalides'),
            new OA\Response(response: 401, description: 'Non authentifié')
        ]
    )]
    public function create(Request $request, EntityManagerInterface $em): JsonResponse
    {
        $data = json_decode($request->getContent(), true);

        if (!isset($data['note']) || !isset($data['commentaire'])) {
            return new JsonResponse(['error' => 'La note et le commentaire sont obligatoires.'], Response::HTTP_BAD_REQUEST);
        }

        $note = (int) $data['note'];
        if ($note < 1 || $note > 5) {
            return new JsonResponse(['error' => 'La note doit être comprise entre 1 et 5.'], Response::HTTP_BAD_REQUEST);
        }

        $avis = new Avis();

        if (method_exists($avis, 'setNote')) {
            $avis->setNote($note);
        }
        if (method_exists($avis, 'setCommentaire')) {
            $avis->setCommentaire($data['commentaire']);
        }
        if (method_exists($avis, 'setValide')) {
            $avis->setValide(false);
        } elseif (method_exists($avis, 'setStatut')) {
            $avis->setStatut('EN_ATTENTE');
        }
        if (method_exists($avis, 'setDateCreation')) {
            $avis->setDateCreation(new \DateTime());
        } elseif (method_exists($avis, 'setDateAvis')) {
            $avis->setDateAvis(new \DateTime());
        }

        // Association utilisateur
        $user = $this->getUser();
        if ($user && method_exists($avis, 'setUtilisateur')) {
            $avis->setUtilisateur($user);
        }

        $em->persist($avis);
        $em->flush();

        return new JsonResponse([
            'message' => 'Avis envoyé avec succès. Il sera visible après validation.',
            'avis'    => $this->serializeAvis($avis)
        ], Response::HTTP_CREATED);
    }

    /**
     * Valider ou refuser un avis (Employé ou Admin)
     */
    #[Route('/{id}/valider', name: 'avis_validate', methods: ['PATCH'])]
    #[IsGranted('ROLE_EMPLOYE', message: 'Accès refusé. Seul un employé ou un administrateur peut modérer les avis.')]
    #[OA\Patch(
        path: '/api/avis/{id}/valider',
        summary: 'Valider ou refuser un avis (Employé / Admin)',
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))
        ],
        requestBody: new OA\RequestBody(
            content: new OA\JsonContent(
                required: ['valide'],
                properties: [
                    new OA\Property(property: 'valide', type: 'boolean', example: true)
                ]
            )
        ),
        responses: [
            new OA\Response(response: 200, description: 'Statut de l\'avis mis à jour'),
            new OA\Response(response: 404, description: 'Avis non trouvé'),
            new OA\Response(response: 403, description: 'Accès refusé')
        ]
    )]
    public function valider(int $id, Request $request, AvisRepository $avisRepository, EntityManagerInterface $em): JsonResponse
    {
        $avis = $avisRepository->find($id);

        if (!$avis) {
            return new JsonResponse(['error' => 'Avis non trouvé.'], Response::HTTP_NOT_FOUND);
        }

        $data = json_decode($request->getContent(), true);

        if (!isset($data['valide'])) {
            return new JsonResponse(['error' => 'Le champ valide est obligatoire.'], Response::HTTP_BAD_REQUEST);
        }

        $valide = (bool) $data['valide'];

        if (method_exists($avis, 'setValide')) {
            $avis->setValide($valide);
        }
        if (method_exists($avis, 'setStatut')) {
            $avis->setStatut($valide ? 'VALIDE' : 'REFUSE');
        }

        $em->flush();

        return new JsonResponse([
            'message' => 'Le statut de l\'avis a été mis à jour avec succès.',
            'avis'    => $this->serializeAvis($avis)
        ], Response::HTTP_OK);
    }

    /**
     * Supprimer un avis (Employé / Admin)
     */
    #[Route('/{id}', name: 'avis_delete', methods: ['DELETE'])]
    #[IsGranted('ROLE_EMPLOYE', message: 'Accès refusé. Seul un employé ou un administrateur peut supprimer un avis.')]
    #[OA\Delete(
        path: '/api/avis/{id}',
        summary: 'Supprimer un avis (Employé / Admin)',
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))
        ],
        responses: [
            new OA\Response(response: 200, description: 'Avis supprimé avec succès'),
            new OA\Response(response: 404, description: 'Avis non trouvé'),
            new OA\Response(response: 403, description: 'Accès refusé')
        ]
    )]
    public function delete(int $id, AvisRepository $avisRepository, EntityManagerInterface $em): JsonResponse
    {
        $avis = $avisRepository->find($id);

        if (!$avis) {
            return new JsonResponse(['error' => 'Avis non trouvé.'], Response::HTTP_NOT_FOUND);
        }

        $em->remove($avis);
        $em->flush();

        return new JsonResponse(['message' => 'Avis supprimé avec succès.'], Response::HTTP_OK);
    }

    /**
     * Détermine l'état booléen de validation
     */
    private function extractValideState(Avis $avis): bool
    {
        if (method_exists($avis, 'isValide')) {
            return (bool) $avis->isValide();
        }
        if (method_exists($avis, 'getValide')) {
            return (bool) $avis->getValide();
        }
        if (method_exists($avis, 'getStatut')) {
            return strtoupper((string) $avis->getStatut()) === 'VALIDE';
        }
        return false;
    }

    /**
     * Sérialisation de l'objet Avis en tableau JSON sans risque de Fatal Error
     */
    private function serializeAvis(Avis $avis): array
    {
        $userData = null;
        if (method_exists($avis, 'getUtilisateur') && $avis->getUtilisateur()) {
            $user = $avis->getUtilisateur();
            $userId = method_exists($user, 'getUtilisateurId') ? $user->getUtilisateurId() : (method_exists($user, 'getId') ? $user->getId() : null);
            $nom = method_exists($user, 'getNom') ? $user->getNom() : '';
            $prenom = method_exists($user, 'getPrenom') ? $user->getPrenom() : '';
            $email = method_exists($user, 'getEmail') ? $user->getEmail() : '';

            $userData = [
                'utilisateurId' => $userId,
                'nom'           => $nom,
                'prenom'        => $prenom,
                'email'         => $email
            ];
        }

        $avisId = method_exists($avis, 'getAvisId') ? $avis->getAvisId() : (method_exists($avis, 'getId') ? $avis->getId() : null);
        $note = method_exists($avis, 'getNote') ? $avis->getNote() : null;
        $commentaire = method_exists($avis, 'getCommentaire') ? $avis->getCommentaire() : null;
        
        $dateCreation = null;
        if (method_exists($avis, 'getDateCreation') && $avis->getDateCreation() instanceof \DateTimeInterface) {
            $dateCreation = $avis->getDateCreation()->format('Y-m-d H:i:s');
        } elseif (method_exists($avis, 'getDateAvis') && $avis->getDateAvis() instanceof \DateTimeInterface) {
            $dateCreation = $avis->getDateAvis()->format('Y-m-d H:i:s');
        }

        return [
            'avisId'       => $avisId,
            'id'           => $avisId,
            'note'         => $note,
            'commentaire'  => $commentaire,
            'valide'       => $this->extractValideState($avis),
            'dateCreation' => $dateCreation,
            'utilisateur'  => $userData,
        ];
    }
}