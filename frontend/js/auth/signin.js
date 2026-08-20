const mailInput = document.getElementById("EmailInput");
const passwordInput = document.getElementById("PasswordInput");
const btnSignin = document.getElementById("btnSignin");

btnSignin.addEventListener("click", checkCredentials);

async function checkCredentials() {
    // Nettoyer les anciens messages d'erreur
    mailInput.classList.remove("is-invalid");
    passwordInput.classList.remove("is-invalid");

    const email = mailInput.value.trim();
    const password = passwordInput.value.trim();

    // Validation simple
    if (!email || !password) {
        alert("Veuillez remplir tous les champs");
        return;
    }

    try {
        // 🔗 Appeler l'API Symfony
        const response = await fetch('http://localhost:8000/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email: email,
                password: password
            })
        });

        const data = await response.json();

        if (response.ok) {
            // ✅ Connexion réussie
            alert("✅ Vous êtes connecté !");

            // 🎫 Stocker le token
            const token = data.token || "token_" + data.id;
            setToken(token);

            // 🍪 Stocker le rôle
            setCookie(RoleCookieName, data.role || "client", 7);

            // 🆔 Stocker l'ID de l'utilisateur (NOUVEAU)
            const idToSave = data.id || data.utilisateur_id || (data.user && data.user.id);
            if (idToSave) {
                setCookie(UserIdCookieName, idToSave, 7);
            }

            // 🔄 Rediriger
            window.location.replace('/');
        } else {
            // ❌ Erreur de connexion
            mailInput.classList.add("is-invalid");
            passwordInput.classList.add("is-invalid");
            alert("❌ Email ou mot de passe incorrect");
        }
    } catch (error) {
        console.error("🔴 Erreur réseau :", error);
        alert("Erreur de connexion au serveur. Vérifiez votre connexion.");
    }
}