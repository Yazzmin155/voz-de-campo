// Acceso a IndexedDB de Voz de Campo: registros del usuario y perfil (rol).

const NOMBRE_DB = 'vozdecampo';
const VERSION_DB = 2;
const STORE_REGISTROS = 'registros';
const STORE_PERFIL = 'perfil';
const STORE_PARCELAS = 'parcelas';
const STORE_PASAPORTES = 'pasaportes';
const STORE_CHAT = 'chat';

// Conexión reutilizable para no abrir la base de datos en cada operación.
let conexion = null;

// Migraciones por versión. MIGRACIONES[n] lleva de la versión n a la n+1.
// Nunca se editan migraciones ya publicadas: solo se añaden nuevas al final.
const MIGRACIONES = [
  // v0 -> v1: registros y perfil.
  (db) => {
    const registros = db.createObjectStore(STORE_REGISTROS, { keyPath: 'id', autoIncrement: true });
    registros.createIndex('fecha', 'fecha');
    registros.createIndex('rol', 'rol');
    db.createObjectStore(STORE_PERFIL, { keyPath: 'id' });
  },
  // v1 -> v2: parcelas, pasaportes, chat e índice por estado en registros.
  (db, transaccion) => {
    const parcelas = db.createObjectStore(STORE_PARCELAS, { keyPath: 'id', autoIncrement: true });
    parcelas.createIndex('rol', 'rol');
    db.createObjectStore(STORE_PASAPORTES, { keyPath: 'id', autoIncrement: true });
    db.createObjectStore(STORE_CHAT, { keyPath: 'id', autoIncrement: true });

    const registros = transaccion.objectStore(STORE_REGISTROS);
    if (!registros.indexNames.contains('estado')) registros.createIndex('estado', 'estado');
  },
];

/** Abre la base de datos "vozdecampo" y aplica las migraciones pendientes. */
export function abrirDB() {
  if (conexion) return conexion;

  conexion = new Promise((resolver, rechazar) => {
    const solicitud = indexedDB.open(NOMBRE_DB, VERSION_DB);

    // Aplica solo las migraciones que faltan desde la versión que tenía el usuario.
    solicitud.onupgradeneeded = (evento) => {
      const db = evento.target.result;
      const transaccion = evento.target.transaction;
      for (let version = evento.oldVersion; version < VERSION_DB; version++) {
        MIGRACIONES[version](db, transaccion);
      }
    };

    solicitud.onsuccess = () => resolver(solicitud.result);
    solicitud.onerror = () => {
      conexion = null;
      rechazar(solicitud.error);
    };
  });

  return conexion;
}

/** Ejecuta una operación sobre un store y resuelve con su resultado al completar la transacción. */
async function operar(store, modo, operacion) {
  const db = await abrirDB();

  return new Promise((resolver, rechazar) => {
    const transaccion = db.transaction(store, modo);
    const solicitud = operacion(transaccion.objectStore(store));

    transaccion.oncomplete = () => resolver(solicitud?.result);
    transaccion.onerror = () => rechazar(transaccion.error);
    transaccion.onabort = () => rechazar(transaccion.error);
  });
}

/** Guarda un registro nuevo, con los campos del motor local si los trae. Devuelve su id autoincremental. */
export function guardarRegistro(datos) {
  const registro = { fecha: Date.now(), estado: 'pendiente', categoria: null, ...datos };
  return operar(STORE_REGISTROS, 'readwrite', (store) => store.add(registro));
}

/** Devuelve todos los registros, del más reciente al más antiguo. */
export async function obtenerRegistros() {
  const registros = await operar(STORE_REGISTROS, 'readonly', (store) => store.getAll());
  return registros.sort((a, b) => b.fecha - a.fecha);
}

/** Devuelve los registros pendientes de análisis, del más antiguo al más reciente. */
export async function obtenerPendientes() {
  const registros = await obtenerRegistros();
  return registros.filter((registro) => registro.estado === 'pendiente').reverse();
}

/** Combina los campos indicados con un registro existente, en una sola transacción. */
export function actualizarRegistro(id, cambios) {
  return new Promise(async (resolver, rechazar) => {
    try {
      const db = await abrirDB();
      const transaccion = db.transaction(STORE_REGISTROS, 'readwrite');
      const store = transaccion.objectStore(STORE_REGISTROS);
      const solicitud = store.get(id);

      solicitud.onsuccess = () => {
        if (solicitud.result) store.put({ ...solicitud.result, ...cambios });
      };

      transaccion.oncomplete = () => resolver();
      transaccion.onerror = () => rechazar(transaccion.error);
      transaccion.onabort = () => rechazar(transaccion.error);
    } catch (error) {
      rechazar(error);
    }
  });
}

/** Guarda una parcela nueva. Devuelve su id. */
export function guardarParcela(datos) {
  return operar(STORE_PARCELAS, 'readwrite', (store) => store.add({ creada: Date.now(), ...datos }));
}

/** Devuelve las parcelas, de la más reciente a la más antigua. */
export async function obtenerParcelas() {
  const parcelas = await operar(STORE_PARCELAS, 'readonly', (store) => store.getAll());
  return parcelas.sort((a, b) => b.creada - a.creada);
}

/** Guarda un mensaje del chat. */
export function guardarMensaje(datos) {
  return operar(STORE_CHAT, 'readwrite', (store) => store.add({ fecha: Date.now(), ...datos }));
}

/** Devuelve los mensajes del chat en orden cronológico. */
export async function obtenerMensajes() {
  const mensajes = await operar(STORE_CHAT, 'readonly', (store) => store.getAll());
  return mensajes.sort((a, b) => a.fecha - b.fecha);
}

/** Guarda un pasaporte emitido. Devuelve su id. */
export function guardarPasaporte(datos) {
  return operar(STORE_PASAPORTES, 'readwrite', (store) => store.add({ emitido: Date.now(), ...datos }));
}

/** Devuelve los pasaportes emitidos, del más reciente al más antiguo. */
export async function obtenerPasaportes() {
  const pasaportes = await operar(STORE_PASAPORTES, 'readonly', (store) => store.getAll());
  return pasaportes.sort((a, b) => b.emitido - a.emitido);
}

/** Devuelve el rol guardado ("productor" o "comprador"), o null si aún no se eligió. */
export async function obtenerRol() {
  const perfil = await operar(STORE_PERFIL, 'readonly', (store) => store.get(1));
  return perfil?.rol ?? null;
}

/** Guarda el rol elegido por el usuario en el perfil (id 1). */
export function cambiarRol(rol) {
  return operar(STORE_PERFIL, 'readwrite', (store) => store.put({ id: 1, rol }));
}

/** Borra todos los registros y el perfil del dispositivo. */
export async function borrarTodo() {
  await Promise.all([
    operar(STORE_REGISTROS, 'readwrite', (store) => store.clear()),
    operar(STORE_PERFIL, 'readwrite', (store) => store.clear()),
  ]);
}
