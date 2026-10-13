/* Lógica del módulo de Estudiantes (por carrera) */

import { bd, CLAVES } from '../../storage.js';
import {
    mostrarNotificacion,
    generarId,
    escaparHTML,
    normalizar,
    limpiarNombre
} from '../../utils.js';

/* ESTADO INTERNO */

let estudiantes = [];             
let idCarreraActiva = null;       
let estudianteEditandoId = null;   

/* PUNTO DE ENTRADA */

export function inicializarEstudiantes() {
    console.log('Módulo Estudiantes: iniciando');

    conectarFormularioRegistro();
    conectarInputNombre();
    conectarSubidaArchivo();
    conectarModalEdicion();

    console.log('Módulo Estudiantes: listo');
}

/**
 * Carga los estudiantes de una carrera específica.
 * Se llama cuando se abre el panel de una carrera.
 * @param {string} idCarrera
 */
export function cargarEstudiantesDeCarrera(idCarrera) {
    idCarreraActiva = idCarrera;

    const todos = bd.obtener(CLAVES.ESTUDIANTES) || [];
    estudiantes = todos.filter(e => e.idCarrera === idCarrera);

    renderizarTabla();
    actualizarCodigoPreview();
}

/* GENERACIÓN DE CÓDIGO GLOBAL */

/**
 * Calcula el siguiente código único global.
 * Ejemplo: si existen EST-101, EST-102, EST-105 → devuelve EST-106.
 */
function calcularSiguienteCodigo() {
    const todos = bd.obtener(CLAVES.ESTUDIANTES) || [];

    if (todos.length === 0) return 'EST-101';

    const numeros = todos
        .map(e => parseInt((e.codigo || '').replace(/\D/g, ''), 10))
        .filter(n => !isNaN(n));

    if (numeros.length === 0) return 'EST-101';

    return `EST-${Math.max(...numeros) + 1}`;
}

function actualizarCodigoPreview() {
    const input = document.getElementById('new-student-codigo');
    if (!input) return;
    input.value = calcularSiguienteCodigo();
}

/* REGISTRO MANUAL */

function conectarFormularioRegistro() {
    const form = document.getElementById('form-registrar-estudiante');
    if (!form) return;

    form.addEventListener('submit', (e) => {
        e.preventDefault();

        // Verificar que haya carrera activa
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

        // Verificar duplicado por nombre EN LA MISMA CARRERA
        const existe = estudiantes.some(
            e => normalizar(e.nombre) === normalizar(nombre)
        );
        if (existe) {
            mostrarNotificacion('Ya existe un estudiante con ese nombre en esta carrera', 'error');
            return;
        }

        // Crear el nuevo estudiante
        const nuevo = {
            id: generarId(),
            nombre,
            codigo: calcularSiguienteCodigo(),
            idCarrera: idCarreraActiva
        };

        // Guardar en la lista global (no solo en la filtrada)
        const todos = bd.obtener(CLAVES.ESTUDIANTES) || [];
        todos.push(nuevo);
        bd.guardar(CLAVES.ESTUDIANTES, todos);

        // Actualizar lista local
        estudiantes.push(nuevo);
        renderizarTabla();
        actualizarCodigoPreview();

        // Limpiar formulario
        form.reset();

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

    // Delegación de eventos
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
    const est = estudiantes.find(e => e.id === id);
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

    // Verificar duplicado (excluyendo el mismo estudiante)
    const existe = estudiantes.some(
        e => e.id !== estudianteEditandoId &&
             normalizar(e.nombre) === normalizar(nombre)
    );
    if (existe) {
        mostrarNotificacion('Ya existe otro estudiante con ese nombre', 'error');
        return;
    }

    // Actualizar en la lista global
    const todos = bd.obtener(CLAVES.ESTUDIANTES) || [];
    const idx = todos.findIndex(e => e.id === estudianteEditandoId);
    if (idx === -1) return;

    todos[idx].nombre = nombre;
    bd.guardar(CLAVES.ESTUDIANTES, todos);

    // Actualizar lista local
    const est = estudiantes.find(e => e.id === estudianteEditandoId);
    if (est) est.nombre = nombre;

    renderizarTabla();
    cerrarModalEdicion();
    mostrarNotificacion('Estudiante actualizado');
}

/* ELIMINACIÓN */

function eliminarEstudiante(id) {
    const est = estudiantes.find(e => e.id === id);
    if (!est) return;

    const confirmar = window.confirm(
        `¿Eliminar a "${est.nombre}" (${est.codigo})?\n\nEsta acción no se puede deshacer.`
    );
    if (!confirmar) return;

    // Eliminar de la lista global
    const todos = bd.obtener(CLAVES.ESTUDIANTES) || [];
    bd.guardar(CLAVES.ESTUDIANTES, todos.filter(e => e.id !== id));

    // Eliminar de la lista local
    estudiantes = estudiantes.filter(e => e.id !== id);

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

        // Refrescar
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

        // Saltar cabecera
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

    // Para calcular códigos consecutivos sin repetir, hacemos un seguimiento
    let siguienteNumero = (() => {
        if (todos.length === 0) return 101;
        const nums = todos
            .map(e => parseInt((e.codigo || '').replace(/\D/g, ''), 10))
            .filter(n => !isNaN(n));
        return nums.length === 0 ? 101 : Math.max(...nums) + 1;
    })();

    nombres.forEach(nombreCrudo => {
        const nombre = limpiarNombre(nombreCrudo);
        if (!nombre) return;

        // Verificar duplicado EN ESTA CARRERA
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
            codigo: `EST-${siguienteNumero}`,
            idCarrera: idCarreraActiva
        };
        siguienteNumero++;

        todos.push(nuevo);
        estudiantes.push(nuevo);
        agregados++;
    });

    bd.guardar(CLAVES.ESTUDIANTES, todos);

    return { agregados, duplicados };
}