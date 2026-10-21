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
    migrarCarreras();
    migrarEvaluaciones();
    migrarResultados();
}

/**
 * Migra las carreras existentes para añadir campos nuevos
 * que no tenían en versiones anteriores de la app.
 * 
 * Se ejecuta al arrancar la app. Es idempotente:
 * si las carreras ya tienen los campos, no hace nada.
 */
export function migrarCarreras() {
    const carreras = bd.obtener(CLAVES.CARRERAS) || [];
    let cambios = false;

    carreras.forEach(c => {
        // Añadir codigoClase si no existe
        if (!c.codigoClase) {
            c.codigoClase = generarCodigoClaseParaMigracion();
            cambios = true;
        }
        // Añadir fecha de creación si no existe
        if (!c.creado) {
            c.creado = new Date().toISOString();
            cambios = true;
        }
    });

    if (cambios) {
        bd.guardar(CLAVES.CARRERAS, carreras);
        console.log('Carreras migradas: campos nuevos añadidos');
    }
}

/**
 * Genera un código de clase (versión simplificada para migración).
 * Debe coincidir con el formato de carreras.js.
 */
function generarCodigoClaseParaMigracion() {
    const caracteres = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let codigo = 'CLS-';
    for (let i = 0; i < 6; i++) {
        codigo += caracteres.charAt(Math.floor(Math.random() * caracteres.length));
    }
    return codigo;
}

/**
 * Migra las evaluaciones existentes para añadir el campo `puntos`
 * a cada pregunta si no lo tienen.
 * 
 * Reglas:
 * - Si una evaluación no tiene preguntas → se omite
 * - Si una pregunta no tiene `puntos` → se le asigna 10
 * - Si el total no es 100 → se ajusta el `puntajeMinimo` proporcionalmente
 *   (ej: si antes era 60% y el nuevo total es 50, el mínimo pasa a 30)
 * 
 * Es idempotente: si las evaluaciones ya tienen puntos, no hace nada.
 */
export function migrarEvaluaciones() {
    const evaluaciones = bd.obtener(CLAVES.EVALUACIONES) || [];
    let cambios = false;

    evaluaciones.forEach(ev => {
        if (!ev.preguntas || ev.preguntas.length === 0) return;

        // ¿Ya tiene puntos? ¿Cuál es el total?
        let totalPuntos = 0;
        let necesitaMigracion = false;

        ev.preguntas.forEach(p => {
            if (typeof p.puntos !== 'number' || isNaN(p.puntos) || p.puntos <= 0) {
                p.puntos = 10;
                necesitaMigracion = true;
            }
            totalPuntos += p.puntos;
        });

        if (necesitaMigracion) {
            // Recalcular el puntaje mínimo proporcionalmente
            const minimoAnterior = ev.puntajeMinimo || 60;
            const porcentajeMinimo = minimoAnterior / 100;
            ev.puntajeMinimo = Math.round(porcentajeMinimo * totalPuntos);
            cambios = true;
        }
    });

    if (cambios) {
        bd.guardar(CLAVES.EVALUACIONES, evaluaciones);
        console.log('Evaluaciones migradas: campo "puntos" añadido');
    }
}

/**
 * Migra los resultados existentes para añadir el campo `puntosObtenidos`
 * y `puntosTotal` si no lo tienen.
 * 
 * Los resultados viejos ya tienen `puntaje` (que era un porcentaje).
 * Los mantenemos como están. Los nuevos tendrán los campos nuevos.
 */
export function migrarResultados() {
    const resultados = bd.obtener(CLAVES.RESULTADOS) || [];
    const evaluaciones = bd.obtener(CLAVES.EVALUACIONES) || [];
    let cambios = false;

    resultados.forEach(r => {
        // Si ya tiene puntosObtenidos → ya está migrado
        if (typeof r.puntosObtenidos === 'number') return;

        // Buscar la evaluación correspondiente
        const ev = evaluaciones.find(e => String(e.id) === String(r.idEvaluacion));
        if (!ev || !ev.preguntas) {
            // No se puede migrar sin la evaluación
            return;
        }

        // Calcular puntos basándose en las respuestas guardadas
        let puntosObtenidos = 0;
        let puntosTotal = 0;
        let pendientes = 0;

        ev.preguntas.forEach(p => {
            const puntos = typeof p.puntos === 'number' && p.puntos > 0 ? p.puntos : 10;
            puntosTotal += puntos;

            const respuesta = r.respuestas?.[p.id];

            if (p.tipo === 'multiple') {
                if (respuesta === p.correcta) puntosObtenidos += puntos;
            } else if (p.tipo === 'vf') {
                if (respuesta === p.correcta) puntosObtenidos += puntos;
            } else if (p.tipo === 'corta') {
                const esperada = (p.respuestaEsperada || '').trim();
                if (!esperada) {
                    // Ver si el profesor la calificó
                    const manual = r.calificacionesManuales?.[p.id];
                    if (manual === true) puntosObtenidos += puntos;
                    else if (manual !== false) pendientes++;
                } else {
                    if (String(respuesta).trim().toUpperCase() === esperada.toUpperCase()) {
                        puntosObtenidos += puntos;
                    }
                }
            }
        });

        // Guardar en el resultado
        r.puntosObtenidos = puntosObtenidos;
        r.puntosTotal = puntosTotal;
        r.puntajeMinimo = ev.puntajeMinimo;
        r.aprobado = puntosObtenidos >= ev.puntajeMinimo;
        r.pendientes = pendientes;
        r.estado = pendientes > 0 ? 'pendiente' : 'calificada';

        // Eliminar el campo viejo (opcional)
        // delete r.puntaje;

        cambios = true;
    });

    if (cambios) {
        bd.guardar(CLAVES.RESULTADOS, resultados);
        console.log('Resultados migrados a puntos');
    }
}