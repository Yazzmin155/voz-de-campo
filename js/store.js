// Estado único de la app. Los cambios se hacen con set() y los módulos reaccionan con subscribe().

/** Crea un store con valores iniciales. */
export function crearStore(inicial) {
  let valor = { ...inicial };
  const suscriptores = new Set();

  return {
    /** Devuelve el valor de una clave. */
    get: (clave) => valor[clave],

    /** Combina los cambios en el estado y avisa a los suscriptores con (estadoNuevo, cambios). */
    set(cambios) {
      valor = { ...valor, ...cambios };
      suscriptores.forEach((funcion) => funcion(valor, cambios));
    },

    /** Suscribe una función a los cambios. Devuelve la función para cancelar la suscripción. */
    subscribe(funcion) {
      suscriptores.add(funcion);
      return () => suscriptores.delete(funcion);
    },
  };
}

export const estado = crearStore({
  rol: null,
  registros: [],
  leyendo: null,
  dictando: false,
  pulsoMic: null,
  ocupado: false,
  sincronizando: false,
  onboardingIndice: 0,
});
