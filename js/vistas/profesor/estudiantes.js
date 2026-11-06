/* Lógica del módulo de Estudiantes (por carrera) */

import { bd, CLAVES, suscribirCambios } from '../../storage.js';
import {
    mostrarNotificacion,
    generarId,
    escaparHTML,
    normalizar,
    limpiarNombre,
    detectarVideo,
    abrirModalVideo
} from '../../utils.js';
import { generarCodigoEstudiante, prefijoCodigo, palabrasDeNombre, sufijoAleatorio } from '../../codigoEstudiante.js';

/* ESTADO INTERNO */

let estudiantes = [];
let idCarreraActiva = null;
let estudianteEditandoId = null;

// Letras al azar del código: se eligen una vez y se conservan mientras se escribe el nombre
let sufijoPendiente = null;

/* PUNTO DE ENTRADA */

export function inicializarEstudiantes() {
    console.log('👥 Módulo Estudiantes: inicializando...');

    conectarFormularioRegistro();
    conectarInputNombre();
    conectarSubidaArchivo();
    conectarDescargarPlantilla();
    conectarModalPegarLista();
    conectarModalEdicion();

    // ─── SUSCRIPCIÓN EN VIVO (comentada para demo) ───
    // Al reactivar Realtime, descomentar este bloque.
    // Advertencia: con la estrategia DELETE+INSERT actual, cada
    // guardado dispara DOS eventos y puede causar loops de recarga.
    //
    // suscribirCambios('edunic_estudiantes', () => {
    //     console.log('🔄 Estudiantes cambiaron, recargando...');
    //     if (!idCarreraActiva) return;
    //
    //     const todos = bd.obtener(CLAVES.ESTUDIANTES) || [];
    //     estudiantes = todos.filter(
    //         e => String(e.idCarrera) === String(idCarreraActiva)
    //     );
    //     renderizarTabla();
    //     actualizarContador();
    //     actualizarCodigoPreview();
    // });

    console.log('✅ Módulo Estudiantes: listo');
}

/**
 * Carga los estudiantes de una carrera específica.
 * Se llama cuando se abre el panel de una carrera.
 * @param {string} idCarrera
 */
export function cargarEstudiantesDeCarrera(idCarrera) {
    idCarreraActiva = idCarrera;

    const todos = bd.obtener(CLAVES.ESTUDIANTES) || [];
    estudiantes = todos.filter(e => String(e.idCarrera) === String(idCarrera));

    renderizarTabla();
    actualizarCodigoPreview();
}

/* CÓDIGO PERSONAL */

/**
 * Muestra el código completo mientras se escribe el nombre.
 * Las iniciales cambian con el nombre; las 4 letras finales se quedan fijas.
 */
function actualizarCodigoPreview() {
    const input = document.getElementById('new-student-codigo');
    if (!input) return;

    const nombre = document.getElementById('new-student-name')?.value || '';
    const prefijo = prefijoCodigo(nombre);

    if (!prefijo) {
        sufijoPendiente = null;
        input.value = 'Escribe el nombre';
        return;
    }
    if (!sufijoPendiente) sufijoPendiente = sufijoAleatorio();
    input.value = `${prefijo}-${sufijoPendiente}`;
}

/* REGISTRO MANUAL */

function conectarFormularioRegistro() {
    const form = document.getElementById('form-registrar-estudiante');
    if (!form) return;

    form.addEventListener('submit', (e) => {
        e.preventDefault();

        if (!idCarreraActiva) {
            mostrarNotificacion('No hay carrera activa', 'error');
            return;
        }

        const nombreInput = document.getElementById('new-student-name');
        const nombre = limpiarNombre(nombreInput.value);

        if (!nombre) {
            mostrarNotificacion('Escribe el nombre del estudiante', 'error');
            return;
        }

        if (palabrasDeNombre(nombre).length < 2) {
            mostrarNotificacion('Escribe nombre y apellido del estudiante', 'error');
            return;
        }

        // Verificar duplicado por nombre EN LA MISMA CARRERA
        const existe = estudiantes.some(
            e => normalizar(e.nombre) === normalizar(nombre)
        );
        if (existe) {
            mostrarNotificacion('Ya existe un estudiante con ese nombre en esta carrera', 'error');
            return;
        }

        const todos = bd.obtener(CLAVES.ESTUDIANTES) || [];

        // Se usa el código que se vio en pantalla (si sigue libre); si no, se genera otro
        const previsto = (document.getElementById('new-student-codigo')?.value || '').trim().toUpperCase();
        const prevLibre = previsto.startsWith(prefijoCodigo(nombre) + '-') &&
            /^[A-Z]{1,4}-[A-Z2-9]{4}$/.test(previsto) &&
            !todos.some(e => String(e.codigo || '').toUpperCase() === previsto);

        const nuevo = {
            id: generarId(),
            nombre,
            codigo: prevLibre ? previsto : generarCodigoEstudiante(nombre, todos),
            idCarrera: idCarreraActiva
        };

        todos.push(nuevo);
        bd.guardar(CLAVES.ESTUDIANTES, todos);

        estudiantes.push(nuevo);
        renderizarTabla();

        form.reset();
        sufijoPendiente = null;
        actualizarCodigoPreview();

        mostrarNotificacion(`Registrado con código ${nuevo.codigo}`);
    });
}

function conectarInputNombre() {
    const input = document.getElementById('new-student-name');
    if (!input) return;

    input.addEventListener('input', () => {
        actualizarCodigoPreview();
    });
}

/* TABLA */

function renderizarTabla() {
    const tbody = document.getElementById('tbody-estudiantes');
    if (!tbody) return;

    if (estudiantes.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="4" class="tabla-vacia">
                    <i class="fa-solid fa-inbox"></i>
                    <p>No hay estudiantes en esta carrera.</p>
                    <p class="text-muted">Usa el formulario de arriba para agregar el primero.</p>
                </td>
            </tr>
        `;
        actualizarContador();
        return;
    }

    tbody.innerHTML = estudiantes.map((est, i) => `
        <tr data-id="${est.id}">
            <td>${i + 1}</td>
            <td>${escaparHTML(est.nombre)}</td>
            <td><strong>${escaparHTML(est.codigo)}</strong></td>
            <td class="text-center">
                <button class="btn-icon btn-edit" type="button"
                        data-accion="editar" data-id="${est.id}" title="Editar">
                    <i class="fa-solid fa-pen"></i>
                </button>
                <button class="btn-icon btn-delete" type="button"
                        data-accion="eliminar" data-id="${est.id}" title="Eliminar">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');

    tbody.onclick = manejarClicTabla;

    actualizarContador();
}

function manejarClicTabla(e) {
    const btn = e.target.closest('[data-accion]');
    if (!btn) return;

    const accion = btn.dataset.accion;
    const id = btn.dataset.id;

    if (accion === 'editar')   abrirModalEdicion(id);
    if (accion === 'eliminar') eliminarEstudiante(id);
}

function actualizarContador() {
    const badge = document.getElementById('contador-estudiantes');
    if (!badge) return;

    const n = estudiantes.length;
    badge.textContent = `${n} ${n === 1 ? 'estudiante' : 'estudiantes'}`;
}

/* EDICIÓN (MODAL) */

function conectarModalEdicion() {
    const modal = document.getElementById('modal-editar-estudiante');
    const form  = document.getElementById('form-editar-estudiante');
    if (!modal || !form) return;

    modal.querySelectorAll('[data-cerrar-modal]').forEach(b => {
        b.addEventListener('click', cerrarModalEdicion);
    });

    modal.addEventListener('click', (e) => {
        if (e.target === modal) cerrarModalEdicion();
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !modal.classList.contains('hidden')) {
            cerrarModalEdicion();
        }
    });

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        guardarEdicion();
    });
}

function abrirModalEdicion(id) {
    const est = estudiantes.find(e => String(e.id) === String(id));
    if (!est) return;

    estudianteEditandoId = id;

    document.getElementById('edit-student-name').value   = est.nombre;
    document.getElementById('edit-student-codigo').value = est.codigo;

    const modal = document.getElementById('modal-editar-estudiante');
    modal.classList.remove('hidden');

    setTimeout(() => document.getElementById('edit-student-name').focus(), 100);
}

function cerrarModalEdicion() {
    const modal = document.getElementById('modal-editar-estudiante');
    if (modal) modal.classList.add('hidden');
    estudianteEditandoId = null;
}

function guardarEdicion() {
    if (!estudianteEditandoId) return;

    const nombreInput = document.getElementById('edit-student-name');
    const nombre = limpiarNombre(nombreInput.value);

    if (!nombre) {
        mostrarNotificacion('El nombre no puede estar vacío', 'error');
        return;
    }

    const existe = estudiantes.some(
        e => String(e.id) !== String(estudianteEditandoId) &&
             normalizar(e.nombre) === normalizar(nombre)
    );
    if (existe) {
        mostrarNotificacion('Ya existe otro estudiante con ese nombre', 'error');
        return;
    }

    const todos = bd.obtener(CLAVES.ESTUDIANTES) || [];
    const idx = todos.findIndex(e => String(e.id) === String(estudianteEditandoId));
    if (idx === -1) return;

    todos[idx].nombre = nombre;
    bd.guardar(CLAVES.ESTUDIANTES, todos);

    const est = estudiantes.find(e => String(e.id) === String(estudianteEditandoId));
    if (est) est.nombre = nombre;

    renderizarTabla();
    cerrarModalEdicion();
    mostrarNotificacion('Estudiante actualizado');
}

/* ELIMINACIÓN */

function eliminarEstudiante(id) {
    const est = estudiantes.find(e => String(e.id) === String(id));
    if (!est) return;

    const confirmar = window.confirm(
        `¿Eliminar a "${est.nombre}" (${est.codigo})?\n\nEsta acción no se puede deshacer.`
    );
    if (!confirmar) return;

    const todos = bd.obtener(CLAVES.ESTUDIANTES) || [];
    bd.guardar(CLAVES.ESTUDIANTES, todos.filter(e => String(e.id) !== String(id)));

    estudiantes = estudiantes.filter(e => String(e.id) !== String(id));

    renderizarTabla();
    actualizarCodigoPreview();
    mostrarNotificacion('Estudiante eliminado');
}

/* IMPORTAR DESDE ARCHIVO (CSV/TXT) */

function conectarSubidaArchivo() {
    const input = document.getElementById('file-input');
    const area  = document.getElementById('upload-area');
    if (!input || !area) return;

    input.addEventListener('change', (e) => {
        const file = e.target.files?.[0];
        if (file) procesarArchivo(file);
    });

    area.addEventListener('dragover', (e) => {
        e.preventDefault();
        area.classList.add('dragover');
    });
    area.addEventListener('dragleave', () => {
        area.classList.remove('dragover');
    });
    area.addEventListener('drop', (e) => {
        e.preventDefault();
        area.classList.remove('dragover');
        const file = e.dataTransfer.files?.[0];
        if (file) procesarArchivo(file);
    });
}

function procesarArchivo(file) {
    if (!idCarreraActiva) {
        mostrarNotificacion('No hay carrera activa', 'error');
        return;
    }

    const nombreLower = file.name.toLowerCase();
    const esCSV = nombreLower.endsWith('.csv');
    const esTXT = nombreLower.endsWith('.txt');

    if (!esCSV && !esTXT) {
        mostrarNotificacion('Solo se aceptan archivos .csv o .txt', 'error');
        return;
    }

    const reader = new FileReader();

    reader.onload = (e) => {
        const contenido = e.target.result;
        const nombres = extraerNombres(contenido);

        if (nombres.length === 0) {
            mostrarNotificacion('El archivo no contiene nombres válidos', 'error');
            return;
        }

        const { agregados, duplicados } = importarNombres(nombres);

        renderizarTabla();
        actualizarCodigoPreview();

        if (agregados > 0) {
            let msg = `${agregados} estudiante${agregados !== 1 ? 's' : ''} importado${agregados !== 1 ? 's' : ''}`;
            if (duplicados > 0) msg += ` (${duplicados} duplicado${duplicados !== 1 ? 's' : ''} omitido${duplicados !== 1 ? 's' : ''})`;
            mostrarNotificacion(msg);
        } else {
            mostrarNotificacion('Todos los nombres ya estaban registrados', 'error');
        }

        document.getElementById('file-input').value = '';
    };

    reader.onerror = () => {
        mostrarNotificacion('Error al leer el archivo', 'error');
    };

    reader.readAsText(file, 'UTF-8');
}

function extraerNombres(contenido) {
    const lineas = contenido
        .split(/\r?\n/)
        .map(l => l.trim())
        .filter(l => l.length > 0);

    const nombres = [];

    lineas.forEach((linea, i) => {
        const primeraCol = linea.split(/[,;]/)[0].trim();

        if (i === 0 && /^(nombre|name|estudiante|student)/i.test(primeraCol)) {
            return;
        }

        const limpio = primeraCol.replace(/^["']|["']$/g, '').trim();

        if (limpio.length > 1) {
            nombres.push(limpio);
        }
    });

    return nombres;
}

function importarNombres(nombres) {
    let agregados = 0;
    let duplicados = 0;

    const todos = bd.obtener(CLAVES.ESTUDIANTES) || [];

    nombres.forEach(nombreCrudo => {
        const nombre = limpiarNombre(nombreCrudo);
        if (!nombre) return;

        const yaExiste = estudiantes.some(
            e => normalizar(e.nombre) === normalizar(nombre)
        );

        if (yaExiste) {
            duplicados++;
            return;
        }

        const nuevo = {
            id: generarId(),
            nombre,
            codigo: generarCodigoEstudiante(nombre, todos),
            idCarrera: idCarreraActiva
        };

        todos.push(nuevo);
        estudiantes.push(nuevo);
        agregados++;
    });

    bd.guardar(CLAVES.ESTUDIANTES, todos);

    return { agregados, duplicados };
}

/* PLANTILLA CSV DESCARGABLE */

function conectarDescargarPlantilla() {
    const btn = document.getElementById('btn-descargar-plantilla');
    if (!btn) return;

    btn.addEventListener('click', descargarPlantilla);
}

function descargarPlantilla() {
    const contenido = [
        'Nombre del estudiante',
        'María González Rodríguez',
        'Carlos Pérez López',
        'Ana Martínez Silva'
    ].join('\n');

    const blob = new Blob(['\uFEFF' + contenido], {
        type: 'text/csv;charset=utf-8;'
    });

    const url = URL.createObjectURL(blob);
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = 'plantilla-estudiantes.csv';

    document.body.appendChild(enlace);
    enlace.click();
    document.body.removeChild(enlace);

    URL.revokeObjectURL(url);

    mostrarNotificacion('Plantilla descargada');
}

/* PEGAR LISTA EN MASA (MODAL) */

function conectarModalPegarLista() {
    const btnAbrir = document.getElementById('btn-pegar-lista');
    const modal = document.getElementById('modal-pegar-lista');
    const textarea = document.getElementById('pegar-lista-textarea');
    const contador = document.getElementById('pegar-lista-contador');
    const btnConfirmar = document.getElementById('btn-confirmar-pegar-lista');

    if (!modal || !textarea || !contador || !btnConfirmar) return;

    btnAbrir?.addEventListener('click', () => {
        textarea.value = '';
        actualizarContadorPegarLista(0);
        btnConfirmar.disabled = true;

        modal.classList.remove('hidden');
        setTimeout(() => textarea.focus(), 100);
    });

    modal.querySelectorAll('[data-cerrar-modal]').forEach(b => {
        b.addEventListener('click', () => cerrarModalPegarLista());
    });

    modal.addEventListener('click', (e) => {
        if (e.target === modal) cerrarModalPegarLista();
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !modal.classList.contains('hidden')) {
            cerrarModalPegarLista();
        }
    });

    textarea.addEventListener('input', () => {
        const cantidad = contarNombresPegados(textarea.value);
        actualizarContadorPegarLista(cantidad);
        btnConfirmar.disabled = cantidad === 0;
    });

    btnConfirmar.addEventListener('click', () => {
        const nombres = extraerNombresDeLista(textarea.value);
        if (nombres.length === 0) {
            mostrarNotificacion('No hay nombres válidos', 'error');
            return;
        }
        importarNombresEnMasa(nombres);
        cerrarModalPegarLista();
    });
}

function cerrarModalPegarLista() {
    document.getElementById('modal-pegar-lista')?.classList.add('hidden');
}

function contarNombresPegados(texto) {
    return extraerNombresDeLista(texto).length;
}

function extraerNombresDeLista(texto) {
    return texto
        .split(/\r?\n/)
        .map(l => l.trim())
        .filter(l => l.length > 1)
        .map(l => limpiarNombre(l));
}

function actualizarContadorPegarLista(cantidad) {
    const el = document.getElementById('pegar-lista-contador');
    if (!el) return;

    el.textContent = cantidad === 1
        ? '1 estudiante detectado'
        : `${cantidad} estudiantes detectados`;
}

function importarNombresEnMasa(nombres) {
    const { agregados, duplicados } = importarNombres(nombres);

    renderizarTabla();
    actualizarCodigoPreview();

    if (agregados > 0) {
        let msg = `${agregados} estudiante${agregados !== 1 ? 's' : ''} agregado${agregados !== 1 ? 's' : ''}`;
        if (duplicados > 0) {
            msg += ` (${duplicados} duplicado${duplicados !== 1 ? 's' : ''} omitido${duplicados !== 1 ? 's' : ''})`;
        }
        mostrarNotificacion(msg);
    } else {
        mostrarNotificacion('Todos los nombres ya estaban registrados', 'error');
    }
}