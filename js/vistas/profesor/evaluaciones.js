/* Lógica del módulo de Evaluaciones */

import { bd, CLAVES } from '../../storage.js';
import {
    mostrarNotificacion,
    generarId,
    escaparHTML,
    normalizar,
    limpiarNombre
} from '../../utils.js';

/* CONSTANTES */

const TIPOS = {
    MULTIPLE: 'multiple',
    VF:       'vf',
    CORTA:    'corta'
};

const MAX_PREGUNTAS = 50;

/* ESTADO INTERNO */

let idCarreraActiva = null;
let modulos = [];              // módulos de la carrera activa
let evaluaciones = [];         // evaluaciones de la carrera activa

let evaluacionEditandoId = null;
let evaluacionEliminandoId = null;

// Preguntas del modal (en memoria mientras se edita)
let preguntasEnEdicion = [];

/* PUNTO DE ENTRADA */

export function inicializarEvaluaciones() {
    console.log('Módulo Evaluaciones: iniciando');

    conectarBotonNuevaEvaluacion();
    conectarModalEvaluacion();
    conectarModalEliminar();
    conectarModalVer();

    console.log('Módulo Evaluaciones: listo');
}

/**
 * Carga los módulos y evaluaciones de una carrera.
 * Se llama al abrir el panel de una carrera.
 */
export function cargarEvaluacionesDeCarrera(idCarrera) {
    idCarreraActiva = idCarrera;

    const todosTemas = bd.obtener(CLAVES.TEMAS) || [];
    modulos = todosTemas.filter(x => x.tipo === 'modulo' && x.idCarrera === idCarrera);

    const todasEvals = bd.obtener(CLAVES.EVALUACIONES) || [];
    evaluaciones = todasEvals.filter(e => e.idCarrera === idCarrera);

    renderizarEvaluaciones();
}

/* RENDERIZADO */

function renderizarEvaluaciones() {
    const cont = document.getElementById('lista-evaluaciones');
    if (!cont) return;

    if (modulos.length === 0) {
        cont.innerHTML = `
            <div class="carreras-vacio">
                <i class="fa-solid fa-folder-open"></i>
                <h3>No hay módulos todavía</h3>
                <p>Crea primero un módulo en la pestaña "Temas" para poder añadir evaluaciones.</p>
            </div>
        `;
        return;
    }

    cont.innerHTML = modulos.map(m => renderizarModuloConEvaluaciones(m)).join('');
    cont.onclick = manejarClicEvaluaciones;
}

function renderizarModuloConEvaluaciones(m) {
    const evalsDelModulo = evaluaciones.filter(e => e.idModulo === m.id);
    const cantidad = evalsDelModulo.length;

    return `
        <div class="modulo-item" data-id="${m.id}">
            <div class="modulo-header" data-accion="toggle" data-id="${m.id}">
                <i class="fa-solid fa-chevron-right modulo-icono-flecha"></i>
                <i class="fa-solid fa-folder modulo-icono-carpeta"></i>
                <h4 class="modulo-nombre">${escaparHTML(m.nombre)}</h4>
                <span class="modulo-contador">${cantidad} ${cantidad === 1 ? 'evaluación' : 'evaluaciones'}</span>
            </div>
            <div class="modulo-body">
                ${evalsDelModulo.length === 0
                    ? `<div class="modulo-vacio">
                        <i class="fa-solid fa-file-pen"></i>
                        Este módulo no tiene evaluaciones todavía.
                       </div>`
                    : evalsDelModulo.map(e => renderizarEvaluacionItem(e)).join('')
                }
                <button class="modulo-add-tema" type="button"
                        data-accion="nueva-evaluacion" data-id="${m.id}">
                    <i class="fa-solid fa-plus"></i> Crear Evaluación en este Módulo
                </button>
            </div>
        </div>
    `;
}

function renderizarEvaluacionItem(e) {
    const totalPreguntas = (e.preguntas || []).length;

    return `
        <div class="evaluacion-item" data-id="${e.id}">
            <div class="evaluacion-item-icono">
                <i class="fa-solid fa-file-pen"></i>
            </div>

            <div class="evaluacion-item-info">
                <p class="evaluacion-item-titulo">${escaparHTML(e.titulo)}</p>
                <div class="evaluacion-item-meta">
                    <span>
                        <i class="fa-solid fa-list-ol"></i>
                        ${totalPreguntas} ${totalPreguntas === 1 ? 'pregunta' : 'preguntas'}
                    </span>
                    <span>
                        <i class="fa-solid fa-check-circle"></i>
                        Mínimo: ${e.puntajeMinimo} puntos
                    </span>
                </div>
            </div>

            <div class="evaluacion-item-acciones">
                <button class="btn-icon" type="button"
                        data-accion="ver-evaluacion" data-id="${e.id}" title="Ver preguntas">
                    <i class="fa-solid fa-eye"></i>
                </button>
                <button class="btn-icon btn-edit" type="button"
                        data-accion="editar-evaluacion" data-id="${e.id}" title="Editar">
                    <i class="fa-solid fa-pen"></i>
                </button>
                <button class="btn-icon btn-delete" type="button"
                        data-accion="eliminar-evaluacion" data-id="${e.id}" title="Eliminar">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </div>
        </div>
    `;
}

/* MANEJO DE CLICS */

function manejarClicEvaluaciones(e) {
    const btn = e.target.closest('[data-accion]');
    if (!btn) return;

    const accion = btn.dataset.accion;
    const id = btn.dataset.id;

    if (accion !== 'toggle') e.stopPropagation();

    switch (accion) {
        case 'toggle':              toggleModulo(id);              break;
        case 'nueva-evaluacion':    abrirModalCrear(id);           break;
        case 'editar-evaluacion':   abrirModalEditar(id);          break;
        case 'eliminar-evaluacion': abrirModalEliminar(id);        break;
        case 'ver-evaluacion':      abrirModalVer(id);             break;
    }
}

function toggleModulo(id) {
    const item = document.querySelector(`#lista-evaluaciones .modulo-item[data-id="${id}"]`);
    if (item) item.classList.toggle('expandido');
}

/* MODAL CREAR / EDITAR EVALUACIÓN */

function conectarBotonNuevaEvaluacion() {
    document.getElementById('btn-nueva-evaluacion')
        ?.addEventListener('click', () => {
            if (modulos.length === 0) {
                mostrarNotificacion('Primero crea un módulo en la pestaña "Temas"', 'error');
                return;
            }
            // Abrir para el primer módulo (el usuario puede cambiarlo)
            abrirModalCrear(modulos[0].id);
        });

    document.getElementById('btn-add-pregunta')
        ?.addEventListener('click', () => agregarPregunta());
}

function conectarModalEvaluacion() {
    const modal = document.getElementById('modal-evaluacion');
    const form  = document.getElementById('form-evaluacion');
    if (!modal || !form) return;

    modal.querySelectorAll('[data-cerrar-modal]').forEach(b => {
        b.addEventListener('click', cerrarModalEvaluacion);
    });

    modal.addEventListener('click', (e) => {
        if (e.target === modal) cerrarModalEvaluacion();
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !modal.classList.contains('hidden')) {
            cerrarModalEvaluacion();
        }
    });

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        guardarEvaluacion();
    });

    // conectar el input de puntaje mínimo
    const inputMinimo = document.getElementById('eval-puntaje-minimo');
    if (inputMinimo) {
        inputMinimo.addEventListener('input', () => {
            validarInputPuntajeMinimo();
        });
    }
}

function abrirModalCrear(idModulo) {
    if (!idCarreraActiva) {
        mostrarNotificacion('No hay carrera activa', 'error');
        return;
    }
    

    evaluacionEditandoId = null;
    preguntasEnEdicion = [];

    document.getElementById('modal-evaluacion-titulo-texto').textContent = 'Nueva Evaluación';
    document.getElementById('eval-titulo').value = '';
    document.getElementById('eval-descripcion').value = '';
    document.getElementById('eval-puntaje-minimo').value = 10;

    // Guardar el módulo activo del builder
    document.getElementById('modal-evaluacion').dataset.idModulo = idModulo;

    renderizarBuilderPreguntas();
    actualizarTotalPuntos(); 

    document.getElementById('modal-evaluacion').classList.remove('hidden');
    setTimeout(() => document.getElementById('eval-titulo').focus(), 100);
}

function abrirModalEditar(idEval) {
    const ev = evaluaciones.find(x => x.id === idEval);
    if (!ev) return;

    evaluacionEditandoId = idEval;

    // Copiar preguntas asegurando que tengan puntos
    preguntasEnEdicion = (ev.preguntas || []).map(p => ({
        ...p,
        puntos: (typeof p.puntos === 'number' && p.puntos > 0) ? p.puntos : 10
    }));


    document.getElementById('modal-evaluacion-titulo-texto').textContent = 'Editar Evaluación';
    document.getElementById('eval-titulo').value = ev.titulo;
    document.getElementById('eval-descripcion').value = ev.descripcion || '';
    document.getElementById('eval-puntaje-minimo').value = ev.puntajeMinimo;

    document.getElementById('modal-evaluacion').dataset.idModulo = ev.idModulo;

    renderizarBuilderPreguntas();
    actualizarTotalPuntos();

    document.getElementById('modal-evaluacion').classList.remove('hidden');
    setTimeout(() => document.getElementById('eval-titulo').focus(), 100);
}

function cerrarModalEvaluacion() {
    document.getElementById('modal-evaluacion')?.classList.add('hidden');
    evaluacionEditandoId = null;
    preguntasEnEdicion = [];
}

function guardarEvaluacion() {
    const titulo = limpiarNombre(document.getElementById('eval-titulo').value);
    const descripcion = document.getElementById('eval-descripcion').value.trim();
    const puntajeMinimo = parseInt(document.getElementById('eval-puntaje-minimo').value, 10);
    const idModulo = document.getElementById('modal-evaluacion').dataset.idModulo;

    // Validaciones
    if (!titulo) {
        mostrarNotificacion('El título no puede estar vacío', 'error');
        return;
    }
        // Validación del puntaje mínimo
    if (isNaN(puntajeMinimo) || puntajeMinimo < 1) {
        mostrarNotificacion('El puntaje mínimo debe ser al menos 1 punto', 'error');
        return;
    }

    if (puntajeMinimo > 100) {
        mostrarNotificacion('El puntaje mínimo no puede superar los 100 puntos', 'error');
        return;
    }

    // Validar contra el total de puntos de las preguntas
    const totalPuntos = preguntasEnEdicion.reduce((sum, p) => {
        const puntos = typeof p.puntos === 'number' && p.puntos > 0 ? p.puntos : 0;
        return sum + puntos;
    }, 0);

    if (totalPuntos > 0 && puntajeMinimo > totalPuntos) {
        mostrarNotificacion(
            `El puntaje mínimo (${puntajeMinimo}) no puede ser mayor que el total de la evaluación (${totalPuntos} puntos)`,
            'error'
        );
        return;
    }
    if (preguntasEnEdicion.length === 0) {
        mostrarNotificacion('Añade al menos una pregunta', 'error');
        return;
    }

    // Validar que todas las preguntas estén completas
    for (let i = 0; i < preguntasEnEdicion.length; i++) {
        const error = validarPregunta(preguntasEnEdicion[i], i + 1);
        if (error) {
            mostrarNotificacion(error, 'error');
            return;
        }
    }

    // Verificar duplicado (mismo título en el mismo módulo)
    const todas = bd.obtener(CLAVES.EVALUACIONES) || [];
    const duplicado = todas.some(e =>
        e.id !== evaluacionEditandoId &&
        e.idModulo === idModulo &&
        normalizar(e.titulo) === normalizar(titulo)
    );
    if (duplicado) {
        mostrarNotificacion('Ya existe una evaluación con ese título en este módulo', 'error');
        return;
    }

    // Limpiar preguntas (quitar campos temporales del builder)
    const preguntasLimpias = preguntasEnEdicion.map(p => limpiarPregunta(p));

    if (evaluacionEditandoId) {
        // EDITAR
        const idx = todas.findIndex(x => x.id === evaluacionEditandoId);
        if (idx === -1) return;

        todas[idx].titulo = titulo;
        todas[idx].descripcion = descripcion;
        todas[idx].puntajeMinimo = puntajeMinimo;
        todas[idx].preguntas = preguntasLimpias;

        bd.guardar(CLAVES.EVALUACIONES, todas);

        // Actualizar en memoria
        const ev = evaluaciones.find(x => x.id === evaluacionEditandoId);
        if (ev) {
            ev.titulo = titulo;
            ev.descripcion = descripcion;
            ev.puntajeMinimo = puntajeMinimo;
            ev.preguntas = preguntasLimpias;
        }

        cerrarModalEvaluacion();
        renderizarEvaluaciones();
        mostrarNotificacion('Evaluación actualizada');
    } else {
        // CREAR
        const nueva = {
            id: generarId(),
            idCarrera: idCarreraActiva,
            idModulo,
            titulo,
            descripcion,
            puntajeMinimo,
            preguntas: preguntasLimpias,
            creado: new Date().toISOString()
        };

        todas.push(nueva);
        bd.guardar(CLAVES.EVALUACIONES, todas);

        evaluaciones.push(nueva);

        cerrarModalEvaluacion();
        renderizarEvaluaciones();

        // Expandir el módulo
        const item = document.querySelector(`#lista-evaluaciones .modulo-item[data-id="${idModulo}"]`);
        if (item) item.classList.add('expandido');

        mostrarNotificacion('Evaluación creada');
    }
}

/* BUILDER DE PREGUNTAS */

function renderizarBuilderPreguntas() {
    const cont = document.getElementById('preguntas-container');
    const contador = document.getElementById('contador-preguntas-builder');
    if (!cont || !contador) return;

    contador.textContent = preguntasEnEdicion.length;

    if (preguntasEnEdicion.length === 0) {
        cont.innerHTML = `
            <p class="text-muted text-center preguntas-vacio">
                No hay preguntas todavía. Añade la primera.
            </p>
        `;
        actualizarTotalPuntos();   // ← NUEVO
        return;
    }

    cont.innerHTML = preguntasEnEdicion.map((p, i) => renderizarPreguntaBuilder(p, i)).join('');

    // Reconectar eventos (los existentes + el nuevo)
    cont.querySelectorAll('[data-tipo]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const idx = parseInt(btn.dataset.idx, 10);
            cambiarTipoPregunta(idx, btn.dataset.tipo);
        });
    });

    cont.querySelectorAll('[data-eliminar-pregunta]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const idx = parseInt(btn.dataset.eliminarPregunta, 10);
            eliminarPregunta(idx);
        });
    });

    cont.querySelectorAll('[data-pregunta-texto]').forEach(input => {
        input.addEventListener('input', () => {
            const idx = parseInt(input.dataset.preguntaTexto, 10);
            preguntasEnEdicion[idx].texto = input.value;
        });
    });

    cont.querySelectorAll('[data-opcion-texto]').forEach(input => {
        input.addEventListener('input', () => {
            const idx = parseInt(input.dataset.idx, 10);
            const optIdx = parseInt(input.dataset.opcionTexto, 10);
            preguntasEnEdicion[idx].opciones[optIdx].texto = input.value;
        });
    });

    cont.querySelectorAll('[data-opcion-correcta]').forEach(radio => {
        radio.addEventListener('change', () => {
            const idx = parseInt(radio.dataset.idx, 10);
            const optIdx = parseInt(radio.dataset.opcionCorrecta, 10);
            preguntasEnEdicion[idx].correcta = optIdx;
        });
    });

    cont.querySelectorAll('[data-vf-correcta]').forEach(radio => {
        radio.addEventListener('change', () => {
            const idx = parseInt(radio.dataset.idx, 10);
            preguntasEnEdicion[idx].correcta = radio.value === 'true';
        });
    });

    cont.querySelectorAll('[data-respuesta-esperada]').forEach(input => {
        input.addEventListener('input', () => {
            const idx = parseInt(input.dataset.respuestaEsperada, 10);
            preguntasEnEdicion[idx].respuestaEsperada = input.value;
        });
    });

    // ─── NUEVO: input de puntos ───
    cont.querySelectorAll('[data-pregunta-puntos]').forEach(input => {
        input.addEventListener('input', () => {
            const idx = parseInt(input.dataset.preguntaPuntos, 10);
            let valor = parseInt(input.value, 10);

            // Validación: mínimo 1, sin decimales
            if (isNaN(valor) || valor < 1) {
                valor = 1;
            }

            preguntasEnEdicion[idx].puntos = valor;
            actualizarTotalPuntos();
        });

        // Al perder el foco, asegurar que el input refleje el valor guardado
        input.addEventListener('blur', () => {
            const idx = parseInt(input.dataset.preguntaPuntos, 10);
            const p = preguntasEnEdicion[idx];
            if (p && p.puntos) {
                input.value = p.puntos;
            }
        });
    });

    // Actualizar el total al final de renderizar
    actualizarTotalPuntos();
}

function renderizarPreguntaBuilder(p, i) {
    const tipoActual = p.tipo || TIPOS.MULTIPLE;
    const puntosActuales = typeof p.puntos === 'number' && p.puntos > 0 ? p.puntos : 10;

    return `
        <div class="pregunta-builder" data-idx="${i}">
            <div class="pregunta-builder-header">
                <span class="pregunta-numero">Pregunta ${i + 1}</span>
                <button class="btn-icon btn-delete" type="button"
                        data-eliminar-pregunta="${i}" title="Eliminar pregunta">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </div>

            <div class="pregunta-tipo-selector">
                <button type="button"
                        class="pregunta-tipo-btn ${tipoActual === TIPOS.MULTIPLE ? 'activo' : ''}"
                        data-tipo="${TIPOS.MULTIPLE}" data-idx="${i}">
                    <i class="fa-solid fa-list-ul"></i> Selección múltiple
                </button>
                <button type="button"
                        class="pregunta-tipo-btn ${tipoActual === TIPOS.VF ? 'activo' : ''}"
                        data-tipo="${TIPOS.VF}" data-idx="${i}">
                    <i class="fa-solid fa-check-double"></i> Verdadero / Falso
                </button>
                <button type="button"
                        class="pregunta-tipo-btn ${tipoActual === TIPOS.CORTA ? 'activo' : ''}"
                        data-tipo="${TIPOS.CORTA}" data-idx="${i}">
                    <i class="fa-solid fa-keyboard"></i> Respuesta corta
                </button>
            </div>

            <div class="pregunta-campos">
                <div class="form-group">
                    <label>Texto de la pregunta:</label>
                    <input type="text" data-pregunta-texto="${i}"
                           value="${escaparHTML(p.texto || '')}"
                           placeholder="Escribe la pregunta aquí...">
                </div>

                ${renderizarCamposSegunTipo(p, i, tipoActual)}

                <div class="pregunta-puntos">
                    <label for="puntos-${i}">
                        <i class="fa-solid fa-star"></i>
                        Puntos:
                    </label>
                    <input type="number"
                           id="puntos-${i}"
                           min="1"
                           step="1"
                           value="${puntosActuales}"
                           data-pregunta-puntos="${i}">
                    <span class="pregunta-puntos-hint">Cuánto vale esta pregunta</span>
                </div>
            </div>
        </div>
    `;
}

function renderizarCamposSegunTipo(p, i, tipo) {
    if (tipo === TIPOS.MULTIPLE) {
        return `
            <div class="opciones-multiple">
                ${[0, 1, 2, 3].map(optIdx => `
                    <div class="opcion-multiple">
                        <input type="radio" 
                               name="pregunta-${i}-correcta"
                               ${p.correcta === optIdx ? 'checked' : ''}
                               data-opcion-correcta="${optIdx}" data-idx="${i}">
                        <span class="opcion-letra">${String.fromCharCode(65 + optIdx)}:</span>
                        <input type="text"
                               value="${escaparHTML((p.opciones && p.opciones[optIdx]?.texto) || '')}"
                               placeholder="Opción ${String.fromCharCode(65 + optIdx)}"
                               data-opcion-texto="${optIdx}" data-idx="${i}">
                    </div>
                `).join('')}
            </div>
            <p class="form-hint">
                <i class="fa-solid fa-circle-info"></i>
                Marca el círculo de la opción <strong>correcta</strong>.
            </p>
        `;
    }

    if (tipo === TIPOS.VF) {
        return `
            <div class="opciones-vf">
                <label class="opcion-vf">
                    <input type="radio" name="vf-${i}" value="true"
                           ${p.correcta === true ? 'checked' : ''}
                           data-vf-correcta="${i}" data-idx="${i}">
                    <span class="opcion-vf-contenido">
                        <i class="fa-solid fa-check"></i> Verdadero
                    </span>
                </label>
                <label class="opcion-vf">
                    <input type="radio" name="vf-${i}" value="false"
                           ${p.correcta === false ? 'checked' : ''}
                           data-vf-correcta="${i}" data-idx="${i}">
                    <span class="opcion-vf-contenido">
                        <i class="fa-solid fa-xmark"></i> Falso
                    </span>
                </label>
            </div>
        `;
    }

    if (tipo === TIPOS.CORTA) {
        return `
            <div class="form-group">
                <label>
                    Respuesta esperada
                    <span class="label-hint">(opcional)</span>
                </label>
                <input type="text"
                       value="${escaparHTML(p.respuestaEsperada || '')}"
                       placeholder="Si la defines, se califica automáticamente si coincide"
                       data-respuesta-esperada="${i}">
            </div>
            <div class="respuesta-corta-info">
                <i class="fa-solid fa-lightbulb"></i>
                <span>
                    Si defines una respuesta esperada, se auto-califica.
                    Si la dejas vacía, el profesor la calificará manualmente.
                </span>
            </div>
        `;
    }

    return '';
}

function agregarPregunta() {
    if (preguntasEnEdicion.length >= MAX_PREGUNTAS) {
        mostrarNotificacion(`Máximo ${MAX_PREGUNTAS} preguntas por evaluación`, 'error');
        return;
    }

    // Pregunta vacía por defecto: selección múltiple con 4 opciones
    preguntasEnEdicion.push({
        id: generarId(),
        tipo: TIPOS.MULTIPLE,
        texto: '',
        opciones: [
            { texto: '' },
            { texto: '' },
            { texto: '' },
            { texto: '' }
        ],
        correcta: 0,
        puntos: 10
    });

    renderizarBuilderPreguntas();

    // Scroll al final
    setTimeout(() => {
        const cont = document.getElementById('preguntas-container');
        if (cont) cont.lastElementChild?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 50);
}

function cambiarTipoPregunta(idx, nuevoTipo) {
    const p = preguntasEnEdicion[idx];
    if (!p) return;

    p.tipo = nuevoTipo;

    // Resetear campos según el nuevo tipo (para evitar datos huérfanos)
    if (nuevoTipo === TIPOS.MULTIPLE) {
        if (!p.opciones || p.opciones.length !== 4) {
            p.opciones = [{ texto: '' }, { texto: '' }, { texto: '' }, { texto: '' }];
        }
        if (typeof p.correcta !== 'number') p.correcta = 0;
    } else if (nuevoTipo === TIPOS.VF) {
        if (typeof p.correcta !== 'boolean') p.correcta = true;
    } else if (nuevoTipo === TIPOS.CORTA) {
        p.respuestaEsperada = p.respuestaEsperada || '';
        p.correcta = null;
    }

    renderizarBuilderPreguntas();
}

function eliminarPregunta(idx) {
    preguntasEnEdicion.splice(idx, 1);
    renderizarBuilderPreguntas();
}

function validarPregunta(p, numero) {
    if (!p.texto || !p.texto.trim()) {
        return `La pregunta ${numero} no tiene texto`;
    }

    if (typeof p.puntos !== 'number' || isNaN(p.puntos) || p.puntos < 1) {
        return `La pregunta ${numero} debe tener al menos 1 punto`;
    }

    if (p.tipo === TIPOS.MULTIPLE) {
        const opciones = p.opciones || [];
        if (opciones.length !== 4) {
            return `La pregunta ${numero} debe tener 4 opciones`;
        }
        for (let i = 0; i < 4; i++) {
            if (!opciones[i].texto || !opciones[i].texto.trim()) {
                return `La pregunta ${numero}: la opción ${String.fromCharCode(65 + i)} está vacía`;
            }
        }
    }

    if (p.tipo === TIPOS.VF) {
        if (typeof p.correcta !== 'boolean') {
            return `La pregunta ${numero}: marca Verdadero o Falso`;
        }
    }

    return null;
}

function limpiarPregunta(p) {
    // Retorna solo los campos necesarios, sin basura
    const base = {
        id: p.id,
        tipo: p.tipo,
        texto: p.texto.trim(),
        puntos: p.puntos
    };

    if (p.tipo === TIPOS.MULTIPLE) {
        base.opciones = p.opciones.map(o => ({ texto: o.texto.trim() }));
        base.correcta = p.correcta;
    } else if (p.tipo === TIPOS.VF) {
        base.correcta = p.correcta;
    } else if (p.tipo === TIPOS.CORTA) {
        base.respuestaEsperada = (p.respuestaEsperada || '').trim();
    }

    return base;
}

/* MODAL ELIMINAR EVALUACIÓN */

/**
 * Conecta el modal de eliminar evaluación:
 * - Botones de cerrar
 * - Clic fuera del modal
 * - ESC
 * - Input de confirmación (habilitar el botón de eliminar)
 * - Botón de confirmar eliminación
 */
function conectarModalEliminar() {
    const modal       = document.getElementById('modal-eliminar-evaluacion');
    const input       = document.getElementById('confirmar-eliminar-evaluacion');
    const btnEliminar = document.getElementById('btn-confirmar-eliminar-evaluacion');
    if (!modal || !input || !btnEliminar) return;

    // Cerrar con botones [data-cerrar-modal]
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

    // Habilitar el botón solo cuando el texto coincide
    input.addEventListener('input', () => {
        const ev = evaluaciones.find(x => x.id === evaluacionEliminandoId);
        if (!ev) return;
        btnEliminar.disabled = input.value.trim() !== ev.titulo;
    });

    // Confirmar eliminación
    btnEliminar.addEventListener('click', confirmarEliminar);
}

function abrirModalEliminar(id) {
    const ev = evaluaciones.find(x => x.id === id);
    if (!ev) return;

    evaluacionEliminandoId = id;

    document.getElementById('eliminar-evaluacion-nombre').textContent = ev.titulo;
    document.getElementById('confirmar-eliminar-evaluacion').value = '';
    document.getElementById('btn-confirmar-eliminar-evaluacion').disabled = true;

    document.getElementById('modal-eliminar-evaluacion').classList.remove('hidden');
    setTimeout(() => document.getElementById('confirmar-eliminar-evaluacion').focus(), 100);
}

function cerrarModalEliminar() {
    document.getElementById('modal-eliminar-evaluacion')?.classList.add('hidden');
    evaluacionEliminandoId = null;
}

function confirmarEliminar() {
    const ev = evaluaciones.find(x => x.id === evaluacionEliminandoId);
    if (!ev) return;

    const todas = bd.obtener(CLAVES.EVALUACIONES) || [];
    bd.guardar(CLAVES.EVALUACIONES, todas.filter(x => x.id !== ev.id));

    // Eliminar también los resultados de esa evaluación (cascada)
    const resultados = bd.obtener(CLAVES.RESULTADOS) || [];
    bd.guardar(CLAVES.RESULTADOS, resultados.filter(r => r.idEvaluacion !== ev.id));

    evaluaciones = evaluaciones.filter(x => x.id !== ev.id);

    cerrarModalEliminar();
    renderizarEvaluaciones();
    mostrarNotificacion('Evaluación eliminada');
}

/* MODAL VER EVALUACIÓN */

function conectarModalVer() {
    const modal = document.getElementById('modal-ver-evaluacion');
    if (!modal) return;

    modal.querySelectorAll('[data-cerrar-modal]').forEach(b => {
        b.addEventListener('click', cerrarModalVer);
    });

    modal.addEventListener('click', (e) => {
        if (e.target === modal) cerrarModalVer();
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !modal.classList.contains('hidden')) {
            cerrarModalVer();
        }
    });
}

function abrirModalVer(id) {
    const ev = evaluaciones.find(x => x.id === id);
    if (!ev) return;

    document.getElementById('modal-ver-evaluacion-nombre').textContent = ev.titulo;
    document.getElementById('ver-evaluacion-descripcion').textContent = ev.descripcion || '';
    document.getElementById('ver-evaluacion-total').textContent = (ev.preguntas || []).length;
    document.getElementById('ver-evaluacion-minimo').textContent = ev.puntajeMinimo;

    const cont = document.getElementById('ver-evaluacion-preguntas');
    cont.innerHTML = (ev.preguntas || []).map((p, i) => renderizarPreguntaVer(p, i)).join('');

    document.getElementById('modal-ver-evaluacion').classList.remove('hidden');
}

function cerrarModalVer() {
    document.getElementById('modal-ver-evaluacion')?.classList.add('hidden');
}

function renderizarPreguntaVer(p, i) {
    const tipoLabels = {
        [TIPOS.MULTIPLE]: { texto: 'Selección múltiple', clase: 'tipo-multiple' },
        [TIPOS.VF]:       { texto: 'Verdadero / Falso',  clase: 'tipo-vf' },
        [TIPOS.CORTA]:    { texto: 'Respuesta corta',    clase: 'tipo-corta' }
    };

    const tipoInfo = tipoLabels[p.tipo] || tipoLabels[TIPOS.MULTIPLE];

    let opcionesHTML = '';

    if (p.tipo === TIPOS.MULTIPLE) {
        opcionesHTML = `
            <div class="pregunta-ver-opciones">
                ${p.opciones.map((o, optIdx) => `
                    <div class="pregunta-ver-opcion ${optIdx === p.correcta ? 'correcta' : ''}">
                        ${optIdx === p.correcta ? '<i class="fa-solid fa-check"></i>' : '<span style="width:12px;display:inline-block;"></span>'}
                        <span class="letra">${String.fromCharCode(65 + optIdx)}:</span>
                        <span>${escaparHTML(o.texto)}</span>
                    </div>
                `).join('')}
            </div>
        `;
    } else if (p.tipo === TIPOS.VF) {
        opcionesHTML = `
            <div class="pregunta-ver-opciones">
                <div class="pregunta-ver-opcion ${p.correcta === true ? 'correcta' : ''}">
                    ${p.correcta === true ? '<i class="fa-solid fa-check"></i>' : '<span style="width:12px;display:inline-block;"></span>'}
                    <span>Verdadero</span>
                </div>
                <div class="pregunta-ver-opcion ${p.correcta === false ? 'correcta' : ''}">
                    ${p.correcta === false ? '<i class="fa-solid fa-check"></i>' : '<span style="width:12px;display:inline-block;"></span>'}
                    <span>Falso</span>
                </div>
            </div>
        `;
    } else if (p.tipo === TIPOS.CORTA) {
        opcionesHTML = p.respuestaEsperada
            ? `<div class="pregunta-ver-respuesta-esperada">
                <strong>Respuesta esperada:</strong> ${escaparHTML(p.respuestaEsperada)}
               </div>`
            : `<div class="pregunta-ver-respuesta-esperada">
                <strong>Sin respuesta esperada.</strong> El profesor la calificará manualmente.
               </div>`;
    }

    return `
        <div class="pregunta-ver">
            <div class="pregunta-ver-header">
                <span class="pregunta-ver-tipo ${tipoInfo.clase}">${tipoInfo.texto}</span>
                <span class="text-muted" style="font-size:0.8rem;">Pregunta ${i + 1}</span>
            </div>
            <p class="pregunta-ver-texto">${escaparHTML(p.texto)}</p>
            ${opcionesHTML}
        </div>
    `;
}

/**
 * Calcula el total de puntos de todas las preguntas en edición
 * y actualiza el contador visual.
 * 
 * - Verde: total = 100
 * - Amarillo: total < 100 (aviso)
 * - Rojo: total > 100 (error)
 * 
 * Además, actualiza el hint del puntaje mínimo y lo revalida
 * para asegurarse de que no supera el total.
 * 
 * @returns {number} El total de puntos
 */
function actualizarTotalPuntos() {
    const total = preguntasEnEdicion.reduce((sum, p) => {
        const puntos = typeof p.puntos === 'number' && p.puntos > 0 ? p.puntos : 0;
        return sum + puntos;
    }, 0);

    const elValor = document.getElementById('preguntas-total-valor');
    const elBadge = document.getElementById('preguntas-total-badge');

    if (elValor) {
        elValor.textContent = total;
    }

    if (elBadge) {
        elBadge.classList.remove('ok', 'aviso', 'error');
        elBadge.textContent = '';

        if (total === 0) {
            // Sin preguntas, no mostrar badge
        } else if (total === 100) {
            elBadge.textContent = '✓ Correcto';
            elBadge.classList.add('ok');
        } else if (total < 100) {
            elBadge.textContent = `Faltan ${100 - total}`;
            elBadge.classList.add('aviso');
        } else {
            elBadge.textContent = `+${total - 100} extra`;
            elBadge.classList.add('error');
        }
    }

    // Actualizar el hint del puntaje mínimo
    actualizarHintPuntajeMinimo(total);

    return total;
}

/**
 * Actualiza el texto de ayuda del input de puntaje mínimo
 * según el total de puntos actual.
 * 
 * También revalida que el mínimo no supere el total.
 * 
 * @param {number} totalPuntos - Total de puntos de las preguntas
 */
function actualizarHintPuntajeMinimo(totalPuntos) {
    const hint = document.getElementById('eval-puntaje-minimo-hint');
    const input = document.getElementById('eval-puntaje-minimo');
    if (!hint || !input) return;

    if (totalPuntos === 0) {
        hint.innerHTML = `
            Mínimo <strong>1 punto</strong> · Máximo <strong>100 puntos</strong>.
        `;
        return;
    }

    // El mínimo máximo efectivo es min(100, totalPuntos)
    const maxEfectivo = Math.min(100, totalPuntos);

    hint.innerHTML = `
        Mínimo <strong>1 punto</strong> · 
        Máximo efectivo: <strong>${maxEfectivo} puntos</strong> 
        (el total de la evaluación).
    `;

    // Actualizar el atributo max del input
    input.max = maxEfectivo;

    // Si el valor actual supera el máximo, ajustarlo
    const valorActual = parseInt(input.value, 10);
    if (!isNaN(valorActual) && valorActual > maxEfectivo) {
        input.value = maxEfectivo;
    }

    // Validar el input (feedback visual)
    validarInputPuntajeMinimo();
}

/**
 * Valida el input del puntaje mínimo y le pone feedback visual
 * si hay algún error.
 */
function validarInputPuntajeMinimo() {
    const input = document.getElementById('eval-puntaje-minimo');
    if (!input) return;

    const valor = parseInt(input.value, 10);
    const total = preguntasEnEdicion.reduce((sum, p) => {
        const puntos = typeof p.puntos === 'number' && p.puntos > 0 ? p.puntos : 0;
        return sum + puntos;
    }, 0);

    let hayError = false;

    if (isNaN(valor) || valor < 1) {
        hayError = true;
    } else if (total > 0 && valor > total) {
        hayError = true;
    }

    if (hayError) {
        input.style.borderColor = 'var(--danger-color)';
        input.style.boxShadow = '0 0 0 3px rgba(220, 38, 38, 0.15)';
    } else {
        input.style.borderColor = '';
        input.style.boxShadow = '';
    }
}