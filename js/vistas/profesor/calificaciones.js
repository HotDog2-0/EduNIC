/* Lógica del módulo de Calificaciones (profesor) */

import { bd, CLAVES } from '../../storage.js';
import {
    mostrarNotificacion,
    escaparHTML,
    normalizar
} from '../../utils.js';
import { mostrarVista } from '../../navegacion.js';

/* ESTADO INTERNO */

let idAnioActivo = null;
let evaluacionesCarrera = [];
let modulosCarrera = [];
let estudiantesCarrera = [];

let filtroActual = 'todas';  

let evaluacionActiva = null;      
let estudianteCalificando = null; 

/* PUNTO DE ENTRADA */

export function inicializarCalificaciones() {
    console.log('Módulo Calificaciones: iniciando');

    conectarFiltros();
    conectarBotonVolver();
    conectarModalCalificar();

    console.log('Módulo Calificaciones: listo');
}

/**
 * Carga las calificaciones de un año específico.
 * @param {string} idAnio
 */
export function cargarCalificacionesDeAnio(idAnio) {
    idAnioActivo = idAnio;

    const todosTemas = bd.obtener(CLAVES.TEMAS) || [];
    modulosCarrera = todosTemas.filter(x => 
        x.tipo === 'modulo' && String(x.idAnio) === String(idAnio)
    );

    const todasEvals = bd.obtener(CLAVES.EVALUACIONES) || [];
    evaluacionesCarrera = todasEvals.filter(e => 
        String(e.idAnio) === String(idAnio)
    );

    const todosEsts = bd.obtener(CLAVES.ESTUDIANTES) || [];
    estudiantesCarrera = todosEsts; // Los estudiantes son de la carrera, no del año

    renderizarListaEvaluaciones();
}

/* RENDERIZADO DEL LISTADO */

function renderizarListaEvaluaciones() {
    const cont = document.getElementById('lista-calificaciones');
    if (!cont) return;

    // Filtrar evaluaciones
    const filtradas = filtrarEvaluaciones(evaluacionesCarrera, filtroActual);

    if (filtradas.length === 0) {
        const mensajes = {
            'todas': { titulo: 'No hay evaluaciones', texto: 'Aún no has creado evaluaciones para esta carrera.' },
            'pendientes': { titulo: 'Sin evaluaciones con pendientes', texto: '¡Todo está calificado!' },
            'sin-respuestas': { titulo: 'Sin evaluaciones sin respuestas', texto: 'Todas las evaluaciones tienen al menos una respuesta.' },
            'con-respuestas': { titulo: 'Sin evaluaciones con respuestas', texto: 'Ninguna evaluación ha sido respondida todavía.' }
        };
        const m = mensajes[filtroActual] || mensajes.todas;
        cont.innerHTML = `
            <div class="carreras-vacio">
                <i class="fa-solid fa-chart-bar"></i>
                <h3>${m.titulo}</h3>
                <p>${m.texto}</p>
            </div>
        `;
        return;
    }

    // Agrupar por módulo (solo mostrar módulos con evaluaciones filtradas)
    const modulosConEvals = modulosCarrera
        .map(m => ({
            ...m,
            evaluaciones: filtradas.filter(e => e.idModulo === m.id)
        }))
        .filter(m => m.evaluaciones.length > 0);

    if (modulosConEvals.length === 0) {
        cont.innerHTML = `
            <div class="carreras-vacio">
                <i class="fa-solid fa-chart-bar"></i>
                <h3>Sin resultados</h3>
                <p>Prueba con otro filtro.</p>
            </div>
        `;
        return;
    }

    cont.innerHTML = modulosConEvals.map(m => renderizarModuloConEvals(m)).join('');
    cont.onclick = manejarClicLista;
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
                ${m.evaluaciones.map(e => renderizarEvalItem(e)).join('')}
            </div>
        </div>
    `;
}

function renderizarEvalItem(ev) {
    const stats = calcularStatsEvaluacion(ev.id);
    const tienePendientes = stats.pendientes > 0;
    const sinRespuestas = stats.totalRespondieron === 0;

    let clasesExtra = '';
    if (tienePendientes) clasesExtra += ' tiene-pendientes';
    if (sinRespuestas) clasesExtra += ' sin-respuestas';

    // Clase del promedio
    let clasePromedio = '';
    if (stats.contCalificadas > 0 && stats.promedioTotal > 0) {
        // Comparar proporcionalmente: (promedioPuntos / promedioTotal) vs (minimo / total)
        const proporcion = stats.promedioPuntos / stats.promedioTotal;
        const proporcionMinimo = ev.puntajeMinimo / stats.promedioTotal;
        
        if (proporcion < proporcionMinimo) clasePromedio = 'bajo';
        else if (proporcion >= 0.8) clasePromedio = 'alto';
    }

    return `
        <div class="calif-evaluacion-item${clasesExtra}">
            <div class="calif-evaluacion-icono">
                <i class="fa-solid fa-file-pen"></i>
            </div>

            <div class="calif-evaluacion-info">
                <p class="calif-evaluacion-titulo">${escaparHTML(ev.titulo)}</p>
                <div class="calif-evaluacion-meta">
                    <span>
                        <i class="fa-solid fa-users"></i>
                        ${stats.totalRespondieron} / ${estudiantesCarrera.length} respondieron
                    </span>
                    ${stats.contCalificadas > 0 ? `
                        <span>
                            <i class="fa-solid fa-star"></i>
                            Promedio: <strong class="calif-promedio ${clasePromedio}">${stats.promedioPuntos}/${stats.promedioTotal}</strong>
                        </span>
                    ` : ''}
                    ${tienePendientes ? `
                        <span class="alerta">
                            <i class="fa-solid fa-clock"></i>
                            ${stats.pendientes} por calificar
                        </span>
                    ` : ''}
                </div>
            </div>

            <div class="calif-evaluacion-accion">
                ${sinRespuestas
                    ? `<button class="btn btn-secondary" type="button" disabled>
                        <i class="fa-solid fa-inbox"></i> Sin respuestas
                       </button>`
                    : `<button class="btn btn-primary" type="button"
                            data-accion="ver-respuestas" data-id="${ev.id}">
                        <i class="fa-solid fa-eye"></i> Ver respuestas
                       </button>`
                }
            </div>
        </div>
    `;
}

/* ESTADÍSTICAS */

function calcularStatsEvaluacion(idEvaluacion) {
    const resultados = bd.obtener(CLAVES.RESULTADOS) || [];
    const deEsta = resultados.filter(r => 
        String(r.idEvaluacion) === String(idEvaluacion) &&
        String(r.idAnio) === String(idAnioActivo)
    );

    const totalRespondieron = deEsta.length;
    let pendientes = 0;
    let aprobados = 0;
    let reprobados = 0;
    let sumaPuntos = 0;
    let sumaTotales = 0;
    let contCalificadas = 0;

    deEsta.forEach(r => {
        if (r.estado === 'pendiente') {
            pendientes++;
        } else {
            const puntos = typeof r.puntosObtenidos === 'number' ? r.puntosObtenidos : 0;
            const total = typeof r.puntosTotal === 'number' ? r.puntosTotal : 0;

            sumaPuntos += puntos;
            sumaTotales += total;
            contCalificadas++;

            if (r.aprobado) aprobados++;
            else reprobados++;
        }
    });

    // Promedio en puntos (proporcional)
    let promedioPuntos = 0;
    let promedioTotal = 0;
    if (contCalificadas > 0) {
        promedioPuntos = Math.round(sumaPuntos / contCalificadas);
        promedioTotal = Math.round(sumaTotales / contCalificadas);
    }

    return { 
        totalRespondieron, 
        pendientes, 
        aprobados, 
        reprobados, 
        promedioPuntos,
        promedioTotal,
        contCalificadas
    };
}

/* FILTROS */

function filtrarEvaluaciones(evaluaciones, filtro) {
    if (filtro === 'todas') return evaluaciones;

    return evaluaciones.filter(ev => {
        const stats = calcularStatsEvaluacion(ev.id);

        if (filtro === 'pendientes') return stats.pendientes > 0;
        if (filtro === 'sin-respuestas') return stats.totalRespondieron === 0;
        if (filtro === 'con-respuestas') return stats.totalRespondieron > 0;

        return true;
    });
}

function conectarFiltros() {
    const cont = document.getElementById('calificaciones-filtros');
    if (!cont) return;

    cont.addEventListener('click', (e) => {
        const btn = e.target.closest('.filtro-btn');
        if (!btn) return;

        cont.querySelectorAll('.filtro-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        filtroActual = btn.dataset.filtro;
        renderizarListaEvaluaciones();
    });
}

/* MANEJO DE CLICS */

function manejarClicLista(e) {
    const btn = e.target.closest('[data-accion]');
    if (!btn) return;

    const accion = btn.dataset.accion;
    const id = btn.dataset.id;

    if (accion === 'toggle') {
        const item = document.querySelector(`#lista-calificaciones .modulo-item[data-id="${id}"]`);
        if (item) item.classList.toggle('expandido');
        return;
    }

    if (accion === 'ver-respuestas') {
        abrirVistaEvaluacion(id);
    }
}

/* VISTA DEDICADA: RESPUESTAS DE UNA EVALUACIÓN */

function abrirVistaEvaluacion(idEvaluacion) {
    evaluacionActiva = evaluacionesCarrera.find(e => String(e.id) === String(idEvaluacion));
    if (!evaluacionActiva) {
        mostrarNotificacion('Evaluación no encontrada', 'error');
        return;
    }

    // Buscar el módulo
    const modulo = modulosCarrera.find(m => m.id === evaluacionActiva.idModulo);

    // Rellenar cabecera
    document.getElementById('calif-eval-codigo').textContent = 'Evaluación';
    document.getElementById('calif-eval-titulo').textContent = evaluacionActiva.titulo;
    document.getElementById('calif-eval-modulo').innerHTML =
        `<i class="fa-solid fa-folder"></i> ${escaparHTML(modulo?.nombre || 'Sin módulo')}`;

    // Renderizar resumen y tabla
    renderizarResumenEvaluacion();
    renderizarTablaRespuestas();

    // Navegar
    mostrarVista('view-calificaciones-evaluacion');
}

function renderizarResumenEvaluacion() {
    const stats = calcularStatsEvaluacion(evaluacionActiva.id);
    document.getElementById('stat-total').textContent = stats.totalRespondieron;
    document.getElementById('stat-promedio').textContent = stats.promedioPuntos > 0 
        ? `${stats.promedioPuntos}/${stats.promedioTotal}` 
        : '—';
    document.getElementById('stat-aprobadas').textContent = stats.aprobados;
    document.getElementById('stat-reprobadas').textContent = stats.reprobados;
}

function renderizarTablaRespuestas() {
    const tbody = document.getElementById('tbody-calificaciones-eval');
    if (!tbody || !evaluacionActiva) return;

    const resultados = bd.obtener(CLAVES.RESULTADOS) || [];
    const deEsta = resultados.filter(r =>
        String(r.idEvaluacion) === String(evaluacionActiva.id)
    );

    // Contador
    const contador = document.getElementById('calif-contador');
    if (contador) {
        contador.textContent = `${deEsta.length} ${deEsta.length === 1 ? 'respuesta' : 'respuestas'}`;
    }

    if (deEsta.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="tabla-vacia">
                    <i class="fa-solid fa-inbox"></i>
                    <p>Nadie ha respondido esta evaluación todavía.</p>
                </td>
            </tr>
        `;
        return;
    }

    // Ordenar por nombre de estudiante
    deEsta.sort((a, b) => {
        const estA = estudiantesCarrera.find(e => String(e.id) === String(a.idEstudiante));
        const estB = estudiantesCarrera.find(e => String(e.id) === String(b.idEstudiante));
        return (estA?.nombre || '').localeCompare(estB?.nombre || '');
    });

    tbody.innerHTML = deEsta.map((r, i) => renderizarFilaRespuesta(r, i)).join('');

    // Delegación para botón calificar
    tbody.onclick = manejarClicTabla;
}

function renderizarFilaRespuesta(r, indice) {
    const est = estudiantesCarrera.find(e => String(e.id) === String(r.idEstudiante));
    if (!est) return '';

    // Determinar estado
    let estadoClase, estadoTexto, notaClase, notaTexto;

    if (r.estado === 'pendiente') {
        estadoClase = 'pendiente';
        estadoTexto = 'Pendiente';
        notaClase = 'pendiente';
        notaTexto = '—';
    } else {
        const aprobado = r.aprobado;
        estadoClase = aprobado ? 'aprobado' : 'reprobado';
        estadoTexto = aprobado ? 'Aprobado' : 'Reprobado';
        notaClase = aprobado ? 'aprobado' : 'reprobado';
        notaTexto = `${r.puntosObtenidos}/${r.puntosTotal}`;
    }
    const puedeCalificar = r.estado === 'pendiente';

    return `
        <tr>
            <td>${indice + 1}</td>
            <td>${escaparHTML(est.nombre)}</td>
            <td><strong>${escaparHTML(est.codigo)}</strong></td>
            <td class="nota-celda ${notaClase}">${notaTexto}</td>
            <td><span class="estado-badge ${estadoClase}">${estadoTexto}</span></td>
            <td class="text-center">
                ${puedeCalificar
                    ? `<button class="btn btn-sm btn-primary" type="button"
                            data-accion="calificar" data-id="${r.id}" title="Calificar respuestas pendientes">
                        <i class="fa-solid fa-pen-to-square"></i> Calificar
                       </button>`
                    : `<button class="btn btn-sm btn-secondary" type="button"
                            data-accion="recalificar" data-id="${r.id}" title="Editar calificación">
                        <i class="fa-solid fa-rotate-right"></i> Revisar
                       </button>`
                }
            </td>
        </tr>
    `;
}

/* VOLVER */

function conectarBotonVolver() {
    document.getElementById('btn-volver-calificaciones')
        ?.addEventListener('click', () => {
            evaluacionActiva = null;
            renderizarListaEvaluaciones();
            mostrarVista('view-panel-carrera');
            // Volver a la pestaña de calificaciones
            activarTabCalificaciones();
        });
}

function activarTabCalificaciones() {
    const nav = document.querySelector('#view-panel-carrera .tabs-nav');
    if (!nav) return;

    const btn = nav.querySelector('[data-tab="tab-calificaciones"]');
    if (btn) btn.click();
}

/* MANEJO DE CLICS EN LA TABLA */

function manejarClicTabla(e) {
    const btn = e.target.closest('[data-accion]');
    if (!btn) return;

    const accion = btn.dataset.accion;
    const id = btn.dataset.id;

    if (accion === 'calificar' || accion === 'recalificar') {
        abrirModalCalificar(id);
    }
}

/* MODAL CALIFICAR */

function conectarModalCalificar() {
    const modal = document.getElementById('modal-calificar');
    if (!modal) return;

    modal.querySelectorAll('[data-cerrar-modal]').forEach(b => {
        b.addEventListener('click', cerrarModalCalificar);
    });

    modal.addEventListener('click', (e) => {
        if (e.target === modal) cerrarModalCalificar();
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !modal.classList.contains('hidden')) {
            cerrarModalCalificar();
        }
    });
}

function abrirModalCalificar(idResultado) {
    const resultados = bd.obtener(CLAVES.RESULTADOS) || [];
    const r = resultados.find(x => String(x.id) === String(idResultado));
    if (!r) return;

    estudianteCalificando = r;

    const est = estudiantesCarrera.find(e => String(e.id) === String(r.idEstudiante));
    document.getElementById('modal-calificar-nombre').textContent =
        `Calificando: ${est?.nombre || 'Estudiante'}`;

    renderizarPreguntasCalificar(r);

    document.getElementById('modal-calificar').classList.remove('hidden');
}

function cerrarModalCalificar() {
    document.getElementById('modal-calificar')?.classList.add('hidden');
    estudianteCalificando = null;

    // Refrescar vista si está activa
    if (evaluacionActiva) {
        renderizarResumenEvaluacion();
        renderizarTablaRespuestas();
    }
}

function renderizarPreguntasCalificar(r) {
    const cont = document.getElementById('calificar-preguntas-container');
    if (!cont) return;

    // Buscar las preguntas tipo "corta" que están pendientes
    const preguntasPendientes = (evaluacionActiva.preguntas || []).filter(p => {
        if (p.tipo !== 'corta') return false;
        const esperada = (p.respuestaEsperada || '').trim();
        return !esperada; // Solo las que NO tienen respuesta esperada
    });

    if (preguntasPendientes.length === 0) {
        cont.innerHTML = `
            <p class="text-muted text-center">No hay respuestas cortas pendientes.</p>
        `;
        return;
    }

    const calificaciones = r.calificacionesManuales || {};

    cont.innerHTML = preguntasPendientes.map((p, i) => {
        const respuestaEstudiante = r.respuestas?.[p.id] || '(sin respuesta)';
        const marcada = calificaciones[p.id];

        let claseMarcada = '';
        let textoMarcada = '';
        if (marcada === true) {
            claseMarcada = 'correcta';
            textoMarcada = '<span class="calificar-item-marcada correcta"><i class="fa-solid fa-check"></i> Correcta</span>';
        } else if (marcada === false) {
            claseMarcada = 'incorrecta';
            textoMarcada = '<span class="calificar-item-marcada incorrecta"><i class="fa-solid fa-xmark"></i> Incorrecta</span>';
        }

        return `
            <div class="calificar-item">
                <div class="calificar-item-pregunta">
                    <span class="calificar-item-pregunta-num">Pregunta ${i + 1}</span>
                    ${escaparHTML(p.texto)}
                    ${textoMarcada}
                </div>

                <div class="calificar-item-respuesta-label">Respuesta del estudiante:</div>
                <div class="calificar-item-respuesta">
                    ${escaparHTML(respuestaEstudiante)}
                </div>

                <div class="calificar-item-acciones">
                    <button class="calificar-btn correcta ${marcada === true ? 'seleccionada' : ''}"
                            type="button"
                            data-marcar="true"
                            data-pregunta-id="${p.id}">
                        <i class="fa-solid fa-check"></i> Correcta
                    </button>
                    <button class="calificar-btn incorrecta ${marcada === false ? 'seleccionada' : ''}"
                            type="button"
                            data-marcar="false"
                            data-pregunta-id="${p.id}">
                        <i class="fa-solid fa-xmark"></i> Incorrecta
                    </button>
                </div>
            </div>
        `;
    }).join('');

    // Conectar botones
    cont.querySelectorAll('[data-marcar]').forEach(btn => {
        btn.addEventListener('click', () => {
            const idPregunta = btn.dataset.preguntaId;
            const valor = btn.dataset.marcar === 'true';
            marcarRespuesta(idPregunta, valor);
        });
    });
}

function marcarRespuesta(idPregunta, valor) {
    if (!estudianteCalificando) return;

    // Guardar la calificación manual
    if (!estudianteCalificando.calificacionesManuales) {
        estudianteCalificando.calificacionesManuales = {};
    }
    estudianteCalificando.calificacionesManuales[idPregunta] = valor;

    // Recalcular puntaje
    recalcularResultado(estudianteCalificando);

    // Guardar en storage
    const resultados = bd.obtener(CLAVES.RESULTADOS) || [];
    const idx = resultados.findIndex(x => String(x.id) === String(estudianteCalificando.id));
    if (idx !== -1) {
        resultados[idx] = estudianteCalificando;
        bd.guardar(CLAVES.RESULTADOS, resultados);
    }

    // Re-renderizar el modal
    renderizarPreguntasCalificar(estudianteCalificando);
}

/* RECÁLCULO DEL PUNTAJE */

function recalcularResultado(r) {
    const ev = evaluacionActiva;
    if (!ev) return;

    let correctas = 0;
    let incorrectas = 0;
    let pendientes = 0;
    let puntosObtenidos = 0;
    let puntosTotal = 0;

    const calificaciones = r.calificacionesManuales || {};

    ev.preguntas.forEach(p => {
        const respuesta = r.respuestas?.[p.id];
        const puntos = typeof p.puntos === 'number' && p.puntos > 0 ? p.puntos : 10;

        puntosTotal += puntos;

        if (p.tipo === 'multiple') {
            if (respuesta === p.correcta) {
                correctas++;
                puntosObtenidos += puntos;
            } else {
                incorrectas++;
            }
        } else if (p.tipo === 'vf') {
            if (respuesta === p.correcta) {
                correctas++;
                puntosObtenidos += puntos;
            } else {
                incorrectas++;
            }
        } else if (p.tipo === 'corta') {
            const esperada = (p.respuestaEsperada || '').trim();

            if (esperada) {
                if (normalizar(String(respuesta)) === normalizar(esperada)) {
                    correctas++;
                    puntosObtenidos += puntos;
                } else {
                    incorrectas++;
                }
            } else {
                // Depende de calificación manual
                if (calificaciones[p.id] === true) {
                    correctas++;
                    puntosObtenidos += puntos;
                } else if (calificaciones[p.id] === false) {
                    incorrectas++;
                } else {
                    pendientes++;
                }
            }
        }
    });

    // Actualizar campos
    r.puntosObtenidos = puntosObtenidos;
    r.puntosTotal = puntosTotal;
    r.correctas = correctas;
    r.incorrectas = incorrectas;
    r.pendientes = pendientes;
    r.aprobado = puntosObtenidos >= ev.puntajeMinimo;
    r.estado = pendientes > 0 ? 'pendiente' : 'calificada';
}

window.cargarCalificacionesDeAnio = cargarCalificacionesDeAnio;