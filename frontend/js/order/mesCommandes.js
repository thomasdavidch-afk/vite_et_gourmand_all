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
        'Accept': 'application/json, application/ld+json, */*',
        'Content-Type': 'application/json'
    };
    if (token) {
        headers['X-AUTH-TOKEN'] = token;
    }

    try {
        // 1. Récupération des commandes (le serveur PHP s'occupe de renvoyer UNIQUEMENT celles de l'utilisateur connecté)
        const res = await fetch("http://127.0.0.1:8000/api/mes-commandes", { 
            headers,
            cache: 'no-store' // Forcer la mise à jour pour éviter tout cache de réponse
        });
        
        if (!res.ok) throw new Error("Impossible de charger les commandes.");

        const data = await res.json();
        // Le PHP renvoie directement le tableau des commandes du client connecté
        const mesCommandes = data['hydra:member'] || data.member || data || [];

        console.log(`📦 Commandes reçues pour cet utilisateur : ${mesCommandes.length}`);

        // 2. Rendu HTML
        container.innerHTML = "";

        if (mesCommandes.length === 0) {
            container.innerHTML = `
                <div class="alert alert-info text-center my-4">
                    <i class="bi bi-info-circle me-2"></i>Vous n'avez passé aucune commande pour le moment.
                </div>`;
            return;
        }

        mesCommandes.forEach(cmd => {
            const idCommande = cmd.id || cmd['@id']?.split('/').pop() || 'N/A';
            const numCommande = cmd.numeroCommande || idCommande;
            const dateCmd = cmd.dateCommande ? new Date(cmd.dateCommande).toLocaleDateString('fr-FR') : 'N/A';
            const datePrest = cmd.datePrestation ? new Date(cmd.datePrestation).toLocaleDateString('fr-FR') : 'N/A';
            const heureLiv = cmd.heureLivraison || 'Non spécifiée';

            const prixMenu = parseFloat(cmd.prixMenu || 0);
            const prixLivraison = parseFloat(cmd.prixLivraison || 0);
            const total = prixMenu + prixLivraison;
            const nbPersonnes = cmd.nombrePersonne || 1;
            const statut = cmd.statut || 'En attente';

            let badgeColor = 'bg-warning text-dark';
            if (statut.toLowerCase().includes('valide') || statut.toLowerCase().includes('livré')) badgeColor = 'bg-success';
            if (statut.toLowerCase().includes('annul')) badgeColor = 'bg-danger';

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
                            <button class="btn btn-sm btn-outline-secondary" type="button" data-bs-toggle="collapse" data-bs-target="#collapse-${idCommande}">
                                Voir détails
                            </button>
                        </div>

                        <div class="collapse mt-3" id="collapse-${idCommande}">
                            <div class="card card-body bg-light">
                                <p class="mb-1"><strong>Prestation prévue le :</strong> ${datePrest} à ${heureLiv}</p>
                                <p class="mb-1"><strong>Nombre de personnes :</strong> ${nbPersonnes}</p>
                                <hr>
                                <div class="d-flex justify-content-between">
                                    <span>Prix menu :</span><span>${prixMenu.toFixed(2)} €</span>
                                </div>
                                <div class="d-flex justify-content-between">
                                    <span>Livraison :</span><span>${prixLivraison.toFixed(2)} €</span>
                                </div>
                            </div>
                        </div>

                        ${statut.toLowerCase().includes("attente") ? `
                        <div class="mt-3 text-end">
                            <button class="btn btn-sm btn-outline-danger btn-annuler" data-id="${idCommande}">
                                <i class="bi bi-x-circle me-1"></i> Annuler commande
                            </button>
                        </div>` : ''}
                    </div>
                </div>
            `;
            container.insertAdjacentHTML("beforeend", cardHTML);
        });

    } catch (error) {
        console.error("❌ Erreur :", error);
        container.innerHTML = `<div class="alert alert-danger my-4 text-center">${error.message}</div>`;
    }
}