// Exécution directe adaptée au routeur SPA
initInfoCommandePage();

async function initInfoCommandePage() {
    const form = document.getElementById("formInfoCommande");
    const btnContinuer = document.querySelector('button[type="submit"]');

    if (!form) return; // Sécurité si la vue n'est pas complètement dans le DOM

    // URL de l'API Symfony adaptée au domaine courant (évite le conflit localhost vs 127.0.0.1)
    const apiHost = window.location.hostname === 'localhost' ? 'http://localhost:8000' : 'http://127.0.0.1:8000';
    const API_URL = `${apiHost}/api`;

    // Conserver le menuId si transmis dans l'URL (?menuId=X)
    const urlParams = new URLSearchParams(window.location.search);
    const menuIdParam = urlParams.get('menuId');
    if (menuIdParam) {
        sessionStorage.setItem("selectedMenuId", menuIdParam);
    }

    // Regex de validation
    const regexTelephone = /^(\+33|0)[1-9](\d{2}){4}$/;
    const regexEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const regexCodePostal = /^\d{5}$/;

    // Fonction utilitaire pour lire un cookie s'il existe
    function getCookie(name) {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return decodeURIComponent(parts.pop().split(';').shift());
        return null;
    }

    // 1. Récupération des données sauvegardées temporairement en session de commande
    const savedData = JSON.parse(sessionStorage.getItem("infoCommande") || "{}");

    // 2. Recherche rapide de l'utilisateur local
    let userConnected = null;
    try {
        const localData = localStorage.getItem("user") || sessionStorage.getItem("user") || getCookie("user");
        if (localData) userConnected = JSON.parse(localData);
    } catch (e) {
        userConnected = null;
    }

    // Récupération du token
    const token = typeof getToken === 'function' ? getToken() : (
        localStorage.getItem("token") || 
        sessionStorage.getItem("token") || 
        getCookie("token") || 
        getCookie("jwt")
    );

    // 3. APPEL FETCH DÉCLENCHÉ SYSTÉMATIQUEMENT SI UN TOKEN EXISTE OU SI LE PROFIL EST INCOMPLET
    const needsFetch = !userConnected || !userConnected.email || !userConnected.mail;

    if (token || needsFetch) {
        try {
            const headers = { 
                "Accept": "application/json" 
            };

            if (token) {
                headers["Authorization"] = `Bearer ${token}`;
                headers["X-AUTH-TOKEN"] = token;
            }

            const response = await fetch(`${API_URL}/account/me`, { 
                method: "GET",
                headers: headers 
            });

            const contentType = response.headers.get("content-type");

            if (response.ok && contentType && contentType.includes("application/json")) {
                userConnected = await response.json();
                console.log("Profil utilisateur chargé depuis l'API :", userConnected);
            }
        } catch (e) {
            console.warn("Impossible de récupérer le profil via l'API, repli sur le stockage local.", e);
        }
    }

    // 4. PRÉ-REMPLISSAGE DES CHAMPS
    if (userConnected && typeof userConnected === "object") {
        // Nom Complet
        const nom = userConnected.nom || userConnected.Name || userConnected.surname || userConnected.lastname || "";
        const prenom = userConnected.prenom || userConnected.FirstName || userConnected.name || userConnected.firstname || "";

        let nomCompletUser = "";
        if (prenom || nom) {
            nomCompletUser = [prenom, nom].filter(Boolean).join(" ");
        } else if (userConnected.nomComplet) {
            nomCompletUser = userConnected.nomComplet;
        }

        const nomCompletInput = document.getElementById("nomComplet");
        if (nomCompletInput) {
            nomCompletInput.value = savedData.nomComplet || nomCompletUser || "";
        }

        // Téléphone
        const telInput = document.getElementById("telephone");
        if (telInput) {
            telInput.value = savedData.telephone || userConnected.telephone || userConnected.phone || userConnected.gsm || "";
        }

        // Email
        const emailInput = document.getElementById("email");
        if (emailInput) {
            emailInput.value = savedData.email || userConnected.email || userConnected.mail || "";
        }

        // Adresse Postale (N° et Nom de la Rue)
        const adresseInput = document.getElementById("adressePostale") || document.getElementById("nomRue");
        if (adresseInput) {
            adresseInput.value = savedData.adressePostale || savedData.nomRue || userConnected.adressePostale || userConnected.adresse || userConnected.street || "";
        }

        // Code Postal
        const zipInput = document.getElementById("codePostal");
        if (zipInput) {
            zipInput.value = savedData.codePostal || userConnected.codePostal || userConnected.zip || userConnected.zipCode || "";
        }

        // Ville
        const villeInput = document.getElementById("ville");
        if (villeInput) {
            villeInput.value = savedData.ville || userConnected.ville || userConnected.city || "";
        }
    }

    // Récupération classique pour le reste des champs déjà sauvegardés temporairement
    if (savedData.date && document.getElementById("date")) document.getElementById("date").value = savedData.date;
    if (savedData.heure && document.getElementById("heure")) document.getElementById("heure").value = savedData.heure;
    if (savedData.autresInfos && document.getElementById("autresInfos")) document.getElementById("autresInfos").value = savedData.autresInfos;

    // Fonction utilitaire pour appliquer le feedback visuel Bootstrap
    function appliquerFeedback(id, estValide, estVide) {
        const input = document.getElementById(id);
        if (!input) return;
        if (estVide) {
            input.classList.remove("is-valid", "is-invalid");
        } else if (estValide) {
            input.classList.add("is-valid");
            input.classList.remove("is-invalid");
        } else {
            input.classList.add("is-invalid");
            input.classList.remove("is-valid");
        }
    }

    // Fonction de vérification globale du formulaire
    function verifierFormulaire() {
        const nomComplet = document.getElementById("nomComplet")?.value.trim() || "";
        const telephone = document.getElementById("telephone")?.value.trim() || "";
        const email = document.getElementById("email")?.value.trim() || "";
        const adressePostale = (document.getElementById("adressePostale") || document.getElementById("nomRue"))?.value.trim() || "";
        const codePostal = document.getElementById("codePostal")?.value.trim() || "";
        const ville = document.getElementById("ville")?.value.trim() || "";
        const date = document.getElementById("date")?.value || "";
        const heure = document.getElementById("heure")?.value || "";

        // Contrôle de la date : Minimum 14 jours (2 semaines) à l'avance
        const dateChoisie = new Date(date);
        const dateMinimale = new Date();
        dateMinimale.setDate(dateMinimale.getDate() + 14);
        dateMinimale.setHours(0, 0, 0, 0);

        const dateValide = date && dateChoisie >= dateMinimale;
        const telephoneValide = regexTelephone.test(telephone);
        const emailValide = regexEmail.test(email);
        const codePostalValide = regexCodePostal.test(codePostal);
        const champsTousRemplis = nomComplet && adressePostale && codePostal && ville && date && heure;

        // Feedback visuel sur les inputs
        appliquerFeedback("telephone", telephoneValide, telephone === "");
        appliquerFeedback("email", emailValide, email === "");
        appliquerFeedback("codePostal", codePostalValide, codePostal === "");

        // Activation / Désactivation du bouton Suivant
        if (btnContinuer) {
            btnContinuer.disabled = !(champsTousRemplis && telephoneValide && emailValide && codePostalValide && dateValide);
        }
    }

    // Écouter les événements "input" pour recalculer la validité en direct
    ["nomComplet", "telephone", "email", "adressePostale", "nomRue", "codePostal", "ville", "date", "heure"].forEach(id => {
        const input = document.getElementById(id);
        if (input) {
            input.addEventListener("input", verifierFormulaire);
        }
    });

    // Lancement de la vérification initiale (après le pré-remplissage)
    verifierFormulaire();

    // Soumission du formulaire
    form.addEventListener("submit", (event) => {
        event.preventDefault();

        const adressePostaleInput = document.getElementById("adressePostale") || document.getElementById("nomRue");

        const infoCommande = {
            nomComplet: document.getElementById("nomComplet").value.trim(),
            telephone: document.getElementById("telephone").value.trim(),
            email: document.getElementById("email").value.trim(),
            adressePostale: adressePostaleInput ? adressePostaleInput.value.trim() : "",
            codePostal: document.getElementById("codePostal").value.trim(),
            ville: document.getElementById("ville").value.trim(),
            date: document.getElementById("date").value,
            heure: document.getElementById("heure").value,
            autresInfos: document.getElementById("autresInfos")?.value.trim() || ""
        };

        // Sauvegarde dans la session du navigateur
        sessionStorage.setItem("infoCommande", JSON.stringify(infoCommande));

        // Redirection SPA ou classique vers l'Étape 2
        if (window.router && typeof window.router.navigate === "function") {
            window.router.navigate("/choixCommande");
        } else {
            window.location.href = "/choixCommande";
        }
    });
}