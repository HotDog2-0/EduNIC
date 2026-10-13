/* Lógica para responder evaluaciones */

import { bd, CLAVES } from '../../storage.js';
import {
    mostrarNotificacion,
    generarId,
    escaparHTML,
    normalizar
} from '../../utils.js';

/* CONSTANTES */

const PREGUNTAS_POR_PAGINA = 3;

/* ESTADO INTERNO */

let evaluacionActiva = null;      
let respuestas = {};              
let paginaActual = 0;            
let totalPaginas = 0;
let estudianteActual = null;

/* PUNTO DE ENTRADA */

export function inicializarQuiz() {
    console.log('📝 Quiz: inicializando...');

    document.getElementById('btn-quiz-anterior')
        ?.addEventListener('click', irPaginaAnterior);
    document.getElementById('btn-quiz-siguiente')
        ?.addEventListener('click', irPaginaSiguiente);
    document.getElementById('btn-quiz-enviar')
        ?.addEventListener('click', enviarRespuestas);

    // Cerrar con ESC: confirmar si hay respuestas
    document.addEventListener('keydown', (e) => {
        const modal = document.getElementById('modal-quiz');
        if (!modal || modal.classList.contains('hidden')) return;
        if (e.key === 'Escape') {
            confirmarCerrarQuiz();
        }
    });

    // Botón de cerrar (X)
    document.getElementById('btn-cerrar-quiz')
        ?.addEventListener('click', confirmarCerrarQuiz);

    console.log('✅ Quiz: listo');
}

/**
 * Actualiza el estudiante actual (se llama desde panelEstudiante.js).
 */
export function setEstudianteActual(est) {
    estudianteActual = est;
}

/* ABRIR QUIZ */

/**
 * Abre el modal del quiz para responder una evaluación.
 * @param {string} idEvaluacion
 */
export function abrirQuiz(idEvaluacion) {
    // Leer siempre del storage (más confiable)
    const usuario = bd.obtener(CLAVES.USUARIO_ACTUAL);

    if (!usuario || usuario.rol !== 'estudiante') {
        mostrarNotificacion('No hay sesión activa. Vuelve a iniciar sesión.', 'error');
        return;
    }

    // Sincronizar la variable local
    estudianteActual = usuario;

    // Buscar la evaluación con comparación flexible de tipos
    const todas = bd.obtener(CLAVES.EVALUACIONES) || [];
    evaluacionActiva = todas.find(e => String(e.id) === String(idEvaluacion));

    if (!evaluacionActiva) {
        console.error('❌ Evaluación no encontrada. id recibido:', idEvaluacion);
        console.error('IDs disponibles:', todas.map(e => e.id));
        mostrarNotificacion('Evaluación no encontrada', 'error');
        return;
    }

    if (!evaluacionActiva.preguntas || evaluacionActiva.preguntas.length === 0) {
        mostrarNotificacion('Esta evaluación no tiene preguntas', 'error');
        return;
    }

    // Reiniciar estado
    respuestas = {};
    paginaActual = 0;
    totalPaginas = Math.ceil(evaluacionActiva.preguntas.length / PREGUNTAS_POR_PAGINA);

    // Título del modal
    document.getElementById('modal-quiz-nombre').textContent = evaluacionActiva.titulo;
    document.getElementById('quiz-num-total').textContent = evaluacionActiva.preguntas.length;

    // Renderizar la primera página
    renderizarPagina();

    // Mostrar modal
    document.getElementById('modal-quiz').classList.remove('hidden');
}

/* RENDERIZADO DE PÁGINA */

function renderizarPagina() {
    const cont = document.getElementById('quiz-preguntas-container');
    if (!cont) return;

    const inicio = paginaActual * PREGUNTAS_POR_PAGINA;
    const fin = Math.min(inicio + PREGUNTAS_POR_PAGINA, evaluacionActiva.preguntas.length);
    const preguntasPagina = evaluacionActiva.preguntas.slice(inicio, fin);

    cont.innerHTML = preguntasPagina.map((p, i) =>
        renderizarPreguntaQuiz(p, inicio + i)
    ).join('');

    // Actualizar progreso
    actualizarProgreso(inicio + 1, fin);

    // Actualizar botones
    actualizarBotonesNavegacion();

    // Conectar eventos de las respuestas
    conectarEventosPreguntas();
}

function renderizarPreguntaQuiz(p, indexGlobal) {
    const tipoLabels = {
        multiple: { texto: 'Selección múltiple', clase: 'tipo-multiple' },
        vf:       { texto: 'Verdadero / Falso',  clase: 'tipo-vf' },
        corta:    { texto: 'Respuesta corta',    clase: 'tipo-corta' }
    };

    const tipoInfo = tipoLabels[p.tipo] || tipoLabels.multiple;
    let opcionesHTML = '';

    if (p.tipo === 'multiple') {
        opcionesHTML = `
            <div class="quiz-opciones-multiple">
                ${p.opciones.map((o, optIdx) => `
                    <label class="quiz-opcion-multiple ${respuestas[p.id] === optIdx ? 'seleccionada' : ''}">
                        <input type="radio" 
                               name="quiz-${p.id}" 
                               value="${optIdx}"
                               ${respuestas[p.id] === optIdx ? 'checked' : ''}
                               data-pregunta-id="${p.id}">
                        <span class="quiz-opcion-letra">${String.fromCharCode(65 + optIdx)}</span>
                        <span class="quiz-opcion-texto">${escaparHTML(o.texto)}</span>
                    </label>
                `).join('')}
            </div>
        `;
    } else if (p.tipo === 'vf') {
        opcionesHTML = `
            <div class="quiz-opciones-vf">
                <label class="quiz-opcion-vf">
                    <input type="radio" name="quiz-${p.id}" value="true"
                           ${respuestas[p.id] === true ? 'checked' : ''}
                           data-pregunta-id="${p.id}" data-tipo-vf="true">
                    <span class="quiz-opcion-vf-contenido">
                        <i class="fa-solid fa-check"></i> Verdadero
                    </span>
                </label>
                <label class="quiz-opcion-vf">
                    <input type="radio" name="quiz-${p.id}" value="false"
                           ${respuestas[p.id] === false ? 'checked' : ''}
                           data-pregunta-id="${p.id}" data-tipo-vf="false">
                    <span class="quiz-opcion-vf-contenido">
                        <i class="fa-solid fa-xmark"></i> Falso
                    </span>
                </label>
            </div>
        `;
    } else if (p.tipo === 'corta') {
        opcionesHTML = `
            <div class="quiz-respuesta-corta">
                <input type="text"
                       placeholder="Escribe tu respuesta..."
                       value="${escaparHTML(respuestas[p.id] || '')}"
                       data-pregunta-id="${p.id}">
            </div>
        `;
    }

    return `
        <div class="quiz-pregunta">
            <div class="quiz-pregunta-header">
                <span class="quiz-pregunta-numero">Pregunta ${indexGlobal + 1}</span>
                <span class="quiz-pregunta-tipo ${tipoInfo.clase}">${tipoInfo.texto}</span>
            </div>
            <p class="quiz-pregunta-texto">${escaparHTML(p.texto)}</p>
            ${opcionesHTML}
        </div>
    `;
}

function actualizarProgreso(desde, hasta) {
    document.getElementById('quiz-num-actual').textContent = desde;

    const porcentaje = Math.round((hasta / evaluacionActiva.preguntas.length) * 100);
    document.getElementById('quiz-progreso-porcentaje').textContent = `${porcentaje}%`;
    document.getElementById('quiz-progreso-relleno').style.width = `${porcentaje}%`;
}

function actualizarBotonesNavegacion() {
    const btnAnterior = document.getElementById('btn-quiz-anterior');
    const btnSiguiente = document.getElementById('btn-quiz-siguiente');
    const btnEnviar = document.getElementById('btn-quiz-enviar');

    // Anterior
    btnAnterior.disabled = paginaActual === 0;

    // Siguiente / Enviar
    const esUltimaPagina = paginaActual === totalPaginas - 1;

    if (esUltimaPagina) {
        btnSiguiente.classList.add('hidden');
        btnEnviar.classList.remove('hidden');
    } else {
        btnSiguiente.classList.remove('hidden');
        btnEnviar.classList.add('hidden');
    }
}

/* NAVEGACIÓN */

function irPaginaAnterior() {
    if (paginaActual > 0) {
        paginaActual--;
        renderizarPagina();
        scrollArriba();
    }
}

function irPaginaSiguiente() {
    if (paginaActual < totalPaginas - 1) {
        paginaActual++;
        renderizarPagina();
        scrollArriba();
    }
}

function scrollArriba() {
    const modal = document.querySelector('#modal-quiz .modal-body');
    if (modal) modal.scrollTop = 0;
}

/* CONECTAR EVENTOS */

function conectarEventosPreguntas() {
    const cont = document.getElementById('quiz-preguntas-container');
    if (!cont) return;

    // Radios (múltiple y V/F)
    cont.querySelectorAll('input[type="radio"]').forEach(radio => {
        radio.addEventListener('change', () => {
            const idPregunta = radio.dataset.preguntaId;

            if (radio.dataset.tipoVf === 'true') {
                respuestas[idPregunta] = true;
            } else if (radio.dataset.tipoVf === 'false') {
                respuestas[idPregunta] = false;
            } else {
                respuestas[idPregunta] = parseInt(radio.value, 10);
            }

            // Actualizar la apariencia de la opción
            if (radio.type === 'radio' && !radio.dataset.tipoVf) {
                const label = radio.closest('.quiz-opcion-multiple');
                if (label) {
                    const parent = label.parentElement;
                    parent.querySelectorAll('.quiz-opcion-multiple').forEach(l => l.classList.remove('seleccionada'));
                    label.classList.add('seleccionada');
                }
            }
        });
    });

    // Inputs de texto (respuesta corta)
    cont.querySelectorAll('input[type="text"]').forEach(input => {
        input.addEventListener('input', () => {
            const idPregunta = input.dataset.preguntaId;
            respuestas[idPregunta] = input.value;
        });
    });
}

/* ENVIAR RESPUESTAS */

function enviarRespuestas() {
    // Verificar que TODAS las preguntas estén respondidas
    const preguntasSinResponder = [];

    evaluacionActiva.preguntas.forEach((p, i) => {
        const r = respuestas[p.id];
        const vacia = r === undefined || r === null || r === '';

        if (vacia) {
            preguntasSinResponder.push(i + 1);
        }
    });

    if (preguntasSinResponder.length > 0) {
        mostrarNotificacion(
            `Faltan responder: pregunta${preguntasSinResponder.length > 1 ? 's' : ''} ${preguntasSinResponder.join(', ')}`,
            'error'
        );
        return;
    }

     const usuario = bd.obtener(CLAVES.USUARIO_ACTUAL);
    if (!usuario || usuario.rol !== 'estudiante') {
        mostrarNotificacion('Sesión expirada. Vuelve a iniciar sesión.', 'error');
        cerrarQuiz(true);
        return;
    }

    const resultados = bd.obtener(CLAVES.RESULTADOS) || [];
    const yaExiste = resultados.some(r =>
        String(r.idEvaluacion) === String(evaluacionActiva.id) &&
        String(r.idEstudiante) === String(usuario.id)
    );

    if (yaExiste) {
        mostrarNotificacion('Ya respondiste esta evaluación anteriormente', 'error');
        cerrarQuiz(true);
        if (typeof window.refrescarEvaluacionesEstudiante === 'function') {
            window.refrescarEvaluacionesEstudiante();
        }
        return;
    }

 const resultadosExistentes = bd.obtener(CLAVES.RESULTADOS) || [];
    const yaRespondio = resultadosExistentes.some(r =>
        String(r.idEvaluacion) === String(evaluacionActiva.id) &&
        String(r.idEstudiante) === String(estudianteActual.id)
    );

    if (yaRespondio) {
        mostrarNotificacion('Ya respondiste esta evaluación anteriormente', 'error');
        cerrarQuiz(true);
        if (typeof window.refrescarEvaluacionesEstudiante === 'function') {
            window.refrescarEvaluacionesEstudiante();
        }
        return;
    }

    // Confirmar
    const confirmar = window.confirm(
        '¿Enviar tus respuestas?\n\nUna vez enviadas, no podrás volver a responder esta evaluación.'
    );
    if (!confirmar) return;

    // Calificar
    const calificacion = calcularCalificacion(evaluacionActiva.preguntas, respuestas);

    // Guardar resultado
    const resultado = {
        id: generarId(),
        idEvaluacion: String(evaluacionActiva.id),
        idEstudiante: String(usuario.id),
        idCarrera: String(evaluacionActiva.idCarrera),
        tituloEvaluacion: evaluacionActiva.titulo,
        respuestas: { ...respuestas },
        puntaje: calificacion.puntaje,
        puntajeMinimo: evaluacionActiva.puntajeMinimo,
        correctas: calificacion.correctas,
        incorrectas: calificacion.incorrectas,
        pendientes: calificacion.pendientes,
        totalPreguntas: evaluacionActiva.preguntas.length,
        estado: calificacion.pendientes > 0 ? 'pendiente' : 'calificada',
        fecha: new Date().toISOString()
    };

    const todos = bd.obtener(CLAVES.RESULTADOS) || [];
    todos.push(resultado);
    bd.guardar(CLAVES.RESULTADOS, todos);

    // Mostrar pantalla de resultado
    mostrarResultado(calificacion);
}

/* CÁLCULO DE CALIFICACIÓN */

function calcularCalificacion(preguntas, respuestasUsuario) {
    let correctas = 0;
    let incorrectas = 0;
    let pendientes = 0;

    preguntas.forEach(p => {
        const r = respuestasUsuario[p.id];

        if (p.tipo === 'multiple') {
            if (r === p.correcta) correctas++;
            else incorrectas++;
        } else if (p.tipo === 'vf') {
            if (r === p.correcta) correctas++;
            else incorrectas++;
        } else if (p.tipo === 'corta') {
            const esperada = (p.respuestaEsperada || '').trim();
            if (!esperada) {
                // Sin respuesta esperada → pendiente
                pendientes++;
            } else {
                // Comparar normalizado
                if (normalizar(String(r)) === normalizar(esperada)) {
                    correctas++;
                } else {
                    incorrectas++;
                }
            }
        }
    });

    const totalCalificables = correctas + incorrectas;
    const puntaje = totalCalificables > 0
        ? Math.round((correctas / preguntas.length) * 100)
        : 0;

    return { correctas, incorrectas, pendientes, puntaje };
}

/* PANTALLA DE RESULTADO */

function mostrarResultado(calificacion) {
    const cont = document.getElementById('quiz-preguntas-container');
    const footer = document.querySelector('#modal-quiz .modal-footer');

    // Ocultar progreso y footer
    document.querySelector('.quiz-progreso').classList.add('hidden');
    footer.classList.add('hidden');

    let icono, titulo, subtitulo, claseNota;

    if (calificacion.pendientes > 0) {
        icono = 'fa-clock';
        titulo = 'Evaluación enviada';
        subtitulo = 'Tu profesor calificará las respuestas pendientes.';
        claseNota = 'pendiente';
    } else {
        const aprobado = calificacion.puntaje >= evaluacionActiva.puntajeMinimo;
        icono = aprobado ? 'fa-circle-check' : 'fa-circle-xmark';
        titulo = aprobado ? '¡Aprobado!' : 'No aprobado';
        subtitulo = aprobado
            ? '¡Excelente trabajo!'
            : `Necesitabas al menos ${evaluacionActiva.puntajeMinimo}% para aprobar.`;
        claseNota = aprobado ? 'aprobado' : 'reprobado';
    }

    cont.innerHTML = `
        <div class="quiz-resultado">
            <div class="quiz-resultado-icono ${claseNota}">
                <i class="fa-solid ${icono}"></i>
            </div>
            <h3 class="quiz-resultado-titulo">${titulo}</h3>
            <p class="quiz-resultado-subtitulo">${subtitulo}</p>

            ${calificacion.pendientes === 0 ? `
                <div class="quiz-resultado-nota ${claseNota}">
                    ${calificacion.puntaje}%
                </div>
            ` : `
                <div class="quiz-resultado-nota pendiente" style="color: var(--warning-color); font-size: 2rem;">
                    ${calificacion.pendientes} pendiente${calificacion.pendientes > 1 ? 's' : ''}
                </div>
            `}

            <div class="quiz-resultado-detalle">
                <strong>${calificacion.correctas}</strong> correctas · 
                <strong>${calificacion.incorrectas}</strong> incorrectas
                ${calificacion.pendientes > 0 ? ` · <strong>${calificacion.pendientes}</strong> pendiente${calificacion.pendientes > 1 ? 's' : ''}` : ''}
            </div>

            <div style="margin-top: 2rem;">
                <button class="btn btn-primary" type="button" id="btn-cerrar-resultado">
                    <i class="fa-solid fa-check"></i> Cerrar
                </button>
            </div>
        </div>
    `;

    // Conectar botón cerrar
    document.getElementById('btn-cerrar-resultado')
        ?.addEventListener('click', cerrarQuizYRefrescar);
}

function cerrarQuizYRefrescar() {
    cerrarQuiz(false);
}

/* CERRAR QUIZ */

function confirmarCerrarQuiz() {
    const tieneRespuestas = Object.keys(respuestas).length > 0;

    if (tieneRespuestas) {
        const confirmar = window.confirm(
            '¿Salir sin enviar?\n\nPerderás todas tus respuestas.'
        );
        if (!confirmar) return;
    }

    cerrarQuiz(true);
}

function cerrarQuiz(resetear) {
    document.getElementById('modal-quiz')?.classList.add('hidden');

    document.querySelector('.quiz-progreso')?.classList.remove('hidden');
    document.querySelector('#modal-quiz .modal-footer')?.classList.remove('hidden');

    if (typeof window.refrescarEvaluacionesEstudiante === 'function') {
        window.refrescarEvaluacionesEstudiante();
    }

    if (resetear) {
        evaluacionActiva = null;
        respuestas = {};
        paginaActual = 0;
    }
}