(function () {
    const API_URL = window.API_URL;

    // Exécution
    initConfirmationPage();

    async function initConfirmationPage() {

        // ============================================================
        // 1. DÉCUPÉRATION ET VALIDATION DES DONNÉES
        // ============================================================
        const rawStep1 = sessionStorage.getItem("infoCommande");
        const rawStep2 = sessionStorage.getItem("choixCommande");

        let infoCommande = null;
        let choixCommande = null;

        try {
            infoCommande = rawStep1 ? JSON.parse(rawStep1) : null;
            choixCommande = rawStep2 ? JSON.parse(rawStep2) : null;
        } catch (e) {
            console.error("Erreur de lecture du sessionStorage", e);
        }

        console.log("infoCommande :", infoCommande);
        console.log("choixCommande :", choixCommande);

        // Si une des étapes est manquante, redirection vers l'étape 1
        if (!infoCommande || !choixCommande || !choixCommande.menuId) {
            console.warn("Données de commande incomplètes.");
            alert("Session expirée ou informations manquantes. Veuillez refaire votre choix.");
            window.location.href = "/infoCommande";
            return;
        }

        // ============================================================
        // 2. RECUPÉRATION DU MENU DEPUIS L'API
        // ============================================================
        const menuId = choixCommande.menuId;
        let menuDetails = null;

        try {
            // Adapté pour gérer menuId ou IRI
            const response = await fetch(`${API_URL}/menus/${menuId}`, {
                headers: { 'Accept': 'application/json' }
            });

            if (!response.ok) {
                throw new Error(`Code HTTP ${response.status}`);
            }

            menuDetails = await response.json();
            console.log("Menu chargé :", menuDetails);

        } catch (err) {
            console.error("Menu introuvable dans l'API :", err);
            // Au lieu de rediriger directement, on affiche un message clair
            alert("Impossible de charger les détails du menu sélectionné.");
            return; 
        }

        // ============================================================
        // 3. AFFICHAGE DU RÉCAPITULATIF DANS LE DOM (Si vous avez les éléments)
        // ============================================================
        // Exemples d'éléments s'ils existent dans votre HTML :
        const elemClient = document.getElementById("recapClient");
        if (elemClient) {
            elemClient.textContent = `${infoCommande.nomComplet} (${infoCommande.email})`;
        }

        const elemMenu = document.getElementById("recapMenu");
        if (elemMenu) {
            elemMenu.textContent = `${choixCommande.menuNom} x ${choixCommande.nbPersonnes} personnes`;
        }

        const elemPrix = document.getElementById("recapPrixTotal");
        if (elemPrix) {
            elemPrix.textContent = choixCommande.prixTotal;
        }

        // ============================================================
        // 4. SOUMISSION & ENREGISTREMENT EN BASE DE DONNÉES (POST API)
        // ============================================================
        const btnValider = document.getElementById("btnValiderCommande");

        if (btnValider) {
            btnValider.addEventListener("click", async function(e) {
                e.preventDefault();

                btnValider.disabled = true;
                btnValider.textContent = "Validation en cours...";

                // Nettoyage et conversion des formats pour la BDD
                const prixMenuFloat = parseFloat(
                    choixCommande.prixTotal ? choixCommande.prixTotal.replace('€', '').trim() : 0
                );

                // Génération d'un numéro de commande unique (ex: CMD-20260818-XXXX)
                const numCommande = "CMD-" + Date.now().toString().slice(-8);

                // Construction du JSON à envoyer correspondant à la structure de la table BDD :
                // (numero_commande, date_commande, date_prestation, heure_livraison, prix_menu, 
                //  nombre_personne, prix_livraison, statut, pret_materiel, restitution_materiel, menu_id, utilisateur_id)
                const payloadCommande = {
                    numeroCommande: numCommande,
                    dateCommande: new Date().toISOString(),
                    datePrestation: infoCommande.datePrestation || infoCommande.dateEvent || new Date().toISOString(),
                    heureLivraison: infoCommande.heureLivraison || "12:00",
                    prixMenu: prixMenuFloat,
                    nombrePersonne: parseInt(choixCommande.nbPersonnes),
                    prixLivraison: parseFloat(infoCommande.fraisLivraison || 0),
                    statut: "EN_ATTENTE", // ou "VALIDE"
                    pretMateriel: false,
                    restitutionMateriel: false,

                    // Si vous utilisez API Platform, les relations se passent sous forme d'IRI "/api/..." :
                    menu: `/api/menus/${menuId}`,
                    // Si l'utilisateur est connecté, passer son IRI, sinon null
                    utilisateur: infoCommande.utilisateurId ? `/api/utilisateurs/${infoCommande.utilisateurId}` : null
                };

                try {
                    const postRes = await fetch(`${API_URL}/commandes`, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            "Accept": "application/json"
                        },
                        body: JSON.stringify(payloadCommande)
                    });

                    if (postRes.ok || postRes.status === 201) {
                        const commandeCreee = await postRes.json();
                        console.log("Commande créée avec succès !", commandeCreee);

                        // Vider la session
                        sessionStorage.removeItem("infoCommande");
                        sessionStorage.removeItem("choixCommande");

                        alert("Votre commande a été enregistrée avec succès !");

                        // Redirection finale
                        if (window.router && typeof window.router.navigate === "function") {
                            window.router.navigate("/succesCommande");
                        } else {
                            window.location.href = "/succesCommande";
                        }
                    } else {
                        const errData = await postRes.json();
                        console.error("Erreur serveur lors de la création de la commande :", errData);
                        alert("Erreur lors de la validation de la commande. Veuillez réessayer.");
                        btnValider.disabled = false;
                        btnValider.textContent = "Valider ma commande";
                    }

                } catch (err) {
                    console.error("Erreur réseau :", err);
                    alert("Erreur de connexion au serveur.");
                    btnValider.disabled = false;
                    btnValider.textContent = "Valider ma commande";
                }
            });
        }
    }
})();