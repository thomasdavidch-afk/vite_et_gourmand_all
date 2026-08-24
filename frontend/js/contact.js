(function () {
    const API_URL = window.API_URL;

    // --- SÉLECTION DES ÉLÉMENTS (alignés sur vos attributs HTML) ---
    const form        = document.querySelector("form");
    const emailInput  = document.querySelector("input[name='email']");
    const titreInput  = document.querySelector("input[name='sujet']");   // Corrigé (sujet)
    const descInput   = document.querySelector("textarea[name='message']"); // Corrigé (message)
    const bouton      = document.querySelector("button[type='submit']");

    // --- FONCTIONS HELPERS ---
    function afficherErreur(input, msg) {
        supprimerErreur(input);
        if (!input) return;
        input.classList.add("is-invalid");
        const div = document.createElement("div");
        div.className = "invalid-feedback";
        div.textContent = msg;
        input.parentNode.appendChild(div);
    }

    function supprimerErreur(input) {
        if (!input) return;
        input.classList.remove("is-invalid");
        input.classList.remove("is-valid");
        const existing = input.parentNode.querySelector(".invalid-feedback");
        if (existing) existing.remove();
    }

    function marquerValide(input) {
        supprimerErreur(input);
        if (input) input.classList.add("is-valid");
    }

    // --- VALIDATION EN TEMPS RÉEL ---
    emailInput?.addEventListener("input", () => {
        const regexEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!regexEmail.test(emailInput.value.trim())) {
            afficherErreur(emailInput, "Veuillez entrer un email valide.");
        } else {
            marquerValide(emailInput);
        }
    });

    titreInput?.addEventListener("input", () => {
        if (titreInput.value.trim().length < 3) {
            afficherErreur(titreInput, "Le titre doit contenir au moins 3 caractères.");
        } else {
            marquerValide(titreInput);
        }
    });

    descInput?.addEventListener("input", () => {
        if (descInput.value.trim().length < 10) {
            afficherErreur(descInput, "La description doit contenir au moins 10 caractères.");
        } else {
            marquerValide(descInput);
        }
    });

    // --- SOUMISSION DU FORMULAIRE ET ENVOI RÉEL ---
    form?.addEventListener("submit", async function (e) {
        e.preventDefault();

        let valide = true;

        const email = emailInput ? emailInput.value.trim() : "";
        const titre = titreInput ? titreInput.value.trim() : "";
        const description = descInput ? descInput.value.trim() : "";

        // Revalidation à la soumission
        const regexEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!regexEmail.test(email)) {
            afficherErreur(emailInput, "Veuillez entrer un email valide.");
            valide = false;
        }

        if (titre.length < 3) {
            afficherErreur(titreInput, "Le titre doit contenir au moins 3 caractères.");
            valide = false;
        }

        if (description.length < 10) {
            afficherErreur(descInput, "La description doit contenir au moins 10 caractères.");
            valide = false;
        }

        if (!valide) return;

        // --- ENVOI DE LA DEMANDE À L'API BACKEND ---
        bouton.disabled = true;
        bouton.textContent = "Envoi en cours...";

        try {
            const response = await fetch(`${API_URL}/contact`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                },
                body: JSON.stringify({
                    email: email,
                    titre: titre,
                    description: description
                })
            });

            if (!response.ok) {
                throw new Error("Erreur lors de l'envoi du message.");
            }

            // Message de succès
            form.innerHTML = "";
            const success = document.createElement("div");
            success.className = "alert alert-success text-center fs-5 mt-4";
            success.innerHTML = `
                ✅ <strong>Votre demande a bien été envoyée !</strong><br>
                L'entreprise vous recontactera à l'adresse <strong>${email}</strong>.
            `;
            form.parentNode.appendChild(success);

        } catch (error) {
            bouton.disabled = false;
            bouton.textContent = "Envoyer >";
            alert("Une erreur est survenue lors de l'envoi de votre message. Veuillez réessayer.");
            console.error(error);
        }
    });

})();