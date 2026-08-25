(function () {
    const API_URL = window.API_URL;

    // Lancement direct pour le routeur SPA
    initAdminPage();

    async function initAdminPage() {

        // Récupérer le token pour l'authentification Admin
        const token = typeof getToken === 'function' ? getToken() : null;
        const authHeaders = token ? { 'X-AUTH-TOKEN': token } : {};

        // Image SVG par défaut en local
        const defaultImageSvg = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='50' height='50' fill='%23ccc' class='bi bi-image' viewBox='0 0 16 16'><path d='M6.002 5.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0z'/><path d='M2.002 1a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V3a2 2 0 0 0-2-2h-12zm12 1a1 1 0 0 1 1 1v6.5l-3.777-1.947a.5.5 0 0 0-.577.093l-3.71 3.71-2.66-1.772a.5.5 0 0 0-.63.062L1.002 12V3a1 1 0 0 1 1-1h12z'/></svg>";
        
        // Fonction pour résoudre les URLs d'images (Gère les fichiers locaux /ressources et distants)
        function resolveImageUrl(photoPath) {
            if (!photoPath || photoPath.includes('via.placeholder.com')) {
                return defaultImageSvg;
            }

            // 1. Si c'est déjà une URL HTTP(S) ou des données SVG/Base64
            if (photoPath.startsWith('http://') || photoPath.startsWith('https://') || photoPath.startsWith('data:')) {
                return photoPath;
            }

            // 2. Extraire uniquement le nom du fichier (au cas où la BDD contient "/uploads/entrecote.jpg" ou "/images/entrecote.jpg")
            let nomFichier = photoPath.split('/').pop().split('\\').pop();

            // 3. Encoder les caractères spéciaux et espaces (ex: "chef cuisinier.jpg" -> "chef%20cuisinier.jpg")
            nomFichier = encodeURIComponent(decodeURIComponent(nomFichier));

            // 4. Pointer vers /ressources/<nom_fichier>
            return `/ressources/${nomFichier}`;
        }

        // Statuts valides autorisés pour la mise à jour des commandes
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
        let tousLesPlats = [];
        let tousLesThemes = [];
        let tousLesRegimes = [];
        let tousLesMenus = [];
        let toutesLesCommandes = [];
        let tousLesEmployes = [];

        // Stats (NoSQL)
        let toutesLesStatsNoSql = [];
        let instanceGraphique = null;

        // Helper sécurisé pour extraire un Array depuis n'importe quel format API
        function extraireTableau(data) {
            if (!data) return [];
            if (Array.isArray(data)) return data;
            if (Array.isArray(data['hydra:member'])) return data['hydra:member'];
            if (Array.isArray(data.member)) return data.member;
            if (Array.isArray(data.commandes)) return data.commandes;
            if (Array.isArray(data.plats)) return data.plats;
            if (Array.isArray(data.menus)) return data.menus;
            if (Array.isArray(data.employes)) return data.employes;
            if (Array.isArray(data.data)) return data.data;
            return [];
        }

        // Initialisation générale
        await chargerThemesEtRegimes();
        await chargerPlats();
        await chargerMenus();
        await chargerCommandes();
        await chargerEmployes();
        await initStatsNoSql();

        /* ========================================================
           1. CHARGEMENT DES THÈMES ET RÉGIMES (CHECKBOXES)
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
        async function chargerPlats() {
            try {
                const res = await fetch(`${API_URL}/plats`, { headers: authHeaders });
                if (!res.ok) return;

                const data = await res.json();
                tousLesPlats = extraireTableau(data);

                afficherTableauPlats();
                distribuerPlatsDansSelects();
            } catch (err) {
                console.error("Erreur lors du chargement des plats :", err);
            }
        }

        function distribuerPlatsDansSelects() {
            const entrees = tousLesPlats.filter(p => (p.type || '').toLowerCase() === 'entree' || (p.type || '').toLowerCase() === 'entrée');
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
                    photoUrl = resolveImageUrl(plat.photo);
                }

                const typeLabel = plat.type ? plat.type.toUpperCase() : 'N/C';

                html += `
                    <tr>
                        <td>
                            <img src="${photoUrl}" alt="${plat.titrePlat || plat.nom || ''}" class="rounded" style="width: 50px; height: 50px; object-fit: cover;" onerror="this.onerror=null; this.src='/ressources/logo%20V&G.png';">
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

            if (titleEl) titleEl.textContent = `Modifier le plat : ${plat.titrePlat || plat.nom}`;
            if (submitBtn) submitBtn.innerHTML = '<i class="bi bi-check-circle me-1"></i> Mettre à jour';
            if (cancelBtn) cancelBtn.classList.remove('d-none');
        };

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
                    alert(`Erreur : ${errorData.message || errorData.error || 'Échec de la suppression'}`);
                }
            } catch (err) {
                console.error("Erreur suppression plat :", err);
            }
        }

        /* ========================================================
           3. CRÉATION, MODIFICATION ET SUPPRESSION DES MENUS
        ======================================================== */
        async function chargerMenus() {
            const selectEdit = document.getElementById('select-menu-edit');

            try {
                const res = await fetch(`${API_URL}/menus`, { headers: authHeaders });
                if (!res.ok) return;

                const data = await res.json();
                tousLesMenus = extraireTableau(data);

                remplirFiltreMenuStats();

                if (selectEdit) {
                    let options = '<option value="">-- Sélectionner un menu --</option>';
                    tousLesMenus.forEach(m => {
                        const id = m.menuId || m.id;
                        const titre = m.titre || m.titreMenu || `Menu #${id}`;
                        options += `<option value="${id}">${titre}</option>`;
                    });
                    selectEdit.innerHTML = options;
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
                        alert(`Erreur lors de la création du menu : ${errorData.error || errorData.message || ''}`);
                    }
                } catch (err) {
                    console.error("Erreur création menu :", err);
                }
            });
        }

        const selectMenuEdit = document.getElementById('select-menu-edit');
        if (selectMenuEdit) {
            selectMenuEdit.addEventListener('change', (e) => {
                const menuId = e.target.value;
                const menu = tousLesMenus.find(m => (m.menuId || m.id) == menuId);
                const imgPreview = document.getElementById('edit-menu-photo-preview');

                if (!menu) {
                    document.getElementById('form-edit-menu').reset();
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
                        imgPreview.src = resolveImageUrl(menu.photo);
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
           4. GESTION DES COMMANDES (AFFICHAGE & CHANGEMENT DE STATUT)
        ======================================================== */
        async function chargerCommandes() {
            const tbody = document.getElementById('table-commandes-body');
            if (!tbody) return;

            try {
                const res = await fetch(`${API_URL}/admin/commandes`, { headers: authHeaders });
                if (!res.ok) return;

                const data = await res.json();
                toutesLesCommandes = extraireTableau(data);

                if (toutesLesCommandes.length === 0) {
                    tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted py-3">Aucune commande enregistrée.</td></tr>`;
                    return;
                }

                let html = '';
                toutesLesCommandes.forEach(c => {
                    const clientNom = c.utilisateur ? `${c.utilisateur.nom || ''} ${c.utilisateur.prenom || ''}` : (c.nomClient || 'Inconnu');
                    const clientEmail = c.utilisateur ? c.utilisateur.email : (c.emailClient || 'N/C');
                    const menuTitre = c.menu ? (c.menu.titre || c.menu.titreMenu) : (c.titreMenu || 'N/C');
                    const materielBadge = c.materielPrete ? '<span class="badge bg-warning text-dark">Oui</span>' : '<span class="badge bg-light text-muted border">Non</span>';

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

                document.querySelectorAll('.select-change-statut').forEach(select => {
                    select.onchange = async (e) => {
                        const numeroCommande = e.target.dataset.num;
                        const nouveauStatut = e.target.value;
                        await changerStatutCommande(numeroCommande, nouveauStatut);
                    };
                });
            } catch (err) {
                console.error("Erreur chargement commandes :", err);
            }
        }

        async function changerStatutCommande(numeroCommande, nouveauStatut) {
            try {
                const res = await fetch(`${API_URL}/admin/commandes/${numeroCommande}/statut`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        ...authHeaders
                    },
                    body: JSON.stringify({ statut: nouveauStatut })
                });

                if (res.ok) {
                    await chargerCommandes();
                } else {
                    const errData = await res.json().catch(() => ({}));
                    alert(`Erreur : ${errData.error || errData.message || 'Impossible de mettre à jour le statut.'}`);
                    await chargerCommandes();
                }
            } catch (err) {
                console.error("Erreur statut commande :", err);
                await chargerCommandes();
            }
        }

        /* ========================================================
           5. GESTION DES EMPLOYÉS (LISTING, CRÉATION, SUPPRESSION)
        ======================================================== */
        async function chargerEmployes() {
            const tbody = document.getElementById('table-employes-body');
            if (!tbody) return;

            try {
                const res = await fetch(`${API_URL}/admin/employes`, { headers: authHeaders });
                if (!res.ok) return;

                const data = await res.json();
                tousLesEmployes = extraireTableau(data);

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
           6. STATISTIQUES & CHIFFRE D'AFFAIRES (BASE NoSQL)
        ======================================================== */
        function remplirFiltreMenuStats() {
            const selectFilter = document.getElementById('stats-filter-menu');
            if (!selectFilter) return;

            let options = '<option value="all">Tous les menus</option>';
            tousLesMenus.forEach(menu => {
                const id = menu.menuId || menu.id;
                const titre = menu.titre || menu.titreMenu || `Menu #${id}`;
                options += `<option value="${id}">${titre}</option>`;
            });
            selectFilter.innerHTML = options;
        }

        async function initStatsNoSql() {
            remplirFiltreMenuStats();

            try {
                const res = await fetch(`${API_URL}/admin/stats`, { headers: authHeaders });
                if (!res.ok) {
                    afficherStatsVides();
                    return;
                }

                const data = await res.json();
                toutesLesStatsNoSql = extraireTableau(data);

                calculerEtAfficherStats(toutesLesStatsNoSql);

                const selectFilter = document.getElementById('stats-filter-menu');
                if (selectFilter) {
                    selectFilter.onchange = (e) => {
                        const val = e.target.value;
                        if (val === 'all') {
                            calculerEtAfficherStats(toutesLesStatsNoSql);
                        } else {
                            const statsFiltrees = toutesLesStatsNoSql.filter(s => (s.idMenu || s.menuId) == val);
                            calculerEtAfficherStats(statsFiltrees);
                        }
                    };
                }
            } catch (err) {
                console.error("Erreur chargement stats :", err);
                afficherStatsVides();
            }
        }

        function calculerEtAfficherStats(donnees) {
            const totalCommandes = donnees.length;
            let totalCA = 0;
            const statsParMenu = {};

            donnees.forEach(item => {
                const titre = item.menuTitre || item.nomMenu || `Menu #${item.idMenu || 'Autre'}`;
                const montant = parseFloat(item.montantTotal || item.prixTotal || (item.prixUnitaire * (item.nombrePersonnes || 1)) || 0);

                totalCA += montant;

                if (!statsParMenu[titre]) {
                    statsParMenu[titre] = { count: 0, ca: 0 };
                }
                statsParMenu[titre].count += 1;
                statsParMenu[titre].ca += montant;
            });

            const elTotalOrders = document.getElementById('stats-total-orders');
            const elTotalCa = document.getElementById('stats-total-ca');
            if (elTotalOrders) elTotalOrders.textContent = totalCommandes;
            if (elTotalCa) elTotalCa.textContent = `${totalCA.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;

            const tbody = document.getElementById('table-stats-ca-body');
            if (tbody) {
                if (Object.keys(statsParMenu).length === 0) {
                    tbody.innerHTML = `<tr><td colspan="3" class="text-center text-muted">Aucune donnée trouvée.</td></tr>`;
                } else {
                    let htmlTable = '';
                    for (const [nomMenu, stat] of Object.entries(statsParMenu)) {
                        htmlTable += `
                            <tr>
                                <td class="fw-bold">${nomMenu}</td>
                                <td class="text-center">${stat.count}</td>
                                <td class="text-end fw-bold text-success">${stat.ca.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</td>
                            </tr>
                        `;
                    }
                    tbody.innerHTML = htmlTable;
                }
            }

            afficherGraphique(statsParMenu);
        }

        function afficherGraphique(statsParMenu) {
            const canvas = document.getElementById('chartCommandesParMenu');
            if (!canvas || typeof Chart === 'undefined') return;

            const ctx = canvas.getContext('2d');
            const labels = Object.keys(statsParMenu);
            const dataCounts = labels.map(lbl => statsParMenu[lbl].count);

            if (instanceGraphique) {
                instanceGraphique.destroy();
            }

            instanceGraphique = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: labels.length ? labels : ['Aucune commande'],
                    datasets: [{
                        label: 'Nombre de commandes',
                        data: dataCounts.length ? dataCounts : [0],
                        backgroundColor: [
                            'rgba(242, 142, 43, 0.75)',
                            'rgba(78, 121, 167, 0.75)',
                            'rgba(89, 161, 79, 0.75)',
                            'rgba(225, 87, 89, 0.75)',
                            'rgba(176, 122, 161, 0.75)',
                            'rgba(255, 157, 167, 0.75)'
                        ],
                        borderColor: [
                            '#f28e2b',
                            '#4e79a7',
                            '#59a14f',
                            '#e15759',
                            '#b07aa1',
                            '#ff9da7'
                        ],
                        borderWidth: 1.5,
                        borderRadius: 5
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                stepSize: 1,
                                precision: 0
                            }
                        }
                    }
                }
            });
        }

        function afficherStatsVides() {
            const tbody = document.getElementById('table-stats-ca-body');
            if (tbody) tbody.innerHTML = `<tr><td colspan="3" class="text-center text-muted">Aucune statistique disponible.</td></tr>`;
            const elTotalOrders = document.getElementById('stats-total-orders');
            const elTotalCa = document.getElementById('stats-total-ca');
            if (elTotalOrders) elTotalOrders.textContent = '0';
            if (elTotalCa) elTotalCa.textContent = '0,00 €';
            afficherGraphique({});
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