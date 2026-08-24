(function () {
    const API_URL = window.API_URL;

    // Sélection des éléments HTML
    const passwordInput = document.getElementById("PasswordInput");
    const validatePasswordInput = document.getElementById("ValidatePasswordInput");
    const btnEditPassword = document.getElementById("btnSignin") || document.querySelector("button[type='submit']");
    const form = document.querySelector("form");

    if (form) {
        form.addEventListener("submit", (event) => {
            event.preventDefault();
            checkAndChangePassword();
        });
    } else if (btnEditPassword) {
        btnEditPassword.addEventListener("click", (event) => {
            event.preventDefault();
            checkAndChangePassword();
        });
    }

    async function checkAndChangePassword() {
        // Nettoyer les anciens messages d'erreur
        if (passwordInput) passwordInput.classList.remove("is-invalid");
        if (validatePasswordInput) validatePasswordInput.classList.remove("is-invalid");

        const password = passwordInput ? passwordInput.value.trim() : "";
        const validatePassword = validatePasswordInput ? validatePasswordInput.value.trim() : "";

        // Validation simple
        if (!password || !validatePassword) {
            alert("Veuillez remplir tous les champs.");
            if (!password && passwordInput) passwordInput.classList.add("is-invalid");
            if (!validatePassword && validatePasswordInput) validatePasswordInput.classList.add("is-invalid");
            return;
        }

        if (password !== validatePassword) {
            alert("❌ Les mots de passe ne correspondent pas.");
            if (passwordInput) passwordInput.classList.add("is-invalid");
            if (validatePasswordInput) validatePasswordInput.classList.add("is-invalid");
            return;
        }

        // Récupération du token (via la fonction globale getToken() ou fallback sur les cookies/localStorage)
        const token = typeof getToken === "function" ? getToken() : (
            localStorage.getItem("accesstoken") || 
            localStorage.getItem("token") || 
            localStorage.getItem("api_token")
        );

        if (!token) {
            alert("❌ Vous devez être connecté pour modifier votre mot de passe.");
            window.location.replace("/signin");
            return;
        }

        try {
            // 🔗 Appeler l'API Symfony
            const response = await fetch(`${API_URL}/account/edit`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-AUTH-TOKEN': token
                },
                body: JSON.stringify({
                    password: password
                })
            });

            const data = await response.json();

            if (response.ok) {
                // ✅ Modification réussie
                alert("✅ " + (data.message || "Mot de passe mis à jour avec succès !"));
                if (form) form.reset();
            } else {
                // ❌ Erreur renvoyée par le serveur
                if (passwordInput) passwordInput.classList.add("is-invalid");
                if (validatePasswordInput) validatePasswordInput.classList.add("is-invalid");
                alert("❌ " + (data.error || data.message || "Erreur lors du changement de mot de passe."));
            }
        } catch (error) {
            console.error("🔴 Erreur réseau :", error);
            alert("Erreur de connexion au serveur. Vérifiez votre connexion.");
        }
    }
})();