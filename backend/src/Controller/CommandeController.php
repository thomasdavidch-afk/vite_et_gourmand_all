<?php

namespace App\Controller;

use App\Entity\Commande;
use App\Entity\Menu;
use App\Entity\Utilisateur;
use App\Repository\CommandeRepository;
use App\Repository\MenuRepository;
use App\Repository\UtilisateurRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Mailer\MailerInterface;
use Symfony\Component\Mime\Email;
use Symfony\Component\Routing\Attribute\Route;

#[Route('/api/mes-commandes', name: 'api_mes_commandes_')]
class CommandeController extends AbstractController
{
    /**
     * Helper pour récupérer l'utilisateur (Security ou X-AUTH-TOKEN)
     */
    private function getUserFromRequest(Request $request, UtilisateurRepository $utilisateurRepository): ?Utilisateur
    {
        /** @var Utilisateur|null $user */
        $user = $this->getUser();

        if (!$user) {
            $apiToken = $request->headers->get('X-AUTH-TOKEN');
            if ($apiToken) {
                $user = $utilisateurRepository->findOneBy(['apiToken' => $apiToken]);
            }
        }

        return $user;
    }

    /**
     * GET /api/commandes
     * Récupère la liste des commandes du client connecté
     */
    #[Route('', name: 'list', methods: ['GET'], format: 'json')]
    public function list(
        Request $request,
        CommandeRepository $commandeRepository,
        UtilisateurRepository $utilisateurRepository
    ): JsonResponse {
        $user = $this->getUserFromRequest($request, $utilisateurRepository);

        // S'assurer strict que l'utilisateur existe
        if (!$user) {
            return new JsonResponse([
                'error' => 'Utilisateur non authentifié'
            ], Response::HTTP_UNAUTHORIZED);
        }

        // Récupérer UNIQUEMENT les commandes liées à cet utilisateur précis
        $commandes = $commandeRepository->findBy(
            ['utilisateur' => $user],
            ['dateCommande' => 'DESC']
        );

        $data = [];
        foreach ($commandes as $commande) {
            $menu = $commande->getMenu();
            $cmdUser = $commande->getUtilisateur();

            $data[] = [
                'id' => $commande->getNumeroCommande(),
                'numeroCommande' => $commande->getNumeroCommande(),
                'dateCommande' => $commande->getDateCommande()?->format('Y-m-d'),
                'datePrestation' => $commande->getDatePrestation()?->format('Y-m-d'),
                'heureLivraison' => $commande->getHeureLivraison(),
                'nombrePersonne' => $commande->getNombrePersonne(),
                'prixMenu' => $commande->getPrixMenu(),
                'prixLivraison' => $commande->getPrixLivraison(),
                'statut' => $commande->getStatut(),
                'pretMateriel' => $commande->getPretMateriel(),
                'restitutionMateriel' => $commande->getRestitutionMateriel(),
                'utilisateur' => [
                    'utilisateurId' => $cmdUser ? ($cmdUser->getUtilisateurId() ?? $cmdUser->getId()) : null,
                    'email' => $cmdUser ? $cmdUser->getEmail() : null
                ],
                'menu' => $menu ? [
                    'menuId' => $menu->getMenuId(),
                    'titre' => $menu->getTitre(),
                ] : null
            ];
        }

        return new JsonResponse($data, Response::HTTP_OK);
    }

    /**
     * POST /api/commandes
     * Crée la commande, applique les règles tarifaires et envoie le mail de confirmation
     */
    #[Route('', name: 'create', methods: ['POST'])]
    public function create(
        Request $request,
        EntityManagerInterface $em,
        MenuRepository $menuRepository,
        UtilisateurRepository $utilisateurRepository,
        MailerInterface $mailer
    ): JsonResponse {
        $data = json_decode($request->getContent(), true);

        if (!$data) {
            return new JsonResponse(['error' => 'Données invalides'], Response::HTTP_BAD_REQUEST);
        }

        // 1. Récupération et validation du Menu
        $menuId = $data['menuId'] ?? null;
        if (!$menuId) {
            return new JsonResponse(['error' => 'Le menu est obligatoire.'], Response::HTTP_BAD_REQUEST);
        }

        $menu = $menuRepository->find($menuId);
        if (!$menu) {
            return new JsonResponse(['error' => 'Menu introuvable.'], Response::HTTP_NOT_FOUND);
        }

        $nbPersonnes = (int)($data['nombrePersonne'] ?? 1);
        $minPersonnes = $menu->getNombrePersonneMinimum() ?? 1;

        // RÈGLE MÉTIER : Respect du nombre minimum de personnes
        if ($nbPersonnes < $minPersonnes) {
            return new JsonResponse([
                'error' => sprintf('Le nombre de personnes minimum pour ce menu est de %d.', $minPersonnes)
            ], Response::HTTP_BAD_REQUEST);
        }

        // Vérification des stocks
        if ($menu->getQuantiteRestante() !== null && $menu->getQuantiteRestante() < $nbPersonnes) {
            return new JsonResponse([
                'error' => 'Quantité restante insuffisante pour ce menu.'
            ], Response::HTTP_BAD_REQUEST);
        }

        // 2. Calcul du Prix du Menu (RÈGLE MÉTIER : -10% si minPersonnes + 5)
        $prixUnitaire = (float) $menu->getPrixParPersonne();
        $prixTotalMenu = $prixUnitaire * $nbPersonnes;

        if ($nbPersonnes >= ($minPersonnes + 5)) {
            $prixTotalMenu = $prixTotalMenu * 0.90; // Application des -10%
        }

        // 3. Calcul des frais de livraison (RÈGLE MÉTIER : 5€ + 0.59€/km si hors Bordeaux)
        $ville = strtolower(trim($data['ville'] ?? 'bordeaux'));
        $distanceKm = (float)($data['distanceKm'] ?? 0);

        $prixLivraison = 0.00;
        if ($ville !== 'bordeaux') {
            $prixLivraison = 5.00 + (0.59 * $distanceKm);
        }

        // 4. Gestion de l'Utilisateur
        $user = $this->getUserFromRequest($request, $utilisateurRepository);
        $emailClient = $data['email'] ?? ($user ? $user->getEmail() : null);

        if (!$user && $emailClient) {
            $user = $utilisateurRepository->findOneBy(['email' => $emailClient]);
            if (!$user) {
                $user = new Utilisateur();
                $user->setEmail($emailClient);
                $user->setPrenom($data['nomComplet'] ?? 'Client');
            }
        }

        if ($user) {
            $adresseFormatee = trim(($data['numeroRue'] ?? '') . ' ' . ($data['nomRue'] ?? '') . ' ' . ($data['codePostal'] ?? ''));
            if (!empty($data['telephone'])) $user->setTelephone($data['telephone']);
            if (!empty($data['ville'])) $user->setVille($data['ville']);
            if (!empty($adresseFormatee)) $user->setAdressePostale($adresseFormatee);
            $em->persist($user);
        }

        // 5. Instanciation de la Commande
        $commande = new Commande();
        $commande->setDateCommande(new \DateTime());
        if (!empty($data['datePrestation'])) {
            $commande->setDatePrestation(new \DateTime($data['datePrestation']));
        }
        $commande->setHeureLivraison($data['heure'] ?? null);
        $commande->setPrixMenu(number_format($prixTotalMenu, 2, '.', ''));
        $commande->setNombrePersonne($nbPersonnes);
        $commande->setPrixLivraison(number_format($prixLivraison, 2, '.', ''));
        $commande->setStatut('En attente');
        $commande->setPretMateriel($data['pretMateriel'] ?? false);
        $commande->setRestitutionMateriel(false);
        $commande->setMenu($menu);
        $commande->setUtilisateur($user);

        // Décrémenter le stock
        if ($menu->getQuantiteRestante() !== null) {
            $menu->setQuantiteRestante($menu->getQuantiteRestante() - $nbPersonnes);
        }

        $em->persist($commande);
        $em->flush();

        // 6. RÈGLE MÉTIER : Envoi de l'email de confirmation
        if ($emailClient) {
            $totalCommande = $prixTotalMenu + $prixLivraison;

            $emailContent = sprintf(
                "Bonjour,\n\nMerci pour votre commande n° %s !\n\n".
                "Détails de la prestation :\n".
                "- Menu : %s\n".
                "- Nombre de personnes : %d\n".
                "- Date : %s à %s\n".
                "- Prix du menu : %.2f €\n".
                "- Frais de livraison : %.2f €\n".
                "- Total général : %.2f €\n\n".
                "Nous traiterons votre demande dans les plus brefs délais.",
                $commande->getNumeroCommande(),
                $menu->getTitre(),
                $nbPersonnes,
                $commande->getDatePrestation()?->format('d/m/Y'),
                $commande->getHeureLivraison(),
                $prixTotalMenu,
                $prixLivraison,
                $totalCommande
            );

            $email = (new Email())
                ->from('contact@traiteur.com')
                ->to($emailClient)
                ->subject('Confirmation de votre commande - N° ' . $commande->getNumeroCommande())
                ->text($emailContent);

            try {
                $mailer->send($email);
            } catch (\Exception $e) {
                // Log l'erreur si besoin sans bloquer le retour de la commande
            }
        }

        return new JsonResponse([
            'message' => 'Commande enregistrée avec succès. Un email de confirmation vous a été envoyé.',
            'numeroCommande' => $commande->getNumeroCommande(),
            'prixTotalMenu' => number_format($prixTotalMenu, 2),
            'prixLivraison' => number_format($prixLivraison, 2),
            'statut' => $commande->getStatut()
        ], Response::HTTP_CREATED);
    }

    /**
     * PATCH /api/commandes/{numeroCommande}
     * Permet la modification / annulation d'une commande
     */
    #[Route('/{numeroCommande}', name: 'cancel', methods: ['PATCH'])]
    public function cancel(
        string $numeroCommande,
        Request $request,
        CommandeRepository $commandeRepository,
        EntityManagerInterface $em
    ): JsonResponse {
        $commande = $commandeRepository->findOneBy(['numeroCommande' => $numeroCommande]);

        if (!$commande) {
            return new JsonResponse(['error' => 'Commande introuvable'], Response::HTTP_NOT_FOUND);
        }

        $data = json_decode($request->getContent(), true);
        if (isset($data['statut'])) {
            $commande->setStatut($data['statut']);
            $em->flush();
        }

        return new JsonResponse(['message' => 'Statut mis à jour avec succès'], Response::HTTP_OK);
    }
}