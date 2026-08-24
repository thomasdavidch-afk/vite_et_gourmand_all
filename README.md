# Vite & Gourmand
 
Application web de réservation de menus traiteur pour des événements privés et professionnels.
 
## Présentation
 
Vite & Gourmand permet de consulter les menus proposés par le traiteur, de filtrer les offres, de voir le détail d'un menu et de passer une commande. L'application comprend également des espaces dédiés aux clients, aux employés et aux administrateurs.
 
Le projet est organisé en deux parties :
 
- `frontend/` : interface web statique et routeur JavaScript côté client ;
- `backend/` : API Symfony, gestion métier et persistance des données.
 
## Fonctionnalités principales
 
- Consultation des menus et de leur détail ;
- filtres par thème, régime et nombre minimal de personnes ;
- inscription, connexion et gestion du compte client ;
- parcours de commande en plusieurs étapes ;
- consultation des commandes client ;
- gestion des menus, commandes, utilisateurs et avis selon le rôle ;
- envoi de notifications par e-mail via Symfony Messenger ;
- gestion des images de menus et de plats ;
- interface responsive basée sur Bootstrap.
 
## Stack technique
 
### Frontend
 
- HTML5
- SCSS/CSS
- JavaScript
- Bootstrap
 
### Backend
 
- PHP
- Symfony
- Doctrine ORM
 
### Base de données
 
- MySQL
- NoSQL/JSON pour les heures
 
### Conteneurisation et serveur web
 
- Docker
- Docker Compose
- Nginx
 
## Prérequis
 
- Docker Desktop récent, avec Docker Compose v2 ;
- Git ;
- un navigateur web récent.
 
Les commandes ci-dessous sont exécutées depuis la racine du projet.
 
## Installation avec Docker
 
1. Cloner le dépôt et entrer dans le dossier du projet :
 
```bash
git clone https://github.com/thomasdavidch-afk/vite_et_gourmand_all.git
cd vite_et_gourmand_all
```
 
2. Créer les fichiers d'environnement à partir des exemples disponibles. Ne jamais versionner les secrets :
 
```bash
cp backend/.env.example backend/.env
```
 
Sous Windows PowerShell, utiliser :
 
```powershell
Copy-Item backend/.env.example backend/.env
```
 
Adapter ensuite les variables de connexion à la base de données et de messagerie dans `backend/.env`.
 
3. Construire et démarrer les services :
 
```bash
docker compose up -d --build
```
 
4. Vérifier l'état des conteneurs :
 
```bash
docker compose ps
```
 
Les services attendus sont le frontend servi par Nginx, le backend Symfony, MySQL et, si configuré dans le fichier Compose, MongoDB.
 
## Initialisation de la base de données
 
Le projet contient un dump SQL à la racine (`dump.sql`). Importer ce fichier uniquement dans une base vide ou après avoir effectué une sauvegarde.
 
### Import avec Docker Compose
 
```bash
Get-Content .\dump.sql -Encoding UTF8 | docker compose exec -T mysql mysql -u root -p vite_et_gourmand
```
 
Sous Linux ou macOS :
 
```bash
docker compose exec -T mysql mysql -u root -p vite_et_gourmand < dump.sql
```
 
Remplacer `mysql` par le nom de service défini dans `docker-compose.yml` si nécessaire. Le mot de passe est demandé interactively ; ne pas l'écrire dans l'historique Git.
 
### Migrations Doctrine
 
Après le démarrage du backend, exécuter les migrations si la base est créée à partir de zéro :
 
```bash
docker compose exec backend php bin/console doctrine:migrations:migrate --no-interaction
```
 
Si le dump SQL contient déjà les tables et les versions Doctrine, ne pas rejouer une migration incompatible avec cet état ; vérifier d'abord :
 
```bash
docker compose exec backend php bin/console doctrine:migrations:status
```
 
## Accès à l'application
 
Selon les ports déclarés dans `docker-compose.yml` :
 
- Frontend : `http://localhost:8080`
- API backend : `http://localhost:8000`
- MySQL : `localhost:3306`
- MongoDB : `localhost:27017`
- PhpMyAdmin : `http://localhost:8081`
 
Le frontend utilise le fallback Nginx vers `index.html` afin de permettre le fonctionnement du routeur JavaScript sur les routes suivantes :
 
- `/`
- `/nosmenus`
- `/menu-detail`
- `/signin`
- `/signup`
- `/account`
- `/allCommandes`
- `/infoCommande`
- `/choixCommande`
- `/confirmationCommande`
- `/contact`
- `/accountAdmin`
- `/accountEmploye`
 
## Commandes utiles
 
```bash
# Démarrer les services
docker compose up -d
 
# Arrêter les services
docker compose down
 
# Arrêter les services et supprimer les volumes (suppression des données)
docker compose down -v
 
# Afficher les logs
docker compose logs -f
 
# Afficher les logs d'un service
docker compose logs -f backend
 
# Ouvrir un shell Symfony dans le conteneur backend
docker compose exec backend sh
 
# Vider le cache Symfony
docker compose exec backend php bin/console cache:clear
 
# Lancer les tests Symfony
docker compose exec backend php bin/phpunit
```
 
## Structure du projet
 
```text
.
├── backend/
│   ├── config/
│   ├── migrations/
│   ├── public/
│   ├── src/
│   ├── templates/
│   ├── Dockerfile
│   └── composer.json
├── frontend/
│   ├── pages/
│   ├── ressources/
│   ├── Router/
│   ├── scss/
│   ├── Dockerfile
│   ├── default.conf
│   └── index.html
├── docker-compose.yml
├── dump.sql
└── README.md
```
 
## Sécurité et bonnes pratiques
 
- Ne pas committer `backend/.env`, les mots de passe, les tokens API ou les clés privées ;
- remplacer les identifiants de développement avant toute mise en production ;
- utiliser des mots de passe distincts pour chaque service ;
- protéger les interfaces d'administration par une authentification et des rôles ;
- sauvegarder la base avant tout import SQL ou migration ;
- ne jamais exposer directement les ports de base de données en production sans filtrage réseau ;
- configurer HTTPS et les variables CORS pour l'environnement de production.
 
## Dépannage
 
### La page renvoie une erreur 404 avec Nginx
 
Vérifier que `frontend/default.conf` contient le fallback vers `index.html`, puis reconstruire le service frontend :
 
```bash
docker compose up -d --build frontend
```
 
### Les menus ne se chargent pas
 
Vérifier que le backend est démarré, que l'URL de l'API est correcte dans le frontend et que la configuration CORS autorise l'origine du frontend :
 
```bash
docker compose ps
docker compose logs -f backend
```
 
### La base existe déjà
 
L'import de `dump.sql` doit être réalisé dans une base vide. Si MySQL signale qu'une table existe déjà, arrêter l'import, sauvegarder les données utiles et utiliser une base de développement dédiée.
 
## Licence
 
Projet réalisé dans le cadre d'un projet de formation. Ajouter ici la licence retenue par les auteurs du projet.
