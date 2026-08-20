<?php

namespace App\Controller;

use App\Entity\Utilisateur;
use Doctrine\ORM\EntityManagerInterface;
use OpenApi\Attributes as OA;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;
use Symfony\Component\Routing\Attribute\Route; 

#[Route('/api', name: 'api_')]
#[OA\Tag(name: 'Sécurité & Compte')]
class SecurityController extends AbstractController
{
    /**
     * Détermine le rôle principal en minuscule pour le front-end ('admin', 'employe', 'client')
     */
    private function determineMainRole(Utilisateur $user): string
    {
        $roles = $user->getRoles();

        if (in_array('ROLE_ADMIN', $roles, true)) {
            return 'admin';
        }

        if (in_array('ROLE_EMPLOYE', $roles, true) || in_array('ROLE_EMPLOYEE', $roles, true)) {
            return 'employe';
        }

        return 'client';
    }

    /**
     * Inscription d'un nouvel utilisateur
     */
    #[Route('/register', name: 'register', methods: ['POST'])]
    #[OA\Post(
        path: '/api/register',
        summary: 'Inscription d\'un nouvel utilisateur',
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                required: ['email', 'password'],
                properties: [
                    new OA\Property(property: 'email', type: 'string', example: 'jean.dupont@example.com'),
                    new OA\Property(property: 'password', type: 'string', example: 'MotDePasse123!'),
                    new OA\Property(property: 'nom', type: 'string', example: 'Dupont'),
                    new OA\Property(property: 'prenom', type: 'string', example: 'Jean'),
                    new OA\Property(property: 'telephone', type: 'string', example: '0612345678'),
                    new OA\Property(property: 'ville', type: 'string', example: 'Bordeaux'),
                    new OA\Property(property: 'codePostal', type: 'string', example: '33000'),
                    new OA\Property(property: 'adressePostale', type: 'string', example: '10 rue de la Paix')
                ]
            )
        ),
        responses: [
            new OA\Response(response: 201, description: 'Utilisateur créé avec succès'),
            new OA\Response(response: 400, description: 'Champs obligatoires manquants'),
            new OA\Response(response: 409, description: 'Un compte existe déjà avec cet email')
        ]
    )]
    public function register(
        Request $request,
        EntityManagerInterface $em,
        UserPasswordHasherInterface $passwordHasher
    ): JsonResponse {
        $data = json_decode($request->getContent(), true);

        $email = $data['email'] ?? null;
        $password = $data['password'] ?? null;

        if (!$email || !$password) {
            return new JsonResponse(['error' => 'Champs obligatoires manquants (email, mot de passe).'], Response::HTTP_BAD_REQUEST);
        }

        // Vérification de l'unicité de l'email
        $existingUser = $em->getRepository(Utilisateur::class)->findOneBy(['email' => $email]);
        if ($existingUser) {
            return new JsonResponse(['error' => 'Un compte existe déjà avec cet email.'], Response::HTTP_CONFLICT);
        }

        $user = new Utilisateur();
        $user->setEmail($email);

        // Hachage du mot de passe
        $hashedPassword = $passwordHasher->hashPassword($user, $password);
        $user->setPassword($hashedPassword);

        if (method_exists($user, 'setIsActive')) {
            $user->setIsActive(true);
        } elseif (method_exists($user, 'setIsactive')) {
            $user->setIsactive(true);
        }

        // Champs optionnels
        if (isset($data['nom'])) $user->setNom($data['nom']);
        if (isset($data['prenom'])) $user->setPrenom($data['prenom']);
        if (isset($data['telephone'])) $user->setTelephone($data['telephone']);
        if (isset($data['ville'])) $user->setVille($data['ville']);
        if (isset($data['codePostal'])) $user->setCodePostal($data['codePostal']);
        if (isset($data['adressePostale'])) $user->setAdressePostale($data['adressePostale']);

        $em->persist($user);
        $em->flush();

        return new JsonResponse([
            'message' => 'Utilisateur créé avec succès.',
            'utilisateurId' => $user->getUtilisateurId(),
            'email' => $user->getEmail()
        ], Response::HTTP_CREATED);
    }

    /**
     * Connexion (Génération du token d'accès)
     */
    #[Route('/login', name: 'login', methods: ['POST'])]
    #[OA\Post(
        path: '/api/login',
        summary: 'Connexion (Génération du token d\'accès)',
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                required: ['email', 'password'],
                properties: [
                    new OA\Property(property: 'email', type: 'string', example: 'jean.dupont@example.com'),
                    new OA\Property(property: 'password', type: 'string', example: 'MotDePasse123!')
                ]
            )
        ),
        responses: [
            new OA\Response(response: 200, description: 'Connexion réussie avec retour du token'),
            new OA\Response(response: 400, description: 'Email et mot de passe requis'),
            new OA\Response(response: 401, description: 'Identifiants invalides'),
            new OA\Response(response: 403, description: 'Compte désactivé')
        ]
    )]
    public function login(
        Request $request,
        EntityManagerInterface $em,
        UserPasswordHasherInterface $passwordHasher
    ): JsonResponse {
        $data = json_decode($request->getContent(), true);

        $email = $data['email'] ?? null;
        $password = $data['password'] ?? null;

        if (!$email || !$password) {
            return new JsonResponse(['error' => 'Email et mot de passe requis.'], Response::HTTP_BAD_REQUEST);
        }

        /** @var Utilisateur|null $user */
        $user = $em->getRepository(Utilisateur::class)->findOneBy(['email' => $email]);

        if (!$user || !$passwordHasher->isPasswordValid($user, $password)) {
            return new JsonResponse(['error' => 'Identifiants invalides.'], Response::HTTP_UNAUTHORIZED);
        }

        // Vérification si le compte est actif
        if (!$user->isIsActive()) {
            return new JsonResponse(['error' => 'Votre compte a été désactivé.'], Response::HTTP_FORBIDDEN);
        }

        // Génération d'un token aléatoire de 64 caractères
        $token = bin2hex(random_bytes(32));
        $user->setApiToken($token);
        $em->flush();

        return new JsonResponse([
            'token' => $token,
            'utilisateurId' => $user->getUtilisateurId(),
            'email' => $user->getEmail(),
            'nom' => $user->getNom(),
            'prenom' => $user->getPrenom(),
            'role' => $this->determineMainRole($user),
            'roles' => $user->getRoles()
        ]);
    }

    /**
     * Récupérer les informations de l'utilisateur connecté
     */
    #[Route('/account/me', name: 'me', methods: ['GET'])]
    #[OA\Get(
        path: '/api/account/me',
        summary: 'Récupérer les informations de l\'utilisateur connecté',
        responses: [
            new OA\Response(response: 200, description: 'Informations de l\'utilisateur'),
            new OA\Response(response: 401, description: 'Utilisateur non authentifié')
        ]
    )]
    #[OA\Security(name: 'X-AUTH-TOKEN')]
    public function me(): JsonResponse
    {
        /** @var Utilisateur|null $user */
        $user = $this->getUser();

        if (!$user) {
            return new JsonResponse(['error' => 'Utilisateur non authentifié.'], Response::HTTP_UNAUTHORIZED);
        }

        return new JsonResponse([
            'utilisateurId' => $user->getUtilisateurId(),
            'email' => $user->getEmail(),
            'nom' => $user->getNom(),
            'prenom' => $user->getPrenom(),
            'telephone' => $user->getTelephone(),
            'ville' => $user->getVille(),
            'codePostal' => $user->getCodePostal(),
            'adressePostale' => $user->getAdressePostale(),
            'isActive' => $user->isIsActive(),
            'role' => $this->determineMainRole($user),
            'roles' => $user->getRoles()
        ]);
    }

    /**
     * Modifier les informations du compte de l'utilisateur connecté
     */
    #[Route('/account/edit', name: 'edit_profile', methods: ['PUT', 'PATCH', 'POST'])]
    #[OA\Put(
        path: '/api/account/edit',
        summary: 'Modifier les informations du compte (PUT)',
        requestBody: new OA\RequestBody(
            content: new OA\JsonContent(
                properties: [
                    new OA\Property(property: 'email', type: 'string', example: 'nouveau.email@example.com'),
                    new OA\Property(property: 'password', type: 'string', example: 'NouveauMotDePasse123!'),
                    new OA\Property(property: 'nom', type: 'string', example: 'DupontModifie'),
                    new OA\Property(property: 'prenom', type: 'string', example: 'JeanModifie'),
                    new OA\Property(property: 'telephone', type: 'string', example: '0698765432'),
                    new OA\Property(property: 'ville', type: 'string', example: 'Lyon'),
                    new OA\Property(property: 'codePostal', type: 'string', example: '33000'),
                    new OA\Property(property: 'adressePostale', type: 'string', example: '5 rue de la République')
                ]
            )
        ),
        responses: [
            new OA\Response(response: 200, description: 'Profil mis à jour avec succès'),
            new OA\Response(response: 401, description: 'Utilisateur non authentifié'),
            new OA\Response(response: 409, description: 'Cet email est déjà utilisé')
        ]
    )]
    #[OA\Post(
        path: '/api/account/edit',
        summary: 'Modifier les informations du compte (POST)',
        requestBody: new OA\RequestBody(
            content: new OA\JsonContent(
                properties: [
                    new OA\Property(property: 'password', type: 'string', example: 'NouveauMotDePasse123!')
                ]
            )
        ),
        responses: [
            new OA\Response(response: 200, description: 'Profil mis à jour avec succès'),
            new OA\Response(response: 401, description: 'Utilisateur non authentifié')
        ]
    )]
    #[OA\Security(name: 'X-AUTH-TOKEN')]
    public function edit(
        Request $request,
        EntityManagerInterface $em,
        UserPasswordHasherInterface $passwordHasher
    ): JsonResponse {
        /** @var Utilisateur|null $user */
        $user = $this->getUser();

        if (!$user) {
            return new JsonResponse(['error' => 'Utilisateur non authentifié.'], Response::HTTP_UNAUTHORIZED);
        }

        $data = json_decode($request->getContent(), true) ?? [];

        // Modification optionnelle de l'email
        if (isset($data['email']) && $data['email'] !== $user->getEmail()) {
            $existingUser = $em->getRepository(Utilisateur::class)->findOneBy(['email' => $data['email']]);
            if ($existingUser) {
                return new JsonResponse(['error' => 'Cet email est déjà utilisé.'], Response::HTTP_CONFLICT);
            }
            $user->setEmail($data['email']);
        }

        // Modification optionnelle du mot de passe
        if (!empty($data['password'])) {
            $user->setPassword($passwordHasher->hashPassword($user, $data['password']));
        }

        // Modification des autres champs personnels
        if (array_key_exists('nom', $data)) $user->setNom($data['nom']);
        if (array_key_exists('prenom', $data)) $user->setPrenom($data['prenom']);
        if (array_key_exists('telephone', $data)) $user->setTelephone($data['telephone']);
        if (array_key_exists('ville', $data)) $user->setVille($data['ville']);
        if (array_key_exists('codePostal', $data)) $user->setCodePostal($data['codePostal']);
        if (array_key_exists('adressePostale', $data)) $user->setAdressePostale($data['adressePostale']);

        $em->flush();

        return new JsonResponse([
            'message' => 'Profil mis à jour avec succès.',
            'user' => [
                'utilisateurId' => $user->getUtilisateurId(),
                'email' => $user->getEmail(),
                'nom' => $user->getNom(),
                'prenom' => $user->getPrenom(),
                'telephone' => $user->getTelephone(),
                'ville' => $user->getVille(),
                'codePostal' => $user->getCodePostal(),
                'adressePostale' => $user->getAdressePostale()
            ]
        ]);
    }

    /**
     * Supprimer le compte de l'utilisateur connecté
     */
    #[Route('/account/delete', name: 'delete_account', methods: ['DELETE'])]
    #[OA\Delete(
        path: '/api/account/delete',
        summary: 'Supprimer le compte de l\'utilisateur connecté',
        responses: [
            new OA\Response(response: 200, description: 'Compte supprimé avec succès'),
            new OA\Response(response: 401, description: 'Utilisateur non authentifié')
        ]
    )]
    #[OA\Security(name: 'X-AUTH-TOKEN')]
    public function deleteAccount(EntityManagerInterface $em): JsonResponse
    {
        /** @var Utilisateur|null $user */
        $user = $this->getUser();

        if (!$user) {
            return new JsonResponse(['error' => 'Utilisateur non authentifié.'], Response::HTTP_UNAUTHORIZED);
        }

        $em->remove($user);
        $em->flush();

        return new JsonResponse([
            'message' => 'Compte supprimé avec succès.'
        ], Response::HTTP_OK);
    }

    /**
     * Liste des employés (Pour l'administrateur)
     */
    #[Route('/admin/employes', name: 'admin_list_employes', methods: ['GET'])]
    #[OA\Get(path: '/api/admin/employes', summary: 'Liste tous les comptes employés')]
    #[OA\Security(name: 'X-AUTH-TOKEN')]
    public function listEmployes(EntityManagerInterface $em): JsonResponse
    {
        /** @var Utilisateur|null $currentUser */
        $currentUser = $this->getUser();
        if (!$currentUser || $this->determineMainRole($currentUser) !== 'admin') {
            return new JsonResponse(['error' => 'Accès refusé. Rôle Administrateur requis.'], Response::HTTP_FORBIDDEN);
        }

        // Récupérer les utilisateurs ayant le rôle employé
        $allUsers = $em->getRepository(Utilisateur::class)->findAll();
        $employes = array_filter($allUsers, function(Utilisateur $u) {
            $roles = $u->getRoles();
            return in_array('ROLE_EMPLOYE', $roles, true) || in_array('ROLE_EMPLOYEE', $roles, true);
        });

        $data = array_map(function(Utilisateur $u) {
            return [
                'utilisateurId' => $u->getUtilisateurId(),
                'email' => $u->getEmail(),
                'nom' => $u->getNom(),
                'prenom' => $u->getPrenom(),
                'roles' => $u->getRoles(),
                'isActive' => $u->isIsActive()
            ];
        }, array_values($employes));

        return new JsonResponse($data, Response::HTTP_OK);
    }

    /**
     * Créer un compte employé (Pour l'administrateur)
     */
    #[Route('/admin/employes', name: 'admin_create_employe', methods: ['POST'])]
    #[OA\Post(path: '/api/admin/employes', summary: 'Créer un compte employé')]
    #[OA\Security(name: 'X-AUTH-TOKEN')]
    public function createEmploye(
        Request $request,
        EntityManagerInterface $em,
        UserPasswordHasherInterface $passwordHasher
    ): JsonResponse {
        try {
            /** @var Utilisateur|null $currentUser */
            $currentUser = $this->getUser();
            if (!$currentUser || $this->determineMainRole($currentUser) !== 'admin') {
                return new JsonResponse(['error' => 'Accès refusé. Rôle Administrateur requis.'], Response::HTTP_FORBIDDEN);
            }

            $data = json_decode($request->getContent(), true) ?? [];
            $email = $data['email'] ?? null;
            $password = $data['password'] ?? null;

            if (!$email || !$password) {
                return new JsonResponse(['error' => 'Email et mot de passe requis.'], Response::HTTP_BAD_REQUEST);
            }

            $existingUser = $em->getRepository(Utilisateur::class)->findOneBy(['email' => $email]);
            if ($existingUser) {
                return new JsonResponse(['error' => 'Un compte existe déjà avec cet email.'], Response::HTTP_CONFLICT);
            }

            $employe = new Utilisateur();
            $employe->setEmail($email);
            $employe->setPassword($passwordHasher->hashPassword($employe, $password));
            $employe->setIsActive(true);

            if (!empty($data['nom'])) {
                $employe->setNom($data['nom']);
            }
            if (!empty($data['prenom'])) {
                $employe->setPrenom($data['prenom']);
            }

            // --- RECHERCHE ET AFFECTATION DU RÔLE EMPLOYÉ ---
            // On cherche le rôle 'employe' ou 'ROLE_EMPLOYE' dans la table Role
            $roleRepository = $em->getRepository(\App\Entity\Role::class);
            $roleEmploye = $roleRepository->findOneBy(['libelle' => 'employe']) 
                        ?? $roleRepository->findOneBy(['libelle' => 'ROLE_EMPLOYE']);

            if ($roleEmploye) {
                $employe->addRole($roleEmploye);
            }

            $em->persist($employe);
            $em->flush();

            return new JsonResponse([
                'message' => 'Compte employé créé avec succès.',
                'utilisateurId' => $employe->getUtilisateurId(),
                'email' => $employe->getEmail()
            ], Response::HTTP_CREATED);

        } catch (\Throwable $e) {
            return new JsonResponse([
                'error' => 'Erreur création employé : ' . $e->getMessage()
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Supprimer un compte employé (Pour l'administrateur)
     */
    #[Route('/admin/employes/{id}', name: 'admin_delete_employe', methods: ['DELETE'])]
    #[OA\Delete(path: '/api/admin/employes/{id}', summary: 'Supprimer un compte employé')]
    #[OA\Security(name: 'X-AUTH-TOKEN')]
    public function deleteEmploye(int $id, EntityManagerInterface $em): JsonResponse
    {
        try {
            /** @var Utilisateur|null $currentUser */
            $currentUser = $this->getUser();
            if (!$currentUser || $this->determineMainRole($currentUser) !== 'admin') {
                return new JsonResponse(['error' => 'Accès refusé. Rôle Administrateur requis.'], Response::HTTP_FORBIDDEN);
            }

            $employe = $em->getRepository(Utilisateur::class)->find($id);
            if (!$employe) {
                return new JsonResponse(['error' => 'Employé non trouvé.'], Response::HTTP_NOT_FOUND);
            }

            $em->remove($employe);
            $em->flush();

            return new JsonResponse(['message' => 'Compte employé supprimé avec succès.'], Response::HTTP_OK);
        } catch (\Exception $e) {
            return new JsonResponse([
                'error' => 'Erreur lors de la suppression de l\'employé : ' . $e->getMessage()
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }
}