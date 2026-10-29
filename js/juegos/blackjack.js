/* ============================================
   JUEGOS/BLACKJACK.JS
   Minijuego: Blackjack (21)
   ============================================ */

import { mostrarNotificacion } from '../utils.js';
import { reproducirSonido } from '../sonidos.js';
import { lanzarConfeti } from '../confeti.js';

/* ==========================================
   CONFIGURACIÓN
   ========================================== */

const PALOS = ['♠', '♥', '♦', '♣'];
const VALORES = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

/* ==========================================
   ESTADO
   ========================================== */

let baraja = [];
let manoJugador = [];
let manoCasa = [];
let juegoTerminado = false;
let cartaOcultaVisible = true;
let victorias = 0;
let derrotas = 0;
let empates = 0;

/* ==========================================
   PUNTO DE ENTRADA
   ========================================== */

/**
 * Renderiza el minijuego de Blackjack.
 */
export function renderizarBlackjack() {
    const cont = document.getElementById('juego-container');
    if (!cont) return;

    cont.innerHTML = `
        <div class="juego-blackjack">
            <h4 class="juego-blackjack-titulo">🃏 Blackjack (21)</h4>
            <p class="juego-blackjack-subtitulo">Acércate a 21 sin pasarte. ¿Podrás vencer a la casa?</p>

            <!-- Barra superior: marcador + botones -->
            <div class="blackjack-barra-superior">
                <div class="blackjack-marcador">
                    <div class="ppt-marcador-item">
                        <div class="ppt-marcador-label">Ganadas</div>
                        <div class="ppt-marcador-valor" id="bj-victorias">0</div>
                    </div>
                    <div class="ppt-marcador-vs">VS</div>
                    <div class="ppt-marcador-item">
                        <div class="ppt-marcador-label">Perdidas</div>
                        <div class="ppt-marcador-valor" id="bj-derrotas">0</div>
                    </div>
                </div>
                <div style="display: flex; gap: 0.5rem; justify-content: center; flex-wrap: wrap; margin-top: 0.75rem;">
                    <button class="btn btn-primary" type="button" id="bj-repartir">
                        <i class="fa-solid fa-hand-holding"></i> Repartir
                    </button>
                    <button class="btn btn-secondary" type="button" id="bj-reiniciar-marcador">
                        <i class="fa-solid fa-eraser"></i> Reiniciar Marcador
                    </button>
                </div>
            </div>

            <!-- Tapete -->
            <div class="blackjack-tapete">
                <div class="blackjack-tapete-grid">
                    <div class="blackjack-tapete-manos">
                        <div class="blackjack-seccion">
                            <div class="blackjack-seccion-titulo">🏦 Casa</div>
                            <div class="blackjack-mano" id="bj-mano-casa"></div>
                            <div class="blackjack-total" id="bj-total-casa">0</div>
                        </div>

                        <div class="blackjack-seccion">
                            <div class="blackjack-seccion-titulo">👤 Tú</div>
                            <div class="blackjack-mano" id="bj-mano-jugador"></div>
                            <div class="blackjack-total" id="bj-total-jugador">0</div>
                        </div>
                    </div>

                    <div class="blackjack-tapete-baraja">
                        <div class="blackjack-baraja" id="bj-baraja">
                            <div class="blackjack-baraja-cartas" id="bj-baraja-cartas"></div>
                            <div class="blackjack-baraja-label">
                                <span id="bj-baraja-contador">52</span>
                                <i class="fa-solid fa-layer-group"></i>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="blackjack-botones" id="bj-botones">
                    <button class="btn btn-success" type="button" id="bj-pedir" disabled>
                        <i class="fa-solid fa-plus"></i> Pedir Carta
                    </button>
                    <button class="btn btn-warning" type="button" id="bj-quedarse" disabled>
                        <i class="fa-solid fa-hand"></i> Quedarse
                    </button>
                </div>

                <div class="blackjack-resultado" id="bj-resultado"></div>
            </div>
        </div>
    `;

    inicializarJuegoVacio();
    conectarEventos();
}

/* ==========================================
   INICIALIZAR JUEGO VACÍO
   ========================================== */

function inicializarJuegoVacio() {
    baraja = crearBaraja();
    manoJugador = [];
    manoCasa = [];
    juegoTerminado = true;
    cartaOcultaVisible = true;

    document.getElementById('bj-mano-jugador').innerHTML = '';
    document.getElementById('bj-mano-casa').innerHTML = '';
    document.getElementById('bj-total-jugador').textContent = '0';
    document.getElementById('bj-total-casa').textContent = '0';
    document.getElementById('bj-total-jugador').className = 'blackjack-total';
    document.getElementById('bj-total-casa').className = 'blackjack-total';

    const resultadoEl = document.getElementById('bj-resultado');
    if (resultadoEl) {
        resultadoEl.textContent = '';
        resultadoEl.className = 'blackjack-resultado';
    }

    actualizarBaraja();

    document.getElementById('bj-pedir').disabled = true;
    document.getElementById('bj-quedarse').disabled = true;
    document.getElementById('bj-repartir').disabled = false;
}

/* ==========================================
   BARAJA
   ========================================== */

function crearBaraja() {
    const nuevaBaraja = [];
    PALOS.forEach(palo => {
        VALORES.forEach(valor => {
            nuevaBaraja.push({ valor, palo });
        });
    });
    return mezclar(nuevaBaraja);
}

function mezclar(array) {
    const copia = [...array];
    for (let i = copia.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copia[i], copia[j]] = [copia[j], copia[i]];
    }
    return copia;
}

function robarCarta() {
    const carta = baraja.pop();
    actualizarBaraja();
    return carta;
}

/* ==========================================
   BARAJA VISUAL
   ========================================== */

function actualizarBaraja() {
    const contenedor = document.getElementById('bj-baraja-cartas');
    const contador = document.getElementById('bj-baraja-contador');
    if (!contenedor) return;

    const cartasAMostrar = Math.min(4, baraja.length);

    let html = '';
    for (let i = 0; i < cartasAMostrar; i++) {
        html += '<div class="carta-mazo"></div>';
    }
    contenedor.innerHTML = html;

    if (contador) {
        contador.textContent = baraja.length;
    }
}

/* ==========================================
   VALOR DE LAS CARTAS
   ========================================== */

function calcularTotal(mano) {
    let total = 0;
    let ases = 0;

    mano.forEach(carta => {
        if (carta.valor === 'A') {
            total += 11;
            ases++;
        } else if (['J', 'Q', 'K'].includes(carta.valor)) {
            total += 10;
        } else {
            total += parseInt(carta.valor, 10);
        }
    });

    while (total > 21 && ases > 0) {
        total -= 10;
        ases--;
    }

    return total;
}

/* ==========================================
   REPARTIR
   ========================================== */

function repartirCartasIniciales() {
    console.log('🎰 Repartiendo...');

    baraja = crearBaraja();
    manoJugador = [];
    manoCasa = [];
    juegoTerminado = false;
    cartaOcultaVisible = true;

    const resultadoEl = document.getElementById('bj-resultado');
    if (resultadoEl) {
        resultadoEl.textContent = '';
        resultadoEl.className = 'blackjack-resultado';
    }

    document.getElementById('bj-mano-jugador').innerHTML = '';
    document.getElementById('bj-mano-casa').innerHTML = '';
    document.getElementById('bj-total-jugador').textContent = '0';
    document.getElementById('bj-total-casa').textContent = '0';
    document.getElementById('bj-total-jugador').className = 'blackjack-total';
    document.getElementById('bj-total-casa').className = 'blackjack-total';

    document.getElementById('bj-pedir').disabled = false;
    document.getElementById('bj-quedarse').disabled = false;
    document.getElementById('bj-repartir').disabled = true;

    // Repartir 2 cartas a cada uno
    manoJugador.push(robarCarta());
    manoCasa.push(robarCarta());
    manoJugador.push(robarCarta());
    manoCasa.push(robarCarta());

    renderizarManos();
    actualizarBaraja();

    // Verificar Blackjack natural
    const totalJugador = calcularTotal(manoJugador);
    if (totalJugador === 21) {
        setTimeout(() => terminarJuego(), 500);
    }
}

/* ==========================================
   RENDERIZADO DE MANOS
   ========================================== */

function renderizarManos() {
    const manoJugadorEl = document.getElementById('bj-mano-jugador');
    const manoCasaEl = document.getElementById('bj-mano-casa');

    // Mano del jugador
    if (manoJugadorEl) {
        manoJugadorEl.innerHTML = manoJugador.map((carta, i) => {
            const esUltima = i === manoJugador.length - 1;
            return renderizarCarta(carta, false, esUltima);
        }).join('');
    }

    // Mano de la casa
    if (manoCasaEl) {
        manoCasaEl.innerHTML = manoCasa.map((carta, i) => {
            const oculta = (i === 1) && cartaOcultaVisible;
            const esUltima = i === manoCasa.length - 1;
            return renderizarCarta(carta, oculta, esUltima);
        }).join('');
    }

    // Total jugador
    actualizarTotal('jugador', calcularTotal(manoJugador));

    // Total casa
    if (cartaOcultaVisible && manoCasa.length >= 2) {
        const primeraCarta = manoCasa[0];
        let valorPrimera = 0;
        if (primeraCarta.valor === 'A') valorPrimera = 11;
        else if (['J', 'Q', 'K'].includes(primeraCarta.valor)) valorPrimera = 10;
        else valorPrimera = parseInt(primeraCarta.valor, 10);

        document.getElementById('bj-total-casa').textContent = `${valorPrimera} + ?`;
        document.getElementById('bj-total-casa').className = 'blackjack-total';
    } else {
        actualizarTotal('casa', calcularTotal(manoCasa));
    }
}

function renderizarCarta(carta, oculta, animar = false) {
    const claseAnimacion = animar ? 'carta-nueva' : '';

    if (oculta) {
        return `<div class="carta oculta ${claseAnimacion}"></div>`;
    }

    const esRojo = ['♥', '♦'].includes(carta.palo);
    const claseColor = esRojo ? 'rojo' : 'negro';

    return `
        <div class="carta ${claseColor} ${claseAnimacion}">
            <div class="carta-esquina">
                <span class="carta-valor">${carta.valor}</span>
                <span class="carta-palo">${carta.palo}</span>
            </div>
            <div class="carta-centro">${carta.palo}</div>
            <div class="carta-esquina abajo">
                <span class="carta-valor">${carta.valor}</span>
                <span class="carta-palo">${carta.palo}</span>
            </div>
        </div>
    `;
}

function actualizarTotal(quien, total) {
    const el = document.getElementById(`bj-total-${quien}`);
    if (!el) return;

    el.textContent = total;
    el.classList.remove('pasado', 'veintiuno');

    if (total > 21) {
        el.classList.add('pasado');
    } else if (total === 21) {
        el.classList.add('veintiuno');
    }
}

/* ==========================================
   ACCIONES DEL JUGADOR
   ========================================== */

function pedirCarta() {
    if (juegoTerminado) return;

    manoJugador.push(robarCarta());
    renderizarManos();
    actualizarBaraja();

    const total = calcularTotal(manoJugador);

    if (total > 21 || total === 21) {
        terminarJuego();
    }
}

function quedarse() {
    if (juegoTerminado) return;

    // Deshabilitar botones del jugador
    document.getElementById('bj-pedir').disabled = true;
    document.getElementById('bj-quedarse').disabled = true;

    // ─── TURNO DE LA CASA ───
    turnoCasa();
}

/* ==========================================
   TURNO DE LA CASA (con animación pausada)
   ========================================== */

function turnoCasa() {
    // ─── PASO 1: Revelar la carta oculta ───
    cartaOcultaVisible = false;
    renderizarManos();

    // ─── PASO 2: Pausa para que se vea la carta revelada ───
    setTimeout(() => {
        const totalCasa = calcularTotal(manoCasa);

        // ─── PASO 3: Si tiene 17+, se queda ───
        if (totalCasa >= 17) {
            setTimeout(() => terminarJuego(), 800);
            return;
        }

        // ─── PASO 4: Pedir cartas hasta 17+ ───
        const pedirCartaCasa = () => {
            const total = calcularTotal(manoCasa);

            if (total < 17) {
                setTimeout(() => {
                    manoCasa.push(robarCarta());
                    renderizarManos();
                    actualizarBaraja();

                    // Si se pasó, terminar
                    if (calcularTotal(manoCasa) > 21) {
                        setTimeout(() => terminarJuego(), 800);
                        return;
                    }

                    // Si no se pasó, seguir pidiendo
                    setTimeout(() => pedirCartaCasa(), 800);
                }, 800);
            } else {
                // Llegó a 17+ → terminar
                setTimeout(() => terminarJuego(), 800);
            }
        };

        pedirCartaCasa();
    }, 800);
}

/* ==========================================
   TERMINAR JUEGO
   ========================================== */

function terminarJuego() {
    juegoTerminado = true;
    cartaOcultaVisible = false;

    document.getElementById('bj-pedir').disabled = true;
    document.getElementById('bj-quedarse').disabled = true;
    document.getElementById('bj-repartir').disabled = false;

    // Revelar todas las cartas
    renderizarManos();

    const totalJugador = calcularTotal(manoJugador);
    const totalCasa = calcularTotal(manoCasa);

    const resultadoEl = document.getElementById('bj-resultado');
    let mensaje = '';
    let clase = '';

    if (totalJugador > 21) {
        mensaje = '¡Te pasaste! 💀';
        clase = 'perdiste';
        derrotas++;
        reproducirSonido('buzzer', 0.4);
    } else if (totalCasa > 21) {
        mensaje = '¡La casa se pasó! 🎉';
        clase = 'ganaste';
        victorias++;
        lanzarConfeti(40);
        reproducirSonido('jackpot', 0.6);
    } else if (totalJugador > totalCasa) {
        mensaje = '¡Ganaste! 🎉';
        clase = 'ganaste';
        victorias++;
        lanzarConfeti(40);
        reproducirSonido('jackpot', 0.6);
    } else if (totalJugador < totalCasa) {
        mensaje = '¡Perdiste! 💀';
        clase = 'perdiste';
        derrotas++;
        reproducirSonido('buzzer', 0.4);
    } else {
        mensaje = '¡Empate!';
        clase = 'empate';
        empates++;
        reproducirSonido('ficha', 0.3);
    }

    resultadoEl.textContent = mensaje;
    resultadoEl.className = `blackjack-resultado ${clase}`;

    document.getElementById('bj-victorias').textContent = victorias;
    document.getElementById('bj-derrotas').textContent = derrotas;
}

/* ==========================================
   EVENTOS
   ========================================== */

function conectarEventos() {
    document.getElementById('bj-pedir')?.addEventListener('click', pedirCarta);
    document.getElementById('bj-quedarse')?.addEventListener('click', quedarse);
    document.getElementById('bj-repartir')?.addEventListener('click', repartirCartasIniciales);

    document.getElementById('bj-reiniciar-marcador')?.addEventListener('click', () => {
        victorias = 0;
        derrotas = 0;
        empates = 0;

        document.getElementById('bj-victorias').textContent = '0';
        document.getElementById('bj-derrotas').textContent = '0';

        mostrarNotificacion('Marcador reiniciado');
    });
}