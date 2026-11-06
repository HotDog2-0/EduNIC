/* ============================================
   LÓGICA COMPLETA DEL MÓDULO DE CARRERAS
   ============================================ */

import { bd, CLAVES, suscribirCambios } from '../../storage.js';
import {
    mostrarNotificacion,
    generarId,
    escaparHTML,
    normalizar,
    limpiarNombre
} from '../../utils.js';
import { mostrarVista } from '../../navegacion.js';
import { cargarEstudiantesDeCarrera } from './estudiantes.js';
import { cargarModulosDeAnio } from './temas.js';
import { cargarEvaluacionesDeAnio } from './evaluaciones.js';
import { cargarCalificacionesDeAnio } from './calificaciones.js';
import { cargarAsistenteDeCarrera } from './asistente.js';

/* ==========================================
   ESTADO INTERNO
   ========================================== */

let carreras = [];
let carreraEditandoId = null;
let carreraEliminandoId = null;
let aniosCarrera = [];
let anioActivo = null;

/* ==========================================
   PUNTO DE ENTRADA
   ========================================== */

export function inicializarCarreras() {
    console.log('Módulo Carreras: iniciando');

    carreras = bd.obtener(CLAVES.CARRERAS) || [];

    renderizarTarjetas();
    conectarBotonNuevaCarrera();
    conectarModalCarrera();
    conectarModalEliminar();
    conectarBotonVolverCarreras();

    // ─── SUSCRIPCIÓN EN VIVO (comentada para demo) ───
    // suscribirCambios('edunic_carreras', () => {
    //     carreras = bd.obtener(CLAVES.CARRERAS) || [];
    //     renderizarTarjetas();
    // });

    console.log('Módulo Carreras: listo');
}

/* ==========================================
   GENERACIÓN DE CÓDIGOS
   ========================================== */

function calcularSiguienteCodigo() {
    if (carreras.length === 0) return 'CAR-001';

    const numeros = carreras
        .map(c => parseInt((c.codigo || '').replace(/\D/g, ''), 10))
        .filter(n => !isNaN(n));

    if (numeros.length === 0) return 'CAR-001';

    return `CAR-${String(Math.max(...numeros) + 1).padStart(3, '0')}`;
}

function generarCodigoClase() {
    const caracteres = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let codigo = 'CLS-';

    for (let i = 0; i < 6; i++) {
        codigo += caracteres.charAt(Math.floor(Math.random() * caracteres.length));
    }

    return codigo;
}

/* ==========================================
   RENDERIZADO DE TARJETAS
   ========================================== */

function renderizarTarjetas() {
    const cont = document.getElementById('lista-carreras');
    if (!cont) return;

    if (carreras.length === 0) {
        cont.innerHTML = `
            <div class="carreras-vacio">
                <i class="fa-solid fa-folder-open"></i>
                <h3>No tienes carreras aún</h3>
                <p>Crea tu primera carrera para empezar a gestionar estudiantes, temas y evaluaciones.</p>
            </div>
        `;
        return;
    }

    cont.innerHTML = carreras.map(c => `
        <article class="carrera-card" data-id="${c.id}">
            <div class="carrera-card-icon">
                <i class="fa-solid fa-book-bookmark"></i>
            </div>

            <div class="carrera-card-body">
                <span class="carrera-card-codigo">${escaparHTML(c.codigo)}</span>
                <h3>${escaparHTML(c.nombre)}</h3>
                <p class="carrera-card-anio">
                    <i class="fa-solid fa-calendar"></i>
                    ${escaparHTML(c.anio || '')}
                </p>
            </div>

            <div class="carrera-card-actions">
                <button class="btn-icon btn-edit" type="button"
                        data-accion="editar" data-id="${c.id}" title="Editar">
                    <i class="fa-solid fa-pen"></i>
                </button>
                <button class="btn-icon btn-delete" type="button"
                        data-accion="eliminar" data-id="${c.id}" title="Eliminar">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </div>

            <button class="carrera-card-open" type="button"
                    data-accion="abrir" data-id="${c.id}">
                Abrir Panel <i class="fa-solid fa-arrow-right"></i>
            </button>
        </article>
    `).join('');

    cont.addEventListener('click', manejarClicTarjeta);
}

function manejarClicTarjeta(e) {
    const btn = e.target.closest('[data-accion]');
    if (!btn) return;

    const accion = btn.dataset.accion;
    const id = btn.dataset.id;

    if (accion === 'editar')   abrirModalEditar(id);
    if (accion === 'eliminar') abrirModalEliminar(id);
    if (accion === 'abrir')    abrirPanelCarrera(id);
}

/* ==========================================
   BOTÓN "CREAR NUEVA CARRERA"
   ========================================== */

function conectarBotonNuevaCarrera() {
    const btn = document.getElementById('btn-nueva-carrera');
    if (!btn) return;
    btn.addEventListener('click', () => abrirModalCrear());
}

/* ==========================================
   MODAL CREAR / EDITAR CARRERA
   ========================================== */

function conectarModalCarrera() {
    const modal = document.getElementById('modal-carrera');
    const form  = document.getElementById('form-carrera');
    if (!modal || !form) return;

    modal.querySelectorAll('[data-cerrar-modal]').forEach(b => {
        b.addEventListener('click', cerrarModalCarrera);
    });

    modal.addEventListener('click', (e) => {
        if (e.target === modal) cerrarModalCarrera();
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !modal.classList.contains('hidden')) {
            cerrarModalCarrera();
        }
    });

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        guardarCarrera();
    });
}

function abrirModalCrear() {
    carreraEditandoId = null;

    document.getElementById('modal-carrera-titulo-texto').textContent = 'Nueva Carrera';
    document.getElementById('carrera-nombre').value = '';

    const modal = document.getElementById('modal-carrera');
    modal.classList.remove('hidden');

    setTimeout(() => document.getElementById('carrera-nombre').focus(), 100);
}

function abrirModalEditar(id) {
    const c = carreras.find(x => x.id === id);
    if (!c) return;

    carreraEditandoId = id;

    document.getElementById('modal-carrera-titulo-texto').textContent = 'Editar Carrera';
    document.getElementById('carrera-nombre').value = c.nombre;

    const modal = document.getElementById('modal-carrera');
    modal.classList.remove('hidden');

    setTimeout(() => document.getElementById('carrera-nombre').focus(), 100);
}

function cerrarModalCarrera() {
    const modal = document.getElementById('modal-carrera');
    if (modal) modal.classList.add('hidden');
    carreraEditandoId = null;
}

function guardarCarrera() {
    const nombre = limpiarNombre(document.getElementById('carrera-nombre').value);

    if (!nombre) {
        mostrarNotificacion('El nombre no puede estar vacío', 'error');
        return;
    }

    const duplicado = carreras.some(c =>
        c.id !== carreraEditandoId &&
        normalizar(c.nombre) === normalizar(nombre)
    );

    if (duplicado) {
        mostrarNotificacion('Ya existe una carrera con ese nombre', 'error');
        return;
    }

    if (carreraEditandoId) {
        const c = carreras.find(x => x.id === carreraEditandoId);
        if (!c) return;
        c.nombre = nombre;
        guardarYRefrescar();
        cerrarModalCarrera();
        mostrarNotificacion('Carrera actualizada');
    } else {
        const nueva = {
            id: generarId(),
            nombre,
            codigo: calcularSiguienteCodigo(),
            codigoClase: generarCodigoClase(),
            creado: new Date().toISOString()
        };
        carreras.push(nueva);
        guardarYRefrescar();
        cerrarModalCarrera();
        mostrarNotificacion(`Carrera creada con código ${nueva.codigo}`);
    }
}

/* ==========================================
   MODAL ELIMINAR CARRERA
   ========================================== */

function conectarModalEliminar() {
    const modal       = document.getElementById('modal-eliminar-carrera');
    const input       = document.getElementById('confirmar-eliminar');
    const btnEliminar = document.getElementById('btn-confirmar-eliminar');
    if (!modal || !input || !btnEliminar) return;

    modal.querySelectorAll('[data-cerrar-modal]').forEach(b => {
        b.addEventListener('click', cerrarModalEliminar);
    });

    modal.addEventListener('click', (e) => {
        if (e.target === modal) cerrarModalEliminar();
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !modal.classList.contains('hidden')) {
            cerrarModalEliminar();
        }
    });

    input.addEventListener('input', () => {
        const c = carreras.find(x => x.id === carreraEliminandoId);
        if (!c) return;
        btnEliminar.disabled = input.value.trim() !== c.nombre;
    });

    btnEliminar.addEventListener('click', confirmarEliminar);
}

function abrirModalEliminar(id) {
    const c = carreras.find(x => x.id === id);
    if (!c) return;

    carreraEliminandoId = id;

    document.getElementById('eliminar-carrera-nombre').textContent = c.nombre;
    document.getElementById('confirmar-eliminar').value = '';
    document.getElementById('btn-confirmar-eliminar').disabled = true;

    const modal = document.getElementById('modal-eliminar-carrera');
    modal.classList.remove('hidden');

    setTimeout(() => document.getElementById('confirmar-eliminar').focus(), 100);
}

function cerrarModalEliminar() {
    const modal = document.getElementById('modal-eliminar-carrera');
    if (modal) modal.classList.add('hidden');
    carreraEliminandoId = null;
}

function confirmarEliminar() {
    const c = carreras.find(x => x.id === carreraEliminandoId);
    if (!c) return;

    carreras = carreras.filter(x => x.id !== carreraEliminandoId);
    eliminarDatosDeCarrera(c.id);

    guardarYRefrescar();
    cerrarModalEliminar();
    mostrarNotificacion('Carrera eliminada');
}

function eliminarDatosDeCarrera(idCarrera) {
    const estudiantes = bd.obtener(CLAVES.ESTUDIANTES) || [];
    bd.guardar(CLAVES.ESTUDIANTES, estudiantes.filter(e => e.idCarrera !== idCarrera));

    const temas = bd.obtener(CLAVES.TEMAS) || [];
    bd.guardar(CLAVES.TEMAS, temas.filter(t => t.idCarrera !== idCarrera));

    const evaluaciones = bd.obtener(CLAVES.EVALUACIONES) || [];
    bd.guardar(CLAVES.EVALUACIONES, evaluaciones.filter(e => e.idCarrera !== idCarrera));

    const resultados = bd.obtener(CLAVES.RESULTADOS) || [];
    bd.guardar(CLAVES.RESULTADOS, resultados.filter(r => r.idCarrera !== idCarrera));
}

/* ==========================================
   ABRIR PANEL DE UNA CARRERA
   ========================================== */

function abrirPanelCarrera(id) {
    const c = carreras.find(x => x.id === id);
    if (!c) return;

    bd.guardar(CLAVES.CARRERA_ACTIVA, c.id);

    document.getElementById('panel-carrera-codigo').textContent = c.codigo;
    document.getElementById('panel-carrera-nombre').textContent = c.nombre;

    rellenarCodigoClase(c);
    conectarBotonesCodigoClase(c);

    cargarAniosDeCarrera(c.id);
    conectarBotonesAnio();
    conectarModalNuevoAnio();
    conectarRefrescoPestanas();  // ⬅️ NUEVO

    if (anioActivo) {
        cargarModulosDeAnio(anioActivo.id);
        cargarEvaluacionesDeAnio(anioActivo.id);
        cargarCalificacionesDeAnio(anioActivo.id);
        aplicarModoSoloLectura(anioActivo.estado === 'archivado');
    } else {
        console.warn('⚠️ No hay año activo. Los módulos/evaluaciones no se cargarán.');
    }

    cargarEstudiantesDeCarrera(c.id);
    cargarAsistenteDeCarrera(c.id);

    mostrarVista('view-panel-carrera');
}

/* ==========================================
   REFRESCO AUTOMÁTICO AL CAMBIAR DE PESTAÑA   ⬅️ NUEVO
   ========================================== */
/**
 * Cuando el profesor hace clic en una pestaña del panel de carrera,
 * se recargan los datos desde Supabase para reflejar los cambios
 * hechos por el estudiante en otro dispositivo.
 *
 * Esto es el "sustituto manual" de Realtime para la demo.
 */
function conectarRefrescoPestanas() {
    const nav = document.querySelector('#view-panel-carrera .tabs-nav');
    if (!nav || nav.dataset.refrescoConectado) return;
    nav.dataset.refrescoConectado = 'true';

    nav.addEventListener('click', async (e) => {
        const btn = e.target.closest('.tab-btn');
        if (!btn) return;

        const tab = btn.dataset.tab;
        if (!anioActivo) return;

        // Refrescar la pestaña según su tipo
        if (tab === 'tab-calificaciones') {
            const { cargarCalificacionesDeAnio } = await import('./calificaciones.js');
            cargarCalificacionesDeAnio(anioActivo.id);
        }
        if (tab === 'tab-temas') {
            const { cargarModulosDeAnio } = await import('./temas.js');
            cargarModulosDeAnio(anioActivo.id);
        }
        if (tab === 'tab-evaluaciones') {
            const { cargarEvaluacionesDeAnio } = await import('./evaluaciones.js');
            cargarEvaluacionesDeAnio(anioActivo.id);
        }
        if (tab === 'tab-estudiantes') {
            const carreraActiva = bd.obtener(CLAVES.CARRERA_ACTIVA);
            const { cargarEstudiantesDeCarrera } = await import('./estudiantes.js');
            if (carreraActiva) cargarEstudiantesDeCarrera(carreraActiva);
        }
    });
}

/* ==========================================
   BOTÓN "VOLVER A MIS CARRERAS"
   ========================================== */

function conectarBotonVolverCarreras() {
    const btn = document.getElementById('btn-volver-carreras');
    if (!btn) return;

    btn.addEventListener('click', () => {
        bd.eliminar(CLAVES.CARRERA_ACTIVA);
        mostrarVista('view-mis-carreras');
    });
}

/* ==========================================
   UTILIDAD INTERNA
   ========================================== */

function guardarYRefrescar() {
    bd.guardar(CLAVES.CARRERAS, carreras);
    renderizarTarjetas();
}

/* ==========================================
   CÓDIGO DE CLASE (AUTO-REGISTRO)
   ========================================== */

function rellenarCodigoClase(carrera) {
    const el = document.getElementById('panel-codigo-clase');
    if (el) {
        el.textContent = carrera.codigoClase || 'CLS-XXXXXX';
    }
}

async function copiarCodigoClase(codigo) {
    try {
        await navigator.clipboard.writeText(codigo);
        mostrarNotificacion('Código copiado al portapapeles');
    } catch (e) {
        const textarea = document.createElement('textarea');
        textarea.value = codigo;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        try {
            document.execCommand('copy');
            mostrarNotificacion('Código copiado al portapapeles');
        } catch (err) {
            mostrarNotificacion('No se pudo copiar el código', 'error');
        }
        document.body.removeChild(textarea);
    }
}

async function compartirCodigoClase(carrera) {
    const mensaje =
        `¡Hola! Te invito a unirte a mi clase en EduNIC.\n\n` +
        `Carrera: ${carrera.nombre} — ${carrera.anio || ''}\n` +
        `Código de clase: ${carrera.codigoClase}\n\n` +
        `Ingresa a la plataforma, selecciona "Estudiante" y usa el ` +
        `código de clase para registrarte. ¡Nos vemos en clase!`;

    try {
        await navigator.clipboard.writeText(mensaje);
        mostrarNotificacion('Mensaje de invitación copiado');
    } catch (e) {
        mostrarNotificacion('No se pudo copiar el mensaje', 'error');
    }
}

function regenerarCodigoClase(carrera) {
    const confirmar = window.confirm(
        '¿Regenerar el código de clase?\n\n' +
        'El código anterior dejará de funcionar. Los estudiantes ' +
        'que no se hayan registrado todavía con ese código ya no podrán hacerlo.'
    );
    if (!confirmar) return;

    const nuevoCodigo = generarCodigoClase();
    carrera.codigoClase = nuevoCodigo;

    const todas = bd.obtener(CLAVES.CARRERAS) || [];
    const idx = todas.findIndex(c => c.id === carrera.id);
    if (idx !== -1) {
        todas[idx].codigoClase = nuevoCodigo;
        bd.guardar(CLAVES.CARRERAS, todas);
    }

    const local = carreras.find(c => c.id === carrera.id);
    if (local) local.codigoClase = nuevoCodigo;

    rellenarCodigoClase(carrera);
    mostrarNotificacion('Nuevo código generado');
}

function conectarBotonesCodigoClase(carrera) {
    const btnCopiar = document.getElementById('btn-copiar-codigo');
    if (btnCopiar) {
        const nuevo = btnCopiar.cloneNode(true);
        btnCopiar.parentNode.replaceChild(nuevo, btnCopiar);
        nuevo.addEventListener('click', () => copiarCodigoClase(carrera.codigoClase));
    }

    const btnCompartir = document.getElementById('btn-compartir-codigo');
    if (btnCompartir) {
        const nuevo = btnCompartir.cloneNode(true);
        btnCompartir.parentNode.replaceChild(nuevo, btnCompartir);
        nuevo.addEventListener('click', () => compartirCodigoClase(carrera));
    }

    const btnRegenerar = document.getElementById('btn-regenerar-codigo');
    if (btnRegenerar) {
        const nuevo = btnRegenerar.cloneNode(true);
        btnRegenerar.parentNode.replaceChild(nuevo, btnRegenerar);
        nuevo.addEventListener('click', () => regenerarCodigoClase(carrera));
    }
}

/* ==========================================
   GESTIÓN DE AÑOS
   ========================================== */

function crearAnioNuevo() {
    console.log('Abriendo modal de nuevo año');

    const idCarreraActiva = bd.obtener(CLAVES.CARRERA_ACTIVA);
    if (!idCarreraActiva) {
        mostrarNotificacion('No hay carrera activa', 'error');
        return;
    }

    const todasCarreras = bd.obtener(CLAVES.CARRERAS) || [];
    const carrera = todasCarreras.find(c => String(c.id) === String(idCarreraActiva));
    if (!carrera) {
        mostrarNotificacion('Carrera no encontrada', 'error');
        return;
    }

    document.getElementById('nuevo-anio-nombre').value = '';

    const modal = document.getElementById('modal-nuevo-anio');
    modal.classList.remove('hidden');

    conectarModalNuevoAnio();

    setTimeout(() => document.getElementById('nuevo-anio-nombre').focus(), 100);
}

function cerrarModalNuevoAnio() {
    document.getElementById('modal-nuevo-anio')?.classList.add('hidden');
}

function guardarNuevoAnio() {
    console.log('🔍 guardarNuevoAnio llamada');

    const input = document.getElementById('nuevo-anio-nombre');
    const nombre = limpiarNombre(input.value);
    console.log('  Nombre limpio:', JSON.stringify(nombre));

    if (!nombre) {
        mostrarNotificacion('Escribe un nombre para el año', 'error');
        return;
    }

    if (nombre.length < 3) {
        mostrarNotificacion('El nombre debe tener al menos 3 caracteres', 'error');
        return;
    }

    if (nombre.length > 30) {
        mostrarNotificacion('El nombre es demasiado largo (máx. 30 caracteres)', 'error');
        return;
    }

    if (/^\d+$/.test(nombre)) {
        mostrarNotificacion('El nombre no puede ser solo números', 'error');
        return;
    }

    const esValido = /año/i.test(nombre) ||
                     /^(primero|segundo|tercero|cuarto|quinto|sexto|séptimo|octavo|noveno|décimo)$/i.test(nombre);

    if (!esValido) {
        mostrarNotificacion('El nombre debe contener "Año" (ej: "Segundo Año") o ser un ordinal (ej: "Segundo")', 'error');
        return;
    }

    const idCarreraActiva = bd.obtener(CLAVES.CARRERA_ACTIVA);
    const todosAnios = bd.obtener(CLAVES.ANIOS) || [];
    const aniosDeEstaCarrera = todosAnios.filter(a => String(a.idCarrera) === String(idCarreraActiva));

    if (aniosDeEstaCarrera.some(a => normalizar(a.nombre) === normalizar(nombre))) {
        mostrarNotificacion('Ya existe un año con ese nombre', 'error');
        return;
    }

    const nuevoAnio = {
        id: generarId(),
        idCarrera: idCarreraActiva,
        nombre,
        estado: 'activo',
        creado: new Date().toISOString()
    };

    todosAnios.forEach(a => {
        if (String(a.idCarrera) === String(idCarreraActiva) && a.estado === 'activo') {
            a.estado = 'archivado';
        }
    });

    todosAnios.push(nuevoAnio);
    bd.guardar(CLAVES.ANIOS, todosAnios);

    cargarAniosDeCarrera(idCarreraActiva);
    cerrarModalNuevoAnio();

    if (anioActivo) {
        aplicarModoSoloLectura(anioActivo.estado === 'archivado');
        cargarModulosDeAnio(anioActivo.id);
        cargarEvaluacionesDeAnio(anioActivo.id);
        cargarCalificacionesDeAnio(anioActivo.id);
    }

    mostrarNotificacion(`Año "${nombre}" creado`);
}

function archivarAnioActual() {
    console.log('📦 archivarAnioActual llamada');

    const idCarreraActiva = bd.obtener(CLAVES.CARRERA_ACTIVA);
    if (!idCarreraActiva) {
        mostrarNotificacion('No hay carrera activa', 'error');
        return;
    }

    const todosAnios = bd.obtener(CLAVES.ANIOS) || [];
    const anioActivoActual = todosAnios.find(a =>
        String(a.idCarrera) === String(idCarreraActiva) && a.estado === 'activo'
    );

    if (!anioActivoActual) {
        mostrarNotificacion('No hay año activo para archivar', 'error');
        return;
    }

    const confirmar = window.confirm(
        `¿Archivar "${anioActivoActual.nombre}"?\n\n` +
        `El contenido quedará en modo solo lectura.`
    );
    if (!confirmar) return;

    const idx = todosAnios.findIndex(a => a.id === anioActivoActual.id);
    if (idx !== -1) {
        todosAnios[idx].estado = 'archivado';
        bd.guardar(CLAVES.ANIOS, todosAnios);
    }

    cargarAniosDeCarrera(idCarreraActiva);
    cargarModulosDeAnio(anioActivoActual.id);
    cargarEvaluacionesDeAnio(anioActivoActual.id);
    cargarCalificacionesDeAnio(anioActivoActual.id);

    aplicarModoSoloLectura(true);

    mostrarNotificacion('Año archivado (solo lectura)');
}

function cambiarAnio(idAnio) {
    console.log('📅 cambiarAnio llamada:', idAnio);

    let idLimpio = idAnio;
    if (typeof idLimpio === 'string') {
        idLimpio = idLimpio.replace(/^"|"$/g, '');
    }

    const todosAnios = bd.obtener(CLAVES.ANIOS) || [];
    const anio = todosAnios.find(a => String(a.id) === String(idLimpio));
    if (!anio) {
        console.warn('  ⚠️ Año no encontrado:', idLimpio);
        return;
    }

    anioActivo = anio;
    bd.guardar(CLAVES.ANIO_ACTIVO, anio.id);

    cargarModulosDeAnio(anio.id);
    cargarEvaluacionesDeAnio(anio.id);
    cargarCalificacionesDeAnio(anio.id);
    aplicarModoSoloLectura(anio.estado === 'archivado');

    mostrarNotificacion(`Cambiado a ${anio.nombre}${anio.estado === 'archivado' ? ' (archivado)' : ''}`);
}

function conectarBotonesAnio() {
    console.log('Conectando botones de año...');

    const btnNuevo = document.getElementById('btn-nuevo-anio');
    const btnArchivar = document.getElementById('btn-archivar-anio');
    const selector = document.getElementById('selector-anio');

    if (btnNuevo && !btnNuevo.dataset.conectado) {
        btnNuevo.dataset.conectado = 'true';
        btnNuevo.addEventListener('click', (e) => {
            e.preventDefault();
            crearAnioNuevo();
        });
    }

    if (btnArchivar && !btnArchivar.dataset.conectado) {
        btnArchivar.dataset.conectado = 'true';
        btnArchivar.addEventListener('click', (e) => {
            e.preventDefault();
            archivarAnioActual();
        });
    }

    if (selector && !selector.dataset.conectado) {
        selector.dataset.conectado = 'true';
        selector.addEventListener('change', (e) => {
            cambiarAnio(e.target.value);
        });
    }
}

function cargarAniosDeCarrera(idCarrera) {
    console.log('📅 Cargando años de la carrera:', idCarrera);

    const todosAnios = bd.obtener(CLAVES.ANIOS) || [];
    aniosCarrera = todosAnios.filter(a => String(a.idCarrera) === String(idCarrera));

    console.log('  Años encontrados:', aniosCarrera.length);

    if (aniosCarrera.length === 0) {
        console.log('⚠️ No hay años. Creando "Primer Año" automáticamente...');

        const nuevoAnio = {
            id: 'anio-' + Date.now(),
            idCarrera: idCarrera,
            nombre: 'Primer Año',
            estado: 'activo',
            creado: new Date().toISOString()
        };

        todosAnios.push(nuevoAnio);
        bd.guardar(CLAVES.ANIOS, todosAnios);

        aniosCarrera = [nuevoAnio];

        console.log('✅ Año creado automáticamente:', nuevoAnio.nombre);
    }

    aniosCarrera.sort((a, b) => {
        if (a.estado === b.estado) {
            return new Date(b.creado) - new Date(a.creado);
        }
        return a.estado === 'activo' ? -1 : 1;
    });

    const activo = aniosCarrera.find(a => a.estado === 'activo');
    if (activo) {
        anioActivo = activo;
    } else {
        let guardado = bd.obtener(CLAVES.ANIO_ACTIVO);
        if (typeof guardado === 'string') {
            guardado = guardado.replace(/^"|"$/g, '');
        }
        anioActivo = aniosCarrera.find(a => String(a.id) === String(guardado)) || aniosCarrera[0] || null;
    }

    if (anioActivo) {
        let idLimpio = anioActivo.id;
        if (typeof idLimpio === 'string') {
            idLimpio = idLimpio.replace(/^"|"$/g, '');
        }
        bd.guardar(CLAVES.ANIO_ACTIVO, idLimpio);
    }

    const select = document.getElementById('selector-anio');
    if (!select) {
        console.warn('  ⚠️ No se encontró #selector-anio');
        return;
    }

    if (aniosCarrera.length === 0) {
        select.innerHTML = '<option value="">No hay años</option>';
    } else {
        select.innerHTML = aniosCarrera.map(a => `
            <option value="${a.id}" ${String(a.id) === String(anioActivo?.id) ? 'selected' : ''}>
                ${escaparHTML(a.nombre)} ${a.estado === 'archivado' ? '(Archivado)' : ''}
            </option>
        `).join('');
    }

    if (anioActivo) {
        aplicarModoSoloLectura(anioActivo.estado === 'archivado');
    }
}

function conectarModalNuevoAnio() {
    console.log('Conectando modal Nuevo Año...');

    const modal = document.getElementById('modal-nuevo-anio');
    if (!modal) {
        console.warn('No se encontró #modal-nuevo-anio');
        return;
    }

    modal.querySelectorAll('[data-cerrar-modal]').forEach(b => {
        b.onclick = (e) => {
            e.preventDefault();
            cerrarModalNuevoAnio();
        };
    });

    modal.onclick = (e) => {
        if (e.target === modal) cerrarModalNuevoAnio();
    };

    document.onkeydown = (e) => {
        if (e.key === 'Escape' && !modal.classList.contains('hidden')) {
            cerrarModalNuevoAnio();
        }
    };

    const btnCrear = document.getElementById('btn-confirmar-nuevo-anio');
    if (btnCrear) {
        btnCrear.onclick = (e) => {
            e.preventDefault();
            guardarNuevoAnio();
        };
    }

    const input = document.getElementById('nuevo-anio-nombre');
    if (input) {
        input.onkeydown = (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                guardarNuevoAnio();
            }
        };
    }
}

function aplicarModoSoloLectura(soloLectura) {
    console.log('🔒 Modo solo lectura:', soloLectura);

    const botones = [
        'btn-nuevo-modulo',
        'btn-nueva-evaluacion',
        'btn-add-pregunta',
        'btn-add-recurso'
    ];

    botones.forEach(id => {
        const btn = document.getElementById(id);
        if (btn) {
            btn.disabled = soloLectura;
            btn.title = soloLectura ? 'Año archivado: solo lectura' : '';
        }
    });

    document.querySelectorAll('#lista-modulos .btn-icon, #lista-evaluaciones .btn-icon').forEach(btn => {
        btn.disabled = soloLectura;
        btn.title = soloLectura ? 'Año archivado: solo lectura' : '';
    });

    let banner = document.getElementById('banner-solo-lectura');
    if (soloLectura) {
        if (!banner) {
            banner = document.createElement('div');
            banner.id = 'banner-solo-lectura';
            banner.className = 'banner-solo-lectura';
            banner.innerHTML = `
                <i class="fa-solid fa-lock"></i>
                Este año está archivado. El contenido es de solo lectura.
            `;
            const panel = document.getElementById('view-panel-carrera');
            if (panel) panel.insertBefore(banner, panel.firstChild);
        }
    } else {
        banner?.remove();
    }
}

window.crearAnioNuevo = crearAnioNuevo;
window.archivarAnioActual = archivarAnioActual;
window.cambiarAnio = cambiarAnio;
window.cargarAniosDeCarrera = cargarAniosDeCarrera;
window.abrirPanelCarrera = abrirPanelCarrera;