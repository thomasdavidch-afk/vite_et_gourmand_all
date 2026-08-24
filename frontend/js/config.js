// frontend/js/config.js

// Détection automatique : 
// Si on tourne en local (localhost ou 127.0.0.1), on appelle le backend local.
// Sinon (en ligne sur Vercel), on appellera l'URL de production du backend.
const API_URL = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://127.0.0.1:8000/api'
    : 'https://mon-backend-render.onrender.com/api'; // On mettra l'URL finale Render ici

// On l'attache à window pour qu'elle soit accessible partout dans l'application
window.API_URL = API_URL;