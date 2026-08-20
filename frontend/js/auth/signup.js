// Implémenter le Javascript
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

inputSurname.addEventListener("keyup", validateForm);
inputName.addEventListener("keyup", validateForm);
inputAdresse.addEventListener("keyup", validateForm);
inputCity.addEventListener("keyup", validateForm);
inputZip.addEventListener("keyup", validateForm);
inputEmail.addEventListener("keyup", validateForm);
inputPhone.addEventListener("keyup", validateForm);
inputPassword.addEventListener("keyup", validateForm);
inputValidatePassword.addEventListener("keyup", validateForm);

// ─── SOUMISSION VERS L'API ────────────────────────────────
form.addEventListener("submit", async (e) => {
    e.preventDefault();

    // 🔑 ENVOIE DU JSON, PAS DU FormData !
    const data = {
        prenom: inputSurname.value.trim(),
        nom: inputName.value.trim(),
        adressePostale: inputAdresse.value.trim(),
        ville: inputCity.value.trim(),
        codePostal: inputZip.value.trim(),
        email: inputEmail.value.trim(),
        telephone: inputPhone.value.trim(),
        password: inputPassword.value.trim()
    };

    console.log("📤 Données envoyées :", data);

    try {
        const response = await fetch("http://127.0.0.1:8000/api/register", {
            method: "POST",
            headers: {
                "Content-Type": "application/ld+json"  // ← IMPORTANT !
            },
            body: JSON.stringify(data)  // ← Pas de FormData !
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

// ─── VALIDATION ───────────────────────────────────────────

function validateForm() {
    const surnameOk = validateRequired(inputSurname);
    const nameOk = validateRequired(inputName);
    const adresseOk = validateRequired(inputAdresse);
    const cityOk = validateRequired(inputCity);
    const zipOk = validateRequired(inputZip);
    const emailOk = validateEmail(inputEmail);
    const passwordOk = validatePasswords(inputPassword, inputValidatePassword);
    const phoneOk = validatePhone(inputPhone);

    btnValidation.disabled = !(surnameOk && nameOk && adresseOk && cityOk && zipOk && emailOk && passwordOk && phoneOk);
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
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
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
