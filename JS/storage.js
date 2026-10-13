/* Capa de acceso a datos (localStorage) */

export const CLAVES = {
    CARRERAS:        'edunic_carreras',
    ESTUDIANTES:     'edunic_estudiantes',
    TEMAS:           'edunic_temas',
    EVALUACIONES:    'edunic_evaluaciones',
    RESULTADOS:      'edunic_resultados',
    USUARIO_ACTUAL:  'edunic_usuario_actual',
    CARRERA_ACTIVA:  'edunic_carrera_activa'
};

/**
 * Objeto de acceso a datos.
 * Toda la app usa estas funciones para leer/escribir.
 */
export const bd = {
    /**
     * Lee un valor del almacenamiento.
     * @param {string} clave
     * @returns {*|null}
     */
    obtener(clave) {
        try {
            const raw = localStorage.getItem(clave);
            return raw ? JSON.parse(raw) : null;
        } catch (e) {
            console.error('Error al leer storage:', clave, e);
            return null;
        }
    },

    /**
     * Guarda un valor en el almacenamiento.
     * @param {string} clave
     * @param {*} valor
     */
    guardar(clave, valor) {
        try {
            localStorage.setItem(clave, JSON.stringify(valor));
        } catch (e) {
            console.error('Error al guardar en storage:', clave, e);
        }
    },

    /**
     * Elimina una clave.
     * @param {string} clave
     */
    eliminar(clave) {
        localStorage.removeItem(clave);
    }
};

/* DATOS INICIALES
   Se cargan la primera vez que se abre la app.*/

const datosIniciales = {
    carreras: [
        { id: 'car-1', nombre: 'Ingeniería en Sistemas', anio: 'Primer Año',  codigo: 'CAR-001' },
        { id: 'car-2', nombre: 'Medicina General',       anio: 'Segundo Año', codigo: 'CAR-002' }
    ],
    estudiantes: [],
    temas: [],         
    evaluaciones: [],
    resultados: []
};

/**
 * Inicializa el almacenamiento con datos de prueba si está vacío.
 */
export function inicializarBaseDatos() {
    if (!bd.obtener(CLAVES.CARRERAS)) {
        bd.guardar(CLAVES.CARRERAS, datosIniciales.carreras);
    }
    if (!bd.obtener(CLAVES.ESTUDIANTES)) {
        bd.guardar(CLAVES.ESTUDIANTES, datosIniciales.estudiantes);
    }
    if (!bd.obtener(CLAVES.TEMAS)) {
        bd.guardar(CLAVES.TEMAS, datosIniciales.temas);
    }
    if (!bd.obtener(CLAVES.EVALUACIONES)) {
        bd.guardar(CLAVES.EVALUACIONES, datosIniciales.evaluaciones);
    }
    if (!bd.obtener(CLAVES.RESULTADOS)) {
        bd.guardar(CLAVES.RESULTADOS, datosIniciales.resultados);
    }
}