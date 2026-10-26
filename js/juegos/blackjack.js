/* Minijuego: Blackjack (21) */

import { mostrarNotificacion } from '../utils.js';
import { reproducirSonido } from '../sonidos.js';
import { lanzarConfeti } from '../confeti.js';

/* CONFIGURACIÓN */

const PALOS = ['♠', '♥', '♦', '♣'];
const VALORES = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

/* ESTADO */

let baraja = [];
let manoJugador = [];
let manoCasa = [];
let juegoTerminado = false;
let victorias = 0;
let derrotas = 0;
let empates = 0;

/* PUNTO DE ENTRADA */

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

            <div class="blackjack-barra-superior">
                <!-- Marcador -->
                <div class="blackjack-marcador" style="margin-bottom: 0.75rem;">
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

                <!-- Botones en fila separada -->
                <div style="display: flex; gap: 0.5rem; justify-content: center; flex-wrap: wrap;">
                    <button class="btn btn-primary" type="button" id="bj-nueva-partida">
                        <i class="fa-solid fa-rotate"></i> Nueva Partida
                    </button>
                    <button class="btn btn-secondary" type="button" id="bj-reiniciar-marcador">
                        <i class="fa-solid fa-eraser"></i> Reiniciar Marcador
                    </button>
                </div>
            </div>

            <div class="blackjack-tapete">
                <!-- Casa -->
                <div class="blackjack-seccion">
                    <div class="blackjack-seccion-titulo">🏦 Casa</div>
                    <div class="blackjack-mano" id="bj-mano-casa"></div>
                    <div class="blackjack-total" id="bj-total-casa">0</div>
                </div>

                <!-- Jugador -->
                <div class="blackjack-seccion">
                    <div class="blackjack-seccion-titulo">👤 Tú</div>
                    <div class="blackjack-mano" id="bj-mano-jugador"></div>
                    <div class="blackjack-total" id="bj-total-jugador">0</div>
                </div>

                <!-- Botones DENTRO del tapete -->
                <div class="blackjack-botones" id="bj-botones">
                    <button class="btn btn-success" type="button" id="bj-pedir">
                        <i class="fa-solid fa-plus"></i> Pedir Carta
                    </button>
                    <button class="btn btn-warning" type="button" id="bj-quedarse">
                        <i class="fa-solid fa-hand"></i> Quedarse
                    </button>
                </div>

                <!-- Resultado DENTRO del tapete -->
                <div class="blackjack-resultado" id="bj-resultado"></div>
            </div>
        </div>
    `;

    // Iniciar partida
    nuevaPartida();
    conectarEventos();
}

/* BARAJA */

/**
 * Crea una baraja nueva y la mezcla.
 */
function crearBaraja() {
    const nuevaBaraja = [];
    PALOS.forEach(palo => {
        VALORES.forEach(valor => {
            nuevaBaraja.push({ valor, palo });
        });
    });
    return mezclar(nuevaBaraja);
}

/**
 * Mezcla un array (Fisher-Yates).
 */
function mezclar(array) {
    const copia = [...array];
    for (let i = copia.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copia[i], copia[j]] = [copia[j], copia[i]];
    }
    return copia;
}

/**
 * Roba una carta de la baraja.
 */
function robarCarta() {
    return baraja.pop();
}

/* VALOR DE LAS CARTAS */

/**
 * Calcula el valor total de una mano.
 * El As vale 11 si no se pasa, 1 si se pasa.
 */
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

    // Ajustar ases si se pasa de 21
    while (total > 21 && ases > 0) {
        total -= 10;
        ases--;
    }

    return total;
}

/* PARTIDA */

function nuevaPartida() {
    // Resetear estado
    baraja = crearBaraja();
    manoJugador = [];
    manoCasa = [];
    juegoTerminado = false;

    // Limpiar resultado
    const resultadoEl = document.getElementById('bj-resultado');
    if (resultadoEl) {
        resultadoEl.textContent = '';
        resultadoEl.className = 'blackjack-resultado';
    }

    // Repartir 2 cartas a cada uno
    manoJugador.push(robarCarta());
    manoCasa.push(robarCarta());
    manoJugador.push(robarCarta());
    manoCasa.push(robarCarta());

    // Renderizar
    renderizarManos();

    // Habilitar botones
    document.getElementById('bj-pedir').disabled = false;
    document.getElementById('bj-quedarse').disabled = false;

    // Verificar Blackjack natural
    const totalJugador = calcularTotal(manoJugador);
    if (totalJugador === 21) {
        terminarJuego();
    }
}

function renderizarManos() {
    // Mano del jugador
    const manoJugadorEl = document.getElementById('bj-mano-jugador');
    if (manoJugadorEl) {
        manoJugadorEl.innerHTML = manoJugador.map(carta => renderizarCarta(carta, false)).join('');
    }

    // Mano de la casa (una oculta si el juego no ha terminado)
    const manoCasaEl = document.getElementById('bj-mano-casa');
    if (manoCasaEl) {
        manoCasaEl.innerHTML = manoCasa.map((carta, i) => {
            const oculta = !juegoTerminado && i === 1;
            return renderizarCarta(carta, oculta);
        }).join('');
    }

    // Actualizar totales
    actualizarTotal('jugador', calcularTotal(manoJugador));
    if (juegoTerminado) {
        actualizarTotal('casa', calcularTotal(manoCasa));
    } else {
        // Mostrar solo el valor de la primera carta de la casa
        const primeraCarta = manoCasa[0];
        let valorPrimera = 0;
        if (primeraCarta.valor === 'A') valorPrimera = 11;
        else if (['J', 'Q', 'K'].includes(primeraCarta.valor)) valorPrimera = 10;
        else valorPrimera = parseInt(primeraCarta.valor, 10);
        
        document.getElementById('bj-total-casa').textContent = `${valorPrimera} + ?`;
    }
}

function renderizarCarta(carta, oculta) {
    if (oculta) {
        return `<div class="carta oculta"></div>`;
    }

    const esRojo = ['♥', '♦'].includes(carta.palo);
    const claseColor = esRojo ? 'rojo' : 'negro';

    return `
        <div class="carta ${claseColor}">
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

/* ACCIONES */

function pedirCarta() {
    if (juegoTerminado) return;

    manoJugador.push(robarCarta());
    renderizarManos();

    const total = calcularTotal(manoJugador);

    if (total > 21) {
        // Se pasó
        terminarJuego();
    } else if (total === 21) {
        // 21 exacto
        terminarJuego();
    }
}

function quedarse() {
    if (juegoTerminado) return;

    // La casa pide cartas hasta llegar a 17 o más
    while (calcularTotal(manoCasa) < 17) {
        manoCasa.push(robarCarta());
    }

    terminarJuego();
}

function terminarJuego() {
    juegoTerminado = true;

    // Deshabilitar botones
    document.getElementById('bj-pedir').disabled = true;
    document.getElementById('bj-quedarse').disabled = true;

    // Revelar la carta oculta
    renderizarManos();

    // Calcular totales finales
    const totalJugador = calcularTotal(manoJugador);
    const totalCasa = calcularTotal(manoCasa);

    // Determinar ganador
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

    // Actualizar marcador
    document.getElementById('bj-victorias').textContent = victorias;
    document.getElementById('bj-derrotas').textContent = derrotas;
}

/* EVENTOS */

function conectarEventos() {
    document.getElementById('bj-pedir')?.addEventListener('click', pedirCarta);
    document.getElementById('bj-quedarse')?.addEventListener('click', quedarse);
    document.getElementById('bj-nueva-partida')?.addEventListener('click', nuevaPartida);
}