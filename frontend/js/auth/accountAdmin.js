// On s'exécute directement sans DOMContentLoaded (adapté au routeur SPA)
initAdminPage();

async function initAdminPage() {
    // URL de base de l'API Symfony
    const API_URL = 'http://127.0.0.1:8000/api';

    // Récupérer le token pour l'authentification Admin
    const token = typeof getToken === 'function' ? getToken() : null;
    const authHeaders = token ? { 'X-AUTH-TOKEN': token } : {};

    // Image SVG par défaut en local pour remplacer placeholder.com
    const defaultImageSvg = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='50' height='50' fill='%23ccc' class='bi bi-image' viewBox='0 0 16 16'><path d='M6.002 5.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0z'/><path d='M2.002 1a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V3a2 2 0 0 0-2-2h-12zm12 1a1 1 0 0 1 1 1v6.5l-3.777-1.947a.5.5 0 0 0-.577.093l-3.71 3.71-2.66-1.772a.5.5 0 0 0-.63.062L1.002 12V3a1 1 0 0 1 1-1h12z'/></svg>";

    // Statuts valides autorisés pour la mise à jour des commandes
    const statutsCommandes = [
        'accepté',
        'en préparation',
        'en cours de livraison',
        'livré',
        'en attente du retour de matériel',
        'terminée'
    ];

    // Stockage global des données
    let tousLesPlats = [];
    let tousLesThemes = [];
    let tousLesRegimes = [];
    let tousLesMenus = [];
    let toutesLesCommandes = [];
    let tousLesEmployes = [];

    // Initialisation
    await chargerThemesEtRegimes();
    await chargerPlats();
    await chargerMenus();
    await chargerCommandes();
    await chargerEmployes();

    /* ========================================================
       1. CHARGEMENT DES THÈMES ET RÉGIMES (CHECKBOXES)
    ======================================================== */
    async function chargerThemesEtRegimes() {
        try {
            const resThemes = await fetch(`${API_URL}/themes`, { headers: authHeaders });
            if (resThemes.ok) {
                tousLesThemes = await resThemes.json();
                afficherCheckboxes('add-menu-themes', 'edit-menu-themes', tousLesThemes, 'theme');
            }

            const resRegimes = await fetch(`${API_URL}/regimes`, { headers: authHeaders });
            if (resRegimes.ok) {
                tousLesRegimes = await resRegimes.json();
                afficherCheckboxes('add-menu-regimes', 'edit-menu-regimes', tousLesRegimes, 'regime');
            }
        } catch (err) {
            console.error("Erreur lors du chargement des thèmes/régimes :", err);
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
       2. CHARGEMENT, CRÉATION, MODIFICATION ET SUPPRESSION DES PLATS
    ======================================================== */

    function reinitialiserFormulairePlat() {
        const form = document.getElementById('form-ajout-plat');
        if (form) form.reset();

        const platIdInput = document.getElementById('plat-id');
        if (platIdInput) platIdInput.value = '';

        const titleEl = document.getElementById('plat-form-title');
        const submitBtn = document.getElementById('btn-submit-plat');
        const cancelBtn = document.getElementById('btn-cancel-plat');

        if (titleEl) titleEl.textContent = 'Créer un nouveau plat';
        if (submitBtn) submitBtn.innerHTML = '<i class="bi bi-plus-circle me-1"></i> Enregistrer le plat';
        if (cancelBtn) cancelBtn.classList.add('d-none');
    }

    window.editerPlat = function(id) {
        console.log("Édition du plat ID :", id);
        const plat = tousLesPlats.find(p => (p.platId || p.id) == id);
        if (!plat) return;

        const platIdInput = document.getElementById('plat-id');
        const titreInput = document.getElementById('plat-titre');
        const typeSelect = document.getElementById('plat-type');

        if (platIdInput) platIdInput.value = id;
        if (titreInput) titreInput.value = plat.titrePlat || plat.nom || '';
        if (typeSelect) typeSelect.value = (plat.type || '').toLowerCase();

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

            tousLesPlats = await res.json();
            remplirSelectsPlats();
            afficherTableauPlats();
        } catch (err) {
            console.error("Erreur lors de la récupération des plats :", err);
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

            let photoUrl = defaultImageSvg;
            if (plat.photo && !plat.photo.includes('via.placeholder.com')) {
                photoUrl = plat.photo.startsWith('http') ? plat.photo : `http://127.0.0.1:8000${plat.photo}`;
            }

            const typeLabel = plat.type ? plat.type.toUpperCase() : 'N/C';

            html += `
                <tr>
                    <td>
                        <img src="${photoUrl}" alt="${plat.titrePlat}" class="rounded" style="width: 50px; height: 50px; object-fit: cover;" onerror="this.src='${defaultImageSvg}'">
                    </td>
                    <td class="fw-bold">${plat.titrePlat || plat.nom || ''}</td>
                    <td><span class="badge bg-secondary">${typeLabel}</span></td>
                    <td class="text-end">
                        <button type="button" class="btn btn-sm btn-outline-warning me-1 btn-edit-plat" data-id="${id}">
                            <i class="bi bi-pencil"></i>
                        </button>
                        <button type="button" class="btn btn-sm btn-outline-danger btn-delete-plat" data-id="${id}">
                            <i class="bi bi-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        });

        tbody.innerHTML = html;

        document.querySelectorAll('.btn-edit-plat').forEach(btn => {
            btn.onclick = () => window.editerPlat(btn.dataset.id);
        });

        document.querySelectorAll('.btn-delete-plat').forEach(btn => {
            btn.onclick = () => supprimerPlat(btn.dataset.id);
        });
    }

    const formAjoutPlat = document.getElementById('form-ajout-plat');
    if (formAjoutPlat) {
        formAjoutPlat.onsubmit = async function(e) {
            e.preventDefault();

            const platIdInput = document.getElementById('plat-id');
            const platId = platIdInput ? platIdInput.value : '';
            const isEditing = Boolean(platId && platId.trim() !== '');

            const formData = new FormData();
            formData.append('titrePlat', document.getElementById('plat-titre').value);
            formData.append('type', document.getElementById('plat-type').value);

            const photoInput = document.getElementById('plat-photo');
            if (photoInput && photoInput.files[0]) {
                formData.append('photo', photoInput.files[0]);
            }

            const url = isEditing ? `${API_URL}/plats/${platId}` : `${API_URL}/plats`;

            try {
                const response = await fetch(url, {
                    method: 'POST',
                    headers: { ...authHeaders },
                    body: formData
                });

                if (response.ok) {
                    alert(isEditing ? 'Plat mis à jour avec succès !' : 'Plat créé avec succès !');
                    reinitialiserFormulairePlat();
                    await chargerPlats();
                } else {
                    const errorData = await response.json().catch(() => ({}));
                    alert(`Erreur (${response.status}) : ${errorData.message || errorData.error || 'Échec de l\'opération'}`);
                }
            } catch (err) {
                console.error("Erreur enregistrement plat :", err);
                alert("Erreur réseau ou serveur.");
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
                alert(`Erreur : ${errorData.message || errorData.error || 'Échec'}`);
            }
        } catch (err) {
            console.error("Erreur suppression plat :", err);
        }
    }

    /* ========================================================
       3. CRÉATION D'UN MENU (AVEC PHOTO)
    ======================================================== */
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

            // Ajout de la photo du menu
            const photoInput = document.getElementById('add-menu-photo');
            if (photoInput && photoInput.files[0]) {
                formData.append('photo', photoInput.files[0]);
            }

            // Ajout des plats
            const platsIds = [
                ...getSelectedValues('select-add-entrees'),
                ...getSelectedValues('select-add-plats'),
                ...getSelectedValues('select-add-desserts'),
                ...getSelectedValues('select-add-boissons')
            ];
            platsIds.forEach(id => formData.append('platsIds[]', id));

            // Ajout des thèmes et régimes
            getCheckedValues('add-themes').forEach(id => formData.append('themesIds[]', id));
            getCheckedValues('add-regimes').forEach(id => formData.append('regimesIds[]', id));

            try {
                const res = await fetch(`${API_URL}/menus`, {
                    method: 'POST',
                    headers: { ...authHeaders }, // Pas de 'Content-Type', le navigateur gère le boundary Multipart
                    body: formData
                });

                if (res.ok) {
                    alert('Menu créé avec succès !');
                    formCreerMenu.reset();
                    await chargerMenus();
                } else {
                    const errorData = await res.json().catch(() => ({}));
                    alert(`Erreur lors de la création du menu: ${errorData.error || errorData.message || ''}`);
                }
            } catch (err) {
                console.error("Erreur création menu :", err);
            }
        });
    }

    /* ========================================================
       4. MODIFICATION ET SUPPRESSION D'UN MENU (AVEC PHOTO)
    ======================================================== */
    async function chargerMenus() {
        try {
            const res = await fetch(`${API_URL}/menus`, { headers: authHeaders });
            if (!res.ok) return;

            tousLesMenus = await res.json();
            const selectEdit = document.getElementById('select-menu-edit');
            if (!selectEdit) return;

            selectEdit.innerHTML = '<option value="">-- Sélectionner un menu --</option>';
            tousLesMenus.forEach(m => {
                const id = m.menuId || m.id;
                selectEdit.innerHTML += `<option value="${id}">${m.titre || m.titreMenu}</option>`;
            });
        } catch (err) {
            console.error("Erreur lors du chargement des menus :", err);
        }
    }

    const selectMenuEdit = document.getElementById('select-menu-edit');
    if (selectMenuEdit) {
        selectMenuEdit.addEventListener('change', (e) => {
            const menuId = parseInt(e.target.value);
            const menu = tousLesMenus.find(m => (m.menuId || m.id) === menuId);

            const imgPreview = document.getElementById('edit-menu-photo-preview');

            if (!menu) {
                const formEdit = document.getElementById('form-edit-menu');
                if (formEdit) formEdit.reset();
                if (imgPreview) imgPreview.classList.add('d-none');
                return;
            }

            document.getElementById('edit-menu-titre').value = menu.titre || menu.titreMenu || '';
            document.getElementById('edit-menu-prix').value = menu.prixParPersonne || menu.prix || '';
            document.getElementById('edit-menu-min-pers').value = menu.nombrePersonneMinimum || menu.nbrPersonneMin || '';
            document.getElementById('edit-menu-description').value = menu.description || '';
            document.getElementById('edit-menu-stock').value = menu.quantiteRestante || menu.quantiteStock || '';

            // Gestion de l'aperçu de l'image existante
            if (imgPreview) {
                if (menu.photo) {
                    imgPreview.src = menu.photo.startsWith('http') ? menu.photo : `http://127.0.0.1:8000${menu.photo}`;
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
            const regimeIdsInMenu = (menu.regimes || []).map(r => r.regimeId || r.id);
            setCheckedValues('edit-themes', themeIdsInMenu);
            setCheckedValues('edit-regimes', regimeIdsInMenu);
        });
    }

    const formEditMenu = document.getElementById('form-edit-menu');
    if (formEditMenu) {
        formEditMenu.addEventListener('submit', async (e) => {
            e.preventDefault();
            const menuId = document.getElementById('select-menu-edit').value;
            if (!menuId) return alert('Veuillez sélectionner un menu.');

            const formData = new FormData();
            formData.append('titre', document.getElementById('edit-menu-titre').value);
            formData.append('prixParPersonne', document.getElementById('edit-menu-prix').value);
            formData.append('nombrePersonneMinimum', document.getElementById('edit-menu-min-pers').value);
            formData.append('description', document.getElementById('edit-menu-description').value);
            formData.append('quantiteRestante', document.getElementById('edit-menu-stock').value);

            // Photo du menu (si modifiée)
            const photoInput = document.getElementById('edit-menu-photo');
            if (photoInput && photoInput.files[0]) {
                formData.append('photo', photoInput.files[0]);
            }

            // Plats
            const platsIds = [
                ...getSelectedValues('select-edit-entrees'),
                ...getSelectedValues('select-edit-plats'),
                ...getSelectedValues('select-edit-desserts'),
                ...getSelectedValues('select-edit-boissons')
            ];
            platsIds.forEach(id => formData.append('platsIds[]', id));

            // Thèmes et régimes
            getCheckedValues('edit-themes').forEach(id => formData.append('themesIds[]', id));
            getCheckedValues('edit-regimes').forEach(id => formData.append('regimesIds[]', id));

            try {
                // Utilisation de POST pour permettre le traitement natif des multipart/form-data dans Symfony
                const res = await fetch(`${API_URL}/menus/${menuId}`, {
                    method: 'POST',
                    headers: { ...authHeaders },
                    body: formData
                });

                if (res.ok) {
                    alert('Menu mis à jour !');
                    await chargerMenus();
                } else {
                    const errorData = await res.json().catch(() => ({}));
                    alert(`Erreur lors de la modification : ${errorData.error || errorData.message || ''}`);
                }
            } catch (err) {
                console.error("Erreur modification menu :", err);
            }
        });
    }

    const btnDeleteMenu = document.getElementById('btn-delete-menu');
    if (btnDeleteMenu) {
        btnDeleteMenu.addEventListener('click', async () => {
            const menuId = document.getElementById('select-menu-edit').value;
            if (!menuId) return alert('Veuillez sélectionner un menu à supprimer.');

            if (confirm('Êtes-vous sûr de vouloir supprimer ce menu ?')) {
                try {
                    const res = await fetch(`${API_URL}/menus/${menuId}`, { 
                        method: 'DELETE',
                        headers: authHeaders
                    });
                    if (res.ok) {
                        alert('Menu supprimé !');
                        document.getElementById('form-edit-menu').reset();
                        const imgPreview = document.getElementById('edit-menu-photo-preview');
                        if (imgPreview) imgPreview.classList.add('d-none');
                        await chargerMenus();
                    } else {
                        alert('Erreur lors de la suppression.');
                    }
                } catch (err) {
                    console.error("Erreur suppression menu :", err);
                }
            }
        });
    }

    /* ========================================================
       5. GESTION DES COMMANDES (AFFICHAGE & CHANGEMENT DE STATUT)
    ======================================================== */
    async function chargerCommandes() {
        const tbody = document.getElementById('table-commandes-body');
        if (!tbody) return;

        try {
            const res = await fetch(`${API_URL}/admin/commandes`, { headers: authHeaders });
            if (!res.ok) return;

            toutesLesCommandes = await res.json();

            if (toutesLesCommandes.length === 0) {
                tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted py-3">Aucune commande enregistrée.</td></tr>`;
                return;
            }

            let html = '';
            toutesLesCommandes.forEach(c => {
                const clientNom = c.utilisateur ? `${c.utilisateur.prenom || ''} ${c.utilisateur.nom || ''}`.trim() : 'Inconnu';
                const clientEmail = c.utilisateur ? c.utilisateur.email : '';
                const menuTitre = c.menu ? (c.menu.titre || c.menu.titreMenu) : 'N/C';

                // Gestion du badge du matériel prêté / restitué
                let materielBadge = '<span class="badge bg-secondary">Non prêté</span>';
                if (c.pretMateriel) {
                    if (c.restitutionMateriel) {
                        materielBadge = '<span class="badge bg-success">Restitué</span>';
                    } else {
                        materielBadge = '<span class="badge bg-warning text-dark">Prêté (à rendre)</span>';
                    }
                }

                // Génération des options pour le select du statut
                let selectOptions = '';
                statutsCommandes.forEach(st => {
                    const selected = (c.statut === st) ? 'selected' : '';
                    selectOptions += `<option value="${st}" ${selected}>${st}</option>`;
                });

                html += `
                    <tr>
                        <td><small class="fw-bold text-break" style="max-width: 120px; display:inline-block;">${c.numeroCommande}</small></td>
                        <td>${clientNom}<br><small class="text-muted">${clientEmail}</small></td>
                        <td>${menuTitre}</td>
                        <td><small>${c.datePrestation || 'Non définie'}</small></td>
                        <td>${materielBadge}</td>
                        <td><span class="badge bg-info text-dark">${c.statut || 'En attente'}</span></td>
                        <td>
                            <select class="form-select form-select-sm select-change-statut" data-num="${c.numeroCommande}">
                                ${selectOptions}
                            </select>
                        </td>
                    </tr>
                `;
            });

            tbody.innerHTML = html;

            // Attacher l'événement "change" sur chaque liste déroulante
            document.querySelectorAll('.select-change-statut').forEach(select => {
                select.onchange = async (e) => {
                    const numeroCommande = e.target.dataset.num;
                    const nouveauStatut = e.target.value;
                    await changerStatutCommande(numeroCommande, nouveauStatut);
                };
            });

        } catch (err) {
            console.error("Erreur lors du chargement des commandes :", err);
        }
    }

    async function changerStatutCommande(numeroCommande, statut) {
        try {
            const res = await fetch(`${API_URL}/admin/commandes/${numeroCommande}/statut`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    ...authHeaders
                },
                body: JSON.stringify({ statut: statut })
            });

            if (res.ok) {
                await chargerCommandes(); // Recharger pour rafraîchir les badges de restitution si applicable
            } else {
                const errData = await res.json().catch(() => ({}));
                alert(`Erreur : ${errData.error || 'Impossible de mettre à jour le statut.'}`);
            }
        } catch (err) {
            console.error("Erreur lors du changement de statut :", err);
        }
    }

    /* ========================================================
       6. GESTION DES EMPLOYÉS (CRÉATION & SUPPRESSION)
    ======================================================== */
    async function chargerEmployes() {
        const tbody = document.getElementById('table-employes-body');
        if (!tbody) return;

        try {
            const res = await fetch(`${API_URL}/admin/employes`, { headers: authHeaders });
            if (!res.ok) return;

            tousLesEmployes = await res.json();

            if (tousLesEmployes.length === 0) {
                tbody.innerHTML = `<tr><td colspan="4" class="text-center text-muted py-3">Aucun employé dans la base.</td></tr>`;
                return;
            }

            let html = '';
            tousLesEmployes.forEach(emp => {
                const id = emp.utilisateurId || emp.id;
                html += `
                    <tr>
                        <td class="fw-bold">${emp.nom || ''} ${emp.prenom || ''}</td>
                        <td>${emp.email || ''}</td>
                        <td><span class="badge bg-primary">EMPLOYÉ</span></td>
                        <td class="text-end">
                            <button type="button" class="btn btn-sm btn-outline-danger btn-delete-emp" data-id="${id}">
                                <i class="bi bi-trash"></i> Supprimer
                            </button>
                        </td>
                    </tr>
                `;
            });

            tbody.innerHTML = html;

            document.querySelectorAll('.btn-delete-emp').forEach(btn => {
                btn.onclick = () => supprimerEmploye(btn.dataset.id);
            });

        } catch (err) {
            console.error("Erreur chargement employés :", err);
        }
    }

    const formAjoutEmploye = document.getElementById('form-ajout-employe');
    if (formAjoutEmploye) {
        formAjoutEmploye.onsubmit = async (e) => {
            e.preventDefault();

            const payload = {
                nom: document.getElementById('emp-nom').value,
                prenom: document.getElementById('emp-prenom').value,
                email: document.getElementById('emp-email').value,
                password: document.getElementById('emp-password').value
            };

            try {
                const res = await fetch(`${API_URL}/admin/employes`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        ...authHeaders
                    },
                    body: JSON.stringify(payload)
                });

                if (res.ok) {
                    alert('Compte employé créé avec succès !');
                    formAjoutEmploye.reset();
                    await chargerEmployes();
                } else {
                    const errData = await res.json().catch(() => ({}));
                    alert(`Erreur : ${errData.error || 'Échec de la création du compte employé.'}`);
                }
            } catch (err) {
                console.error("Erreur création employé :", err);
            }
        };
    }

    async function supprimerEmploye(id) {
        if (!confirm('Êtes-vous sûr de vouloir supprimer ce compte employé ?')) return;

        try {
            const res = await fetch(`${API_URL}/admin/employes/${id}`, {
                method: 'DELETE',
                headers: authHeaders
            });

            if (res.ok) {
                alert('Compte employé supprimé !');
                await chargerEmployes();
            } else {
                const errData = await res.json().catch(() => ({}));
                alert(`Erreur : ${errData.error || 'Échec de la suppression'}`);
            }
        } catch (err) {
            console.error("Erreur suppression employé :", err);
        }
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