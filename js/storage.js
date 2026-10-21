/* Capa de acceso a datos (localStorage)
   
   MODELO DE DATOS ACTUAL:
   - carreras: { id, nombre, codigo, codigoClase, creado }
   - anios: { id, idCarrera, nombre, estado, creado }
   - estudiantes: { id, nombre, codigo, idCarrera }
   - temas: módulos y temas (con idAnio)
   - evaluaciones: con idAnio
   - resultados: con idAnio */

export const CLAVES = {
    CARRERAS:        'edunic_carreras',
    ANIOS:           'edunic_anios',           // ← NUEVA
    ESTUDIANTES:     'edunic_estudiantes',
    TEMAS:           'edunic_temas',
    EVALUACIONES:    'edunic_evaluaciones',
    RESULTADOS:      'edunic_resultados',
    USUARIO_ACTUAL:  'edunic_usuario_actual',
    CARRERA_ACTIVA:  'edunic_carrera_activa',
    ANIO_ACTIVO:     'edunic_anio_activo'      // ← NUEVA
};

/**
 * Objeto de acceso a datos.
 */
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
        } catch (e) {
            console.error('Error al guardar en storage:', clave, e);
        }
    },

    eliminar(clave) {
        localStorage.removeItem(clave);
    }
};

/*  DATOS INICIALES */

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
        {
            id: 'anio-1',
            idCarrera: 'car-1',
            nombre: 'Primer Año',
            estado: 'activo',
            creado: new Date().toISOString()
        },
        {
            id: 'anio-2',
            idCarrera: 'car-2',
            nombre: 'Primer Año',
            estado: 'activo',
            creado: new Date().toISOString()
        }
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
    if (!bd.obtener(CLAVES.ANIOS)) {
        bd.guardar(CLAVES.ANIOS, datosIniciales.anios);
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

    // Migraciones de versiones anteriores (si hubiera)
    migrarCarreras();
    migrarEvaluaciones();
    migrarResultados();
}

/* MIGRACIONES (versiones anteriores) */

/**
 * Migra carreras antiguas que tenían el campo "anio".
 * Crea un año por defecto para cada carrera y quita el campo "anio".
 */
export function migrarCarreras() {
    const carreras = bd.obtener(CLAVES.CARRERAS) || [];
    const anios = bd.obtener(CLAVES.ANIOS) || [];
    let cambios = false;

    carreras.forEach(c => {
        // Si la carrera tiene "anio" (modelo viejo), migrarla
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
        // Añadir codigoClase si no existe
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
        console.log('Carreras y años migrados');
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

export function migrarResultados() {
    const resultados = bd.obtener(CLAVES.RESULTADOS) || [];
    let cambios = false;

    resultados.forEach(r => {
        if (typeof r.puntosObtenidos !== 'number') {
            r.puntosObtenidos = null;
            cambios = true;
        }
        if (typeof r.puntosTotal !== 'number') {
            r.puntosTotal = null;
            cambios = true;
        }
    });

    if (cambios) {
        bd.guardar(CLAVES.RESULTADOS, resultados);
        console.log('Resultados migrados');
    }
}

/* UTILIDADES */

/**
 * Genera un código de clase para migración (temporal).
 */
function generarCodigoClaseParaMigracion() {
    const caracteres = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let codigo = 'CLS-';
    for (let i = 0; i < 6; i++) {
        codigo += caracteres.charAt(Math.floor(Math.random() * caracteres.length));
    }
    return codigo;
}