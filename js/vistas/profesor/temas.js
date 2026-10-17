/* Lógica del módulo de Temas
   (módulos + temas + material de apoyo) */

import { bd, CLAVES } from '../../storage.js';

import {
    mostrarNotificacion,
    generarId,
    escaparHTML,
    normalizar,
    limpiarNombre,
    dataURLtoBlobURL,
    detectarVideo,        
    abrirModalVideo       
} from '../../utils.js';

/* CONSTANTES*/

const MAX_PDF_BYTES = 500 * 1024; // 500 KB

/* ESTADO INTERNO */

let modulos = [];
let idCarreraActiva = null;
let moduloEditandoId = null;
let moduloEliminandoId = null;

let temaEditandoId = null;
let idModuloParaNuevoTema = null;

// Recursos que se están editando actualmente en el modal de tema
let recursosDelTemaEnEdicion = [];

/* PUNTO DE ENTRADA */

export function inicializarTemas() {
    console.log('Módulo Temas: inicializando...');

    conectarBotonNuevoModulo();
    conectarModalModulo();
    conectarModalEliminarModulo();
    conectarModalTema();
    conectarModalRecurso();

    console.log('Módulo Temas: listo');
}

export function cargarModulosDeCarrera(idCarrera) {
    idCarreraActiva = idCarrera;

    const todos = bd.obtener(CLAVES.TEMAS) || [];
    modulos = todos.filter(x => x.tipo === 'modulo' && x.idCarrera === idCarrera);

    renderizarModulos();
}

/* RENDERIZADO */

function renderizarModulos() {
    const cont = document.getElementById('lista-modulos');
    if (!cont) return;

    if (modulos.length === 0) {
        cont.innerHTML = `
            <div class="carreras-vacio">
                <i class="fa-solid fa-folder-open"></i>
                <h3>No hay módulos todavía</h3>
                <p>Crea tu primer módulo (unidad) para empezar a organizar los temas.</p>
            </div>
        `;
        return;
    }

    cont.innerHTML = modulos.map(m => renderizarModuloHTML(m)).join('');
    cont.onclick = manejarClicModulos;
}

function renderizarModuloHTML(m) {
    const temasDelModulo = obtenerTemasDeModulo(m.id);
    const cantidad = temasDelModulo.length;

    return `
        <div class="modulo-item" data-id="${m.id}">
            <div class="modulo-header" data-accion="toggle" data-id="${m.id}">
                <i class="fa-solid fa-chevron-right modulo-icono-flecha"></i>
                <i class="fa-solid fa-folder modulo-icono-carpeta"></i>
                <h4 class="modulo-nombre">${escaparHTML(m.nombre)}</h4>
                <span class="modulo-contador">${cantidad} ${cantidad === 1 ? 'tema' : 'temas'}</span>
                <div class="modulo-acciones">
                    <button class="btn-icon btn-edit" type="button"
                            data-accion="editar-modulo" data-id="${m.id}" title="Editar módulo">
                        <i class="fa-solid fa-pen"></i>
                    </button>
                    <button class="btn-icon btn-delete" type="button"
                            data-accion="eliminar-modulo" data-id="${m.id}" title="Eliminar módulo">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            </div>
            <div class="modulo-body">
                ${renderizarTemasDelModulo(temasDelModulo)}
                <button class="modulo-add-tema" type="button"
                        data-accion="nuevo-tema" data-id="${m.id}">
                    <i class="fa-solid fa-plus"></i> Añadir Tema
                </button>
            </div>
        </div>
    `;
}

function renderizarTemasDelModulo(temas) {
    if (temas.length === 0) {
        return `
            <div class="modulo-vacio">
                <i class="fa-solid fa-book"></i>
                Este módulo aún no tiene temas. ¡Añade el primero!
            </div>
        `;
    }
    return temas.map(t => renderizarTemaHTML(t)).join('');
}

function renderizarTemaHTML(t) {
    const recursos = (t.material || []).filter(r => r && r.id);
    const cantidadRecursos = recursos.length;

    return `
        <div class="tema-card" data-id="${t.id}">
            <div class="tema-card-header">
                <h5 class="tema-card-titulo">
                    <i class="fa-solid fa-book-open"></i>
                    ${escaparHTML(t.titulo)}
                </h5>
                <div class="tema-card-acciones">
                    <button class="btn-icon btn-edit" type="button"
                            data-accion="editar-tema" data-id="${t.id}" title="Editar tema">
                        <i class="fa-solid fa-pen"></i>
                    </button>
                    <button class="btn-icon btn-delete" type="button"
                            data-accion="eliminar-tema" data-id="${t.id}" title="Eliminar tema">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            </div>

            <p class="tema-card-descripcion">${escaparHTML(t.descripcion)}</p>

            <div class="tema-card-ejemplo">
                <strong>Ejemplo:</strong> ${escaparHTML(t.ejemplo)}
            </div>

            ${cantidadRecursos > 0 ? `
                <div class="tema-card-recursos">
                    <div class="tema-card-recursos-titulo">
                        <i class="fa-solid fa-paperclip"></i>
                        Material de apoyo (${cantidadRecursos})
                    </div>
                    <div class="recursos-chips">
                        ${recursos.map(r => renderizarRecursoChip(r)).join('')}
                    </div>
                </div>
            ` : ''}
        </div>
    `;
}

/**
 * Renderiza un chip de recurso (enlace, PDF o video).
 * 
 * - Si es PDF → genera blob URL y lo abre en pestaña nueva.
 * - Si es video (YouTube/Vimeo) → lo abre en modal embebido.
 * - Si es enlace normal → lo abre en pestaña nueva.
 * 
 * @param {Object} r - Objeto del recurso
 * @returns {string} HTML del chip
 */
function renderizarRecursoChip(r) {
    const esPDF = r.tipo === 'pdf';

    // ----- PDF -----
    if (esPDF) {
        const url = r.dataURL ? dataURLtoBlobURL(r.dataURL) : '#';
        return `
            <a class="recurso-chip tipo-pdf"
               href="${url}"
               target="_blank"
               rel="noopener noreferrer"
               title="${escaparHTML(r.titulo)}">
                <i class="fa-solid fa-file-pdf"></i>
                <span class="recurso-chip-texto">${escaparHTML(r.titulo)}</span>
            </a>
        `;
    }

    // ----- Enlace o video -----
    const url = r.url || '#';
    const video = detectarVideo(url);

    // Si es video → botón que abre el modal embebido
    if (video) {
        return `
            <button class="recurso-chip tipo-video"
                    type="button"
                    data-video-url="${escaparHTML(video.embedURL)}"
                    data-video-titulo="${escaparHTML(r.titulo)}"
                    data-video-original="${escaparHTML(video.urlOriginal)}"
                    title="${escaparHTML(r.titulo)}">
                <i class="fa-solid fa-circle-play"></i>
                <span class="recurso-chip-texto">${escaparHTML(r.titulo)}</span>
            </button>
        `;
    }

    // Enlace normal
    return `
        <a class="recurso-chip tipo-enlace"
           href="${url}"
           target="_blank"
           rel="noopener noreferrer"
           title="${escaparHTML(r.titulo)}">
            <i class="fa-solid fa-link"></i>
            <span class="recurso-chip-texto">${escaparHTML(r.titulo)}</span>
        </a>
    `;
}

function obtenerTemasDeModulo(idModulo) {
    const todos = bd.obtener(CLAVES.TEMAS) || [];
    return todos.filter(x => x.tipo === 'tema' && x.idModulo === idModulo);
}

function obtenerTemaPorId(id) {
    const todos = bd.obtener(CLAVES.TEMAS) || [];
    return todos.find(x => x.id === id && x.tipo === 'tema');
}

/* MANEJO DE CLICS */

function manejarClicModulos(e) {
    const btn = e.target.closest('[data-accion]');
    if (!btn) return;

    const accion = btn.dataset.accion;
    const id = btn.dataset.id;

    if (accion !== 'toggle') e.stopPropagation();

    switch (accion) {
        case 'toggle':           toggleModulo(id);             break;
        case 'editar-modulo':    abrirModalEditarModulo(id);   break;
        case 'eliminar-modulo':  abrirModalEliminarModulo(id); break;
        case 'nuevo-tema':       abrirModalCrearTema(id);      break;
        case 'editar-tema':      abrirModalEditarTema(id);     break;
        case 'eliminar-tema':    eliminarTema(id);             break;
    }
}

function toggleModulo(id) {
    const item = document.querySelector(`.modulo-item[data-id="${id}"]`);
    if (item) item.classList.toggle('expandido');
}

/* MODAL CREAR / EDITAR MÓDULO */

function conectarBotonNuevoModulo() {
    document.getElementById('btn-nuevo-modulo')
        ?.addEventListener('click', () => abrirModalCrearModulo());
}

function conectarModalModulo() {
    const modal = document.getElementById('modal-modulo');
    const form  = document.getElementById('form-modulo');
    if (!modal || !form) return;

    modal.querySelectorAll('[data-cerrar-modal]').forEach(b => {
        b.addEventListener('click', cerrarModalModulo);
    });

    modal.addEventListener('click', (e) => {
        if (e.target === modal) cerrarModalModulo();
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !modal.classList.contains('hidden')) {
            cerrarModalModulo();
        }
    });

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        guardarModulo();
    });
}

function abrirModalCrearModulo() {
    if (!idCarreraActiva) {
        mostrarNotificacion('No hay carrera activa', 'error');
        return;
    }

    moduloEditandoId = null;
    document.getElementById('modal-modulo-titulo-texto').textContent = 'Nuevo Módulo';
    document.getElementById('modulo-nombre').value = '';

    document.getElementById('modal-modulo').classList.remove('hidden');
    setTimeout(() => document.getElementById('modulo-nombre').focus(), 100);
}

function abrirModalEditarModulo(id) {
    const m = modulos.find(x => x.id === id);
    if (!m) return;

    moduloEditandoId = id;
    document.getElementById('modal-modulo-titulo-texto').textContent = 'Editar Módulo';
    document.getElementById('modulo-nombre').value = m.nombre;

    document.getElementById('modal-modulo').classList.remove('hidden');
    setTimeout(() => document.getElementById('modulo-nombre').focus(), 100);
}

function cerrarModalModulo() {
    document.getElementById('modal-modulo')?.classList.add('hidden');
    moduloEditandoId = null;
}

function guardarModulo() {
    const nombre = limpiarNombre(document.getElementById('modulo-nombre').value);

    if (!nombre) {
        mostrarNotificacion('El nombre no puede estar vacío', 'error');
        return;
    }

    const duplicado = modulos.some(m =>
        m.id !== moduloEditandoId &&
        normalizar(m.nombre) === normalizar(nombre)
    );
    if (duplicado) {
        mostrarNotificacion('Ya existe un módulo con ese nombre en esta carrera', 'error');
        return;
    }

    const todos = bd.obtener(CLAVES.TEMAS) || [];

    if (moduloEditandoId) {
        const idx = todos.findIndex(x => x.id === moduloEditandoId && x.tipo === 'modulo');
        if (idx === -1) return;

        todos[idx].nombre = nombre;
        bd.guardar(CLAVES.TEMAS, todos);

        const m = modulos.find(x => x.id === moduloEditandoId);
        if (m) m.nombre = nombre;

        cerrarModalModulo();
        renderizarModulos();
        mostrarNotificacion('Módulo actualizado');
    } else {
        const nuevo = {
            id: generarId(),
            tipo: 'modulo',
            idCarrera: idCarreraActiva,
            nombre,
            creado: new Date().toISOString()
        };

        todos.push(nuevo);
        bd.guardar(CLAVES.TEMAS, todos);

        modulos.push(nuevo);
        cerrarModalModulo();
        renderizarModulos();
        mostrarNotificacion('Módulo creado');
    }
}

/* MODAL ELIMINAR MÓDULO */

function conectarModalEliminarModulo() {
    const modal       = document.getElementById('modal-eliminar-modulo');
    const input       = document.getElementById('confirmar-eliminar-modulo');
    const btnEliminar = document.getElementById('btn-confirmar-eliminar-modulo');
    if (!modal || !input || !btnEliminar) return;

    modal.querySelectorAll('[data-cerrar-modal]').forEach(b => {
        b.addEventListener('click', cerrarModalEliminarModulo);
    });

    modal.addEventListener('click', (e) => {
        if (e.target === modal) cerrarModalEliminarModulo();
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !modal.classList.contains('hidden')) {
            cerrarModalEliminarModulo();
        }
    });

    input.addEventListener('input', () => {
        const m = modulos.find(x => x.id === moduloEliminandoId);
        if (!m) return;
        btnEliminar.disabled = input.value.trim() !== m.nombre;
    });

    btnEliminar.addEventListener('click', confirmarEliminarModulo);
}

function abrirModalEliminarModulo(id) {
    const m = modulos.find(x => x.id === id);
    if (!m) return;

    moduloEliminandoId = id;

    document.getElementById('eliminar-modulo-nombre').textContent = m.nombre;
    document.getElementById('confirmar-eliminar-modulo').value = '';
    document.getElementById('btn-confirmar-eliminar-modulo').disabled = true;

    document.getElementById('modal-eliminar-modulo').classList.remove('hidden');
    setTimeout(() => document.getElementById('confirmar-eliminar-modulo').focus(), 100);
}

function cerrarModalEliminarModulo() {
    document.getElementById('modal-eliminar-modulo')?.classList.add('hidden');
    moduloEliminandoId = null;
}

function confirmarEliminarModulo() {
    const m = modulos.find(x => x.id === moduloEliminandoId);
    if (!m) return;

    const todos = bd.obtener(CLAVES.TEMAS) || [];
    const filtrados = todos.filter(x => {
        if (x.id === m.id && x.tipo === 'modulo') return false;
        if (x.tipo === 'tema' && x.idModulo === m.id) return false;
        return true;
    });
    bd.guardar(CLAVES.TEMAS, filtrados);

    modulos = modulos.filter(x => x.id !== m.id);

    cerrarModalEliminarModulo();
    renderizarModulos();
    mostrarNotificacion('Módulo eliminado');
}

/* MODAL CREAR / EDITAR TEMA */

function conectarModalTema() {
    const modal = document.getElementById('modal-tema');
    const form  = document.getElementById('form-tema');
    if (!modal || !form) return;

    modal.querySelectorAll('[data-cerrar-modal]').forEach(b => {
        b.addEventListener('click', cerrarModalTema);
    });

    modal.addEventListener('click', (e) => {
        if (e.target === modal) cerrarModalTema();
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !modal.classList.contains('hidden')) {
            cerrarModalTema();
        }
    });

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        guardarTema();
    });

    // Botón "+ Añadir Recurso"
    document.getElementById('btn-add-recurso')
        ?.addEventListener('click', () => abrirModalRecurso());
}

function abrirModalCrearTema(idModulo) {
    const m = modulos.find(x => x.id === idModulo);
    if (!m) return;

    temaEditandoId = null;
    idModuloParaNuevoTema = idModulo;
    recursosDelTemaEnEdicion = [];

    document.getElementById('modal-tema-titulo-texto').textContent = 'Nuevo Tema';
    document.getElementById('tema-titulo').value = '';
    document.getElementById('tema-descripcion').value = '';
    document.getElementById('tema-ejemplo').value = '';

    renderizarRecursosEnModal();

    document.getElementById('modal-tema').classList.remove('hidden');
    setTimeout(() => document.getElementById('tema-titulo').focus(), 100);
}

function abrirModalEditarTema(idTema) {
    const t = obtenerTemaPorId(idTema);
    if (!t) return;

    temaEditandoId = idTema;
    idModuloParaNuevoTema = null;
    recursosDelTemaEnEdicion = (t.material || []).map(r => ({ ...r }));

    document.getElementById('modal-tema-titulo-texto').textContent = 'Editar Tema';
    document.getElementById('tema-titulo').value = t.titulo;
    document.getElementById('tema-descripcion').value = t.descripcion;
    document.getElementById('tema-ejemplo').value = t.ejemplo;

    renderizarRecursosEnModal();

    document.getElementById('modal-tema').classList.remove('hidden');
    setTimeout(() => document.getElementById('tema-titulo').focus(), 100);
}

function cerrarModalTema() {
    document.getElementById('modal-tema')?.classList.add('hidden');
    temaEditandoId = null;
    idModuloParaNuevoTema = null;
    recursosDelTemaEnEdicion = [];
}

function guardarTema() {
    const titulo      = limpiarNombre(document.getElementById('tema-titulo').value);
    const descripcion = document.getElementById('tema-descripcion').value.trim();
    const ejemplo     = document.getElementById('tema-ejemplo').value.trim();

    if (!titulo) {
        mostrarNotificacion('El título no puede estar vacío', 'error');
        return;
    }
    if (!descripcion) {
        mostrarNotificacion('La descripción no puede estar vacía', 'error');
        return;
    }
    if (!ejemplo) {
        mostrarNotificacion('El ejemplo no puede estar vacío', 'error');
        return;
    }

    const idModulo = temaEditandoId
        ? obtenerTemaPorId(temaEditandoId)?.idModulo
        : idModuloParaNuevoTema;

    const todos = bd.obtener(CLAVES.TEMAS) || [];

    const duplicado = todos.some(x =>
        x.tipo === 'tema' &&
        x.idModulo === idModulo &&
        x.id !== temaEditandoId &&
        normalizar(x.titulo) === normalizar(titulo)
    );
    if (duplicado) {
        mostrarNotificacion('Ya existe un tema con ese título en este módulo', 'error');
        return;
    }

    if (temaEditandoId) {
        const idx = todos.findIndex(x => x.id === temaEditandoId && x.tipo === 'tema');
        if (idx === -1) return;

        todos[idx].titulo = titulo;
        todos[idx].descripcion = descripcion;
        todos[idx].ejemplo = ejemplo;
        todos[idx].material = recursosDelTemaEnEdicion.map(r => ({ ...r }));

        bd.guardar(CLAVES.TEMAS, todos);

        cerrarModalTema();
        renderizarModulos();
        mostrarNotificacion('Tema actualizado');
    } else {
        const nuevo = {
            id: generarId(),
            tipo: 'tema',
            idModulo: idModuloParaNuevoTema,
            idCarrera: idCarreraActiva,
            titulo,
            descripcion,
            ejemplo,
            material: recursosDelTemaEnEdicion.map(r => ({ ...r })),
            creado: new Date().toISOString()
        };

        todos.push(nuevo);
        bd.guardar(CLAVES.TEMAS, todos);

        const idModulo = idModuloParaNuevoTema;
        cerrarModalTema();
        renderizarModulos();

        // Expandir el módulo del tema recién creado
        const item = document.querySelector(`.modulo-item[data-id="${idModulo}"]`);
        if (item) item.classList.add('expandido');

        mostrarNotificacion('Tema creado');
    }
}

/* ELIMINAR TEMA */

function eliminarTema(idTema) {
    const t = obtenerTemaPorId(idTema);
    if (!t) return;

    const confirmar = window.confirm(
        `¿Eliminar el tema "${t.titulo}"?\n\nEsta acción no se puede deshacer.`
    );
    if (!confirmar) return;

    const todos = bd.obtener(CLAVES.TEMAS) || [];
    bd.guardar(CLAVES.TEMAS, todos.filter(x => x.id !== idTema));

    renderizarModulos();
    mostrarNotificacion('Tema eliminado');
}

/* MODAL RECURSO (MATERIAL DE APOYO)*/

function conectarModalRecurso() {
    const modal = document.getElementById('modal-recurso');
    const form  = document.getElementById('form-recurso');
    if (!modal || !form) return;

    // Botones de cerrar
    modal.querySelectorAll('[data-cerrar-modal]').forEach(b => {
        b.addEventListener('click', cerrarModalRecurso);
    });

    // Cerrar al hacer clic fuera
    modal.addEventListener('click', (e) => {
        if (e.target === modal) cerrarModalRecurso();
    });

    // Cerrar con ESC
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !modal.classList.contains('hidden')) {
            cerrarModalRecurso();
        }
    });

    // Cambio de tipo (enlace / pdf)
    document.querySelectorAll('input[name="tipo-recurso"]').forEach(radio => {
        radio.addEventListener('change', actualizarSeccionesRecurso);
    });

    // Submit
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        agregarRecurso();
    });
}

function abrirModalRecurso() {
    // Resetear form
    const form = document.getElementById('form-recurso');
    form.reset();

    // Por defecto "enlace"
    document.querySelector('input[name="tipo-recurso"][value="enlace"]').checked = true;
    actualizarSeccionesRecurso();

    document.getElementById('modal-recurso').classList.remove('hidden');
    setTimeout(() => document.getElementById('recurso-titulo').focus(), 100);
}

function cerrarModalRecurso() {
    document.getElementById('modal-recurso')?.classList.add('hidden');
}

function actualizarSeccionesRecurso() {
    const tipo = document.querySelector('input[name="tipo-recurso"]:checked')?.value;

    const seccionEnlace = document.getElementById('recurso-seccion-enlace');
    const seccionPDF    = document.getElementById('recurso-seccion-pdf');
    if (!seccionEnlace || !seccionPDF) return;

    if (tipo === 'pdf') {
        seccionEnlace.classList.add('hidden');
        seccionPDF.classList.remove('hidden');
    } else {
        seccionEnlace.classList.remove('hidden');
        seccionPDF.classList.add('hidden');
    }
}

function agregarRecurso() {
    const tipo = document.querySelector('input[name="tipo-recurso"]:checked')?.value;

    if (tipo === 'enlace') {
        agregarRecursoEnlace();
    } else if (tipo === 'pdf') {
        agregarRecursoPDF();
    }
}

function agregarRecursoEnlace() {
    const titulo = limpiarNombre(document.getElementById('recurso-titulo').value);
    const url    = document.getElementById('recurso-url').value.trim();

    if (!titulo) {
        mostrarNotificacion('Escribe un título para el recurso', 'error');
        return;
    }
    if (!url) {
        mostrarNotificacion('Escribe una URL', 'error');
        return;
    }

    // Validación básica de URL
    try {
        new URL(url);
    } catch (e) {
        mostrarNotificacion('La URL no es válida', 'error');
        return;
    }

    // Verificar duplicado (mismo título)
    if (recursosDelTemaEnEdicion.some(r => normalizar(r.titulo) === normalizar(titulo))) {
        mostrarNotificacion('Ya existe un recurso con ese título', 'error');
        return;
    }

    recursosDelTemaEnEdicion.push({
        id: generarId(),
        tipo: 'enlace',
        titulo,
        url
    });

    renderizarRecursosEnModal();
    cerrarModalRecurso();
    mostrarNotificacion('Recurso añadido');
}

function agregarRecursoPDF() {
    const titulo = limpiarNombre(document.getElementById('recurso-titulo-pdf').value);
    const inputFile = document.getElementById('recurso-archivo');

    if (!titulo) {
        mostrarNotificacion('Escribe un título para el recurso', 'error');
        return;
    }
    if (!inputFile.files || inputFile.files.length === 0) {
        mostrarNotificacion('Selecciona un archivo PDF', 'error');
        return;
    }

    const file = inputFile.files[0];

    // Validar tipo
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
        mostrarNotificacion('El archivo debe ser PDF', 'error');
        return;
    }

    // Validar tamaño
    if (file.size > MAX_PDF_BYTES) {
        mostrarNotificacion('El PDF es muy grande. Máximo 500 KB.', 'error');
        return;
    }

    // Verificar duplicado (mismo título)
    if (recursosDelTemaEnEdicion.some(r => normalizar(r.titulo) === normalizar(titulo))) {
        mostrarNotificacion('Ya existe un recurso con ese título', 'error');
        return;
    }

    // Leer como base64
    const reader = new FileReader();

    reader.onload = (e) => {
        recursosDelTemaEnEdicion.push({
            id: generarId(),
            tipo: 'pdf',
            titulo,
            nombreArchivo: file.name,
            dataURL: e.target.result
        });

        renderizarRecursosEnModal();
        cerrarModalRecurso();
        mostrarNotificacion('PDF añadido');
    };

    reader.onerror = () => {
        mostrarNotificacion('Error al leer el PDF', 'error');
    };

    reader.readAsDataURL(file);
}

function renderizarRecursosEnModal() {
    const cont = document.getElementById('lista-recursos-tema');
    if (!cont) return;

    if (recursosDelTemaEnEdicion.length === 0) {
        cont.innerHTML = `
            <p class="text-muted text-center recursos-vacio">
                No hay recursos añadidos todavía.
            </p>
        `;
        return;
    }

    cont.innerHTML = recursosDelTemaEnEdicion.map(r => `
        <div class="recurso-item" data-id="${r.id}">
            <div class="recurso-item-icono ${r.tipo === 'pdf' ? 'tipo-pdf' : 'tipo-enlace'}">
                <i class="fa-solid ${r.tipo === 'pdf' ? 'fa-file-pdf' : 'fa-link'}"></i>
            </div>
            <div class="recurso-item-info">
                <p class="recurso-item-titulo">${escaparHTML(r.titulo)}</p>
                <p class="recurso-item-meta">
                    ${r.tipo === 'pdf'
                        ? escaparHTML(r.nombreArchivo || 'Archivo PDF')
                        : escaparHTML(r.url)}
                </p>
            </div>
            <button class="btn-icon btn-delete" type="button"
                    data-quitar-recurso="${r.id}" title="Quitar recurso">
                <i class="fa-solid fa-trash"></i>
            </button>
        </div>
    `).join('');

    // Delegación de eventos para quitar recursos
    cont.onclick = (e) => {
        const btn = e.target.closest('[data-quitar-recurso]');
        if (!btn) return;

        const id = btn.dataset.quitarRecurso;
        recursosDelTemaEnEdicion = recursosDelTemaEnEdicion.filter(r => r.id !== id);
        renderizarRecursosEnModal();
    };
}

/**
 * Listener delegado para abrir videos en el modal embebido.
 */
function conectarAperturaVideos() {
    document.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-video-url]');
        if (!btn) return;

        e.preventDefault();

        const embedURL = btn.dataset.videoUrl;
        const titulo = btn.dataset.videoTitulo;
        const urlOriginal = btn.dataset.videoOriginal;

        abrirModalVideo(embedURL, titulo, urlOriginal);
    });
}