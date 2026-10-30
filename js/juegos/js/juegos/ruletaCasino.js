/* ============================================
   JUEGOS/RULETACASINO.JS
   Minijuego: Ruleta de casino (europea, 0 al 36)

   Nota: no confundir con js/ruleta.js, que es la
   ruleta "Todo o Nada" del modal de evaluaciones.
   Aquí todos los ids y clases empiezan con "rc-".
   ============================================ */

import { mostrarNotificacion } from '../utils.js';
import { reproducirSonido } from '../sonidos.js';
import { lanzarConfeti } from '../confeti.js';

/* ==========================================
   CONFIGURACIÓN
   ========================================== */

// Orden real de los números en una ruleta europea
const ORDEN = [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26];
const ROJOS = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);

const TAU = Math.PI * 2;
const SEG = TAU / ORDEN.length;       // ángulo de cada casilla
const TAM = 420;                      // tamaño lógico del canvas
const RADIO = TAM / 2;

const FICHAS_INICIALES = 1000;
const MONTOS = [10, 50, 100, 250];
const MINIMO = MONTOS[0];

// Los mismos colores del tema (el canvas no puede leer variables CSS)
const ORO = '#d4af37';
const MARFIL = '#f3f4f6';
const COLOR_ROJO = '#b91c1c';
const COLOR_NEGRO = '#111113';
const COLOR_VERDE = '#0b6b3a';

/* ==========================================
   ESTADO
   ========================================== */

let fichas = FICHAS_INICIALES;   // se conserva al salir y volver al juego
let historial = [];              // últimos números que salieron
let rotacion = 0;                // rotación actual de la rueda (radianes)
let girando = false;
let tipoApuesta = 'rojo';
let monto = MINIMO;

/* ==========================================
   PUNTO DE ENTRADA
   ========================================== */

/**
 * Renderiza el minijuego de Ruleta de Casino
 * dentro de #juego-container.
 */
export function renderizarRuletaCasino() {
    const cont = document.getElementById('juego-container');
    if (!cont) return;

    girando = false;
    tipoApuesta = 'rojo';
    monto = MINIMO;

    cont.innerHTML = `
        <div class="rc-juego">
            <h4 class="rc-titulo">🎰 Ruleta de Casino</h4>
            <p class="rc-subtitulo">Apuesta tus fichas y mira dónde cae. ¿Podrás vencer a la casa?</p>

            <div class="rc-rueda">
                <canvas id="rc-canvas" aria-label="Rueda de la ruleta"></canvas>
            </div>

            <p id="rc-msg" class="rc-msg" role="status" aria-live="polite">Elige una apuesta y gira.</p>
            <div id="rc-hist" class="rc-hist" aria-label="Últimos números"></div>

            <div class="rc-panel">
                <div class="rc-saldo">
                    <span>Fichas</span>
                    <strong id="rc-saldo">${fichas}</strong>
                </div>

                <div>
                    <span class="rc-grupo-titulo">Apuesta a</span>
                    <div class="rc-fila" id="rc-tipos" role="group" aria-label="Tipo de apuesta">
                        <button class="rc-opt" type="button" data-tipo="rojo" aria-pressed="true">Rojo</button>
                        <button class="rc-opt" type="button" data-tipo="negro" aria-pressed="false">Negro</button>
                        <button class="rc-opt" type="button" data-tipo="par" aria-pressed="false">Par</button>
                        <button class="rc-opt" type="button" data-tipo="impar" aria-pressed="false">Impar</button>
                        <button class="rc-opt" type="button" data-tipo="num" aria-pressed="false">Número</button>
                        <input class="rc-num" id="rc-num" type="number" min="0" max="36" value="7" hidden
                               aria-label="Número del 0 al 36">
                    </div>
                </div>

                <div>
                    <span class="rc-grupo-titulo">Fichas a apostar</span>
                    <div class="rc-fila" id="rc-montos" role="group" aria-label="Fichas a apostar">
                        ${MONTOS.map((m, i) => `
                            <button class="rc-opt" type="button" data-monto="${m}" aria-pressed="${i === 0}">${m}</button>
                        `).join('')}
                    </div>
                </div>

                <button class="btn btn-primary btn-block" type="button" id="rc-girar">
                    <i class="fa-solid fa-rotate"></i> Girar
                </button>
                <button class="btn btn-secondary btn-sm" type="button" id="rc-reiniciar" hidden>
                    <i class="fa-solid fa-eraser"></i> Reiniciar fichas
                </button>
            </div>
        </div>
    `;

    // Preparar el canvas (nítido en pantallas retina)
    const canvas = cont.querySelector('#rc-canvas');
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvas.height = TAM * dpr;
    ctx.scale(dpr, dpr);
    dibujarRueda(ctx, rotacion);

    pintarHistorial(cont);
    actualizarControles(cont);
    conectarEventos(cont, canvas, ctx);
}

/* ==========================================
   EVENTOS
   ========================================== */

function conectarEventos(cont, canvas, ctx) {
    cont.querySelector('#rc-tipos').addEventListener('click', (e) => {
        const btn = e.target.closest('.rc-opt');
        if (!btn || girando) return;
        tipoApuesta = btn.dataset.tipo;
        marcarSeleccion(e.currentTarget, btn);
        cont.querySelector('#rc-num').hidden = tipoApuesta !== 'num';
    });

    cont.querySelector('#rc-montos').addEventListener('click', (e) => {
        const btn = e.target.closest('.rc-opt');
        if (!btn || girando) return;
        monto = Number(btn.dataset.monto);
        marcarSeleccion(e.currentTarget, btn);
        actualizarControles(cont);
    });

    cont.querySelector('#rc-girar').addEventListener('click', () => girar(cont, canvas, ctx));

    cont.querySelector('#rc-reiniciar').addEventListener('click', () => {
        fichas = FICHAS_INICIALES;
        mostrarMensaje(cont, 'Fichas reiniciadas. ¡Suerte!');
        actualizarControles(cont);
    });
}

function marcarSeleccion(grupo, botonActivo) {
    grupo.querySelectorAll('.rc-opt').forEach(b => {
        b.setAttribute('aria-pressed', String(b === botonActivo));
    });
}

/* ==========================================
   GIRAR
   ========================================== */

function girar(cont, canvas, ctx) {
    if (girando) return;

    // Validar el número elegido (si apuesta a un número exacto)
    let numeroElegido = null;
    if (tipoApuesta === 'num') {
        const texto = cont.querySelector('#rc-num').value.trim();
        numeroElegido = Number(texto);
        if (texto === '' || !Number.isInteger(numeroElegido) || numeroElegido < 0 || numeroElegido > 36) {
            mostrarNotificacion('Escribe un número entero entre 0 y 36', 'error');
            return;
        }
    }

    if (fichas < monto) {
        mostrarNotificacion('No te alcanzan las fichas. Baja la apuesta.', 'error');
        return;
    }

    // Se descuenta la apuesta al empezar
    const apuesta = monto;
    const tipo = tipoApuesta;
    fichas -= apuesta;
    girando = true;
    actualizarControles(cont);
    mostrarMensaje(cont, 'Girando…');
    reproducirSonido('ficha', 0.4);

    // Se elige el ganador y luego se calcula cuánto girar para que caiga ahí
    const ganador = Math.floor(Math.random() * ORDEN.length);
    const indice = ORDEN.indexOf(ganador);
    const actual = ((rotacion % TAU) + TAU) % TAU;
    const delta = (((-indice * SEG - actual) % TAU) + TAU) % TAU;

    const reducir = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const vueltas = reducir ? 1 : 5 + Math.floor(Math.random() * 3);
    const duracion = reducir ? 700 : 4800;

    const inicio = rotacion;
    const destino = rotacion + vueltas * TAU + delta;
    const t0 = performance.now();

    function paso(ahora) {
        // Si el estudiante salió del juego mientras giraba, se resuelve sin dibujar
        if (!canvas.isConnected) {
            rotacion = destino;
            terminar(null, ganador, apuesta, tipo, numeroElegido);
            return;
        }

        const t = Math.min((ahora - t0) / duracion, 1);
        rotacion = inicio + (destino - inicio) * (1 - Math.pow(1 - t, 3)); // frena al final
        dibujarRueda(ctx, rotacion);

        if (t < 1) {
            requestAnimationFrame(paso);
        } else {
            terminar(cont, ganador, apuesta, tipo, numeroElegido);
        }
    }
    requestAnimationFrame(paso);
}

/* ==========================================
   RESULTADO
   ========================================== */

function terminar(cont, ganador, apuesta, tipo, numeroElegido) {
    girando = false;

    const recibido = calcularPago(ganador, tipo, apuesta, numeroElegido);
    fichas += recibido;

    historial.unshift(ganador);
    historial = historial.slice(0, 10);

    if (!cont) return; // ya salió del juego: solo se guardó el saldo

    const color = ganador === 0 ? 'verde' : ROJOS.has(ganador) ? 'rojo' : 'negro';
    const gano = recibido > 0;

    if (gano) {
        mostrarMensaje(cont, `Salió el ${ganador} (${color}). ¡Ganaste ${recibido - apuesta} fichas!`, 'gana');
        lanzarConfeti(40);
        reproducirSonido('jackpot', 0.6);
    } else {
        mostrarMensaje(cont, `Salió el ${ganador} (${color}). Perdiste ${apuesta} fichas.`, 'pierde');
        reproducirSonido('buzzer', 0.4);
    }

    pintarHistorial(cont);
    actualizarControles(cont);
}

/**
 * Devuelve el total que recibe el jugador (0 si pierde).
 * Rojo/negro/par/impar pagan 1 a 1. Un número exacto paga 35 a 1.
 * Si sale el 0 pierden todas las apuestas excepto la del 0.
 */
function calcularPago(ganador, tipo, apuesta, numeroElegido) {
    if (tipo === 'num') return ganador === numeroElegido ? apuesta * 36 : 0;
    if (ganador === 0) return 0;

    const rojo = ROJOS.has(ganador);
    const gana =
        tipo === 'rojo' ? rojo :
        tipo === 'negro' ? !rojo :
        tipo === 'par' ? ganador % 2 === 0 :
        ganador % 2 === 1;

    return gana ? apuesta * 2 : 0;
}

/* ==========================================
   ACTUALIZAR PANTALLA
   ========================================== */

function mostrarMensaje(cont, texto, clase = '') {
    const msg = cont.querySelector('#rc-msg');
    if (!msg) return;
    msg.textContent = texto;
    msg.className = 'rc-msg' + (clase ? ` rc-${clase}` : '');
}

function actualizarControles(cont) {
    const saldoEl = cont.querySelector('#rc-saldo');
    const btnGirar = cont.querySelector('#rc-girar');
    const btnReiniciar = cont.querySelector('#rc-reiniciar');
    if (saldoEl) saldoEl.textContent = fichas;
    if (btnGirar) btnGirar.disabled = girando || fichas < monto;
    if (btnReiniciar) btnReiniciar.hidden = fichas >= MINIMO;
}

function pintarHistorial(cont) {
    const hist = cont.querySelector('#rc-hist');
    if (!hist) return;
    hist.innerHTML = historial.map(n => {
        const color = n === 0 ? COLOR_VERDE : ROJOS.has(n) ? COLOR_ROJO : COLOR_NEGRO;
        return `<span class="rc-bola" style="background:${color}">${n}</span>`;
    }).join('');
}

/* ==========================================
   DIBUJAR LA RUEDA
   ========================================== */

function colorDe(n) {
    return n === 0 ? COLOR_VERDE : ROJOS.has(n) ? COLOR_ROJO : COLOR_NEGRO;
}

function dibujarRueda(ctx, rot) {
    ctx.clearRect(0, 0, TAM, TAM);
    ctx.save();
    ctx.translate(RADIO, RADIO);

    // Borde dorado
    ctx.beginPath(); ctx.arc(0, 0, RADIO - 2, 0, TAU); ctx.fillStyle = '#3a2a12'; ctx.fill();
    ctx.beginPath(); ctx.arc(0, 0, RADIO - 8, 0, TAU); ctx.fillStyle = ORO; ctx.fill();

    // Casillas (giran con la rueda)
    ctx.rotate(rot);
    const rExt = RADIO - 16;
    const rInt = RADIO - 84;

    ORDEN.forEach((n, i) => {
        const a0 = -Math.PI / 2 + (i - 0.5) * SEG;
        const a1 = a0 + SEG;

        ctx.beginPath();
        ctx.arc(0, 0, rExt, a0, a1);
        ctx.arc(0, 0, rInt, a1, a0, true);
        ctx.closePath();
        ctx.fillStyle = colorDe(n);
        ctx.fill();
        ctx.strokeStyle = ORO;
        ctx.lineWidth = 1;
        ctx.stroke();

        // Número
        ctx.save();
        ctx.rotate(-Math.PI / 2 + i * SEG);
        ctx.translate((rExt + rInt) / 2 + 6, 0);
        ctx.rotate(Math.PI / 2);
        ctx.fillStyle = MARFIL;
        ctx.font = '600 15px Georgia, serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(n, 0, 0);
        ctx.restore();
    });

    // Centro
    ctx.beginPath(); ctx.arc(0, 0, rInt - 6, 0, TAU);
    ctx.fillStyle = '#0a0a0c'; ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = ORO; ctx.stroke();
    ctx.restore();

    // Marcador fijo arriba: señala el número ganador
    ctx.beginPath();
    ctx.moveTo(RADIO - 13, 0);
    ctx.lineTo(RADIO + 13, 0);
    ctx.lineTo(RADIO, 34);
    ctx.closePath();
    ctx.fillStyle = MARFIL; ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = '#3a2a12'; ctx.stroke();
}
