/* Panel del estudiante (login + ver temas)*/

import { bd, CLAVES } from '../../storage.js';
import {
    mostrarNotificacion,
    escaparHTML,
    normalizar,
    dataURLtoBlobURL,
    detectarVideo,
    abrirModalVideo
} from '../../utils.js';
import { mostrarVista } from '../../navegacion.js';
import { abrirQuiz, setEstudianteActual, inicializarQuiz } from './quiz.js';

/* ESTADO INTERNO */

let estudianteActual = null;   // { id, nombre, codigo, idCarrera }

/* PUNTO DE ENTRADA */

export function inicializarPanelEstudiante() {
    console.log('Panel Estudiante: iniciando');

    conectarLoginEstudiante();
    conectarLogoutEstudiante();
    conectarCambioDePestanaEstudiante();
    conectarFiltrosResultados();

    console.log('Panel Estudiante: listo');
}

/**
 * Recarga las evaluaciones cada vez que el estudiante cambia a esa pestaña.
 */
function conectarCambioDePestanaEstudiante() {
    const nav = document.querySelector('#view-panel-estudiante .tabs-nav');
    if (!nav) return;

    nav.addEventListener('click', (e) => {
        const btn = e.target.closest('.tab-btn');
        if (!btn) return;

        if (btn.dataset.tab === 'tab-est-evaluaciones') {
            cargarEvaluacionesDeCarrera();
        }
        if (btn.dataset.tab === 'tab-est-temas') {
            cargarTemasDeCarrera();
        }
         if (btn.dataset.tab === 'tab-est-resultados') {
            cargarResultadosEstudiante();
         }
    });
}

/* LOGIN */

function conectarLoginEstudiante() {
    const form = document.getElementById('form-login-estudiante');
    if (!form) return;

    form.addEventListener('submit', (e) => {
        e.preventDefault();

        const input = document.getElementById('student-code');
        const codigo = normalizar(input.value);

        if (!codigo) {
            mostrarNotificacion('Ingresa tu código único', 'error');
            return;
        }

        // Buscar al estudiante por código
        const estudiantes = bd.obtener(CLAVES.ESTUDIANTES) || [];
        const est = estudiantes.find(x => normalizar(x.codigo) === codigo);

        if (!est) {
            mostrarNotificacion('Código no válido. Verifica con tu docente.', 'error');
            return;
        }

        // Guardar sesión
        iniciarSesionEstudiante(est);
        form.reset();
    });
}

/**
 * Inicia sesión con un estudiante.
 * @param {Object} est - El estudiante (con idCarrera)
 */
function iniciarSesionEstudiante(est) {
    // Buscar la carrera para mostrarla en la cabecera
    const carreras = bd.obtener(CLAVES.CARRERAS) || [];
    const carrera = carreras.find(c => c.id === est.idCarrera);

    estudianteActual = {
        id: est.id,
        nombre: est.nombre,
        codigo: est.codigo,
        idCarrera: est.idCarrera,
        carrera: carrera || { nombre: 'Sin carrera', anio: '', codigo: '' }
    };

    // Guardar sesión en storage
    bd.guardar(CLAVES.USUARIO_ACTUAL, {
        id: est.id,
        nombre: est.nombre,
        codigo: est.codigo,
        idCarrera: est.idCarrera,
        rol: 'estudiante'
    });

    // Actualizar cabecera del sitio (el header de arriba)
    actualizarHeaderGlobal(est);

    // Rellenar la cabecera del panel
    rellenarCabeceraPanel();

    // Cargar temas de la carrera
    cargarTemasDeCarrera();
    cargarEvaluacionesDeCarrera();

    // Navegar al panel
    mostrarVista('view-panel-estudiante');
    mostrarNotificacion(`¡Bienvenido, ${est.nombre}!`);
}

/**
 * Recupera la sesión activa si existe.
 * Se llama desde app.js al arrancar.
 */
export function recuperarSesionEstudiante() {
    const sesion = bd.obtener(CLAVES.USUARIO_ACTUAL);

    if (!sesion || sesion.rol !== 'estudiante') return false;

    // Verificar que el estudiante sigue existiendo
    const estudiantes = bd.obtener(CLAVES.ESTUDIANTES) || [];
    const est = estudiantes.find(x => x.id === sesion.id);

    if (!est) {
        // Estudiante eliminado → limpiar sesión
        bd.eliminar(CLAVES.USUARIO_ACTUAL);
        return false;
    }

    // Reconstruir sesión
    const carreras = bd.obtener(CLAVES.CARRERAS) || [];
    const carrera = carreras.find(c => c.id === est.idCarrera);

    estudianteActual = {
        id: est.id,
        nombre: est.nombre,
        codigo: est.codigo,
        idCarrera: est.idCarrera,
        carrera: carrera || { nombre: 'Sin carrera', anio: '', codigo: '' }
    };

    actualizarHeaderGlobal(est);
    rellenarCabeceraPanel();
    cargarTemasDeCarrera();
    cargarEvaluacionesDeCarrera();
    cargarResultadosEstudiante(); 
    cargarResultadosEstudiante(); 

    setEstudianteActual(estudianteActual);

    mostrarVista('view-panel-estudiante');
    return true;
}

/* LOGOUT */

function conectarLogoutEstudiante() {
    const btn = document.getElementById('btn-logout');
    if (!btn) return;

    btn.addEventListener('click', () => {
        estudianteActual = null;
    });
}

/* HEADER GLOBAL */

function actualizarHeaderGlobal(est) {
    const infoSesion = document.getElementById('session-info');
    const etiquetaUsuario = document.getElementById('user-display');
    if (!infoSesion || !etiquetaUsuario) return;

    infoSesion.classList.remove('hidden');
    etiquetaUsuario.innerHTML =
        `<i class="fa-solid fa-user-graduate"></i> ${escaparHTML(est.nombre)} <span class="text-muted">(Estudiante)</span>`;
}

/* CABECERA DEL PANEL */

function rellenarCabeceraPanel() {
    if (!estudianteActual) return;

    document.getElementById('estudiante-codigo').textContent = estudianteActual.codigo;
    document.getElementById('estudiante-nombre').textContent = estudianteActual.nombre;

    const carrera = estudianteActual.carrera;
    document.getElementById('estudiante-carrera').innerHTML =
        `<i class="fa-solid fa-graduation-cap"></i> ${escaparHTML(carrera.nombre)} — ${escaparHTML(carrera.anio)}`;
}

/* TEMAS */

function cargarTemasDeCarrera() {
    const cont = document.getElementById('est-lista-modulos');
    if (!cont || !estudianteActual) return;

    const todos = bd.obtener(CLAVES.TEMAS) || [];
    const modulos = todos.filter(x =>
        x.tipo === 'modulo' && x.idCarrera === estudianteActual.idCarrera
    );

    if (modulos.length === 0) {
        cont.innerHTML = `
            <div class="carreras-vacio">
                <i class="fa-solid fa-book-open"></i>
                <h3>Tu profesor aún no ha publicado temas</h3>
                <p>Vuelve más tarde para ver el material de estudio.</p>
            </div>
        `;
        return;
    }

    cont.innerHTML = modulos.map(m => renderizarModuloEstudiante(m)).join('');
    cont.onclick = manejarClicModulosEstudiante;
}

function renderizarModuloEstudiante(m) {
    const todos = bd.obtener(CLAVES.TEMAS) || [];
    const temas = todos.filter(x => x.tipo === 'tema' && x.idModulo === m.id);
    const cantidad = temas.length;

    return `
        <div class="modulo-item" data-id="${m.id}">
            <div class="modulo-header" data-accion="toggle" data-id="${m.id}">
                <i class="fa-solid fa-chevron-right modulo-icono-flecha"></i>
                <i class="fa-solid fa-folder modulo-icono-carpeta"></i>
                <h4 class="modulo-nombre">${escaparHTML(m.nombre)}</h4>
                <span class="modulo-contador">${cantidad} ${cantidad === 1 ? 'tema' : 'temas'}</span>
            </div>
            <div class="modulo-body">
                ${temas.length === 0
                    ? `<div class="modulo-vacio">
                        <i class="fa-solid fa-book"></i>
                        Este módulo aún no tiene temas publicados.
                       </div>`
                    : temas.map(t => renderizarTemaEstudiante(t)).join('')
                }
            </div>
        </div>
    `;
}

function renderizarTemaEstudiante(t) {
    const recursos = (t.material || []).filter(r => r && r.id);
    const cantidadRecursos = recursos.length;

    return `
        <div class="tema-card">
            <div class="tema-card-header">
                <h5 class="tema-card-titulo">
                    <i class="fa-solid fa-book-open"></i>
                    ${escaparHTML(t.titulo)}
                </h5>
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
                        ${recursos.map(r => renderizarRecursoChipEstudiante(r)).join('')}
                    </div>
                </div>
            ` : ''}
        </div>
    `;
}

function renderizarRecursoChipEstudiante(r) {
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

function manejarClicModulosEstudiante(e) {
    const btn = e.target.closest('[data-accion]');
    if (!btn) return;

    const accion = btn.dataset.accion;
    const id = btn.dataset.id;

    if (accion === 'toggle') {
        const item = document.querySelector(`#est-lista-modulos .modulo-item[data-id="${id}"]`);
        if (item) item.classList.toggle('expandido');
    }
}

/* EVALUACIONES DISPONIBLES */

/**
 * Carga y renderiza las evaluaciones de la carrera del estudiante.
 */
export function cargarEvaluacionesDeCarrera() {
    const cont = document.getElementById('est-lista-evaluaciones');
    if (!cont || !estudianteActual) return;

    const todosTemas = bd.obtener(CLAVES.TEMAS) || [];
    const modulos = todosTemas.filter(x =>
        x.tipo === 'modulo' && x.idCarrera === estudianteActual.idCarrera
    );

    const todasEvals = bd.obtener(CLAVES.EVALUACIONES) || [];
    const evaluaciones = todasEvals.filter(e => e.idCarrera === estudianteActual.idCarrera);

    if (modulos.length === 0 || evaluaciones.length === 0) {
        cont.innerHTML = `
            <div class="carreras-vacio">
                <i class="fa-solid fa-file-pen"></i>
                <h3>No hay evaluaciones disponibles</h3>
                <p>Tu profesor aún no ha publicado evaluaciones. Vuelve más tarde.</p>
            </div>
        `;
        return;
    }

    // Agrupar por módulo (solo mostrar módulos con evaluaciones)
    const modulosConEvals = modulos
        .map(m => ({
            ...m,
            evaluaciones: evaluaciones.filter(e => e.idModulo === m.id)
        }))
        .filter(m => m.evaluaciones.length > 0);

    if (modulosConEvals.length === 0) {
        cont.innerHTML = `
            <div class="carreras-vacio">
                <i class="fa-solid fa-file-pen"></i>
                <h3>No hay evaluaciones disponibles</h3>
                <p>Tu profesor aún no ha publicado evaluaciones. Vuelve más tarde.</p>
            </div>
        `;
        return;
    }

    cont.innerHTML = modulosConEvals.map(m => renderizarModuloConEvals(m)).join('');
    cont.onclick = manejarClicEvalsEstudiante;
}

function renderizarModuloConEvals(m) {
    const cantidad = m.evaluaciones.length;

    return `
        <div class="modulo-item" data-id="${m.id}">
            <div class="modulo-header" data-accion="toggle" data-id="${m.id}">
                <i class="fa-solid fa-chevron-right modulo-icono-flecha"></i>
                <i class="fa-solid fa-folder modulo-icono-carpeta"></i>
                <h4 class="modulo-nombre">${escaparHTML(m.nombre)}</h4>
                <span class="modulo-contador">${cantidad} ${cantidad === 1 ? 'evaluación' : 'evaluaciones'}</span>
            </div>
            <div class="modulo-body">
                ${m.evaluaciones.map(e => renderizarEvaluacionEstudiante(e)).join('')}
            </div>
        </div>
    `;
}

function renderizarEvaluacionEstudiante(ev) {
    const usuario = bd.obtener(CLAVES.USUARIO_ACTUAL);
    if (!usuario) return '';

    const resultados = bd.obtener(CLAVES.RESULTADOS) || [];
    const miResultado = resultados.find(r =>
        String(r.idEvaluacion) === String(ev.id) &&
        String(r.idEstudiante) === String(usuario.id)
    );

    const yaRespondida = !!miResultado;
    const totalPreguntas = (ev.preguntas || []).length;

    // Determinar el estado
    let contenidoDerecho = '';

    if (yaRespondida) {
        // Ya respondida: mostrar nota o estado pendiente
        const estaCalificada = miResultado.estado === 'calificada';
        const estaPendiente = miResultado.estado === 'pendiente';

        if (estaCalificada) {
            const aprobado = miResultado.puntaje >= ev.puntajeMinimo;
            contenidoDerecho = `
                <div class="evaluacion-estudiante-resultado">
                    <div class="evaluacion-nota ${aprobado ? 'aprobado' : 'reprobado'}">
                        ${miResultado.puntaje}%
                    </div>
                    <div class="evaluacion-estado-texto">
                        ${aprobado ? 'Aprobado' : 'Reprobado'}
                    </div>
                </div>
            `;
        } else if (estaPendiente) {
            contenidoDerecho = `
                <div class="evaluacion-estudiante-resultado">
                    <div class="evaluacion-nota pendiente">
                        <i class="fa-solid fa-clock"></i> Pendiente
                    </div>
                    <div class="evaluacion-estado-texto">
                        Esperando calificación
                    </div>
                </div>
            `;
        }
    } else {
        // No respondida: botón de responder
        contenidoDerecho = `
            <div class="evaluacion-estudiante-accion">
                <button class="btn btn-primary" type="button"
                        data-accion="responder-evaluacion" data-id="${ev.id}">
                    <i class="fa-solid fa-pen-to-square"></i> Responder
                </button>
            </div>
        `;
    }

    return `
        <div class="evaluacion-estudiante ${yaRespondida ? 'respuesta' : ''}">
            <div class="evaluacion-estudiante-icono">
                <i class="fa-solid fa-file-pen"></i>
            </div>

            <div class="evaluacion-estudiante-info">
                <h5 class="evaluacion-estudiante-titulo">${escaparHTML(ev.titulo)}</h5>
                ${ev.descripcion ? `
                    <p class="evaluacion-estudiante-descripcion">${escaparHTML(ev.descripcion)}</p>
                ` : ''}
                <div class="evaluacion-estudiante-meta">
                    <span>
                        <i class="fa-solid fa-list-ol"></i>
                        ${totalPreguntas} ${totalPreguntas === 1 ? 'pregunta' : 'preguntas'}
                    </span>
                    <span>
                        <i class="fa-solid fa-check-circle"></i>
                        Mínimo: ${ev.puntajeMinimo}%
                    </span>
                </div>
            </div>

            ${contenidoDerecho}
        </div>
    `;
}

function manejarClicEvalsEstudiante(e) {
    const btn = e.target.closest('[data-accion]');
    if (!btn) return;

    const accion = btn.dataset.accion;
    const id = btn.dataset.id;

    if (accion === 'toggle') {
        const item = document.querySelector(`#est-lista-evaluaciones .modulo-item[data-id="${id}"]`);
        if (item) item.classList.toggle('expandido');
        return;
    }

    if (accion === 'responder-evaluacion') {
    const usuario = bd.obtener(CLAVES.USUARIO_ACTUAL);
    if (!usuario || usuario.rol !== 'estudiante') {
        mostrarNotificacion('Sesión no válida. Vuelve a iniciar sesión.', 'error');
        return;
    }

    const resultados = bd.obtener(CLAVES.RESULTADOS) || [];
    const yaRespondio = resultados.some(r =>
        String(r.idEvaluacion) === String(id) &&
        String(r.idEstudiante) === String(usuario.id)
    );

    if (yaRespondio) {
        mostrarNotificacion('Ya respondiste esta evaluación', 'error');
        cargarEvaluacionesDeCarrera();
        return;
    }

    abrirQuiz(id);
}}

/**
 * Refresca la lista de evaluaciones del estudiante.
 * Se llama desde quiz.js al cerrar la pantalla de resultado.
 */
window.refrescarEvaluacionesEstudiante = function() {
    cargarEvaluacionesDeCarrera();
    cargarResultadosEstudiante();
};

/* MIS RESULTADOS */

let filtroResultados = 'todas'; 

/**
 * Carga y renderiza los resultados del estudiante.
 */
export function cargarResultadosEstudiante() {
    const cont = document.getElementById('est-lista-resultados');
    if (!cont || !estudianteActual) return;

    // Cargar todos los resultados de este estudiante
    const todos = bd.obtener(CLAVES.RESULTADOS) || [];
    const misResultados = todos.filter(r => r.idEstudiante === estudianteActual.id);

    // Ordenar por fecha (más reciente primero)
    misResultados.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

    // Calcular resumen
    const resumen = calcularResumenResultados(misResultados);
    actualizarResumen(resumen);

    // Filtrar
    const filtrados = filtrarResultados(misResultados, filtroResultados);

    // Contador
    const contador = document.getElementById('contador-resultados');
    if (contador) {
        contador.textContent = `${filtrados.length} ${filtrados.length === 1 ? 'resultado' : 'resultados'}`;
    }

    // Render
    if (filtrados.length === 0) {
        cont.innerHTML = `
            <div class="resultados-vacio">
                <i class="fa-solid fa-chart-line"></i>
                <h3>Sin resultados ${filtroResultados !== 'todas' ? 'en este filtro' : ''}</h3>
                <p>${filtroResultados === 'todas'
                    ? 'Cuando respondas una evaluación, aquí verás tus calificaciones.'
                    : 'Prueba con otro filtro.'}</p>
            </div>
        `;
        return;
    }

    cont.innerHTML = filtrados.map(r => renderizarResultadoItem(r)).join('');
}

/**
 * Calcula el resumen.
 */
function calcularResumenResultados(resultados) {
    const total = resultados.length;
    let aprobadas = 0;
    let reprobadas = 0;
    let pendientes = 0;
    let sumaCalificadas = 0;
    let contCalificadas = 0;

    resultados.forEach(r => {
        if (r.estado === 'pendiente') {
            pendientes++;
        } else {
            // Calificada
            const aprobado = r.puntaje >= r.puntajeMinimo;
            if (aprobado) aprobadas++;
            else reprobadas++;
            sumaCalificadas += r.puntaje;
            contCalificadas++;
        }
    });

    const promedio = contCalificadas > 0
        ? Math.round(sumaCalificadas / contCalificadas)
        : 0;

    return { total, aprobadas, reprobadas, pendientes, promedio };
}

function actualizarResumen(r) {
    document.getElementById('stat-total').textContent = r.total;
    document.getElementById('stat-aprobadas').textContent = r.aprobadas;
    document.getElementById('stat-reprobadas').textContent = r.reprobadas;
    document.getElementById('stat-promedio').textContent = `${r.promedio}%`;
}

/**
 * Filtra resultados según el filtro activo.
 */
function filtrarResultados(resultados, filtro) {
    if (filtro === 'todas') return resultados;

    if (filtro === 'pendientes') {
        return resultados.filter(r => r.estado === 'pendiente');
    }

    if (filtro === 'aprobadas') {
        return resultados.filter(r =>
            r.estado !== 'pendiente' && r.puntaje >= r.puntajeMinimo
        );
    }

    if (filtro === 'reprobadas') {
        return resultados.filter(r =>
            r.estado !== 'pendiente' && r.puntaje < r.puntajeMinimo
        );
    }

    return resultados;
}

/**
 * Renderiza un item de resultado.
 */
function renderizarResultadoItem(r) {
    // Determinar estado visual
    let estadoVisual;
    if (r.estado === 'pendiente') {
        estadoVisual = 'pendiente';
    } else {
        estadoVisual = r.puntaje >= r.puntajeMinimo ? 'aprobado' : 'reprobado';
    }

    // Buscar el módulo para mostrarlo
    const todosTemas = bd.obtener(CLAVES.TEMAS) || [];
    const evals = bd.obtener(CLAVES.EVALUACIONES) || [];
    const evaluacion = evals.find(e => e.id === r.idEvaluacion);
    const modulo = evaluacion
        ? todosTemas.find(m => m.id === evaluacion.idModulo && m.tipo === 'modulo')
        : null;

    // Ícono según estado
    let icono;
    if (estadoVisual === 'aprobado') icono = 'fa-circle-check';
    else if (estadoVisual === 'reprobado') icono = 'fa-circle-xmark';
    else icono = 'fa-clock';

    // Etiqueta de estado
    let etiquetaEstado;
    if (estadoVisual === 'aprobado') etiquetaEstado = 'Aprobado';
    else if (estadoVisual === 'reprobado') etiquetaEstado = 'Reprobado';
    else etiquetaEstado = 'Pendiente';

    // Fecha formateada
    const fecha = new Date(r.fecha).toLocaleDateString('es-ES', {
        day: '2-digit', month: 'short', year: 'numeric'
    });

    return `
        <div class="resultado-item ${estadoVisual}">
            <div class="resultado-item-icono">
                <i class="fa-solid ${icono}"></i>
            </div>

            <div class="resultado-item-info">
                <p class="resultado-item-titulo">${escaparHTML(r.tituloEvaluacion)}</p>
                ${modulo ? `
                    <div class="resultado-item-modulo">
                        <i class="fa-solid fa-folder"></i>
                        ${escaparHTML(modulo.nombre)}
                    </div>
                ` : ''}
                <div class="resultado-item-meta">
                    <span>
                        <i class="fa-solid fa-calendar"></i>
                        ${fecha}
                    </span>
                    <span>
                        <i class="fa-solid fa-check"></i>
                        ${r.correctas}/${r.totalPreguntas} correctas
                    </span>
                    ${r.pendientes > 0 ? `
                        <span>
                            <i class="fa-solid fa-clock"></i>
                            ${r.pendientes} pendiente${r.pendientes > 1 ? 's' : ''}
                        </span>
                    ` : ''}
                </div>
            </div>

            <div class="resultado-item-nota">
                ${estadoVisual === 'pendiente'
                    ? `<div class="resultado-nota-valor pendiente">—</div>`
                    : `<div class="resultado-nota-valor ${estadoVisual}">${r.puntaje}%</div>`
                }
                <div class="resultado-nota-estado ${estadoVisual}">
                    ${etiquetaEstado}
                </div>
            </div>
        </div>
    `;
}

/**
 * Conecta los botones de filtro.
 */
function conectarFiltrosResultados() {
    const cont = document.getElementById('resultados-filtros');
    if (!cont) return;

    cont.addEventListener('click', (e) => {
        const btn = e.target.closest('.filtro-btn');
        if (!btn) return;

        // Cambiar filtro activo
        cont.querySelectorAll('.filtro-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        filtroResultados = btn.dataset.filtro;
        cargarResultadosEstudiante();
    });
}

/**
 * Resetea el estado del módulo (al cerrar sesión).
 * Se llama desde app.js en el logout.
 */
export function resetearPanelEstudiante() {
    estudianteActual = null;
    filtroResultados = 'todas';
}