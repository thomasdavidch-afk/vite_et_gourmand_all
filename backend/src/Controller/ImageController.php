<?php

namespace App\Controller;

use App\Entity\Image;
use App\Repository\ImageRepository;
use Doctrine\ORM\EntityManagerInterface;
use OpenApi\Attributes as OA;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\File\Exception\FileException;
use Symfony\Component\HttpFoundation\File\UploadedFile;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;
use Symfony\Component\String\Slugger\SluggerInterface;

#[Route('/api/images')]
#[OA\Tag(name: 'Images')]
class ImageController extends AbstractController
{
    /**
     * Obtenir la liste de toutes les images
     */
    #[Route('', name: 'image_index', methods: ['GET'])]
    #[OA\Get(
        path: '/api/images',
        summary: 'Obtenir la liste de toutes les images',
        responses: [
            new OA\Response(response: 200, description: 'Liste des images récupérée avec succès')
        ]
    )]
    public function index(ImageRepository $imageRepository): JsonResponse
    {
        $images = $imageRepository->findAll();

        $data = array_map(function (Image $image) {
            return $this->serializeImage($image);
        }, $images);

        return new JsonResponse($data, Response::HTTP_OK);
    }

    /**
     * Obtenir les détails d'une image par son ID
     */
    #[Route('/{id}', name: 'image_show', methods: ['GET'])]
    #[OA\Get(
        path: '/api/images/{id}',
        summary: 'Obtenir les détails d\'une image',
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))
        ],
        responses: [
            new OA\Response(response: 200, description: 'Détails de l\'image'),
            new OA\Response(response: 404, description: 'Image non trouvée')
        ]
    )]
    public function show(int $id, ImageRepository $imageRepository): JsonResponse
    {
        $image = $imageRepository->find($id);

        if (!$image) {
            return new JsonResponse(['error' => 'Image non trouvée.'], Response::HTTP_NOT_FOUND);
        }

        return new JsonResponse($this->serializeImage($image), Response::HTTP_OK);
    }

    /**
     * Uploader / Créer une nouvelle image (Admin uniquement)
     */
    #[Route('', name: 'image_create', methods: ['POST'])]
    #[IsGranted('ROLE_ADMIN', message: 'Accès refusé. Seul un administrateur peut ajouter une image.')]
    #[OA\Post(
        path: '/api/images',
        summary: 'Uploader une nouvelle image (Admin uniquement)',
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\MediaType(
                mediaType: 'multipart/form-data',
                schema: new OA\Schema(
                    properties: [
                        new OA\Property(property: 'file', type: 'string', format: 'binary', description: 'Le fichier image à uploader')
                    ],
                    required: ['file']
                )
            )
        ),
        responses: [
            new OA\Response(response: 201, description: 'Image uploadée avec succès'),
            new OA\Response(response: 400, description: 'Fichier image obligatoire'),
            new OA\Response(response: 403, description: 'Accès refusé'),
            new OA\Response(response: 500, description: 'Erreur lors de l\'enregistrement du fichier')
        ]
    )]
    public function create(
        Request $request, 
        SluggerInterface $slugger, 
        EntityManagerInterface $em
    ): JsonResponse {
        /** @var UploadedFile $uploadedFile */
        $uploadedFile = $request->files->get('file');

        if (!$uploadedFile) {
            return new JsonResponse(['error' => 'Le fichier image est obligatoire.'], Response::HTTP_BAD_REQUEST);
        }

        $originalFilename = pathinfo($uploadedFile->getClientOriginalName(), PATHINFO_FILENAME);
        $safeFilename = $slugger->slug($originalFilename);
        $newFilename = $safeFilename . '-' . uniqid() . '.' . $uploadedFile->guessExtension();

        try {
            $uploadedFile->move(
                $this->getParameter('images_directory'),
                $newFilename
            );
        } catch (FileException $e) {
            return new JsonResponse(['error' => 'Erreur lors du déplacement de l\'image.'], Response::HTTP_INTERNAL_SERVER_ERROR);
        }

        $image = new Image();
        if (method_exists($image, 'setUrl')) {
            $image->setUrl('/uploads/images/' . $newFilename);
        }
        if (method_exists($image, 'setNom')) {
            $image->setNom($newFilename);
        }

        $em->persist($image);
        $em->flush();

        return new JsonResponse([
            'message' => 'Image créée avec succès.',
            'image' => $this->serializeImage($image)
        ], Response::HTTP_CREATED);
    }

    /**
     * Modifier une image / Remplacer le fichier (Admin uniquement)
     */
    #[Route('/{id}', name: 'image_update', methods: ['POST', 'PUT'])]
    #[IsGranted('ROLE_ADMIN', message: 'Accès refusé. Seul un administrateur peut modifier une image.')]
    #[OA\Post(
        path: '/api/images/{id}',
        summary: 'Remplacer une image existante (Admin uniquement)',
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))
        ],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\MediaType(
                mediaType: 'multipart/form-data',
                schema: new OA\Schema(
                    properties: [
                        new OA\Property(property: 'file', type: 'string', format: 'binary', description: 'Le nouveau fichier image')
                    ]
                )
            )
        ),
        responses: [
            new OA\Response(response: 200, description: 'Image mise à jour avec succès'),
            new OA\Response(response: 404, description: 'Image non trouvée'),
            new OA\Response(response: 403, description: 'Accès refusé')
        ]
    )]
    public function update(
        int $id, 
        Request $request, 
        ImageRepository $imageRepository, 
        SluggerInterface $slugger, 
        EntityManagerInterface $em
    ): JsonResponse {
        $image = $imageRepository->find($id);

        if (!$image) {
            return new JsonResponse(['error' => 'Image non trouvée.'], Response::HTTP_NOT_FOUND);
        }

        /** @var UploadedFile $uploadedFile */
        $uploadedFile = $request->files->get('file');

        if ($uploadedFile) {
            // Supprimer l'ancien fichier s'il existe
            if (method_exists($image, 'getNom') && $image->getNom()) {
                $oldFilePath = $this->getParameter('images_directory') . '/' . $image->getNom();
                if (file_exists($oldFilePath)) {
                    unlink($oldFilePath);
                }
            }

            // Upload du nouveau fichier
            $originalFilename = pathinfo($uploadedFile->getClientOriginalName(), PATHINFO_FILENAME);
            $safeFilename = $slugger->slug($originalFilename);
            $newFilename = $safeFilename . '-' . uniqid() . '.' . $uploadedFile->guessExtension();

            try {
                $uploadedFile->move(
                    $this->getParameter('images_directory'),
                    $newFilename
                );
            } catch (FileException $e) {
                return new JsonResponse(['error' => 'Erreur lors du déplacement de l\'image.'], Response::HTTP_INTERNAL_SERVER_ERROR);
            }

            if (method_exists($image, 'setUrl')) {
                $image->setUrl('/uploads/images/' . $newFilename);
            }
            if (method_exists($image, 'setNom')) {
                $image->setNom($newFilename);
            }

            $em->flush();
        }

        return new JsonResponse([
            'message' => 'Image mise à jour avec succès.',
            'image' => $this->serializeImage($image)
        ], Response::HTTP_OK);
    }

    /**
     * Supprimer une image (Admin uniquement)
     */
    #[Route('/{id}', name: 'image_delete', methods: ['DELETE'])]
    #[IsGranted('ROLE_ADMIN', message: 'Accès refusé. Seul un administrateur peut supprimer une image.')]
    #[OA\Delete(
        path: '/api/images/{id}',
        summary: 'Supprimer une image (Admin uniquement)',
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))
        ],
        responses: [
            new OA\Response(response: 200, description: 'Image supprimée avec succès'),
            new OA\Response(response: 404, description: 'Image non trouvée'),
            new OA\Response(response: 403, description: 'Accès refusé')
        ]
    )]
    public function delete(int $id, ImageRepository $imageRepository, EntityManagerInterface $em): JsonResponse
    {
        $image = $imageRepository->find($id);

        if (!$image) {
            return new JsonResponse(['error' => 'Image non trouvée.'], Response::HTTP_NOT_FOUND);
        }

        // Suppression physique du fichier sur le disque dur
        if (method_exists($image, 'getNom') && $image->getNom()) {
            $filePath = $this->getParameter('images_directory') . '/' . $image->getNom();
            if (file_exists($filePath)) {
                unlink($filePath);
            }
        }

        $em->remove($image);
        $em->flush();

        return new JsonResponse(['message' => 'Image supprimée avec succès.'], Response::HTTP_OK);
    }

    /**
     * Sérialisation de l'objet Image en tableau JSON
     */
    private function serializeImage(Image $image): array
    {
        return [
            'imageId' => method_exists($image, 'getImageId') ? $image->getImageId() : $image->getId(),
            'nom'     => method_exists($image, 'getNom') ? $image->getNom() : null,
            'url'     => method_exists($image, 'getUrl') ? $image->getUrl() : null,
        ];
    }
}