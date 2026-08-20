<?php

namespace App\Controller;

use App\Entity\Commande;
use App\Repository\CommandeRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Mailer\MailerInterface;
use Symfony\Component\Mime\Email;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/api/admin/commandes')]
#[IsGranted('ROLE_ADMIN')]
class CommandeAdminController extends AbstractController
{
    // Statuts valides selon les exigences du projet
    public const STATUTS_VALIDES = [
        'accepté',
        'en préparation',
        'en cours de livraison',
        'livré',
        'en attente du retour de matériel',
        'terminée'
    ];

    /**
     * Liste de toutes les commandes
     */
    #[Route('', name: 'admin_commandes_index', methods: ['GET'])]
    public function index(CommandeRepository $commandeRepo): JsonResponse
    {
        $commandes = $commandeRepo->findBy([], ['dateCommande' => 'DESC']);

        $data = array_map(function (Commande $c) {
            $u = $c->getUtilisateur();
            $menu = $c->getMenu();

            return [
                'numeroCommande' => $c->getNumeroCommande(),
                'dateCommande' => $c->getDateCommande() ? $c->getDateCommande()->format('Y-m-d') : null,
                'datePrestation' => $c->getDatePrestation() ? $c->getDatePrestation()->format('Y-m-d') : null,
                'heureLivraison' => $c->getHeureLivraison(),
                'prixMenu' => $c->getPrixMenu(),
                'nombrePersonne' => $c->getNombrePersonne(),
                'prixLivraison' => $c->getPrixLivraison(),
                'statut' => $c->getStatut(),
                'pretMateriel' => $c->getPretMateriel(),
                'restitutionMateriel' => $c->getRestitutionMateriel(),
                'utilisateur' => $u ? [
                    'id' => method_exists($u, 'getUtilisateurId') ? $u->getUtilisateurId() : $u->getId(),
                    'email' => method_exists($u, 'getEmail') ? $u->getEmail() : null,
                    'nom' => method_exists($u, 'getNom') ? $u->getNom() : '',
                    'prenom' => method_exists($u, 'getPrenom') ? $u->getPrenom() : '',
                ] : null,
                'menu' => $menu ? [
                    'id' => method_exists($menu, 'getMenuId') ? $menu->getMenuId() : $menu->getId(),
                    'titre' => $menu->getTitre(),
                ] : null,
            ];
        }, $commandes);

        return new JsonResponse($data, Response::HTTP_OK);
    }

    /**
     * Mise à jour du statut d'une commande (et gestion automatique du retour matériel)
     */
    #[Route('/{numeroCommande}/statut', name: 'admin_commandes_update_statut', methods: ['PATCH', 'PUT', 'POST'])]
    public function updateStatut(
        string $numeroCommande,
        Request $request,
        CommandeRepository $commandeRepo,
        EntityManagerInterface $em,
        MailerInterface $mailer
    ): JsonResponse {
        $commande = $commandeRepo->find($numeroCommande);
        if (!$commande) {
            return new JsonResponse(['error' => 'Commande introuvable.'], Response::HTTP_NOT_FOUND);
        }

        $data = json_decode($request->getContent(), true) ?? $request->request->all();
        $nouveauStatut = $data['statut'] ?? null;

        if (!$nouveauStatut || !in_array($nouveauStatut, self::STATUTS_VALIDES, true)) {
            return new JsonResponse([
                'error' => 'Statut invalide. Statuts autorisés : ' . implode(', ', self::STATUTS_VALIDES)
            ], Response::HTTP_BAD_REQUEST);
        }

        $ancienStatut = $commande->getStatut();
        $commande->setStatut($nouveauStatut);

        // Si le statut passe à "terminée", et qu'il y avait prêt de matériel, on coche restitué
        if ($nouveauStatut === 'terminée' && $commande->getPretMateriel()) {
            $commande->setRestitutionMateriel(true);
        }

        $em->flush();

        // Notification par Email si le statut passe à "en attente du retour de matériel"
        if ($nouveauStatut === 'en attente du retour de matériel' && $ancienStatut !== $nouveauStatut) {
            $user = $commande->getUtilisateur();
            $userEmail = $user && method_exists($user, 'getEmail') ? $user->getEmail() : null;

            if ($userEmail) {
                $email = (new Email())
                    ->from('no-reply@voterestaurant.com')
                    ->to($userEmail)
                    ->subject('Restitution du matériel prêté - Commande n° ' . $commande->getNumeroCommande())
                    ->html("
                        <h2>Bonjour,</h2>
                        <p>Votre commande n° <strong>{$commande->getNumeroCommande()}</strong> a été livrée.</p>
                        <p>Du matériel vous a été prêté pour cette prestation. Nous vous rappelons que conformément à nos Conditions Générales de Vente, vous disposez de <strong>10 jours ouvrés</strong> pour le restituer.</p>
                        <p><strong>Avertissement :</strong> Si le matériel n'est pas restitué dans ce délai, une somme forfaitaire de <strong>600 €</strong> de frais vous sera facturée.</p>
                        <p>Pour effectuer la restitution du matériel, merci de bien vouloir contacter directement notre société ou répondre à cet e-mail.</p>
                        <br>
                        <p>Cordialement,<br>L'équipe du Restaurant</p>
                    ");

                try {
                    $mailer->send($email);
                } catch (\Exception $e) {
                    // Ignorer les erreurs d'envoi de mail en local
                }
            }
        }

        return new JsonResponse([
            'message' => 'Statut mis à jour avec succès.',
            'statut' => $nouveauStatut,
            'restitutionMateriel' => $commande->getRestitutionMateriel()
        ], Response::HTTP_OK);
    }
}