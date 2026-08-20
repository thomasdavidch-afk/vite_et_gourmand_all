<?php

namespace App\Controller;

use App\Entity\Image;
use App\Entity\Menu;
use App\Repository\ImageRepository;
use App\Repository\MenuRepository;
use App\Repository\PlatRepository;
use App\Repository\RegimeRepository;
use App\Repository\ThemeRepository;
use Doctrine\ORM\EntityManagerInterface;
use OpenApi\Attributes as OA;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\File\Exception\FileException;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;
use Symfony\Component\String\Slugger\SluggerInterface;

#[Route('/api/menus')]
#[OA\Tag(name: 'Menus')]
class MenuController extends AbstractController
{
    /**
     * Liste de tous les menus
     */
    #[Route('', name: 'menu_index', methods: ['GET'])]
    #[OA\Get(
        path: '/api/menus',
        summary: 'Obtenir la liste de tous les menus',
        responses: [
            new OA\Response(response: 200, description: 'Liste des menus récupérée avec succès')
        ]
    )]
    public function index(MenuRepository $menuRepository): JsonResponse
    {
        $menus = $menuRepository->findAll();

        $data = array_map(fn(Menu $menu) => $this->serializeMenu($menu), $menus);

        return new JsonResponse($data, Response::HTTP_OK);
    }

    /**
     * Détail d'un menu par son ID
     */
    #[Route('/{id}', name: 'menu_show', methods: ['GET'])]
    #[OA\Get(
        path: '/api/menus/{id}',
        summary: 'Obtenir les détails d\'un menu',
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))
        ],
        responses: [
            new OA\Response(response: 200, description: 'Menu trouvé'),
            new OA\Response(response: 404, description: 'Menu non trouvé')
        ]
    )]
    public function show(int $id, MenuRepository $menuRepository): JsonResponse
    {
        $menu = $menuRepository->find($id);

        if (!$menu) {
            return new JsonResponse(['error' => 'Menu non trouvé.'], Response::HTTP_NOT_FOUND);
        }

        return new JsonResponse($this->serializeMenu($menu), Response::HTTP_OK);
    }

    /**
     * Créer un ou plusieurs menus (Admin uniquement)
     */
    #[Route('', name: 'menu_create', methods: ['POST'])]
    #[IsGranted('ROLE_ADMIN', message: 'Accès refusé. Seul un administrateur peut ajouter un menu.')]
    #[OA\Post(
        path: '/api/menus',
        summary: 'Créer un ou plusieurs menus (Admin uniquement)',
        responses: [
            new OA\Response(response: 201, description: 'Menu(s) créé(s) avec succès'),
            new OA\Response(response: 400, description: 'Données invalides'),
            new OA\Response(response: 403, description: 'Accès refusé')
        ]
    )]
    public function create(
        Request $request,
        EntityManagerInterface $em,
        RegimeRepository $regimeRepository,
        ThemeRepository $themeRepository,
        PlatRepository $platRepository,
        ImageRepository $imageRepository,
        SluggerInterface $slugger
    ): JsonResponse {
        $data = $this->extractDataFromRequest($request);

        if (empty($data)) {
            return new JsonResponse(['error' => 'Les données transmises sont vides ou invalides.'], Response::HTTP_BAD_REQUEST);
        }

        // Si la requête contient une liste JSON (tableau numérique) -> Ajout multiple
        if (array_is_list($data)) {
            $createdMenus = [];

            foreach ($data as $index => $itemData) {
                if (empty($itemData['titre']) && empty($itemData['titreMenu'])) {
                    return new JsonResponse([
                        'error' => sprintf('Élément à l\'index %d invalide : Le titre est obligatoire.', $index)
                    ], Response::HTTP_BAD_REQUEST);
                }

                $menu = $this->buildMenuFromData($itemData, $regimeRepository, $themeRepository, $platRepository, $imageRepository);
                
                // Traitement photo si présent
                $this->handlePhotoUpload($request, $menu, $slugger, $em);

                $em->persist($menu);
                $createdMenus[] = $menu;
            }

            $em->flush();

            return new JsonResponse([
                'message' => count($createdMenus) . ' menu(s) créé(s) avec succès.',
                'menus' => array_map(fn(Menu $m) => $this->serializeMenu($m), $createdMenus)
            ], Response::HTTP_CREATED);
        }

        // Sinon -> Ajout simple d'un seul menu
        $titre = $data['titre'] ?? $data['titreMenu'] ?? null;
        if (empty($titre) || (!isset($data['prixParPersonne']) && !isset($data['prix']))) {
            return new JsonResponse(['error' => 'Le titre et le prix sont obligatoires.'], Response::HTTP_BAD_REQUEST);
        }

        $menu = $this->buildMenuFromData($data, $regimeRepository, $themeRepository, $platRepository, $imageRepository);
        
        // Upload photo
        $this->handlePhotoUpload($request, $menu, $slugger, $em);

        $em->persist($menu);
        $em->flush();

        return new JsonResponse([
            'message' => 'Menu créé avec succès.',
            'menu' => $this->serializeMenu($menu)
        ], Response::HTTP_CREATED);
    }

    /**
     * Modifier un menu (Admin uniquement)
     */
    #[Route('/{id}', name: 'menu_update', methods: ['PUT', 'PATCH', 'POST'])]
    #[IsGranted('ROLE_ADMIN', message: 'Accès refusé. Seul un administrateur peut modifier un menu.')]
    #[OA\Put(
        path: '/api/menus/{id}',
        summary: 'Modifier un menu existant (Admin uniquement)',
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))
        ],
        responses: [
            new OA\Response(response: 200, description: 'Menu mis à jour avec succès'),
            new OA\Response(response: 404, description: 'Menu non trouvé'),
            new OA\Response(response: 403, description: 'Accès refusé')
        ]
    )]
    public function update(
        int $id,
        Request $request,
        MenuRepository $menuRepository,
        RegimeRepository $regimeRepository,
        ThemeRepository $themeRepository,
        PlatRepository $platRepository,
        ImageRepository $imageRepository,
        EntityManagerInterface $em,
        SluggerInterface $slugger
    ): JsonResponse {
        $menu = $menuRepository->find($id);

        if (!$menu) {
            return new JsonResponse(['error' => 'Menu non trouvé.'], Response::HTTP_NOT_FOUND);
        }

        $data = $this->extractDataFromRequest($request);

        $titre = $data['titre'] ?? $data['titreMenu'] ?? null;
        if ($titre !== null) $menu->setTitre($titre);

        $minPers = $data['nombrePersonneMinimum'] ?? $data['nbrPersonneMin'] ?? null;
        if ($minPers !== null) $menu->setNombrePersonneMinimum((int) $minPers);

        $prix = $data['prixParPersonne'] ?? $data['prix'] ?? null;
        if ($prix !== null) $menu->setPrixParPersonne((float) $prix);

        if (array_key_exists('description', $data)) $menu->setDescription($data['description']);

        $stock = $data['quantiteRestante'] ?? $data['quantiteStock'] ?? null;
        if ($stock !== null) $menu->setQuantiteRestante((int) $stock);

        // Traitement du fichier photo téléchargé
        $this->handlePhotoUpload($request, $menu, $slugger, $em);

        // Mise à jour des relations ManyToMany
        $regimeIds = $data['regimeIds'] ?? $data['regimesIds'] ?? null;
        if (is_array($regimeIds)) {
            foreach ($menu->getRegimes() as $r) { $menu->removeRegime($r); }
            foreach ($regimeIds as $rId) {
                $r = $regimeRepository->find($rId);
                if ($r) $menu->addRegime($r);
            }
        }

        $themeIds = $data['themeIds'] ?? $data['themesIds'] ?? null;
        if (is_array($themeIds)) {
            foreach ($menu->getThemes() as $t) { $menu->removeTheme($t); }
            foreach ($themeIds as $tId) {
                $t = $themeRepository->find($tId);
                if ($t) $menu->addTheme($t);
            }
        }

        $platIds = $data['platIds'] ?? $data['platsIds'] ?? null;
        if (is_array($platIds)) {
            foreach ($menu->getPlats() as $p) { $menu->removePlat($p); }
            foreach ($platIds as $pId) {
                $p = $platRepository->find($pId);
                if ($p) $menu->addPlat($p);
            }
        }

        if (isset($data['imageIds']) && is_array($data['imageIds'])) {
            foreach ($menu->getImages() as $img) { $menu->removeImage($img); }
            foreach ($data['imageIds'] as $imgId) {
                $img = $imageRepository->find($imgId);
                if ($img) $menu->addImage($img);
            }
        }

        $em->flush();

        return new JsonResponse([
            'message' => 'Menu mis à jour avec succès.',
            'menu' => $this->serializeMenu($menu)
        ], Response::HTTP_OK);
    }

    /**
     * Supprimer un menu (Admin uniquement)
     */
    #[Route('/{id}', name: 'menu_delete', methods: ['DELETE'])]
    #[IsGranted('ROLE_ADMIN', message: 'Accès refusé. Seul un administrateur peut supprimer un menu.')]
    #[OA\Delete(
        path: '/api/menus/{id}',
        summary: 'Supprimer un menu (Admin uniquement)',
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))
        ],
        responses: [
            new OA\Response(response: 200, description: 'Menu supprimé avec succès'),
            new OA\Response(response: 404, description: 'Menu non trouvé'),
            new OA\Response(response: 403, description: 'Accès refusé')
        ]
    )]
    public function delete(int $id, MenuRepository $menuRepository, EntityManagerInterface $em): JsonResponse
    {
        $menu = $menuRepository->find($id);

        if (!$menu) {
            return new JsonResponse(['error' => 'Menu non trouvé.'], Response::HTTP_NOT_FOUND);
        }

        $em->remove($menu);
        $em->flush();

        return new JsonResponse(['message' => 'Menu supprimé avec succès.'], Response::HTTP_OK);
    }

    /**
     * Extrait les données depuis une requête JSON ou multipart (FormData)
     */
    private function extractDataFromRequest(Request $request): array
    {
        $content = $request->getContent();
        if ($content !== '' && json_validate($content)) {
            return json_decode($content, true) ?? [];
        }

        $data = $request->request->all();

        // Convertir d'éventuels tableaux transmis sous forme de chaînes (ex: "1,2,3")
        foreach (['platIds', 'platsIds', 'themeIds', 'themesIds', 'regimeIds', 'regimesIds'] as $key) {
            if (isset($data[$key]) && is_string($data[$key])) {
                $data[$key] = array_filter(array_map('trim', explode(',', $data[$key])));
            }
        }

        return $data;
    }

    /**
     * Gère le téléversement d'une photo pour un Menu
     */
    private function handlePhotoUpload(Request $request, Menu $menu, SluggerInterface $slugger, EntityManagerInterface $em): void
    {
        $photoFile = $request->files->get('photo');
        if (!$photoFile) return;

        $originalFilename = pathinfo($photoFile->getClientOriginalName(), PATHINFO_FILENAME);
        $safeFilename = $slugger->slug($originalFilename);
        $newFilename = $safeFilename . '-' . uniqid() . '.' . $photoFile->guessExtension();

        $uploadDir = $this->getParameter('kernel.project_dir') . '/public/uploads/menus';

        try {
            $photoFile->move($uploadDir, $newFilename);
            $photoUrl = '/uploads/menus/' . $newFilename;

            // Création de l'entité Image
            $image = new Image();
            if (method_exists($image, 'setPath')) {
                $image->setPath($photoUrl);
            } elseif (method_exists($image, 'setUrl')) {
                $image->setUrl($photoUrl);
            }

            $em->persist($image);

            // Remplacement des images existantes
            foreach ($menu->getImages() as $existingImage) {
                $menu->removeImage($existingImage);
            }
            $menu->addImage($image);

        } catch (FileException $e) {
            // Ignorer ou logger l'erreur
        }
    }

    /**
     * Construit un objet Menu à partir des données reçues
     */
    private function buildMenuFromData(
        array $data,
        RegimeRepository $regimeRepository,
        ThemeRepository $themeRepository,
        PlatRepository $platRepository,
        ImageRepository $imageRepository
    ): Menu {
        $menu = new Menu();
        $menu->setTitre($data['titre'] ?? $data['titreMenu'] ?? '');
        $menu->setNombrePersonneMinimum((int)($data['nombrePersonneMinimum'] ?? $data['nbrPersonneMin'] ?? 1));
        $menu->setPrixParPersonne((float)($data['prixParPersonne'] ?? $data['prix'] ?? 0));
        $menu->setDescription($data['description'] ?? null);
        $menu->setQuantiteRestante((int)($data['quantiteRestante'] ?? $data['quantiteStock'] ?? 0));

        $regimeIds = $data['regimeIds'] ?? $data['regimesIds'] ?? [];
        if (!empty($regimeIds) && is_array($regimeIds)) {
            foreach ($regimeIds as $regimeId) {
                $regime = $regimeRepository->find($regimeId);
                if ($regime) $menu->addRegime($regime);
            }
        }

        $themeIds = $data['themeIds'] ?? $data['themesIds'] ?? [];
        if (!empty($themeIds) && is_array($themeIds)) {
            foreach ($themeIds as $themeId) {
                $theme = $themeRepository->find($themeId);
                if ($theme) $menu->addTheme($theme);
            }
        }

        $platIds = $data['platIds'] ?? $data['platsIds'] ?? [];
        if (!empty($platIds) && is_array($platIds)) {
            foreach ($platIds as $platId) {
                $plat = $platRepository->find($platId);
                if ($plat) $menu->addPlat($plat);
            }
        }

        if (!empty($data['imageIds']) && is_array($data['imageIds'])) {
            foreach ($data['imageIds'] as $imageId) {
                $image = $imageRepository->find($imageId);
                if ($image) $menu->addImage($image);
            }
        }

        return $menu;
    }

    /**
     * Transforme l'objet Menu en tableau JSON incluant les relations
     */
    private function serializeMenu(Menu $menu): array
    {
        $images = [];
        if (method_exists($menu, 'getImages')) {
            foreach ($menu->getImages() as $i) {
                $path = method_exists($i, 'getPath') ? $i->getPath() : (method_exists($i, 'getUrl') ? $i->getUrl() : null);
                $images[] = [
                    'imageId' => method_exists($i, 'getImageId') ? $i->getImageId() : $i->getId(),
                    'path' => $path
                ];
            }
        }

        // Prendre la première image comme photo principale si disponible
        $mainPhoto = !empty($images) ? $images[0]['path'] : null;

        return [
            'menuId' => method_exists($menu, 'getMenuId') ? $menu->getMenuId() : $menu->getId(),
            'titre' => $menu->getTitre(),
            'nombrePersonneMinimum' => $menu->getNombrePersonneMinimum(),
            'prixParPersonne' => $menu->getPrixParPersonne(),
            'description' => $menu->getDescription(),
            'quantiteRestante' => $menu->getQuantiteRestante(),
            'photo' => $mainPhoto,
            'regimes' => array_map(fn($r) => [
                'regimeId' => method_exists($r, 'getRegimeId') ? $r->getRegimeId() : $r->getId(),
                'nom' => method_exists($r, 'getNom') ? $r->getNom() : (method_exists($r, 'getLibelle') ? $r->getLibelle() : null)
            ], $menu->getRegimes()->toArray()),
            'themes' => array_map(fn($t) => [
                'themeId' => method_exists($t, 'getThemeId') ? $t->getThemeId() : $t->getId(),
                'nom' => method_exists($t, 'getNom') ? $t->getNom() : (method_exists($t, 'getLibelle') ? $t->getLibelle() : null)
            ], $menu->getThemes()->toArray()),
            'plats' => array_map(fn($p) => [
                'platId' => method_exists($p, 'getPlatId') ? $p->getPlatId() : $p->getId(),
                'nom' => method_exists($p, 'getNom') ? $p->getNom() : (method_exists($p, 'getTitre') ? $p->getTitre() : null)
            ], $menu->getPlats()->toArray()),
            'images' => $images,
        ];
    }
}