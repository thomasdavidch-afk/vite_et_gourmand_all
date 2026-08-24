(function () {
    const API_URL = window.API_URL;

    initEmployeePage();

    async function initEmployeePage() {

        // Récupérer le token d'authentification Employé
        const token = typeof getToken === 'function' ? getToken() : null;
        const authHeaders = token ? { 'X-AUTH-TOKEN': token } : {};

        // Image SVG par défaut en local
        const defaultImageSvg = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='50' height='50' fill='%23ccc' class='bi bi-image' viewBox='0 0 16 16'><path d='M6.002 5.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0z'/><path d='M2.002 1a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V3a2 2 0 0 0-2-2h-12zm12 1a1 1 0 0 1 1 1v6.5l-3.777-1.947a.5.5 0 0 0-.577.093l-3.71 3.71-2.66-1.772a.5.5 0 0 0-.63.062L1.002 12V3a1 1 0 0 1 1-1h12z'/></svg>";

        // Statuts valides autorisés pour l'employé
        const statutsCommandes = [
            'accepté',
            'en préparation',
            'en cours de livraison',
            'livré',
            'en attente du retour de matériel',
            'terminée',
            'annulée'
        ];

        // Stockage global des données
        let toutesLesCommandes = [];
        let tousLesAvis = [];
        let tousLesPlats = [];
        let tousLesThemes = [];
        let tousLesRegimes = [];
        let tousLesMenus = [];

        // Modale Bootstrap d'annulation
        const modalEl = document.getElementById('modalAnnulationCommande');
        const modalAnnulation = (modalEl && typeof bootstrap !== 'undefined') ? new bootstrap.Modal(modalEl) : null;

        // Helper sécurisé pour extraire un Array depuis n'importe quel format API
        function extraireTableau(data) {
            if (!data) return [];
            if (Array.isArray(data)) return data;
            if (Array.isArray(data['hydra:member'])) return data['hydra:member'];
            if (Array.isArray(data.member)) return data.member;
            if (Array.isArray(data.commandes)) return data.commandes;
            if (Array.isArray(data.plats)) return data.plats;
            if (Array.isArray(data.menus)) return data.menus;
            if (Array.isArray(data.avis)) return data.avis;
            if (Array.isArray(data.data)) return data.data;
            return [];
        }

        // Initialisation générale
        await chargerCommandes();
        if (typeof chargerAvisEnAttente === 'function') await chargerAvisEnAttente();
        if (typeof chargerHoraires === 'function') await chargerHoraires();
        if (typeof chargerThemesEtRegimes === 'function') await chargerThemesEtRegimes();
        if (typeof chargerPlats === 'function') await chargerPlats();
        if (typeof chargerMenus === 'function') await chargerMenus();
        initFiltresCommandes();
        initFormulaireAnnulation();

        /* ========================================================
           1. GESTION DES COMMANDES (FILTRES, STATUTS & ANNULATION)
        ======================================================== */
        async function chargerCommandes() {
            const tbody = document.getElementById('table-commandes-body');
            if (!tbody) return;

            try {
                // 🟢 Appel vers la route du contrôleur CommandeAdminController
                const res = await fetch(`${API_URL}/admin/commandes`, { headers: authHeaders });
                if (!res.ok) {
                    tbody.innerHTML = `<tr><td colspan="7" class="text-center text-danger py-3">Erreur lors de la récupération des commandes (${res.status}).</td></tr>`;
                    return;
                }

                const data = await res.json();
                toutesLesCommandes = extraireTableau(data);

                console.log("📦 Commandes reçues :", toutesLesCommandes);
                afficherTableauCommandes(toutesLesCommandes);
            } catch (err) {
                console.error("Erreur chargement commandes :", err);
                tbody.innerHTML = `<tr><td colspan="7" class="text-center text-danger py-3">Impossible de joindre le serveur.</td></tr>`;
            }
        }

        function formatFrDate(dateStr) {
            if (!dateStr) return 'N/C';
            if (dateStr.includes('-')) {
                const parts = dateStr.split('-');
                if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
            }
            return dateStr;
        }

        function afficherTableauCommandes(commandesAffichees) {
            const tbody = document.getElementById('table-commandes-body');
            if (!tbody) return;

            const liste = extraireTableau(commandesAffichees);

            if (liste.length === 0) {
                tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted py-3">Aucune commande trouvée.</td></tr>`;
                return;
            }

            let html = '';
            liste.forEach(c => {
                const numCmd = c.numeroCommande || c.id || '';
                const clientNom = c.utilisateur ? `${c.utilisateur.prenom || ''} ${c.utilisateur.nom || ''}`.trim() : (c.clientNom || 'Inconnu');
                const clientEmail = c.utilisateur ? (c.utilisateur.email || '') : (c.clientEmail || '');
                const clientGsm = c.utilisateur ? (c.utilisateur.telephone || c.utilisateur.gsm || '') : '';
                const menuTitre = c.menu ? (c.menu.titre || c.menu.titreMenu) : (c.menuTitre || 'N/C');
                
                // Formatage de la date de prestation (ou date de commande en secours)
                const dateBrute = c.datePrestation || c.dateCommande || '';
                const datePresta = formatFrDate(dateBrute);

                // Badge Matériel prêté
                let materielBadge = '<span class="badge bg-secondary">Non</span>';
                if (c.pretMateriel) {
                    if (c.restitutionMateriel) {
                        materielBadge = '<span class="badge bg-success">Restitué</span>';
                    } else {
                        materielBadge = '<span class="badge bg-warning text-dark"><i class="bi bi-box-seam me-1"></i>Prêté</span>';
                    }
                }

                // Badge Statut actuel
                let badgeColor = 'bg-secondary';
                if (c.statut === 'accepté') badgeColor = 'bg-primary';
                else if (c.statut === 'en préparation') badgeColor = 'bg-info text-dark';
                else if (c.statut === 'en cours de livraison') badgeColor = 'bg-warning text-dark';
                else if (c.statut === 'livré') badgeColor = 'bg-success';
                else if (c.statut === 'en attente du retour de matériel') badgeColor = 'bg-warning text-dark';
                else if (c.statut === 'terminée') badgeColor = 'bg-dark';
                else if (c.statut === 'annulée') badgeColor = 'bg-danger';

                // Options du select
                let selectOptions = '';
                statutsCommandes.forEach(st => {
                    const selected = (c.statut === st) ? 'selected' : '';
                    selectOptions += `<option value="${st}" ${selected}>${st}</option>`;
                });

                html += `
                    <tr>
                        <td class="fw-bold">${numCmd}</td>
                        <td>
                            <div>${clientNom}</div>
                            <small class="text-muted">${clientEmail}</small>
                            ${clientGsm ? `<br><small class="text-muted"><i class="bi bi-telephone me-1"></i>${clientGsm}</small>` : ''}
                        </td>
                        <td>${menuTitre}</td>
                        <td>${datePresta}</td>
                        <td>${materielBadge}</td>
                        <td><span class="badge ${badgeColor}">${c.statut}</span></td>
                        <td>
                            <div class="d-flex align-items-center gap-2">
                                <select class="form-select form-select-sm select-change-status" data-id="${numCmd}">
                                    ${selectOptions}
                                </select>
                                <button type="button" class="btn btn-sm btn-outline-danger btn-open-cancel" data-id="${numCmd}" title="Annuler la commande">
                                    <i class="bi bi-x-circle"></i>
                                </button>
                            </div>
                        </td>
                    </tr>
                `;
            });

            tbody.innerHTML = html;

            // Écouteurs pour le changement de statut via select
            document.querySelectorAll('.select-change-status').forEach(select => {
                select.addEventListener('change', async (e) => {
                    const numCmd = e.target.dataset.id;
                    const nouveauStatut = e.target.value;

                    if (nouveauStatut === 'annulée') {
                        ouvrirModaleAnnulation(numCmd);
                    } else {
                        await changerStatutCommande(numCmd, nouveauStatut);
                    }
                });
            });

            // Écouteurs pour le bouton d'annulation directe
            document.querySelectorAll('.btn-open-cancel').forEach(btn => {
                btn.addEventListener('click', () => {
                    ouvrirModaleAnnulation(btn.dataset.id);
                });
            });
        }

        function initFiltresCommandes() {
            const inputClient = document.getElementById('order-filter-client');
            const selectStatut = document.getElementById('order-filter-status');
            const btnReset = document.getElementById('btn-reset-order-filters');

            function filtrer() {
                const valClient = (inputClient ? inputClient.value : '').toLowerCase().trim();
                const valStatut = (selectStatut ? selectStatut.value : '').trim();

                const resultat = toutesLesCommandes.filter(c => {
                    const nomComplet = c.utilisateur ? `${c.utilisateur.prenom || ''} ${c.utilisateur.nom || ''}`.toLowerCase() : '';
                    const email = c.utilisateur && c.utilisateur.email ? c.utilisateur.email.toLowerCase() : '';
                    const correspondClient = !valClient || nomComplet.includes(valClient) || email.includes(valClient);
                    const correspondStatut = !valStatut || c.statut === valStatut;

                    return correspondClient && correspondStatut;
                });

                afficherTableauCommandes(resultat);
            }

            if (inputClient) inputClient.addEventListener('input', filtrer);
            if (selectStatut) selectStatut.addEventListener('change', filtrer);

            if (btnReset) {
                btnReset.addEventListener('click', () => {
                    if (inputClient) inputClient.value = '';
                    if (selectStatut) selectStatut.value = '';
                    afficherTableauCommandes(toutesLesCommandes);
                });
            }
        }

        async function changerStatutCommande(numCmd, statut, cancelDetails = null) {
            try {
                const payload = { statut: statut };
                if (cancelDetails) {
                    payload.modeContact = cancelDetails.modeContact;
                    payload.motif = cancelDetails.motif;
                }

                const res = await fetch(`${API_URL}/admin/commandes/${numCmd}/statut`, {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                        ...authHeaders
                    },
                    body: JSON.stringify(payload)
                });

                if (res.ok) {
                    await chargerCommandes();
                } else {
                    const errData = await res.json().catch(() => ({}));
                    alert(`Erreur : ${errData.error || errData.message || 'Impossible de mettre à jour le statut.'}`);
                    await chargerCommandes();
                }
            } catch (err) {
                console.error("Erreur lors de la mise à jour du statut :", err);
                await chargerCommandes();
            }
        }

        function ouvrirModaleAnnulation(numCmd) {
            const idInput = document.getElementById('cancel-modal-order-id');
            const selectMode = document.getElementById('cancel-contact-mode');
            const txtMotif = document.getElementById('cancel-motif');

            if (idInput) idInput.value = numCmd;
            if (selectMode) selectMode.value = '';
            if (txtMotif) txtMotif.value = '';

            if (modalAnnulation) {
                modalAnnulation.show();
            } else {
                const mode = prompt("Annulation - Mode de contact utilisé (appel ou mail) :");
                const motif = prompt("Annulation - Motif de l'annulation :");
                if (mode && motif) {
                    changerStatutCommande(numCmd, 'annulée', { modeContact: mode, motif: motif });
                } else {
                    alert("Annulation interrompue : motif et mode de contact obligatoires.");
                    chargerCommandes();
                }
            }
        }

        function initFormulaireAnnulation() {
            const formAnnulation = document.getElementById('form-modal-annulation');
            if (!formAnnulation) return;

            formAnnulation.onsubmit = async (e) => {
                e.preventDefault();
                const numCmd = document.getElementById('cancel-modal-order-id').value;
                const modeContact = document.getElementById('cancel-contact-mode').value;
                const motif = document.getElementById('cancel-motif').value.trim();

                if (!motif) {
                    alert("Veuillez saisir un motif d'annulation.");
                    return;
                }

                await changerStatutCommande(numCmd, 'annulée', { modeContact, motif });

                if (modalAnnulation) modalAnnulation.hide();
            };
        }

        /* ========================================================
           2. GESTION DES AVIS CLIENTS (MODÉRATION)
        ======================================================== */
        async function chargerAvisEnAttente() {
            const tbody = document.getElementById('table-avis-body');
            if (!tbody) return;

            try {
                const res = await fetch(`${API_URL}/avis/en-attente`, { headers: authHeaders });
                if (!res.ok) {
                    tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted py-3">Aucun avis en attente.</td></tr>`;
                    return;
                }

                const data = await res.json();
                tousLesAvis = extraireTableau(data);

                if (tousLesAvis.length === 0) {
                    tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted py-3">Aucun avis en attente de validation.</td></tr>`;
                    return;
                }

                let html = '';
                tousLesAvis.forEach(a => {
                    const idAvis = a.avisId || a.id;
                    const auteur = a.utilisateur ? `${a.utilisateur.prenom || ''} ${a.utilisateur.nom || ''}`.trim() : (a.auteur || 'Anonyme');
                    const note = '★'.repeat(a.note || 5) + '☆'.repeat(Math.max(0, 5 - (a.note || 5)));
                    const commentaire = a.commentaire || a.description || '';
                    const dateAvis = formatFrDate(a.dateAvis || a.createdAt || '');

                    html += `
                        <tr>
                            <td class="fw-bold">${auteur}</td>
                            <td class="text-warning">${note}</td>
                            <td><small>${commentaire}</small></td>
                            <td><small class="text-muted">${dateAvis}</small></td>
                            <td class="text-end">
                                <button type="button" class="btn btn-sm btn-success me-1 btn-valider-avis" data-id="${idAvis}">
                                    <i class="bi bi-check-circle me-1"></i> Valider
                                </button>
                                <button type="button" class="btn btn-sm btn-outline-danger btn-refuser-avis" data-id="${idAvis}">
                                    <i class="bi bi-x-circle me-1"></i> Refuser
                                </button>
                            </td>
                        </tr>
                    `;
                });

                tbody.innerHTML = html;

                // Clic sur "Valider" -> valide = true
                document.querySelectorAll('.btn-valider-avis').forEach(btn => {
                    btn.onclick = () => modererAvis(btn.dataset.id, true);
                });

                // Clic sur "Refuser" -> suppression ou marquage
                document.querySelectorAll('.btn-refuser-avis').forEach(btn => {
                    btn.onclick = () => modererAvis(btn.dataset.id, false);
                });
            } catch (err) {
                console.error("Erreur lors du chargement des avis :", err);
                tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted py-3">Impossible de charger les avis.</td></tr>`;
            }
        }

        async function modererAvis(idAvis, approuve) {
            try {
                if (approuve) {
                    // Validation de l'avis via PATCH /api/avis/{id}/valider
                    const res = await fetch(`${API_URL}/avis/${idAvis}/valider`, {
                        method: 'PATCH',
                        headers: {
                            'Content-Type': 'application/json',
                            ...authHeaders
                        },
                        body: JSON.stringify({ valide: true })
                    });

                    if (res.ok) {
                        alert("L'avis a été validé et publié avec succès !");
                        await chargerAvisEnAttente();
                    } else {
                        const errData = await res.json().catch(() => ({}));
                        alert(`Erreur : ${errData.error || 'Impossible de valider cet avis.'}`);
                    }
                } else {
                    // Refus : suppression directe de l'avis non validé via DELETE /api/avis/{id}
                    if (!confirm("Voulez-vous vraiment refuser et supprimer cet avis ?")) return;

                    const res = await fetch(`${API_URL}/avis/${idAvis}`, {
                        method: 'DELETE',
                        headers: authHeaders
                    });

                    if (res.ok) {
                        alert("L'avis a été refusé et supprimé.");
                        await chargerAvisEnAttente();
                    } else {
                        const errData = await res.json().catch(() => ({}));
                        alert(`Erreur : ${errData.error || 'Impossible de refuser cet avis.'}`);
                    }
                }
            } catch (err) {
                console.error("Erreur modération avis :", err);
            }
        }

        /* ========================================================
           3. GESTION DES HORAIRES (NoSQL)
        ======================================================== */
        async function chargerHoraires() {
            const selectJour = document.getElementById('horaire-jour');
            if (!selectJour) return;

            try {
                const res = await fetch(`${API_URL}/horaires`, { headers: authHeaders });
                if (!res.ok) return;

                const data = await res.json();
                const horaires = extraireTableau(data);

                selectJour.onchange = () => {
                    const jourSelectionne = selectJour.value;
                    const configJour = horaires.find(h => (h.jour || '').toLowerCase() === jourSelectionne.toLowerCase());

                    const inputHeures = document.getElementById('horaire-heures');
                    const selectFerme = document.getElementById('horaire-ferme');

                    if (configJour) {
                        if (inputHeures) inputHeures.value = configJour.heures || '';
                        if (selectFerme) selectFerme.value = configJour.ferme ? 'true' : 'false';
                    } else {
                        if (inputHeures) inputHeures.value = '';
                        if (selectFerme) selectFerme.value = 'false';
                    }
                };

                selectJour.dispatchEvent(new Event('change'));
            } catch (err) {
                console.error("Erreur chargement horaires :", err);
            }
        }

        const formHoraires = document.getElementById('form-horaires');
        if (formHoraires) {
            formHoraires.onsubmit = async (e) => {
                e.preventDefault();

                const payload = {
                    jour: document.getElementById('horaire-jour').value,
                    heures: document.getElementById('horaire-heures').value.trim(),
                    ferme: document.getElementById('horaire-ferme').value === 'true'
                };

                try {
                    const res = await fetch(`${API_URL}/horaires`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            ...authHeaders
                        },
                        body: JSON.stringify(payload)
                    });

                    if (res.ok) {
                        alert(`Horaires pour le ${payload.jour} enregistrés avec succès !`);
                    } else {
                        alert("Erreur lors de l'enregistrement des horaires.");
                    }
                } catch (err) {
                    console.error("Erreur sauvegarde horaires :", err);
                }
            };
        }

        /* ========================================================
           4. THÈMES ET RÉGIMES (CHECKBOXES POUR LES MENUS)
        ======================================================== */
        async function chargerThemesEtRegimes() {
            try {
                const resThemes = await fetch(`${API_URL}/themes`, { headers: authHeaders });
                if (resThemes.ok) {
                    const dataThemes = await resThemes.json();
                    tousLesThemes = extraireTableau(dataThemes);
                    afficherCheckboxes('add-menu-themes', 'edit-menu-themes', tousLesThemes, 'theme');
                }

                const resRegimes = await fetch(`${API_URL}/regimes`, { headers: authHeaders });
                if (resRegimes.ok) {
                    const dataRegimes = await resRegimes.json();
                    tousLesRegimes = extraireTableau(dataRegimes);
                    afficherCheckboxes('add-menu-regimes', 'edit-menu-regimes', tousLesRegimes, 'regime');
                }
            } catch (err) {
                console.error("Erreur chargement thèmes/régimes :", err);
            }
        }

        function afficherCheckboxes(containerAddId, containerEditId, items, type) {
            const containerAdd = document.getElementById(containerAddId);
            const containerEdit = document.getElementById(containerEditId);
            if (!containerAdd) return;

            let htmlAdd = '';
            let htmlEdit = '';

            items.forEach(item => {
                const id = item.themeId || item.regimeId || item.id;
                const libelle = item.libelle || item.nom;

                htmlAdd += `
                    <div class="form-check">
                        <input class="form-check-input" type="checkbox" name="add-${type}s" value="${id}" id="add-${type}-${id}">
                        <label class="form-check-label" for="add-${type}-${id}">${libelle}</label>
                    </div>`;

                htmlEdit += `
                    <div class="form-check">
                        <input class="form-check-input" type="checkbox" name="edit-${type}s" value="${id}" id="edit-${type}-${id}">
                        <label class="form-check-label" for="edit-${type}-${id}">${libelle}</label>
                    </div>`;
            });

            containerAdd.innerHTML = htmlAdd || '<small class="text-muted">Aucun disponible</small>';
            if (containerEdit) containerEdit.innerHTML = htmlEdit || '<small class="text-muted">Aucun disponible</small>';
        }

        /* ========================================================
           5. GESTION DES PLATS (CRUD)
        ======================================================== */
        let idPlatEnModification = null;

        function reinitialiserFormulairePlat() {
            idPlatEnModification = null;
            const formEl = document.getElementById('form-ajout-plat');
            if (formEl) formEl.reset();

            const titleEl = document.getElementById('plat-form-title');
            const submitBtn = document.getElementById('btn-submit-plat');
            const cancelBtn = document.getElementById('btn-cancel-plat');

            if (titleEl) titleEl.textContent = 'Ajouter un nouveau plat';
            if (submitBtn) submitBtn.innerHTML = '<i class="bi bi-plus-circle me-1"></i> Ajouter le plat';
            if (cancelBtn) cancelBtn.classList.add('d-none');
        }

        window.editerPlat = function (id) {
            const plat = tousLesPlats.find(p => (p.platId || p.id) == id);
            if (!plat) return;

            idPlatEnModification = id;
            document.getElementById('plat-titre').value = plat.titrePlat || plat.nom || '';
            document.getElementById('plat-type').value = plat.type || 'plat';

            const titleEl = document.getElementById('plat-form-title');
            const submitBtn = document.getElementById('btn-submit-plat');
            const cancelBtn = document.getElementById('btn-cancel-plat');

            if (titleEl) titleEl.textContent = 'Modifier le plat';
            if (submitBtn) submitBtn.innerHTML = '<i class="bi bi-save me-1"></i> Mettre à jour';
            if (cancelBtn) cancelBtn.classList.remove('d-none');

            const formEl = document.getElementById('form-ajout-plat');
            if (formEl) {
                window.scrollTo({ top: formEl.offsetTop - 80, behavior: 'smooth' });
            }
        };

        async function chargerPlats() {
            try {
                const res = await fetch(`${API_URL}/plats`, { headers: authHeaders });
                if (!res.ok) return;

                const data = await res.json();
                tousLesPlats = extraireTableau(data);
                remplirSelectsPlats();
                afficherTableauPlats();
            } catch (err) {
                console.error("Erreur récupération des plats :", err);
            }
        }

        function remplirSelectsPlats() {
            const entrees = tousLesPlats.filter(p => (p.type || '').toLowerCase() === 'entree');
            const plats = tousLesPlats.filter(p => (p.type || '').toLowerCase() === 'plat');
            const desserts = tousLesPlats.filter(p => (p.type || '').toLowerCase() === 'dessert');
            const boissons = tousLesPlats.filter(p => (p.type || '').toLowerCase() === 'boisson');

            function alimenterSelect(selectId, listePlats) {
                const select = document.getElementById(selectId);
                if (!select) return;
                select.innerHTML = '';
                listePlats.forEach(p => {
                    const id = p.platId || p.id;
                    const nom = p.titrePlat || p.nom || `Plat #${id}`;
                    select.innerHTML += `<option value="${id}">${nom}</option>`;
                });
            }

            alimenterSelect('select-add-entrees', entrees);
            alimenterSelect('select-add-plats', plats);
            alimenterSelect('select-add-desserts', desserts);
            alimenterSelect('select-add-boissons', boissons);

            alimenterSelect('select-edit-entrees', entrees);
            alimenterSelect('select-edit-plats', plats);
            alimenterSelect('select-edit-desserts', desserts);
            alimenterSelect('select-edit-boissons', boissons);
        }

        function afficherTableauPlats() {
            const tbody = document.getElementById('table-plats-body');
            if (!tbody) return;

            if (tousLesPlats.length === 0) {
                tbody.innerHTML = `<tr><td colspan="4" class="text-center text-muted py-3">Aucun plat enregistré pour le moment.</td></tr>`;
                return;
            }

            let html = '';
            tousLesPlats.forEach(plat => {
                const id = plat.platId || plat.id;
                const titre = plat.titrePlat || plat.nom || 'Sans titre';
                const type = plat.type || 'plat';

                let typeBadge = 'bg-secondary';
                if (type === 'entree') typeBadge = 'bg-info text-dark';
                else if (type === 'plat') typeBadge = 'bg-primary';
                else if (type === 'dessert') typeBadge = 'bg-warning text-dark';
                else if (type === 'boisson') typeBadge = 'bg-success';

                html += `
                    <tr>
                        <td><strong>#${id}</strong></td>
                        <td>${titre}</td>
                        <td><span class="badge ${typeBadge}">${type.toUpperCase()}</span></td>
                        <td class="text-end">
                            <button type="button" class="btn btn-sm btn-outline-primary me-1" onclick="editerPlat(${id})">
                                <i class="bi bi-pencil"></i>
                            </button>
                            <button type="button" class="btn btn-sm btn-outline-danger btn-suppr-plat" data-id="${id}">
                                <i class="bi bi-trash"></i>
                            </button>
                        </td>
                    </tr>
                `;
            });

            tbody.innerHTML = html;

            document.querySelectorAll('.btn-suppr-plat').forEach(btn => {
                btn.onclick = () => supprimerPlat(btn.dataset.id);
            });
        }

        const formPlat = document.getElementById('form-ajout-plat');
        if (formPlat) {
            formPlat.onsubmit = async (e) => {
                e.preventDefault();

                const titre = document.getElementById('plat-titre').value.trim();
                const type = document.getElementById('plat-type').value;

                if (!titre) return;

                const payload = {
                    titrePlat: titre,
                    type: type
                };

                const isEditing = idPlatEnModification !== null;
                const url = isEditing ? `${API_URL}/plats/${idPlatEnModification}` : `${API_URL}/plats`;
                const method = isEditing ? 'PUT' : 'POST';

                try {
                    const response = await fetch(url, {
                        method: method,
                        headers: {
                            'Content-Type': 'application/json',
                            ...authHeaders
                        },
                        body: JSON.stringify(payload)
                    });

                    if (response.ok) {
                        alert(isEditing ? 'Plat mis à jour avec succès !' : 'Plat enregistré avec succès !');
                        reinitialiserFormulairePlat();
                        await chargerPlats();
                    } else {
                        const errorData = await response.json().catch(() => ({}));
                        alert(`Erreur : ${errorData.message || errorData.error || 'Une erreur est survenue'}`);
                    }
                } catch (err) {
                    console.error("Erreur formulaire plat :", err);
                }
            };
        }

        const btnCancelPlat = document.getElementById('btn-cancel-plat');
        if (btnCancelPlat) {
            btnCancelPlat.onclick = reinitialiserFormulairePlat;
        }

        async function supprimerPlat(id) {
            if (!confirm('Êtes-vous sûr de vouloir supprimer ce plat ?')) return;

            try {
                const res = await fetch(`${API_URL}/plats/${id}`, {
                    method: 'DELETE',
                    headers: authHeaders
                });

                if (res.ok) {
                    alert('Plat supprimé avec succès !');
                    await chargerPlats();
                } else {
                    const errorData = await res.json().catch(() => ({}));
                    alert(`Erreur : ${errorData.message || errorData.error || 'Échec de la suppression'}`);
                }
            } catch (err) {
                console.error("Erreur suppression plat :", err);
            }
        }

        /* ========================================================
           6. GESTION DES MENUS (AJOUT & MODIFICATION)
        ======================================================== */
        async function chargerMenus() {
            try {
                const res = await fetch(`${API_URL}/menus`, { headers: authHeaders });
                if (!res.ok) return;

                const data = await res.json();
                tousLesMenus = extraireTableau(data);

                const selectMenuEdit = document.getElementById('select-menu-edit');
                if (selectMenuEdit) {
                    selectMenuEdit.innerHTML = '<option value="">-- Choisir un menu à modifier --</option>';
                    tousLesMenus.forEach(m => {
                        const id = m.menuId || m.id;
                        const titre = m.titre || m.titreMenu || `Menu #${id}`;
                        selectMenuEdit.innerHTML += `<option value="${id}">${titre} (#${id})</option>`;
                    });
                }
            } catch (err) {
                console.error("Erreur chargement menus :", err);
            }
        }

        const formCreerMenu = document.getElementById('form-creer-menu');
        if (formCreerMenu) {
            formCreerMenu.addEventListener('submit', async (e) => {
                e.preventDefault();

                const formData = new FormData();
                formData.append('titre', document.getElementById('add-menu-titre').value);
                formData.append('prixParPersonne', document.getElementById('add-menu-prix').value);
                formData.append('nombrePersonneMinimum', document.getElementById('add-menu-min-pers').value);
                formData.append('description', document.getElementById('add-menu-description').value);
                formData.append('quantiteRestante', document.getElementById('add-menu-stock').value);

                const photoInput = document.getElementById('add-menu-photo');
                if (photoInput && photoInput.files[0]) {
                    formData.append('photo', photoInput.files[0]);
                }

                const platsIds = [
                    ...getSelectedValues('select-add-entrees'),
                    ...getSelectedValues('select-add-plats'),
                    ...getSelectedValues('select-add-desserts'),
                    ...getSelectedValues('select-add-boissons')
                ];
                platsIds.forEach(id => formData.append('platsIds[]', id));

                getCheckedValues('add-themes').forEach(id => formData.append('themesIds[]', id));
                getCheckedValues('add-regimes').forEach(id => formData.append('regimesIds[]', id));

                try {
                    const res = await fetch(`${API_URL}/menus`, {
                        method: 'POST',
                        headers: { ...authHeaders },
                        body: formData
                    });

                    if (res.ok) {
                        alert('Menu créé avec succès !');
                        formCreerMenu.reset();
                        await chargerMenus();
                    } else {
                        const errorData = await res.json().catch(() => ({}));
                        alert(`Erreur lors de la création : ${errorData.error || errorData.message || ''}`);
                    }
                } catch (err) {
                    console.error("Erreur création menu :", err);
                }
            });
        }

        const selectMenuEdit = document.getElementById('select-menu-edit');
        if (selectMenuEdit) {
            selectMenuEdit.addEventListener('change', () => {
                const menuId = selectMenuEdit.value;
                const menu = tousLesMenus.find(m => (m.menuId || m.id) == menuId);

                const imgPreview = document.getElementById('edit-menu-photo-preview');

                if (!menu) {
                    const formEdit = document.getElementById('form-edit-menu');
                    if (formEdit) formEdit.reset();
                    if (imgPreview) imgPreview.classList.add('d-none');
                    return;
                }

                document.getElementById('edit-menu-titre').value = menu.titre || menu.titreMenu || '';
                document.getElementById('edit-menu-prix').value = menu.prixParPersonne || menu.prix || '';
                document.getElementById('edit-menu-min-pers').value = menu.nombrePersonneMinimum || menu.minPersons || '';
                document.getElementById('edit-menu-description').value = menu.description || '';
                document.getElementById('edit-menu-stock').value = menu.quantiteRestante ?? menu.stock ?? '';

                if (imgPreview) {
                    if (menu.photo) {
                        imgPreview.src = menu.photo.startsWith('http') ? menu.photo : `${API_URL.replace('/api', '')}${menu.photo}`;
                        imgPreview.classList.remove('d-none');
                    } else {
                        imgPreview.classList.add('d-none');
                    }
                }

                const platIdsInMenu = (menu.plats || []).map(p => p.platId || p.id);
                setSelectedValues('select-edit-entrees', platIdsInMenu);
                setSelectedValues('select-edit-plats', platIdsInMenu);
                setSelectedValues('select-edit-desserts', platIdsInMenu);
                setSelectedValues('select-edit-boissons', platIdsInMenu);

                const themeIdsInMenu = (menu.themes || []).map(t => t.themeId || t.id);
                setCheckedValues('edit-themes', themeIdsInMenu);

                const regimeIdsInMenu = (menu.regimes || []).map(r => r.regimeId || r.id);
                setCheckedValues('edit-regimes', regimeIdsInMenu);
            });
        }

        const formEditMenu = document.getElementById('form-edit-menu');
        if (formEditMenu) {
            formEditMenu.addEventListener('submit', async (e) => {
                e.preventDefault();

                const menuId = selectMenuEdit ? selectMenuEdit.value : null;
                if (!menuId) {
                    alert("Veuillez d'abord sélectionner un menu à modifier.");
                    return;
                }

                const formData = new FormData();
                formData.append('titre', document.getElementById('edit-menu-titre').value);
                formData.append('prixParPersonne', document.getElementById('edit-menu-prix').value);
                formData.append('nombrePersonneMinimum', document.getElementById('edit-menu-min-pers').value);
                formData.append('description', document.getElementById('edit-menu-description').value);
                formData.append('quantiteRestante', document.getElementById('edit-menu-stock').value);

                const photoInput = document.getElementById('edit-menu-photo');
                if (photoInput && photoInput.files[0]) {
                    formData.append('photo', photoInput.files[0]);
                }

                const platsIds = [
                    ...getSelectedValues('select-edit-entrees'),
                    ...getSelectedValues('select-edit-plats'),
                    ...getSelectedValues('select-edit-desserts'),
                    ...getSelectedValues('select-edit-boissons')
                ];
                platsIds.forEach(id => formData.append('platsIds[]', id));

                getCheckedValues('edit-themes').forEach(id => formData.append('themesIds[]', id));
                getCheckedValues('edit-regimes').forEach(id => formData.append('regimesIds[]', id));

                try {
                    const res = await fetch(`${API_URL}/menus/${menuId}`, {
                        method: 'POST',
                        headers: { ...authHeaders },
                        body: formData
                    });

                    if (res.ok) {
                        alert('Menu mis à jour avec succès !');
                        await chargerMenus();
                    } else {
                        const errorData = await res.json().catch(() => ({}));
                        alert(`Erreur lors de la mise à jour : ${errorData.error || errorData.message || ''}`);
                    }
                } catch (err) {
                    console.error("Erreur modification menu :", err);
                }
            });
        }

        /* ========================================================
           UTILITAIRES DE MANIPULATION DU DOM
        ======================================================== */
        function getSelectedValues(selectId) {
            const select = document.getElementById(selectId);
            if (!select) return [];
            return Array.from(select.selectedOptions).map(opt => parseInt(opt.value));
        }

        function setSelectedValues(selectId, values) {
            const select = document.getElementById(selectId);
            if (!select) return;
            Array.from(select.options).forEach(opt => {
                opt.selected = values.includes(parseInt(opt.value));
            });
        }

        function getCheckedValues(type) {
            const checkboxes = document.querySelectorAll(`input[name="${type}s"]:checked`);
            return Array.from(checkboxes).map(cb => parseInt(cb.value));
        }

        function setCheckedValues(type, values) {
            const checkboxes = document.querySelectorAll(`input[name="${type}s"]`);
            checkboxes.forEach(cb => {
                cb.checked = values.includes(parseInt(cb.value));
            });
        }
    }
})();