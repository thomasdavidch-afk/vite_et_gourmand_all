(function () {
    const API_URL = window.API_URL;

    // Sélection des éléments HTML
    const inputSurname = document.getElementById("SurnameInput");
    const inputName = document.getElementById("NameInput");
    const inputAdresse = document.getElementById("AdresseInput");
    const inputCity = document.getElementById("CityInput");
    const inputZip = document.getElementById("ZipInput");
    const inputEmail = document.getElementById("EmailInput");
    const inputPhone = document.getElementById("PhoneInput");
    const inputPassword = document.getElementById("PasswordInput");
    const inputValidatePassword = document.getElementById("ValidatePasswordInput");
    const btnValidation = document.getElementById("btn-validation-inscription");
    const form = document.querySelector("form");

    // Écouteurs d'événements pour la validation
    const inputs = [
        inputSurname, inputName, inputAdresse, inputCity,
        inputZip, inputEmail, inputPhone, inputPassword, inputValidatePassword
    ];

    inputs.forEach((input) => {
        if (input) {
            input.addEventListener("keyup", validateForm);
        }
    });

    // ─── SOUMISSION VERS L'API ────────────────────────────────
    if (form) {
        form.addEventListener("submit", async (e) => {
            e.preventDefault();

            // 🔑 ENVOIE DU JSON, PAS DU FormData !
            const data = {
                prenom: inputSurname ? inputSurname.value.trim() : "",
                nom: inputName ? inputName.value.trim() : "",
                adressePostale: inputAdresse ? inputAdresse.value.trim() : "",
                ville: inputCity ? inputCity.value.trim() : "",
                codePostal: inputZip ? inputZip.value.trim() : "",
                email: inputEmail ? inputEmail.value.trim() : "",
                telephone: inputPhone ? inputPhone.value.trim() : "",
                password: inputPassword ? inputPassword.value.trim() : ""
            };

            console.log("📤 Données envoyées :", data);

            try {
                const response = await fetch(`${API_URL}/register`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/ld+json" // ← IMPORTANT !
                    },
                    body: JSON.stringify(data)
                });

                console.log("📊 Status reçu :", response.status);

                const result = await response.json();
                console.log("📥 Réponse API :", result);

                if (response.ok) {
                    alert("✅ Inscription réussie ! Vous allez être redirigé vers la connexion.");
                    window.location.href = "/signin";
                } else {
                    // Affiche le vrai message d'erreur
                    const errorMsg = result.detail || result.message || JSON.stringify(result);
                    alert("❌ Erreur : " + errorMsg);
                }

            } catch (err) {
                console.error("🔴 Erreur réseau :", err);
                alert("Impossible de contacter le serveur. Vérifiez votre connexion.");
            }
        });
    }

    // ─── VALIDATION ───────────────────────────────────────────

    function validateForm() {
        const surnameOk = inputSurname ? validateRequired(inputSurname) : false;
        const nameOk = inputName ? validateRequired(inputName) : false;
        const adresseOk = inputAdresse ? validateRequired(inputAdresse) : false;
        const cityOk = inputCity ? validateRequired(inputCity) : false;
        const zipOk = inputZip ? validateRequired(inputZip) : false;
        const emailOk = inputEmail ? validateEmail(inputEmail) : false;
        const passwordOk = (inputPassword && inputValidatePassword) 
            ? validatePasswords(inputPassword, inputValidatePassword) 
            : false;
        const phoneOk = inputPhone ? validatePhone(inputPhone) : false;

        if (btnValidation) {
            btnValidation.disabled = !(surnameOk && nameOk && adresseOk && cityOk && zipOk && emailOk && passwordOk && phoneOk);
        }
    }

    function validateRequired(input) {
        if (input.value.trim() !== '') {
            input.classList.add("is-valid");
            input.classList.remove('is-invalid');
            return true;
        } else {
            input.classList.remove("is-valid");
            input.classList.add('is-invalid');
            return false;
        }
    }

    function validateEmail(input) {
        const email = input.value.trim();
        const emailRegex = /^[^\s@]+@[^\s@]+$/;
        if (emailRegex.test(email)) {
            input.classList.add("is-valid");
            input.classList.remove("is-invalid");
            return true;
        } else {
            input.classList.remove("is-valid");
            input.classList.add("is-invalid");
            return false;
        }
    }

    function validatePasswords(passwordInput, confirmPasswordInput) {
        const password = passwordInput.value.trim();
        const confirmPassword = confirmPasswordInput.value.trim();

        if (password === '' || confirmPassword === '') {
            passwordInput.classList.remove("is-valid");
            passwordInput.classList.add("is-invalid");
            confirmPasswordInput.classList.remove("is-valid");
            confirmPasswordInput.classList.add("is-invalid");
            return false;
        }

        if (password !== confirmPassword) {
            passwordInput.classList.remove("is-valid");
            passwordInput.classList.add("is-invalid");
            confirmPasswordInput.classList.remove("is-valid");
            confirmPasswordInput.classList.add("is-invalid");
            return false;
        }

        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_])[A-Za-z\d\W_]{8,}$/;
        if (!passwordRegex.test(password)) {
            passwordInput.classList.remove("is-valid");
            passwordInput.classList.add("is-invalid");
            confirmPasswordInput.classList.remove("is-valid");
            confirmPasswordInput.classList.add("is-invalid");
            return false;
        }

        passwordInput.classList.add("is-valid");
        passwordInput.classList.remove("is-invalid");
        confirmPasswordInput.classList.add("is-valid");
        confirmPasswordInput.classList.remove("is-invalid");
        return true;
    }

    function validatePhone(input) {
        const phone = input.value.replace(/\D/g, '');
        if (/^\d{10}$/.test(phone)) {
            input.classList.add("is-valid");
            input.classList.remove("is-invalid");
            return true;
        } else {
            input.classList.remove("is-valid");
            input.classList.add("is-invalid");
            return false;
        }
    }
})();