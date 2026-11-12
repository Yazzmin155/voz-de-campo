// Plantilla de configuración del cliente. Copia este archivo como js/config.js si falta.
// Las claves no van aquí: la API Key de Gemini vive en el servidor (ver .env.example).

// Origen del proxy de IA. Vacío en la web; en la app Android, la URL pública del despliegue.
export const API_BASE = import.meta.env.VITE_API_BASE ?? '';

// Ruta del proxy que analiza los registros con Gemini.
export const ENDPOINT_IA = `${API_BASE}/api/gemini`;

// Ruta del proxy del chat copiloto.
export const ENDPOINT_CHAT = `${API_BASE}/api/chat`;
