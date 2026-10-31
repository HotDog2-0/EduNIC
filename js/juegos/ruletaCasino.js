

import { mostrarNotificacion } from '../utils.js';
import { reproducirSonido, estaSilenciado } from '../sonidos.js';
import { lanzarConfeti } from '../confeti.js';


const ORDEN = [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26];
const ROJOS = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);

const TAU = Math.PI * 2;
const SEG = TAU / ORDEN.length;      
const TAM = 420;                      
const RADIO = TAM / 2;

// Música de fondo (para cambiarla, reemplaza el archivo o cambia esta ruta)
const RUTA_MUSICA = 'assets/sonidos/musica-sala.mp3';
const VOLUMEN_MUSICA = 0.25;
const VOLUMEN_EFECTOS = 0.6;     // sonido generado de la bola (si no hay archivo)

// Sonido real del giro (opcional). Si el archivo existe, la rueda gira
// exactamente lo que dura el audio (entre 3 y 12 segundos).
const RUTA_GIRO = 'assets/sonidos/ruleta-giro.mp3';
const VOLUMEN_GIRO = 0.7;

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

let musica = null;               // objeto Audio, se crea la primera vez
let musicaActiva = false;        // si el estudiante la encendió (se conserva al volver)
let vigilante = null;            // detecta cuando el estudiante sale del juego
let efectoGiro = null;           // audio real del giro (si existe el archivo)
let efectoGiroFalla = false;     // true si el archivo no existe: se usa el sonido generado

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

            <button class="rc-musica" type="button" id="rc-musica" aria-pressed="false">
                <i class="fa-solid fa-music"></i> <span>Música: apagada</span>
            </button>

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

    prepararEfectoGiro();
    vigilarSalida(cont);
    pintarBotonMusica(cont);
    if (musicaActiva) {
        // Si la había encendido antes de salir, vuelve a sonar
        encenderMusica().catch(() => { musicaActiva = false; pintarBotonMusica(cont); });
    }
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

    cont.querySelector('#rc-musica').addEventListener('click', async () => {
        if (musicaActiva) {
            musicaActiva = false;
            musica?.pause();
        } else {
            if (estaSilenciado()) {
                mostrarNotificacion('El sonido está silenciado. Actívalo para escuchar la música.', 'error');
                return;
            }
            try {
                await encenderMusica();
                musicaActiva = true;
            } catch (err) {
                console.warn('No se pudo reproducir la música:', err.message);
                mostrarNotificacion('No se encontró la música (' + RUTA_MUSICA + ')', 'error');
                musicaActiva = false;
            }
        }
        pintarBotonMusica(cont);
    });

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

    // Si silenciaron el sonido de toda la app, la música también se apaga
    if (musicaActiva && estaSilenciado()) {
        musicaActiva = false;
        musica?.pause();
        pintarBotonMusica(cont);
    }

    // Se elige el ganador y luego se calcula cuánto girar para que caiga ahí
    const ganador = Math.floor(Math.random() * ORDEN.length);
    const indice = ORDEN.indexOf(ganador);
    const actual = ((rotacion % TAU) + TAU) % TAU;
    const delta = (((-indice * SEG - actual) % TAU) + TAU) % TAU;

    const reducir = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const vueltas = reducir ? 1 : 5 + Math.floor(Math.random() * 3);
    let duracion = reducir ? 700 : 4800;

    // Si hay audio real, la rueda dura lo mismo que el audio
    const audioReal = reducir ? null : efectoGiroListo();
    if (audioReal) duracion = Math.min(Math.max(audioReal.duration * 1000, 3000), 12000);

    const inicio = rotacion;
    const destino = rotacion + vueltas * TAU + delta;
    const t0 = performance.now();
    let sonidoBola = null;
    if (audioReal && !estaSilenciado()) {
        audioReal.currentTime = 0;
        audioReal.play().catch(() => {});
        sonidoBola = { detener: () => audioReal.pause() };
    } else {
        sonidoBola = iniciarSonidoBola(duracion / 1000);
    }

    function paso(ahora) {
        // Si el estudiante salió del juego mientras giraba, se resuelve sin dibujar
        if (!canvas.isConnected) {
            rotacion = destino;
            sonidoBola?.detener();
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

    // El sonido de ganar/perder entra justo después de que la bola se asienta
    if (gano) {
        mostrarMensaje(cont, `Salió el ${ganador} (${color}). ¡Ganaste ${recibido - apuesta} fichas!`, 'gana');
        lanzarConfeti(40);
        setTimeout(() => reproducirSonido('jackpot', 0.6), 400);
    } else {
        mostrarMensaje(cont, `Salió el ${ganador} (${color}). Perdiste ${apuesta} fichas.`, 'pierde');
        setTimeout(() => reproducirSonido('buzzer', 0.4), 400);
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
   SONIDO DE LA BOLA (generado por código, sin archivos)

   1) La bola rueda rápido por la pista: un zumbido que
      "late" una vez por vuelta y se va haciendo más lento.
   2) Cae y rebota: golpes secos e irregulares que se
      acercan cada vez más hasta que se asienta.
   ========================================== */

let audioCtx = null;
const ruidos = new WeakMap();

function contextoAudio() {
    if (!audioCtx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        audioCtx = new AC();
    }
    if (audioCtx.state === 'suspended') audioCtx.resume();
    return audioCtx;
}

/** Ruido blanco de 2 segundos (una sola vez por contexto de audio). */
function ruidoDe(ctx) {
    if (!ruidos.has(ctx)) {
        const buf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
        const datos = buf.getChannelData(0);
        for (let i = 0; i < datos.length; i++) datos[i] = Math.random() * 2 - 1;
        ruidos.set(ctx, buf);
    }
    return ruidos.get(ctx);
}

/** Un golpe seco de la bola (marfil contra madera). */
function golpe(ctx, destino, t, vol) {
    // chasquido corto
    const ruido = ctx.createBufferSource();
    ruido.buffer = ruidoDe(ctx);
    const filtro = ctx.createBiquadFilter();
    filtro.type = 'bandpass';
    filtro.frequency.value = 2500 + Math.random() * 2500;
    filtro.Q.value = 1.2;
    const g1 = ctx.createGain();
    g1.gain.setValueAtTime(vol * 0.9, t);
    g1.gain.exponentialRampToValueAtTime(0.001, t + 0.03);
    ruido.connect(filtro).connect(g1).connect(destino);
    ruido.start(t, Math.random());
    ruido.stop(t + 0.05);

    // "toc" de la madera
    const osc = ctx.createOscillator();
    const g2 = ctx.createGain();
    const f = 650 + Math.random() * 900;
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(f, t);
    osc.frequency.exponentialRampToValueAtTime(f * 0.6, t + 0.05);
    g2.gain.setValueAtTime(vol * 0.6, t);
    g2.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
    osc.connect(g2).connect(destino);
    osc.start(t);
    osc.stop(t + 0.07);
}

/**
 * Programa todo el sonido de un giro de la duración indicada (segundos).
 * Devuelve un objeto con detener() por si el estudiante sale del juego.
 */
export function generarSonidoBola(ctx, salida, durSeg) {
    const t0 = ctx.currentTime + 0.02;
    const bus = ctx.createGain();
    bus.gain.value = VOLUMEN_EFECTOS;
    const comp = ctx.createDynamicsCompressor();
    bus.connect(comp).connect(salida);

    const escala = Math.min(1, durSeg / 4.8);
    const dRodar = durSeg * 0.74;

    // 1) La bola rodando por la pista (solo en giros largos)
    if (durSeg > 2) {
        const ruido = ctx.createBufferSource();
        ruido.buffer = ruidoDe(ctx);
        ruido.loop = true;

        const banda = ctx.createBiquadFilter();       // zumbido que se vuelve más grave al frenar
        banda.type = 'bandpass';
        banda.Q.value = 0.9;
        banda.frequency.setValueAtTime(3000, t0);
        banda.frequency.exponentialRampToValueAtTime(1100, t0 + dRodar);

        const pulso = ctx.createGain();               // late una vez por vuelta
        pulso.gain.value = 0.6;
        const lfo = ctx.createOscillator();
        lfo.frequency.setValueAtTime(3.4, t0);
        lfo.frequency.exponentialRampToValueAtTime(0.9, t0 + dRodar);
        const profundidad = ctx.createGain();
        profundidad.gain.value = 0.4;
        lfo.connect(profundidad).connect(pulso.gain);

        const env = ctx.createGain();
        env.gain.setValueAtTime(0.0001, t0);
        env.gain.exponentialRampToValueAtTime(0.35, t0 + 0.25);
        env.gain.setValueAtTime(0.35, t0 + dRodar * 0.8);
        env.gain.exponentialRampToValueAtTime(0.14, t0 + dRodar);        // sigue rodando hasta que cae
        env.gain.exponentialRampToValueAtTime(0.001, t0 + dRodar + 0.3);

        ruido.connect(banda).connect(pulso).connect(env).connect(bus);
        ruido.start(t0);
        lfo.start(t0);
        ruido.stop(t0 + dRodar + 0.35);
        lfo.stop(t0 + dRodar + 0.35);
    }

    // 2) La bola cae y rebota: cada golpe llega antes que el anterior
    let t = t0 + (durSeg > 2 ? dRodar : 0);
    let espera = 0.28 * escala;
    let vol = 1;
    while (espera > 0.04 * escala + 0.012) {
        golpe(ctx, bus, t, vol);
        if (Math.random() < 0.3) golpe(ctx, bus, t + 0.02 + Math.random() * 0.012, vol * 0.55); // rebote doble
        t += espera;
        espera *= 0.72;
        vol = Math.max(0.3, vol * 0.87);
    }
    // traqueteo final entre las casillas y asentamiento
    for (let i = 0; i < 3; i++) golpe(ctx, bus, t + i * 0.035 * escala + Math.random() * 0.01, 0.25);
    golpe(ctx, bus, t + 0.14 * escala, 0.2);

    return {
        detener() {
            const ahora = ctx.currentTime;
            bus.gain.cancelScheduledValues(ahora);
            bus.gain.setTargetAtTime(0, ahora, 0.02);
        }
    };
}

/** Carga el audio real del giro. Si el archivo no existe, se usa el sonido generado. */
function prepararEfectoGiro() {
    if (efectoGiro || efectoGiroFalla) return;
    const audio = new Audio(RUTA_GIRO);
    audio.preload = 'auto';
    audio.volume = VOLUMEN_GIRO;
    audio.addEventListener('error', () => { efectoGiroFalla = true; efectoGiro = null; });
    efectoGiro = audio;
}

/** Devuelve el audio real solo si ya cargó y se conoce su duración. */
function efectoGiroListo() {
    const a = efectoGiro;
    return a && !efectoGiroFalla && Number.isFinite(a.duration) && a.duration > 0 ? a : null;
}

function iniciarSonidoBola(durSeg) {
    if (estaSilenciado()) return null;
    const ctx = contextoAudio();
    if (!ctx) return null;
    return generarSonidoBola(ctx, ctx.destination, durSeg);
}

/* ==========================================
   MÚSICA DE FONDO
   ========================================== */

/** Crea (si hace falta) y reproduce la música en bucle. Devuelve una promesa. */
function encenderMusica() {
    if (!musica) {
        musica = new Audio(RUTA_MUSICA);
        musica.loop = true;
        musica.volume = VOLUMEN_MUSICA;
    }
    return musica.play();
}

function pintarBotonMusica(cont) {
    const btn = cont.querySelector('#rc-musica');
    if (!btn) return;
    btn.setAttribute('aria-pressed', String(musicaActiva));
    btn.querySelector('span').textContent = musicaActiva ? 'Música: encendida' : 'Música: apagada';
}

/**
 * Pausa la música cuando el estudiante sale de la ruleta
 * (el contenedor se vacía o cambia a otro juego).
 */
function vigilarSalida(cont) {
    vigilante?.disconnect();
    vigilante = new MutationObserver(() => {
        if (!cont.querySelector('#rc-canvas')) {
            musica?.pause();
            vigilante.disconnect();
        }
    });
    vigilante.observe(cont, { childList: true });
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