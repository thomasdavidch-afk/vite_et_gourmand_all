(function () {
    const API_URL = window.API_URL;

    (function waitForContainer() {
        const container = document.getElementById("containerCommandes");
        if (!container) {
            setTimeout(waitForContainer, 100);
            return;
        }
        chargerCommandesClient(container);
    })();

    async function chargerCommandesClient(container) {
        console.log("🔄 Lancement de la récupération des commandes...");

        function getCookie(name) {
            const value = `; ${document.cookie}`;
            const parts = value.split(`; ${name}=`);
            if (parts.length === 2) return decodeURIComponent(parts.pop().split(';').shift());
            return null;
        }

        const token = (typeof getToken === 'function' ? getToken() : null) || getCookie("accesstoken");

        const headers = {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        };
        if (token) {
            headers['X-AUTH-TOKEN'] = token;
        }

        try {
            // 1. Récupération des commandes
            const res = await fetch(`${API_URL}/mes-commandes`, { 
                headers,
                cache: 'no-store'
            });

            if (!res.ok) throw new Error("Impossible de charger les commandes.");

            const data = await res.json();
            const mesCommandes = Array.isArray(data) ? data : (data['hydra:member'] || data.member || []);

            console.log(`📦 Commandes reçues : ${mesCommandes.length}`);

            // 2. Rendu HTML
            container.innerHTML = "";

            if (mesCommandes.length === 0) {
                container.innerHTML = `
                    <div class="alert alert-info text-center my-4">
                        <i class="bi bi-info-circle me-2"></i>Vous n'avez passé aucune commande pour le moment.
                    </div>`;
                return;
            }

            mesCommandes.forEach((cmd, index) => {
                const numCommande = cmd.numeroCommande || cmd.id || 'N/A';
                const collapseId = `collapse-${index}-${numCommande.replace(/[^a-zA-Z0-9]/g, '')}`;

                const dateCmd = cmd.dateCommande ? new Date(cmd.dateCommande).toLocaleDateString('fr-FR') : 'N/A';
                const datePrest = cmd.datePrestation ? new Date(cmd.datePrestation).toLocaleDateString('fr-FR') : 'N/A';

                // Format heure : retire les secondes superflues si présentes
                let heureLiv = cmd.heureLivraison || 'Non spécifiée';
                if (heureLiv.length === 8) {
                    heureLiv = heureLiv.slice(0, 5);
                }

                const menuTitre = cmd.menu?.titre || 'Menu personnalisé / standard';
                const prixMenu = parseFloat(cmd.prixMenu || 0);
                const prixLivraison = parseFloat(cmd.prixLivraison || 0);
                const total = prixMenu + prixLivraison;
                const nbPersonnes = cmd.nombrePersonne || 1;
                const statut = cmd.statut || 'En attente';
                const pretMateriel = cmd.pretMateriel ? 'Oui' : 'Non';

                // Gestion des couleurs du badge statut
                let badgeColor = 'bg-warning text-dark';
                if (statut.toLowerCase().includes('valide') || statut.toLowerCase().includes('livré') || statut.toLowerCase().includes('accept')) {
                    badgeColor = 'bg-success text-white';
                } else if (statut.toLowerCase().includes('annul') || statut.toLowerCase().includes('refus')) {
                    badgeColor = 'bg-danger text-white';
                }

                const cardHTML = `
                    <div class="card mb-3 shadow-sm border-0">
                        <div class="card-body">
                            <div class="d-flex justify-content-between align-items-center mb-2">
                                <h5 class="card-title mb-0">Commande <strong>${numCommande}</strong></h5>
                                <span class="badge ${badgeColor}">${statut}</span>
                            </div>
                            <p class="text-muted small mb-2">Passée le : ${dateCmd}</p>

                            <div class="d-flex justify-content-between align-items-center">
                                <span class="fs-5 fw-bold text-primary">Total : ${total.toFixed(2)} €</span>
                                <button class="btn btn-sm btn-outline-secondary" type="button" data-bs-toggle="collapse" data-bs-target="#${collapseId}">
                                    Voir détails
                                </button>
                            </div>

                            <div class="collapse mt-3" id="${collapseId}">
                                <div class="card card-body bg-light border-0">
                                    <h6 class="fw-bold text-dark mb-2">
                                        <i class="bi bi-journal-text me-1"></i> Menu : <span class="text-primary">${menuTitre}</span>
                                    </h6>
                                    <p class="mb-1"><strong>Prestation prévue le :</strong> ${datePrest} à ${heureLiv}</p>
                                    <p class="mb-1"><strong>Nombre de personnes :</strong> ${nbPersonnes}</p>
                                    <p class="mb-1"><strong>Prêt de matériel :</strong> ${pretMateriel}</p>
                                    <hr class="my-2">
                                    <div class="d-flex justify-content-between">
                                        <span>Prix menu :</span><span class="fw-semibold">${prixMenu.toFixed(2)} €</span>
                                    </div>
                                    <div class="d-flex justify-content-between">
                                        <span>Livraison :</span><span class="fw-semibold">${prixLivraison.toFixed(2)} €</span>
                                    </div>
                                </div>
                            </div>

                            ${statut.toLowerCase().includes("attente") ? `
                            <div class="mt-3 text-end">
                                <button class="btn btn-sm btn-outline-danger btn-annuler" data-num="${numCommande}">
                                    <i class="bi bi-x-circle me-1"></i> Annuler commande
                                </button>
                            </div>` : ''}
                        </div>
                    </div>
                `;
                container.insertAdjacentHTML("beforeend", cardHTML);
            });

            // 3. Gestionnaire pour le bouton d'annulation
            container.querySelectorAll(".btn-annuler").forEach(btn => {
                btn.addEventListener("click", async function() {
                    const numCmd = this.dataset.num;
                    if (!confirm(`Êtes-vous sûr de vouloir annuler la commande ${numCmd} ?`)) {
                        return;
                    }

                    this.disabled = true;
                    this.textContent = "Annulation en cours...";

                    try {
                        const resPatch = await fetch(`${API_URL}/mes-commandes/${numCmd}`, {
                            method: 'PATCH',
                            headers: headers,
                            body: JSON.stringify({ statut: 'Annulée' })
                        });

                        if (resPatch.ok) {
                            alert("Votre commande a été annulée avec succès.");
                            chargerCommandesClient(container); // Recharger la liste
                        } else {
                            const err = await resPatch.json();
                            alert(err.error || "Impossible d'annuler la commande.");
                            this.disabled = false;
                            this.textContent = "Annuler commande";
                        }
                    } catch (e) {
                        console.error("Erreur annulation :", e);
                        alert("Erreur réseau lors de l'annulation.");
                        this.disabled = false;
                        this.textContent = "Annuler commande";
                    }
                });
            });

        } catch (error) {
            console.error("❌ Erreur :", error);
            container.innerHTML = `<div class="alert alert-danger my-4 text-center">${error.message}</div>`;
        }
    }
})();