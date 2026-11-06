/* Capa de acceso a datos (localStorage + Supabase) */

import { supabase } from './supabaseClient.js';

export const CLAVES = {
    CARRERAS:        'edunic_carreras',
    ANIOS:           'edunic_anios',
    ESTUDIANTES:     'edunic_estudiantes',
    TEMAS:           'edunic_temas',
    EVALUACIONES:    'edunic_evaluaciones',
    RESULTADOS:      'edunic_resultados',
    USUARIO_ACTUAL:  'edunic_usuario_actual',
    CARRERA_ACTIVA:  'edunic_carrera_activa',
    ANIO_ACTIVO:     'edunic_anio_activo'
};

// Mapeo de claves a tablas (ARRIBA para que `guardar` lo use)
const TABLAS = {
    'edunic_carreras':     'carreras',
    'edunic_anios':        'anios',
    'edunic_estudiantes':  'estudiantes',
    'edunic_temas':        'temas',
    'edunic_evaluaciones': 'evaluaciones',
    'edunic_resultados':   'resultados'
};

export const bd = {
    obtener(clave) {
        try {
            const raw = localStorage.getItem(clave);
            return raw ? JSON.parse(raw) : null;
        } catch (e) {
            console.error('Error al leer storage:', clave, e);
            return null;
        }
    },

    guardar(clave, valor) {
        try {
            localStorage.setItem(clave, JSON.stringify(valor));
            if (TABLAS[clave]) {
                sincronizarConSupabase(clave, valor);
            }
        } catch (e) {
            console.error('Error al guardar en storage:', clave, e);
        }
    },

    eliminar(clave) {
        localStorage.removeItem(clave);
    }
};

/* DATOS INICIALES */
const datosIniciales = {
    carreras: [
        {
            id: 'car-1',
            nombre: 'Ingeniería en Sistemas',
            codigo: 'CAR-001',
            codigoClase: 'CLS-IES001',
            creado: new Date().toISOString()
        },
        {
            id: 'car-2',
            nombre: 'Medicina General',
            codigo: 'CAR-002',
            codigoClase: 'CLS-MG0002',
            creado: new Date().toISOString()
        }
    ],
    anios: [
        { id: 'anio-1', idCarrera: 'car-1', nombre: 'Primer Año', estado: 'activo', creado: new Date().toISOString() },
        { id: 'anio-2', idCarrera: 'car-2', nombre: 'Primer Año', estado: 'activo', creado: new Date().toISOString() }
    ],
    estudiantes: [],
    temas: [],
    evaluaciones: [],
    resultados: []
};

/**
 * Carga todos los datos desde Supabase a localStorage.
 * Devuelve true si encontró datos en Supabase.
 */
export async function cargarTodoDesdeSupabase() {
    console.log('📥 Cargando datos desde Supabase...');
    let datosCargados = false;

    for (const [clave, tabla] of Object.entries(TABLAS)) {
        try {
            const { data, error } = await supabase.from(tabla).select('data');
            if (error) throw error;

            if (data && data.length > 0) {
                const array = data.map(item => item.data);
                localStorage.setItem(clave, JSON.stringify(array));
                console.log(`✅ ${tabla}: ${array.length} registros cargados.`);
                datosCargados = true;
            } else {
                console.log(`⚠️ ${tabla}: vacía en Supabase.`);
            }
        } catch (e) {
            console.error(`❌ Error al cargar ${tabla} desde Supabase:`, e);
        }
    }
    return datosCargados;
}

/**
 * Inicializa el almacenamiento (ahora es async).
 */
export async function inicializarBaseDatos() {
    const datosDeSupabase = await cargarTodoDesdeSupabase();

    // Si Supabase está vacío, usar datos iniciales
    if (!datosDeSupabase) {
        console.log('🔄 Supabase vacío. Sembrando datos iniciales...');
        if (!bd.obtener(CLAVES.CARRERAS))        bd.guardar(CLAVES.CARRERAS, datosIniciales.carreras);
        if (!bd.obtener(CLAVES.ANIOS))           bd.guardar(CLAVES.ANIOS, datosIniciales.anios);
        if (!bd.obtener(CLAVES.ESTUDIANTES))     bd.guardar(CLAVES.ESTUDIANTES, datosIniciales.estudiantes);
        if (!bd.obtener(CLAVES.TEMAS))           bd.guardar(CLAVES.TEMAS, datosIniciales.temas);
        if (!bd.obtener(CLAVES.EVALUACIONES))    bd.guardar(CLAVES.EVALUACIONES, datosIniciales.evaluaciones);
        if (!bd.obtener(CLAVES.RESULTADOS))      bd.guardar(CLAVES.RESULTADOS, datosIniciales.resultados);
    }

    // Migraciones (siempre se ejecutan por compatibilidad)
    migrarCarreras();
    migrarEvaluaciones();
    migrarResultados();
    migrarAIdAnio();
}

/* MIGRACIONES */

export function migrarCarreras() {
    const carreras = bd.obtener(CLAVES.CARRERAS) || [];
    const anios = bd.obtener(CLAVES.ANIOS) || [];
    let cambios = false;

    carreras.forEach(c => {
        if (c.anio) {
            const yaTieneAnio = anios.some(a => a.idCarrera === c.id);
            if (!yaTieneAnio) {
                anios.push({
                    id: 'anio-' + c.id,
                    idCarrera: c.id,
                    nombre: c.anio || 'Primer Año',
                    estado: 'activo',
                    creado: c.creado || new Date().toISOString()
                });
            }
            delete c.anio;
            cambios = true;
        }
        if (!c.codigoClase) {
            c.codigoClase = generarCodigoClaseParaMigracion();
            cambios = true;
        }
        if (!c.creado) {
            c.creado = new Date().toISOString();
            cambios = true;
        }
    });

    if (cambios) {
        bd.guardar(CLAVES.CARRERAS, carreras);
        bd.guardar(CLAVES.ANIOS, anios);
    }
}

export function migrarEvaluaciones() {
    const evaluaciones = bd.obtener(CLAVES.EVALUACIONES) || [];
    let cambios = false;

    evaluaciones.forEach(ev => {
        if (!ev.preguntas || ev.preguntas.length === 0) return;

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
            const minimoAnterior = ev.puntajeMinimo || 60;
            ev.puntajeMinimo = Math.round((minimoAnterior / 100) * totalPuntos);
            cambios = true;
        }
    });

    if (cambios) bd.guardar(CLAVES.EVALUACIONES, evaluaciones);
}

export function migrarResultados() {
    const resultados = bd.obtener(CLAVES.RESULTADOS) || [];
    let cambios = false;

    resultados.forEach(r => {
        if (typeof r.puntosObtenidos !== 'number') { r.puntosObtenidos = null; cambios = true; }
        if (typeof r.puntosTotal !== 'number')     { r.puntosTotal = null; cambios = true; }
    });

    if (cambios) bd.guardar(CLAVES.RESULTADOS, resultados);
}

function generarCodigoClaseParaMigracion() {
    const caracteres = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let codigo = 'CLS-';
    for (let i = 0; i < 6; i++) {
        codigo += caracteres.charAt(Math.floor(Math.random() * caracteres.length));
    }
    return codigo;
}

export function migrarAIdAnio() {
    const anios = bd.obtener(CLAVES.ANIOS) || [];
    const carreras = bd.obtener(CLAVES.CARRERAS) || [];
    let cTemas = false, cEvals = false, cRes = false;

    const mapaCarreraAAnio = {};
    carreras.forEach(c => {
        const anioActivo = anios.find(a =>
            String(a.idCarrera) === String(c.id) && a.estado === 'activo'
        );
        if (anioActivo) mapaCarreraAAnio[c.id] = anioActivo.id;
    });

    const temas = bd.obtener(CLAVES.TEMAS) || [];
    temas.forEach(t => {
        if (t.idCarrera && !t.idAnio) {
            const idAnio = mapaCarreraAAnio[t.idCarrera];
            if (idAnio) { t.idAnio = idAnio; cTemas = true; }
        }
    });
    if (cTemas) bd.guardar(CLAVES.TEMAS, temas);

    const evaluaciones = bd.obtener(CLAVES.EVALUACIONES) || [];
    evaluaciones.forEach(e => {
        if (e.idCarrera && !e.idAnio) {
            const idAnio = mapaCarreraAAnio[e.idCarrera];
            if (idAnio) { e.idAnio = idAnio; cEvals = true; }
        }
    });
    if (cEvals) bd.guardar(CLAVES.EVALUACIONES, evaluaciones);

    const resultados = bd.obtener(CLAVES.RESULTADOS) || [];
    resultados.forEach(r => {
        if (r.idCarrera && !r.idAnio) {
            const idAnio = mapaCarreraAAnio[r.idCarrera];
            if (idAnio) { r.idAnio = idAnio; cRes = true; }
        }
    });
    if (cRes) bd.guardar(CLAVES.RESULTADOS, resultados);
}

/* SINCRONIZACIÓN CON SUPABASE */

/**
 * Sincroniza un array local con Supabase.
 * Estrategia: DELETE + INSERT (simple, apta para demo).
 */
export async function sincronizarConSupabase(clave, array) {
    const tabla = TABLAS[clave];
    if (!tabla) return;

    try {
        // 1. Borrar todas las filas
        const { error: deleteError } = await supabase.from(tabla).delete().neq('id', '___nunca___');
        if (deleteError) throw deleteError;

        // 2. Insertar nuevo
        if (Array.isArray(array) && array.length > 0) {
            const filas = array.map(item => ({
                id: String(item.id),
                data: item
            }));
            const { error: insertError } = await supabase.from(tabla).insert(filas);
            if (insertError) throw insertError;
        }
        console.log(`✅ Sincronizado: ${tabla} (${array?.length || 0})`);
    } catch (e) {
        console.error(`❌ Error al sincronizar ${tabla}:`, e);
    }
}

/**
 * Suscribirse a cambios en vivo de una tabla.
 */
export function suscribirCambios(clave, callback) {
    const tabla = TABLAS[clave];
    if (!tabla) return null;

    const canal = supabase
        .channel(`cambios-${tabla}-${Date.now()}`)
        .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: tabla },
            (payload) => {
                console.log(`📡 Cambio en ${tabla}:`, payload.eventType);
                callback(payload);
            }
        )
        .subscribe();

    return canal;
}