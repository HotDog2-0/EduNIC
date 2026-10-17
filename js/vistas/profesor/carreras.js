/* Lógica completa del módulo de Carreras */

import { bd, CLAVES } from '../../storage.js';
import {
    mostrarNotificacion,
    generarId,
    escaparHTML,
    normalizar,
    limpiarNombre
} from '../../utils.js';
import { mostrarVista } from '../../navegacion.js';

/* ESTADO INTERNO */

let carreras = [];             
let carreraEditandoId = null;  
let carreraEliminandoId = null;

/* PUNTO DE ENTRADA */

export function inicializarCarreras() {
    console.log('Módulo Carreras: iniciando');

    carreras = bd.obtener(CLAVES.CARRERAS) || [];

    renderizarTarjetas();
    conectarBotonNuevaCarrera();
    conectarModalCarrera();
    conectarModalEliminar();
    conectarBotonVolverCarreras();

    console.log('Módulo Carreras: listo');
}

/* GENERACIÓN DE CÓDIGO */

function calcularSiguienteCodigo() {
    if (carreras.length === 0) return 'CAR-001';

    const numeros = carreras
        .map(c => parseInt((c.codigo || '').replace(/\D/g, ''), 10))
        .filter(n => !isNaN(n));

    if (numeros.length === 0) return 'CAR-001';

    return `CAR-${String(Math.max(...numeros) + 1).padStart(3, '0')}`;

    /**
 * Genera un código único de clase para compartir con estudiantes.
 * 
 * Formato: CLS-XXXXXX
 *   - CLS-  → prefijo fijo
 *   - XXXXXX → 6 caracteres aleatorios (letras mayúsculas y números)
 * 
 * El código se usa para que los estudiantes se auto-registren
 * sin que el profesor tenga que agregarlos manualmente.
 * 
 * @returns {string} Ej: "CLS-A3F9X2"
 */
function generarCodigoClase() {
    const caracteres = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; 
    // Se omiten I, O, 0, 1 para evitar confusión visual
    
    let codigo = 'CLS-';
    for (let i = 0; i < 6; i++) {
        codigo += caracteres.charAt(Math.floor(Math.random() * caracteres.length));
    }
    return codigo;
}
}

/* RENDERIZADO DE TARJETAS*/

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
                    ${escaparHTML(c.anio)}
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

    // Delegación de eventos: un solo listener para todos los botones
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

/* BOTÓN "CREAR NUEVA CARRERA" */

function conectarBotonNuevaCarrera() {
    const btn = document.getElementById('btn-nueva-carrera');
    if (!btn) return;

    btn.addEventListener('click', () => abrirModalCrear());
}

/* MODAL CREAR / EDITAR CARRERA */

function conectarModalCarrera() {
    const modal = document.getElementById('modal-carrera');
    const form  = document.getElementById('form-carrera');
    if (!modal || !form) return;

    // Botones de cerrar
    modal.querySelectorAll('[data-cerrar-modal]').forEach(b => {
        b.addEventListener('click', cerrarModalCarrera);
    });

    // Cerrar al hacer clic fuera del modal
    modal.addEventListener('click', (e) => {
        if (e.target === modal) cerrarModalCarrera();
    });

    // Cerrar con ESC
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !modal.classList.contains('hidden')) {
            cerrarModalCarrera();
        }
    });

    // Guardar (crear o editar según el modo)
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        guardarCarrera();
    });
}

function abrirModalCrear() {
    carreraEditandoId = null;

    document.getElementById('modal-carrera-titulo-texto').textContent = 'Nueva Carrera';
    document.getElementById('carrera-nombre').value = '';
    document.getElementById('carrera-anio').value = '';

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
    document.getElementById('carrera-anio').value = c.anio;

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
    const anio   = document.getElementById('carrera-anio').value;

    // Validaciones
    if (!nombre) {
        mostrarNotificacion('El nombre no puede estar vacío', 'error');
        return;
    }
    if (!anio) {
        mostrarNotificacion('Selecciona un año', 'error');
        return;
    }

    // Verificar duplicado (mismo nombre + mismo año)
    const duplicado = carreras.some(c =>
        c.id !== carreraEditandoId &&
        normalizar(c.nombre) === normalizar(nombre) &&
        c.anio === anio
    );

    if (duplicado) {
        mostrarNotificacion('Ya existe una carrera con ese nombre y año', 'error');
        return;
    }

    if (carreraEditandoId) {
        // EDITAR
        const c = carreras.find(x => x.id === carreraEditandoId);
        if (!c) return;
        c.nombre = nombre;
        c.anio   = anio;
        guardarYRefrescar();
        cerrarModalCarrera();
        mostrarNotificacion('Carrera actualizada');
    } else {
        // CREAR
        const nueva = {
            id: generarId(),
            nombre,
            anio,
            codigo: calcularSiguienteCodigo(),
            codigoClase: generarCodigoClase(),
            creado: new Date().toISOString(),
        };
        carreras.push(nueva);
        guardarYRefrescar();
        cerrarModalCarrera();
        mostrarNotificacion(`Carrera creada con código ${nueva.codigo}`);
    }
}

/* MODAL ELIMINAR CARRERA (DOBLE CONFIRMACIÓN) */

function conectarModalEliminar() {
    const modal      = document.getElementById('modal-eliminar-carrera');
    const input      = document.getElementById('confirmar-eliminar');
    const btnEliminar = document.getElementById('btn-confirmar-eliminar');
    if (!modal || !input || !btnEliminar) return;

    // Botones de cerrar
    modal.querySelectorAll('[data-cerrar-modal]').forEach(b => {
        b.addEventListener('click', cerrarModalEliminar);
    });

    // Cerrar al hacer clic fuera
    modal.addEventListener('click', (e) => {
        if (e.target === modal) cerrarModalEliminar();
    });

    // Cerrar con ESC
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !modal.classList.contains('hidden')) {
            cerrarModalEliminar();
        }
    });

    // Habilitar el botón de eliminar solo si el texto coincide exactamente
    input.addEventListener('input', () => {
        const c = carreras.find(x => x.id === carreraEliminandoId);
        if (!c) return;

        const coincide = input.value.trim() === c.nombre;
        btnEliminar.disabled = !coincide;
    });

    // Confirmar eliminación
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

    // Eliminar la carrera
    carreras = carreras.filter(x => x.id !== carreraEliminandoId);

    // Eliminación en cascada: borrar estudiantes, temas, evaluaciones y resultados de esa carrera
    eliminarDatosDeCarrera(c.id);

    guardarYRefrescar();
    cerrarModalEliminar();
    mostrarNotificacion('Carrera eliminada');
}

/**
 * Elimina en cascada todos los datos asociados a una carrera.
 */
function eliminarDatosDeCarrera(idCarrera) {
    // Estudiantes
    const estudiantes = bd.obtener(CLAVES.ESTUDIANTES) || [];
    bd.guardar(CLAVES.ESTUDIANTES, estudiantes.filter(e => e.idCarrera !== idCarrera));

    // Temas
    const temas = bd.obtener(CLAVES.TEMAS) || [];
    bd.guardar(CLAVES.TEMAS, temas.filter(t => t.idCarrera !== idCarrera));

    // Evaluaciones
    const evaluaciones = bd.obtener(CLAVES.EVALUACIONES) || [];
    bd.guardar(CLAVES.EVALUACIONES, evaluaciones.filter(e => e.idCarrera !== idCarrera));

    // Resultados (los que pertenecen a evaluaciones de esa carrera)
    const resultados = bd.obtener(CLAVES.RESULTADOS) || [];
    bd.guardar(CLAVES.RESULTADOS, resultados.filter(r => r.idCarrera !== idCarrera));
}

/* ABRIR PANEL DE UNA CARRERA */

import { cargarEstudiantesDeCarrera } from './estudiantes.js';
import { cargarModulosDeCarrera } from './temas.js';
import { cargarEvaluacionesDeCarrera } from './evaluaciones.js';
import { cargarCalificacionesDeCarrera } from './calificaciones.js';

function abrirPanelCarrera(id) {
    const c = carreras.find(x => x.id === id);
    if (!c) return;

    bd.guardar(CLAVES.CARRERA_ACTIVA, c.id);

    document.getElementById('panel-carrera-codigo').textContent = c.codigo;
    document.getElementById('panel-carrera-nombre').textContent = c.nombre;
    document.getElementById('panel-carrera-anio').innerHTML =
        `<i class="fa-solid fa-calendar"></i> ${escaparHTML(c.anio)}`;

        rellenarCodigoClase(c);
        conectarBotonesCodigoClase(c);

    cargarEstudiantesDeCarrera(c.id);
    cargarModulosDeCarrera(c.id);
    cargarEvaluacionesDeCarrera(c.id);
    cargarCalificacionesDeCarrera(c.id);

    mostrarVista('view-panel-carrera');
}

/* BOTÓN "VOLVER A MIS CARRERAS" */

function conectarBotonVolverCarreras() {
    const btn = document.getElementById('btn-volver-carreras');
    if (!btn) return;

    btn.addEventListener('click', () => {
        bd.eliminar(CLAVES.CARRERA_ACTIVA);
        mostrarVista('view-mis-carreras');
    });
}

/* UTILIDAD INTERNA*/

function guardarYRefrescar() {
    bd.guardar(CLAVES.CARRERAS, carreras);
    renderizarTarjetas();
}

/* CÓDIGO DE CLASE (AUTO-REGISTRO) */

/**
 * Rellena el bloque del código de clase en el panel de la carrera.
 * 
 * @param {Object} carrera - Objeto de la carrera activa
 */
function rellenarCodigoClase(carrera) {
    const el = document.getElementById('panel-codigo-clase');
    if (el) {
        el.textContent = carrera.codigoClase || 'CLS-XXXXXX';
    }
}

/**
 * Copia el código de clase al portapapeles.
 * 
 * @param {string} codigo - Código a copiar
 */
async function copiarCodigoClase(codigo) {
    try {
        await navigator.clipboard.writeText(codigo);
        mostrarNotificacion('Código copiado al portapapeles');
    } catch (e) {
        // Fallback para navegadores sin clipboard API
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

/**
 * Copia un mensaje de invitación con el código de clase.
 * Listo para pegar en WhatsApp, correo, etc.
 * 
 * @param {Object} carrera - Objeto de la carrera activa
 */
async function compartirCodigoClase(carrera) {
    const mensaje = 
        `¡Hola! Te invito a unirte a mi clase en EduNIC.\n\n` +
        `Carrera: ${carrera.nombre} — ${carrera.anio}\n` +
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

/**
 * Regenera el código de clase de la carrera activa.
 * El código anterior queda inválido.
 * 
 * @param {Object} carrera - Objeto de la carrera activa
 */
function regenerarCodigoClase(carrera) {
    const confirmar = window.confirm(
        '¿Regenerar el código de clase?\n\n' +
        'El código anterior dejará de funcionar. Los estudiantes ' +
        'que no se hayan registrado todavía con ese código ya no podrán hacerlo.'
    );
    if (!confirmar) return;

    // Generar código nuevo
    const nuevoCodigo = generarCodigoClase();
    carrera.codigoClase = nuevoCodigo;

    // Guardar cambios
    const todas = bd.obtener(CLAVES.CARRERAS) || [];
    const idx = todas.findIndex(c => c.id === carrera.id);
    if (idx !== -1) {
        todas[idx].codigoClase = nuevoCodigo;
        bd.guardar(CLAVES.CARRERAS, todas);
    }

    // Actualizar la variable local
    const local = carreras.find(c => c.id === carrera.id);
    if (local) local.codigoClase = nuevoCodigo;

    // Refrescar UI
    rellenarCodigoClase(carrera);
    mostrarNotificacion('Nuevo código generado');
}

/**
 * Conecta los botones del bloque de código de clase.
 * Se llama cada vez que se abre una carrera.
 * 
 * @param {Object} carrera - Objeto de la carrera activa
 */
function conectarBotonesCodigoClase(carrera) {
    // Botón copiar
    const btnCopiar = document.getElementById('btn-copiar-codigo');
    if (btnCopiar) {
        // Clonar y reemplazar para eliminar listeners previos
        const nuevo = btnCopiar.cloneNode(true);
        btnCopiar.parentNode.replaceChild(nuevo, btnCopiar);
        nuevo.addEventListener('click', () => copiarCodigoClase(carrera.codigoClase));
    }

    // Botón compartir
    const btnCompartir = document.getElementById('btn-compartir-codigo');
    if (btnCompartir) {
        const nuevo = btnCompartir.cloneNode(true);
        btnCompartir.parentNode.replaceChild(nuevo, btnCompartir);
        nuevo.addEventListener('click', () => compartirCodigoClase(carrera));
    }

    // Botón regenerar
    const btnRegenerar = document.getElementById('btn-regenerar-codigo');
    if (btnRegenerar) {
        const nuevo = btnRegenerar.cloneNode(true);
        btnRegenerar.parentNode.replaceChild(nuevo, btnRegenerar);
        nuevo.addEventListener('click', () => regenerarCodigoClase(carrera));
    }
}

/* GENERACIÓN DE CÓDIGOS */
/**
 * Genera un código único de clase para compartir con estudiantes.
 * 
 * Formato: CLS-XXXXXX
 *   - CLS-  → prefijo fijo
 *   - XXXXXX → 6 caracteres aleatorios
 * 
 * Se omiten las letras I, O y los números 0, 1
 * para evitar confusión visual (I/1, O/0).
 * 
 * @returns {string} Ej: "CLS-A3F9X2"
 */
function generarCodigoClase() {
    const caracteres = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let codigo = 'CLS-';

    for (let i = 0; i < 6; i++) {
        codigo += caracteres.charAt(Math.floor(Math.random() * caracteres.length));
    }

    return codigo;
}