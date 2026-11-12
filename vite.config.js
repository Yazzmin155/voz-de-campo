import { defineConfig, loadEnv } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import { manejarGemini, manejarChat } from './server/handler.mjs';

// Rutas del proxy y su manejador. Deben coincidir con los archivos de api/.
const RUTAS = {
  '/api/gemini': manejarGemini,
  '/api/chat': manejarChat,
};

/** Lee el cuerpo JSON de una petición de Node. */
async function leerCuerpo(req) {
  let datos = '';
  for await (const trozo of req) datos += trozo;
  return datos ? JSON.parse(datos) : {};
}

/** Monta las rutas del proxy en el servidor de desarrollo y en el de preview. */
function montarProxy(entorno) {
  return (servidor) => {
    for (const [ruta, manejador] of Object.entries(RUTAS)) {
      servidor.middlewares.use(ruta, async (req, res) => {
        let cuerpo = {};
        try {
          cuerpo = await leerCuerpo(req);
        } catch (error) {
          res.statusCode = 400;
          res.setHeader('Content-Type', 'application/json');
          return res.end(JSON.stringify({ error: { tipo: 'peticion-invalida', mensaje: 'JSON inválido' } }));
        }

        const { estado, cuerpo: respuesta } = await manejador(req.method, cuerpo, entorno);
        res.statusCode = estado;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(respuesta));
      });
    }
  };
}

// Rutas relativas para que el build funcione en cualquier subcarpeta de hosting.
export default defineConfig(({ mode }) => {
  // loadEnv lee .env.local. Las variables sin prefijo VITE_ nunca llegan al navegador.
  const entorno = { ...process.env, ...loadEnv(mode, process.cwd(), '') };

  return {
    base: './',
    plugins: [
      tailwindcss(),
      {
        name: 'proxy-gemini',
        configureServer: montarProxy(entorno),
        configurePreviewServer: montarProxy(entorno),
      },
    ],
    build: {
      outDir: 'dist',
    },
  };
});
