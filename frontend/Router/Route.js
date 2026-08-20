export default class Route {
    constructor(url, title, pathHtml, pathJS, authorize = "") {
        this.url = url;
        this.title = title;
        this.pathHtml = pathHtml;
        this.pathJS = pathJS;
        this.authorize = authorize;
    }
}

/*
[] -> Tout le monde peut y accéder
["disconnected"] -> Réservé aux users déconnecté
["client"] -> Réservé aux users clients
["admin"] -> Réservé aux users admins
["employe"] -> Réservé aux users employés
["admin", "employe"] -> Réservé aux users admin et employé
["admin", "employe", "client"] -> Réservé aux users admin, employé et client
*/