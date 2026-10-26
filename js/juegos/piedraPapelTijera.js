/* Minijuego: Piedra, papel o tijera */

import { mostrarNotificacion } from '../utils.js';
import { reproducirSonido } from '../sonidos.js';
import { lanzarConfeti } from '../confeti.js';

/* OPCIONES */

const OPCIONES = {
    piedra: { emoji: '🪨', nombre: 'Piedra', vence: 'tijera' },
    papel: { emoji: '📄', nombre: 'Papel', vence: 'piedra' },
    tijera: { emoji: '✂️', nombre: 'Tijera', vence: 'papel' }
};

/* ESTADO */

let victorias = 0;
let derrotas = 0;
let empates = 0;

/* PUNTO DE ENTRADA */

/**
 * Renderiza el minijuego de Piedra, papel o tijera.
 */
export function renderizarPiedraPapelTijera() {
    const cont = document.getElementById('juego-container');
    if (!cont) return;

    cont.innerHTML = `
        <div class="juego-ppt">
            <h4 class="juego-ppt-titulo">✊✋✌️ Piedra, Papel o Tijera</h4>
            <p class="juego-ppt-subtitulo">Elige tu jugada y derrota a la casa</p>

            <!-- Marcador -->
            <div class="ppt-marcador">
                <div class="ppt-marcador-item">
                    <div class="ppt-marcador-label">Tú</div>
                    <div class="ppt-marcador-valor" id="ppt-victorias">0</div>
                </div>
                <div class="ppt-marcador-vs">VS</div>
                <div class="ppt-marcador-item">
                    <div class="ppt-marcador-label">Casa</div>
                    <div class="ppt-marcador-valor" id="ppt-derrotas">0</div>
                </div>
            </div>

            <!-- Resultado -->
            <div class="ppt-resultado">
                <div class="ppt-resultado-item">
                    <div class="ppt-resultado-label">Tú</div>
                    <div class="ppt-resultado-emoji" id="ppt-tu-emoji">❓</div>
                </div>
                <div class="ppt-resultado-item">
                    <div class="ppt-resultado-label">Casa</div>
                    <div class="ppt-resultado-emoji" id="ppt-casa-emoji">❓</div>
                </div>
            </div>

            <!-- Mensaje -->
            <div class="ppt-resultado-mensaje" id="ppt-mensaje"></div>

            <!-- Opciones -->
            <div class="ppt-opciones" id="ppt-opciones">
                <button class="ppt-opcion" data-opcion="piedra" title="Piedra">🪨</button>
                <button class="ppt-opcion" data-opcion="papel" title="Papel">📄</button>
                <button class="ppt-opcion" data-opcion="tijera" title="Tijera">✂️</button>
            </div>

            <!-- Botón reiniciar -->
            <button class="btn btn-secondary ppt-reiniciar" type="button" id="ppt-reiniciar">
                <i class="fa-solid fa-rotate"></i> Reiniciar Marcador
            </button>
        </div>
    `;

    // Conectar eventos
    conectarEventos();
}

/* EVENTOS */

function conectarEventos() {
    // Botones de opción
    document.querySelectorAll('.ppt-opcion').forEach(btn => {
        btn.addEventListener('click', () => {
            const opcionUsuario = btn.dataset.opcion;
            jugar(opcionUsuario);
        });
    });

    // Botón reiniciar
    document.getElementById('ppt-reiniciar')?.addEventListener('click', () => {
        victorias = 0;
        derrotas = 0;
        empates = 0;
        actualizarMarcador();
        document.getElementById('ppt-tu-emoji').textContent = '❓';
        document.getElementById('ppt-casa-emoji').textContent = '❓';
        document.getElementById('ppt-mensaje').textContent = '';
        document.getElementById('ppt-mensaje').className = 'ppt-resultado-mensaje';
        mostrarNotificacion('Marcador reiniciado');
    });
}

/* LÓGICA DEL JUEGO */

function jugar(opcionUsuario) {
    // Elegir opción de la casa al azar
    const opcionesKeys = Object.keys(OPCIONES);
    const opcionCasa = opcionesKeys[Math.floor(Math.random() * opcionesKeys.length)];

    // Mostrar emojis
    document.getElementById('ppt-tu-emoji').textContent = OPCIONES[opcionUsuario].emoji;
    document.getElementById('ppt-casa-emoji').textContent = OPCIONES[opcionCasa].emoji;

    // Determinar ganador
    const mensajeEl = document.getElementById('ppt-mensaje');
    let mensaje = '';
    let clase = '';

    if (opcionUsuario === opcionCasa) {
        mensaje = '¡Empate!';
        clase = 'empate';
        empates++;
        reproducirSonido('ficha', 0.3);
    } else if (OPCIONES[opcionUsuario].vence === opcionCasa) {
        mensaje = '¡Ganaste! 🎉';
        clase = 'ganaste';
        victorias++;
        lanzarConfeti(30);
        reproducirSonido('jackpot', 0.5);
    } else {
        mensaje = '¡Perdiste! 💀';
        clase = 'perdiste';
        derrotas++;
        reproducirSonido('buzzer', 0.4);
    }

    mensajeEl.textContent = mensaje;
    mensajeEl.className = `ppt-resultado-mensaje ${clase}`;

    // Actualizar marcador
    actualizarMarcador();
}

function actualizarMarcador() {
    document.getElementById('ppt-victorias').textContent = victorias;
    document.getElementById('ppt-derrotas').textContent = derrotas;
}