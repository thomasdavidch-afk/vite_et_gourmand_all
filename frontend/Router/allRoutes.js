import Route from "./Route.js";


//Définir ici vos routes
export const allRoutes = [
    new Route("/", "Accueil", "pages/home.html", "", []),
    new Route("/nosmenus", "Nos Menus", "pages/nosmenus.html", "js/nosmenus.js", []),
    new Route("/menu-detail", "Détail du Menu", "pages/menu-detail.html", "js/menu-detail.js", []),
    new Route("/MenuJoyeuxNoelIndien", "Menu Joyeux Noel Indien", "pages/MenuJoyeuxNoelIndien.html", "", []),
    new Route("/MenuSeminaire", "Menu Séminaire", "pages/MenuSeminaire.html", "", []),
    new Route("/MenuViveLesMaries", "Menu Vive les Mariés", "pages/MenuViveLesMaries.html", "", []),
    new Route("/MenuLeGrandFormat", "Menu Le Grand Format", "pages/MenuLeGrandFormat.html", "", []),
    new Route("/MenuVegetarien", "Menu Végétarien", "pages/MenuVegetarien.html", "", []),
    new Route("/signin", "Connexion", "pages/auth/signin.html", "js/auth/signin.js", ["disconnected"]),
    new Route("/signup", "Inscription", "pages/auth/signup.html", "js/auth/signup.js", ["disconnected"]),
    new Route("/account", "Mon Compte", "pages/auth/account.html", "js/auth/accountClient.js", ["client", "admin", "employe"]),
    new Route("/editPassword", "Changement mot de passe", "pages/auth/editPassword.html", "js/auth/editPassword.js", ["client", "admin", "employe"]),
    new Route("/allCommandes", "Vos commandes", "pages/commandes/allCommandes.html", "js/order/mesCommandes.js", ["client"]),
    new Route("/infoCommande", "Etape 1 : Commande", "pages/commandes/infoCommande.html", "js/order/infoCommande.js", []),
    new Route("/choixCommande", "Etape 2 : Commande", "pages/commandes/choixCommande.html", "js/order/choixCommande.js", []),
    new Route("/confirmationCommande", "Etape 3 : Confirmation Commande", "pages/commandes/confirmationCommande.html", "js/order/confirmationCommande.js", []),
    new Route("/contact", "Contactez-nous", "pages/contact.html", "js/contact.js", []),
    new Route("/accountAdmin", "Mon Compte Administrateur", "pages/auth/accountAdmin.html", "js/auth/accountAdmin.js", ["admin"]),
    new Route("/accountEmploye", "Mon Compte Employe", "pages/auth/accountEmploye.html", "js/auth/accountEmploye.js", ["employe"]),
];

//Le titre s'affiche comme ceci : Route.titre - websitename
export const websiteName = "Vite & Gourmand";