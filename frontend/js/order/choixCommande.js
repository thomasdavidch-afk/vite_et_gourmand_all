// Exécution
initChoixCommandePage();

async function initChoixCommandePage() {

    // ============================================================
    // 1. SÉCURISATION & VALIDATION ÉTAPE 1
    // ============================================================
    const rawDataStep1 = sessionStorage.getItem("infoCommande");
    let infoCommande = null;

    try {
        infoCommande = rawDataStep1 ? JSON.parse(rawDataStep1) : null;
    } catch (e) {
        infoCommande = null;
    }

    if (!infoCommande || !infoCommande.email) {
        console.warn("Étape 1 non complétée, redirection...");
        if (window.router && typeof window.router.navigate === "function") {
            window.router.navigate("/infoCommande");
        } else {
            window.location.href = "/infoCommande";
        }
        return;
    }

    // ============================================================
    // 2. ÉLÉMENTS DOM
    // ============================================================
    const selectMenu         = document.getElementById("selectMenu");
    const sectionChoix       = document.getElementById("sectionChoix");
    const containerContenu   = document.getElementById("containerContenuMenu");
    const nbPersonnesInput   = document.getElementById("nbPersonnes");
    const erreurPersonnes    = document.getElementById("erreurPersonnes");
    const remiseInput        = document.getElementById("remise");
    const prixBaseInput      = document.getElementById("prixBase");
    const montantRemiseInput = document.getElementById("montantRemise");
    const prixTotalInput     = document.getElementById("prixTotal");
    const formChoixMenu      = document.getElementById("formChoixMenu");

    let menusMap = {};
    let cataloguePlats = {};

    function getCookie(name) {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop().split(';').shift();
        return null;
    }

    // ============================================================
    // 3. CHARGEMENT DU CATALOGUE DE PLATS
    // ============================================================
    async function chargerCataloguePlats() {
        try {
            const res = await fetch("http://127.0.0.1:8000/api/plats", {
                headers: { 'Accept': 'application/json' }
            });

            if (res.ok) {
                const data = await res.json();
                const listePlats = Array.isArray(data) ? data : (data["hydra:member"] || data.plats || []);

                listePlats.forEach(p => {
                    const id = p.platId || p.id || p._id;
                    const nomOuTitre = p.titre || p["titre-plat"] || p.titrePlat || p.nom || p.libelle;
                    if (id) {
                        cataloguePlats[id] = nomOuTitre || `Plat #${id}`;
                    }
                });
            }
        } catch (e) {
            console.warn("Impossible de charger le catalogue des plats", e);
        }
    }

    // ============================================================
    // 4. CHARGEMENT DES MENUS
    // ============================================================
    try {
        await chargerCataloguePlats();

        const API_URL = "http://127.0.0.1:8000/api/menus"; 
        const res = await fetch(API_URL, {
            headers: { 'Accept': 'application/json' }
        });

        if (!res.ok) throw new Error(`Erreur HTTP ${res.status}`);

        const data = await res.json();
        const listeMenus = Array.isArray(data) ? data : (data["hydra:member"] || data.menus || []);

        selectMenu.innerHTML = '<option selected disabled value="">-- Sélectionnez un menu --</option>';

        listeMenus.forEach(menu => {
            const id = menu.menuId || menu.id || menu._id;
            const titre = menu.titre || menu.nom || "Menu";
            const prix = parseFloat(menu.prixParPersonne || menu.prix || 0);

            menusMap[id] = menu;

            const option = document.createElement("option");
            option.value = id;
            option.textContent = `${titre} (${prix.toFixed(2)}€ / pers.)`;
            selectMenu.appendChild(option);
        });

        const savedMenuId = sessionStorage.getItem("selectedMenuId");
        if (savedMenuId && menusMap[savedMenuId]) {
            selectMenu.value = savedMenuId;
            selectMenu.dispatchEvent(new Event('change'));
        }

    } catch (err) {
        console.error("Erreur menus :", err);
        selectMenu.innerHTML = '<option selected disabled value="">Impossible de charger les menus</option>';
    }

    // ============================================================
    // 5. CHANGEMENT DE MENU
    // ============================================================
    selectMenu.addEventListener("change", function() {
        const menuId = this.value;
        const menu = menusMap[menuId];

        if (!menu) return;

        sectionChoix.classList.remove("d-none");

        const minPersonnes = menu.nombrePersonneMinimum || menu.minPersonnes || 1;
        nbPersonnesInput.value = minPersonnes;
        nbPersonnesInput.min = minPersonnes;

        let htmlContenu = `<h5 class="fw-bold text-primary mb-2">${menu.titre || menu.nom}</h5>`;
        if (menu.description) {
            htmlContenu += `<p class="text-muted small mb-3">${menu.description}</p>`;
        }

        const listePlats = menu.plats || menu.menuPlats || [];

        if (Array.isArray(listePlats) && listePlats.length > 0) {
            htmlContenu += `<h6 class="fw-bold mb-2">Composition du menu :</h6><ul class="mb-0 ps-3">`;
            listePlats.forEach(item => {
                const objPlat = item.plat || item;
                const idPlat = objPlat.platId || objPlat.id;
                const titreDirect = objPlat.titre || objPlat["titre-plat"] || objPlat.titrePlat || objPlat.nom;
                const nomFinal = titreDirect || cataloguePlats[idPlat] || `Plat #${idPlat}`;
                htmlContenu += `<li>${nomFinal}</li>`;
            });
            htmlContenu += `</ul>`;
        } else {
            htmlContenu += `<p class="mb-0 text-muted fs-6"><em>Menu tout-compris.</em></p>`;
        }

        containerContenu.innerHTML = htmlContenu;
        calculerPrix();
    });

    // ============================================================
    // 6. CALCUL DU PRIX ET DES REMISES
    // ============================================================
    function calculerPrix() {
        const menuId = selectMenu.value;
        const menu = menusMap[menuId];
        if (!menu) return;

        const prixParPersonne = parseFloat(menu.prixParPersonne || menu.prix || 0);
        const minPersonnes = parseInt(menu.nombrePersonneMinimum || menu.minPersonnes || 1);
        const nbPersonnes = parseInt(nbPersonnesInput.value) || 0;

        erreurPersonnes.classList.add("d-none");

        if (nbPersonnes < minPersonnes) {
            erreurPersonnes.textContent = `Le nombre minimum de personnes pour ce menu est de ${minPersonnes}.`;
            erreurPersonnes.classList.remove("d-none");
        }

        const prixBase = prixParPersonne * nbPersonnes;
        let tauxRemise = 0;

        if (nbPersonnes >= minPersonnes + 5) {
            tauxRemise = 0.10; // 10%
        }

        const montantRemise = prixBase * tauxRemise;
        const prixTotal = prixBase - montantRemise;

        remiseInput.value = (tauxRemise * 100) + " %";
        prixBaseInput.value = prixBase.toFixed(2) + " €";
        montantRemiseInput.value = montantRemise.toFixed(2) + " €";
        prixTotalInput.value = prixTotal.toFixed(2) + " €";
    }

    nbPersonnesInput.addEventListener("input", calculerPrix);

    // ============================================================
    // 7. SOUMISSION DU FORMULAIRE ET ENVOI AU CONTROLLER
    // ============================================================
    formChoixMenu.addEventListener("submit", async function(e) {
        e.preventDefault();

        const btnSubmit = formChoixMenu.querySelector('button[type="submit"]');
        const menuId = selectMenu.value;
        const menu = menusMap[menuId];

        if (!menuId || !menu) {
            alert("Veuillez sélectionner un menu.");
            return;
        }

        const minPersonnes = parseInt(menu.nombrePersonneMinimum || menu.minPersonnes || 1);
        const nbPersonnes = parseInt(nbPersonnesInput.value);

        if (isNaN(nbPersonnes) || nbPersonnes < minPersonnes) {
            alert(`Le minimum de personnes requis pour ce menu est de ${minPersonnes}.`);
            return;
        }

        // Sauvegarde locale sessionStorage
        const choixCommande = {
            menuId: parseInt(menuId, 10),
            menuNom: menu.titre || menu.nom,
            prixParPersonne: parseFloat(menu.prixParPersonne || menu.prix || 0),
            nbPersonnes: nbPersonnes,
            prixBase: prixBaseInput.value,
            remise: remiseInput.value,
            montantRemise: montantRemiseInput.value,
            prixTotal: prixTotalInput.value
        };
        sessionStorage.setItem("choixCommande", JSON.stringify(choixCommande));

        // Formatage de l'heure
        let heureLivraisonBrute = (infoCommande.heureLivraison || infoCommande.heure || "12:00").trim();
        if (heureLivraisonBrute.length === 5) {
            heureLivraisonBrute += ":00";
        }

        const datePrestationStr = (infoCommande.datePrestation || infoCommande.dateLivraison || new Date().toISOString().slice(0, 10)).slice(0, 10);

        // PAYLOAD EXACT ATTENDU PAR LE CommandeController PHP
        const payloadCommande = {
            menuId: parseInt(menuId, 10),
            nombrePersonne: nbPersonnes,
            datePrestation: datePrestationStr,
            heure: heureLivraisonBrute,
            pretMateriel: infoCommande.pretMateriel || false,
            // Coordonnées client pour création/maj utilisateur et frais de livraison :
            email: infoCommande.email,
            nomComplet: infoCommande.nomComplet || infoCommande.nom || '',
            telephone: infoCommande.telephone || '',
            ville: infoCommande.ville || 'Bordeaux',
            distanceKm: parseFloat(infoCommande.distanceKm || infoCommande.distance || 0),
            numeroRue: infoCommande.numeroRue || '',
            nomRue: infoCommande.nomRue || infoCommande.adresse || '',
            codePostal: infoCommande.codePostal || ''
        };

        console.log("Payload envoyé à la BDD :", payloadCommande);

        if (btnSubmit) {
            btnSubmit.disabled = true;
            btnSubmit.textContent = "Enregistrement en cours...";
        }

        const tokenCookie = getCookie("accesstoken");
        const headers = {
            "Content-Type": "application/json",
            "Accept": "application/json"
        };

        if (tokenCookie) {
            headers["X-AUTH-TOKEN"] = tokenCookie;
        }

        try {
            const response = await fetch("http://127.0.0.1:8000/api/mes-commandes", {
                method: "POST",
                headers: headers,
                body: JSON.stringify(payloadCommande)
            });

            if (response.ok || response.status === 201) {
                const resData = await response.json();
                console.log("✅ Commande créée avec succès :", resData);

                // On stocke le numéro de commande retourné pour l'affichage final
                sessionStorage.setItem("dernierNumeroCommande", resData.numeroCommande);

                if (window.router && typeof window.router.navigate === "function") {
                    window.router.navigate("/confirmationCommande");
                } else {
                    window.location.href = "/confirmationCommande";
                }
            } else {
                const errData = await response.json();
                console.error("❌ Erreur serveur lors de la création :", errData);
                alert(errData.error || "Erreur lors de la validation de la commande.");
                if (btnSubmit) {
                    btnSubmit.disabled = false;
                    btnSubmit.textContent = "Valider ma commande";
                }
            }
        } catch (error) {
            console.error("❌ Erreur réseau lors du POST commande :", error);
            alert("Impossible de se connecter au serveur.");
            if (btnSubmit) {
                btnSubmit.disabled = false;
                btnSubmit.textContent = "Valider ma commande";
            }
        }
    });
}