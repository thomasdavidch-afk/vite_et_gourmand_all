const API_BASE_URL = "http://127.0.0.1:8000";

// Placeholder SVG propre généré en mémoire si pas d'image ou si l'image plante
const DEFAULT_PLACEHOLDER = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'><rect width='100%' height='100%' fill='%23f8f9fa'/><text x='50%' y='50%' fill='%236c757d' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='16'>Image non disponible</text></svg>";

/**
 * Fonction utilitaire pour formater la source de l'image
 */
function formatImageSrc(imagePath) {
    if (!imagePath) return DEFAULT_PLACEHOLDER;

    // 1. Data URL (Base64 déjà formatiée)
    if (imagePath.startsWith('data:')) return imagePath;

    // 2. Chemin relatif vers l'API Backend (/uploads/...)
    if (imagePath.startsWith('/') || imagePath.startsWith('uploads/')) {
        const cleanPath = imagePath.startsWith('/') ? imagePath : `/${imagePath}`;
        return `${API_BASE_URL}${cleanPath}`;
    }

    // 3. URL absolue HTTP/HTTPS
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) return imagePath;

    // 4. Chaîne binaire Base64 brute
    return `data:image/jpeg;base64,${imagePath}`;
}

async function chargerDetailMenu() {
    const urlParams = new URLSearchParams(window.location.search);
    const menuId = urlParams.get('id');

    if (!menuId || isNaN(menuId)) return;

    try {
        // 1. Récupération du menu depuis le Backend
        const response = await fetch(`${API_BASE_URL}/api/menus/${menuId}`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const menu = await response.json();
        console.log("Menu complet reçu :", menu);

        // 2. Remplissage des infos globales du menu
        if (document.getElementById('menu-titre')) document.getElementById('menu-titre').textContent = `“ ${menu.titre || ''} ”`;
        if (document.getElementById('menu-description')) document.getElementById('menu-description').textContent = menu.description || '';
        if (document.getElementById('menu-stock')) document.getElementById('menu-stock').textContent = `${menu.quantiteRestante ?? '--'} en stock`;
        if (document.getElementById('menu-prix')) document.getElementById('menu-prix').textContent = `${menu.prixParPersonne ?? '--'} € / personne`;
        if (document.getElementById('menu-min-pers')) document.getElementById('menu-min-pers').textContent = menu.nombrePersonneMinimum ?? '--';

        const elRegime = document.getElementById('menu-regime');
        if (elRegime) {
            if (menu.regimes && Array.isArray(menu.regimes) && menu.regimes.length > 0) {
                // Extrait 'nom' ou 'libelle' de chaque régime et les joint avec une virgule s'il y en a plusieurs
                elRegime.textContent = menu.regimes
                    .map(r => r.nom || r.libelle)
                    .filter(Boolean)
                    .join(', ');
            } else {
                elRegime.textContent = menu.regime || '--';
            }
        }

        // 3. Traitement de l'image principale du menu
        const imgMenuElement = document.getElementById('menu-image');
        if (imgMenuElement) {
            const menuPhoto = menu.photo || menu.image || menu.imagePath;
            imgMenuElement.src = formatImageSrc(menuPhoto);
            imgMenuElement.onerror = function() {
                this.onerror = null;
                this.src = DEFAULT_PLACEHOLDER;
            };
        }

        // 4. Traitement des plats
        const containerPlats = document.getElementById('liste-plats-container');
        if (!containerPlats) return;

        containerPlats.innerHTML = '';

        if (menu.plats && Array.isArray(menu.plats) && menu.plats.length > 0) {

            // Récupération des détails de chaque plat
            const platPromises = menu.plats.map(async (item) => {
                const id = item.platId || item.id;
                if (!id) return null;

                try {
                    const res = await fetch(`${API_BASE_URL}/api/plats/${id}`);
                    if (!res.ok) return null;
                    return await res.json();
                } catch (e) {
                    console.error(`Erreur lors de la récupération du plat ${id}:`, e);
                    return null;
                }
            });

            const platsDetails = await Promise.all(platPromises);

            // Génération dynamique des cartes de plats
            platsDetails.forEach((plat) => {
                if (!plat) return;

                const titre = plat.titrePlat || 'Plat sans nom';
                const imageSrc = formatImageSrc(plat.photo);

                const cardHTML = `
                    <div class="col-md-4 mb-4">
                        <div class="card h-100 shadow-sm border-0">
                            <img src="${imageSrc}" 
                                 class="card-img-top" 
                                 style="height: 180px; object-fit: cover;" 
                                 alt="${titre}" 
                                 onerror="this.onerror=null; this.src='${DEFAULT_PLACEHOLDER}';">
                            <div class="card-body text-center">
                                <h5 class="card-title fw-bold text-success mb-0">${titre}</h5>
                            </div>
                        </div>
                    </div>
                `;

                containerPlats.innerHTML += cardHTML;
            });

        } else {
            containerPlats.innerHTML = `<p class="text-muted text-center col-12">Aucun plat renseigné pour ce menu.</p>`;
        }

    } catch (error) {
        console.error("Erreur lors du chargement :", error);
    }
}

chargerDetailMenu();