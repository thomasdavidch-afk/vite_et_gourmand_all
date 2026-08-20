🍽️ Vite et Gourmand - Backend API

📌 Description
API backend du projet 'Vite et Gourmand'. Elle permet de gérer les données de l’application (menus, utilisateurs, etc.) et de les exposer au frontend via une API REST.

⚙️ Technologies utilisées
- PHP
- Symfony
- API Platform
- Composer

🚀 Installation
1. Cloner le projet :
 git clone https://github.com/thomasdavidch-afk/vite-et-gourmand-api.git
 cd vite-et-gourmand-api

2. Installer les dépendances :
 composer install

🔐 Configuration
Créer un fichier .env.local à la racine du projet :
 cp .env .env.local

Configurer les variables nécessaires (ex : base de données).

🗄️ Base de données
Créer la base de données :
 php bin/console doctrine:database:create

Lancer les migrations :
 php bin/console doctrine:migrations:migrate

▶️ Lancer le serveur
symfony serve
ou
php -S localhost:8000 -t public

🔗 Accès à l’API
API : http://localhost:8000/api
Documentation (Swagger) : http://localhost:8000/api/docs

🔗 Lien avec le frontend

✅ Fonctionnalités principales
- Gestion des menus
- API Platform

👨‍💻 Auteur
Projet réalisé dans le cadre de l'ECF par Thomas DAVID.
