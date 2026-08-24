(function () {
    const API_URL = window.API_URL;

    // URL de base déduite pour les images statiques
    const BASE_URL = (typeof API_BASE_URL !== 'undefined') 
        ? API_BASE_URL 
        : (typeof API_URL !== 'undefined' ? API_URL.replace(/\/api\/?$/, '') : 'http://127.0.0.1:8000');

    const themeRadios  = document.querySelectorAll("input[name='theme']");
    const budgetRange  = document.getElementById("budgetRange");
    const budgetLabel  = document.getElementById("budgetLabel");
    const prixMax      = document.getElementById("prixMax");
    const prixMin      = document.getElementById("prixMin");
    const vegetarien   = document.getElementById("vegetarien");
    const listeMenus   = document.getElementById("listeMenus");

    let allMenusData = [];

    // 1. Écouteurs d'événements
    if (budgetRange) {
        budgetRange.addEventListener("input", function () {
            budgetLabel.textContent = "0 € à " + this.value + " €";
            filtrerEtAfficher();
        });
    }

    themeRadios.forEach(radio => radio.addEventListener("change", filtrerEtAfficher));
    if (prixMax) prixMax.addEventListener("change", filtrerEtAfficher);
    if (prixMin) prixMin.addEventListener("change", filtrerEtAfficher);
    if (vegetarien) vegetarien.addEventListener("change", filtrerEtAfficher);

    // Helper pour nettoyer les chaînes (supprimer accents et mettre en minuscules)
    function cleanString(str) {
        if (!str) return "";
        return str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    }

    // 2. Charger les menus depuis l'API Symfony
    async function fetchMenus() {
        if (!listeMenus) return;

        listeMenus.innerHTML = '<div class="text-center py-5"><div class="spinner-border text-success" role="status"></div><p class="mt-2 text-muted">Chargement des menus...</p></div>';

        try {
            const response = await fetch(`${API_URL}/menus`, {
                method: 'GET',
                headers: { 
                    'Accept': 'application/json',
                    'Content-Type': 'application/json' 
                }
            });

            if (!response.ok) {
                throw new Error(`Erreur HTTP ${response.status} (${response.statusText})`);
            }

            // Vérification que la réponse est bien du JSON
            const contentType = response.headers.get("content-type");
            if (!contentType || !contentType.includes("application/json")) {
                throw new Error("L'API a renvoyé du HTML au lieu de JSON. Vérifiez l'URL de votre route Symfony.");
            }

            const data = await response.json();
            allMenusData = Array.isArray(data) ? data : (data['hydra:member'] || data.member || []);
            console.log("📥 Menus reçus de la BDD :", allMenusData);

            filtrerEtAfficher();

        } catch (error) {
            console.error("🔴 Erreur chargement menus :", error);
            listeMenus.innerHTML = `
                <div class="alert alert-danger text-center">
                    ❌ Impossible de charger les menus.<br>
                    <small class="text-muted">${error.message}</small>
                </div>`;
        }
    }

    // 3. Filtrer et afficher
    function filtrerEtAfficher() {
        const themeSelectionne = document.querySelector("input[name='theme']:checked")?.value || "tous";
        const budgetMax = parseInt(budgetRange ? budgetRange.value : 60);
        const vegetarienCoche = vegetarien ? vegetarien.checked : false;

        let menusFiltres = allMenusData.filter(menu => {
            const prix = parseFloat(menu.prixParPersonne || 0);

            // Extraire la liste des noms de thèmes
            const themesNoms = (menu.themes || []).map(t => cleanString(t.nom || t.libelle));

            // Extraire la liste des noms de régimes
            const regimesNoms = (menu.regimes || []).map(r => cleanString(r.nom || r.libelle));

            // Vérifier si le menu est végétarien (dans ses régimes ou dans ses thèmes)
            const isVege = regimesNoms.some(r => r.includes("vegetarien")) || 
                           themesNoms.some(t => t.includes("vegetarien"));

            // 1. Filtre par Thème
            if (themeSelectionne !== "tous") {
                const selectedClean = cleanString(themeSelectionne);
                const hasTheme = themesNoms.some(t => t.includes(selectedClean));
                if (!hasTheme) return false;
            }

            // 2. Filtre par Budget
            if (prix > budgetMax) return false;

            // 3. Filtre Végétarien
            if (vegetarienCoche && !isVege) return false;

            return true;
        });

        // Tri par prix
        if (prixMin && prixMin.checked) {
            menusFiltres.sort((a, b) => parseFloat(a.prixParPersonne) - parseFloat(b.prixParPersonne));
        } else if (prixMax && prixMax.checked) {
            menusFiltres.sort((a, b) => parseFloat(b.prixParPersonne) - parseFloat(a.prixParPersonne));
        }

        // Rendu HTML
        if (menusFiltres.length === 0) {
            listeMenus.innerHTML = '<p class="text-muted text-center mt-4 w-100">😔 Aucun menu ne correspond à vos critères.</p>';
            return;
        }

        listeMenus.innerHTML = menusFiltres.map(menu => creerCardHTML(menu)).join('');
    }

    function creerCardHTML(menu) {
        const id = menu.menuId || menu.id;
        const titre = menu.titre || "Menu Sans Nom";
        const prix = menu.prixParPersonne || 0;
        const minPeople = menu.nombrePersonneMinimum || 1;
        const description = menu.description || "Aucune description disponible.";

        // Noms des thèmes pour l'affichage
        const themesList = (menu.themes || []).map(t => t.nom || t.libelle).filter(Boolean);
        const themeAffichage = themesList.length > 0 ? themesList.join(', ') : 'Classique';

        // Image : gestion du chemin relatif vs URL complète
        let image = "../ressources/grandrepas2.jpg";
        if (menu.images && menu.images.length > 0 && menu.images[0].path) {
            const imagePath = menu.images[0].path;
            image = imagePath.startsWith('http') ? imagePath : `${BASE_URL}/${imagePath.replace(/^\//, '')}`;
        } else if (menu.photo || menu.image) {
            const imagePath = menu.photo || menu.image;
            image = imagePath.startsWith('http') || imagePath.startsWith('data:') ? imagePath : `${BASE_URL}/${imagePath.replace(/^\//, '')}`;
        }

        return `
            <div class="card mb-4 border-0 shadow-sm">
                <div class="row g-0 align-items-center">
                    <div class="col-md-4">
                        <img src="${image}" class="img-fluid rounded-start w-100" style="object-fit: cover; height: 180px;" alt="${titre}" onerror="this.onerror=null; this.src='../ressources/grandrepas2.jpg';">
                    </div>
                    <div class="col-md-8">
                        <div class="card-body">
                            <div class="d-flex justify-content-between align-items-center">
                                <h5 class="card-title text-success mb-0">${titre}</h5>
                                <a href="/menu-detail?id=${id}" class="small text-decoration-none">Voir le détail</a>
                            </div>
                            <p class="small text-muted mb-2 mt-1">
                                👥 Min ${minPeople} pers. • 💰 ${prix}€/pers • 🗂️ ${themeAffichage}
                            </p>
                            <p class="card-text text-secondary">${description}</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    fetchMenus();
})();