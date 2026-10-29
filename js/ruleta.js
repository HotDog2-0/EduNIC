/* Lógica de la Ruleta del Todo o Nada */

import { bd, CLAVES } from './storage.js';
import { mostrarNotificacion } from './utils.js';
import { reproducirSonido } from './sonidos.js';
import { lanzarConfeti } from './confeti.js';

/* CONFIGURACIÓN */

// Secciones de la ruleta (6 secciones de 60° cada una)
const SECCIONES = [
    { premio: 'jackpot', angulo: 0,   color: '#fbbf24' },
    { premio: 'pierde',  angulo: 60,  color: '#dc2626' },
    { premio: 'pasa',    angulo: 120, color: '#16a34a' },
    { premio: 'mas5',    angulo: 180, color: '#eab308' },
    { premio: 'pierde',  angulo: 240, color: '#991b1b' },
    { premio: 'mas10',   angulo: 300, color: '#10b981' }
];

/* ESTADO */

let resultadoActivo = null;
let calificacionActiva = null;
let girando = false;

/* PUNTO DE ENTRADA */

/**
 * Inicializa el modal de la ruleta.
 * Se llama una sola vez desde app.js.
 */
export function inicializarRuleta() {
    console.log('🎰 Módulo Ruleta: inicializando...');

    // Botón "Girar"
    document.getElementById('btn-girar-ruleta')?.addEventListener('click', girarRuleta);

    // Botón "No, gracias"
    document.getElementById('btn-cancelar-ruleta')?.addEventListener('click', cerrarRuleta);

    // Cerrar con X o ESC
    const modal = document.getElementById('modal-ruleta');
    modal?.querySelectorAll('[data-cerrar-modal]').forEach(b => {
        b.addEventListener('click', cerrarRuleta);
    });

    modal?.addEventListener('click', (e) => {
        if (e.target === modal && !girando) cerrarRuleta();
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !modal?.classList.contains('hidden') && !girando) {
            cerrarRuleta();
        }
    });

    console.log('✅ Módulo Ruleta: listo');
}

/* ABRIR RULETA */

/**
 * Abre el modal de la ruleta.
 * 
 * @param {Object} resultado - El resultado del estudiante
 * @param {Object} calificacion - Datos de la calificación (puntosObtenidos, puntosTotal, puntajeMinimo)
 */
export function abrirRuleta(resultado, calificacion) {
    console.log('🎰 abrirRuleta:', resultado?.id, calificacion);
    resultadoActivo = resultado;
    calificacionActiva = calificacion;
    girando = false;

    // Resetear la ruleta
    const ruleta = document.getElementById('ruleta');
    if (ruleta) {
        ruleta.style.transition = 'none';
        ruleta.style.transform = 'rotate(0deg)';
    }

    // ─── RESETEAR BOTONES Y RESULTADO (SIEMPRE) ───
    const contenedorBotones = document.querySelector('.ruleta-botones');
    if (contenedorBotones) {
        contenedorBotones.classList.remove('hidden');
        contenedorBotones.style.display = 'flex';   // ← forzar display
    }

    const btnGirar = document.getElementById('btn-girar-ruleta');
    if (btnGirar) {
        btnGirar.classList.remove('hidden');
        btnGirar.disabled = false;
        btnGirar.innerHTML = '<i class="fa-solid fa-rotate"></i> ¡Girar!';
        btnGirar.style.display = '';   // ← forzar display
    }

    const btnCancelar = document.getElementById('btn-cancelar-ruleta');
    if (btnCancelar) {
        btnCancelar.classList.remove('hidden');
        btnCancelar.disabled = false;
        btnCancelar.style.display = '';   // ← forzar display
    }

    // Ocultar resultado anterior
    const resultadoEl = document.getElementById('ruleta-resultado');
    if (resultadoEl) {
        resultadoEl.classList.remove('hidden');
        resultadoEl.className = 'ruleta-resultado hidden';
        resultadoEl.innerHTML = '';
        resultadoEl.style.display = 'block';   // ← forzar display
    }

    // Mostrar modal
    document.getElementById('modal-ruleta').classList.remove('hidden');
}

/* GIRAR LA RULETA */

function girarRuleta() {
    if (girando || !resultadoActivo) return;
    girando = true;

    const ruleta = document.getElementById('ruleta');
    const btnGirar = document.getElementById('btn-girar-ruleta');
    const btnCancelar = document.getElementById('btn-cancelar-ruleta');
    if (!ruleta) return;

    if (btnGirar) btnGirar.disabled = true;
    if (btnCancelar) btnCancelar.disabled = true;

    reproducirSonido('ficha', 0.4);

    // ─── LEER SECCIONES DEL DOM ───
    const seccionesDOM = document.querySelectorAll('#ruleta .ruleta-seccion');
    if (seccionesDOM.length === 0) {
        console.error('No hay secciones en la ruleta');
        girando = false;
        return;
    }

    // Elegir una sección al azar
    const indiceAleatorio = Math.floor(Math.random() * seccionesDOM.length);
    const seccionDOM = seccionesDOM[indiceAleatorio];
    const premio = seccionDOM.dataset.premio;

    console.log('🎰 Índice:', indiceAleatorio, '→ Premio:', premio);

    // ─── CÁLCULO DEL ÁNGULO ───
    const anguloSeccion = parseFloat(seccionDOM.style.getPropertyValue('--angulo'));
    const vueltas = 5;
    const rotacionFinal = (vueltas * 360) + (360 - anguloSeccion);

    console.log('🎰 Ángulo sección:', anguloSeccion, '° · Rotación final:', rotacionFinal, '°');

    ruleta.style.transition = 'transform 4s cubic-bezier(0.17, 0.67, 0.12, 0.99)';
    ruleta.style.transform = `rotate(${rotacionFinal}deg)`;

    setTimeout(() => {
        mostrarResultadoRuleta(premio);
    }, 4200);
}

/* MOSTRAR RESULTADO */

function mostrarResultadoRuleta(premio) {
    // ─── GUARDAR REFERENCIA LOCAL (antes de que se ponga en null) ───
    const resultadoLocal = resultadoActivo;
    const calificacionLocal = calificacionActiva;

    // ─── PROTECCIÓN ───
    if (!resultadoLocal || !resultadoLocal.id || !calificacionLocal) {
        console.warn('⚠️ No hay resultado activo o calificación');
        girando = false;
        return;
    }

    const resultadoEl = document.getElementById('ruleta-resultado');
    const btnGirar = document.getElementById('btn-girar-ruleta');
    const btnCancelar = document.getElementById('btn-cancelar-ruleta');
    if (!resultadoEl) {
        girando = false;
        return;
    }

    if (btnGirar) btnGirar.classList.add('hidden');
    if (btnCancelar) btnCancelar.classList.add('hidden');

    const { puntosObtenidos, puntosTotal, puntajeMinimo } = calificacionLocal;
    let nuevosPuntos = puntosObtenidos;
    let nuevoEstado = 'reprobado';
    let titulo = '';
    let detalle = '';

    if (premio === 'pasa') {
        nuevosPuntos = puntajeMinimo;
        nuevoEstado = 'aprobado';
        titulo = '¡PASAS!';
        detalle = `Llegaste al mínimo para aprobar: <strong>${nuevosPuntos}/${puntosTotal}</strong>`;
        lanzarConfeti(80);
        reproducirSonido('jackpot', 0.6);
    } else {
        nuevosPuntos = 0;
        nuevoEstado = 'reprobado';
        titulo = '¡PIERDES TODO!';
        detalle = `Tu puntaje se ha reiniciado a <strong>0/${puntosTotal}</strong>. ¡Suerte para la próxima!`;
        reproducirSonido('buzzer', 0.6);
    }

    // ─── USAR resultadoLocal EN LUGAR DE resultadoActivo ───
    actualizarResultadoEnStorage(resultadoLocal.id, nuevosPuntos, nuevoEstado, premio);

    const clase = nuevoEstado === 'aprobado' ? 'gana' : 'pierde';
    resultadoEl.className = `ruleta-resultado ${clase}`;
    resultadoEl.innerHTML = `
        <h4 class="ruleta-resultado-titulo">${titulo}</h4>
        <p class="ruleta-resultado-detalle">${detalle}</p>
        <button class="btn btn-primary margin-top" type="button" id="btn-cerrar-ruleta-resultado">
            <i class="fa-solid fa-check"></i> Cerrar
        </button>
    `;
    resultadoEl.classList.remove('hidden');
    resultadoEl.style.display = 'block';

    document.getElementById('btn-cerrar-ruleta-resultado')?.addEventListener('click', () => {
        cerrarRuleta();
        if (typeof window.refrescarEvaluacionesEstudiante === 'function') {
            window.refrescarEvaluacionesEstudiante();
        }
        document.getElementById('modal-quiz')?.classList.add('hidden');
    });

    girando = false;
}

/* ACTUALIZAR RESULTADO EN STORAGE */

function actualizarResultadoEnStorage(idResultado, nuevosPuntos, nuevoEstado, premio) {
    const resultados = bd.obtener(CLAVES.RESULTADOS) || [];
    const idx = resultados.findIndex(r => String(r.id) === String(idResultado));

    if (idx === -1) {
        console.error('Resultado no encontrado:', idResultado);
        return;
    }

    // Actualizar puntos y estado
    resultados[idx].puntosObtenidos = nuevosPuntos;
    resultados[idx].aprobado = nuevoEstado === 'aprobado';
    resultados[idx].estado = 'calificada';
    resultados[idx].ruletaUsada = true;
    resultados[idx].ruletaPremio = premio;

    bd.guardar(CLAVES.RESULTADOS, resultados);

    console.log(`Ruleta: resultado actualizado a ${nuevosPuntos} puntos (${nuevoEstado})`);
}

/* CERRAR RULETA */

function cerrarRuleta() {
    if (girando) return;

    document.getElementById('modal-ruleta')?.classList.add('hidden');
}

/**
 * Expone la función para que otros módulos puedan abrir la ruleta.
 */
window.abrirRuleta = abrirRuleta;