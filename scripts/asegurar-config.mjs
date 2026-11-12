// Crea js/config.js a partir de la plantilla si aún no existe (por ejemplo, en un clon nuevo).
import { copyFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const destino = join(raiz, 'js', 'config.js');
const plantilla = join(raiz, 'js', 'config.example.js');

if (!existsSync(destino)) {
  copyFileSync(plantilla, destino);
  console.log('js/config.js creado desde config.example.js. Agrega tu API Key de Gemini.');
}
