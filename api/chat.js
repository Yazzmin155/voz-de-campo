// Función serverless para producción (Vercel): POST /api/chat.
// Permite CORS porque la app Android llama desde otro origen. No usa cookies, así que no expone sesiones.
import { manejarChat } from '../server/handler.mjs';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();

  const { estado, cuerpo } = await manejarChat(req.method, req.body ?? {}, process.env);
  res.status(estado).json(cuerpo);
}
