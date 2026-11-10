/* ============================================
   DUELO EN VIVO CON SUPABASE REALTIME
   ============================================ */

import { supabase } from './supabaseClient.js';
import { mostrarNotificacion } from './utils.js';
import { mostrarVista } from './navegacion.js';

let canal = null;
let miRol = null; // 'profesor' o 'estudiante'
let miJugada = null;
let jugadaRivalTemp = null;

/* ============================================
   INICIALIZACIÓN (conecta los botones)
   ============================================ */

/**
 * Conecta los botones de la vista de duelo.
 * Se llama una sola vez desde app.js.
 */
export function inicializarDuelo() {
    console.log('⚔️ Módulo Duelo: inicializando...');

    // Botón "Crear Sala de Duelo" (profesor)
    document.getElementById('btn-crear-sala')?.addEventListener('click', crearSalaDuelo);

    // Botón "Salir del Duelo"
    document.getElementById('btn-salir-duelo')?.addEventListener('click', cerrarDuelo);

    console.log('⚔️ Módulo Duelo: listo');
}

/* ============================================
   1. CREAR SALA (PROFESOR)
   ============================================ */

export function crearSalaDuelo() {
    const codigo = Math.floor(1000 + Math.random() * 9000).toString();

    miRol = 'profesor';
    miJugada = null;
    jugadaRivalTemp = null;

    // ⚠️ CLAVE: navegar a la vista del duelo primero
    mostrarVista('view-duelo');

    // Resetear estados visuales
    document.getElementById('duelo-lobby').classList.add('hidden');
    document.getElementById('duelo-espera').classList.remove('hidden');
    document.getElementById('duelo-juego').classList.add('hidden');
    document.getElementById('duelo-codigo').textContent = codigo;

    conectarAlCanal(codigo);
}

/* ============================================
   2. UNIRSE A SALA (ESTUDIANTE)
   ============================================ */

export function unirseADuelo(codigo) {
    if (!codigo) return;

    miRol = 'estudiante';
    miJugada = null;
    jugadaRivalTemp = null;

    mostrarVista('view-duelo');

    document.getElementById('duelo-lobby').classList.add('hidden');
    document.getElementById('duelo-espera').classList.add('hidden');
    document.getElementById('duelo-juego').classList.add('hidden');

    conectarAlCanal(codigo);
}

/* ============================================
   3. CONEXIÓN AL CANAL DE SUPABASE
   ============================================ */

function conectarAlCanal(codigoSala, rol) {
    if (canal) supabase.removeChannel(canal);

    canal = supabase.channel(`duelo-${codigoSala}`, {
        config: { presence: { key: rol } }
    });

    // ─── Escuchar jugadas del rival ───
    canal.on('broadcast', { event: 'jugada' }, (payload) => {
        if (payload.payload.rol === miRol) return;

        if (miJugada) {
            resolverDuelo(miJugada, payload.payload.jugada);
        } else {
            jugadaRivalTemp = payload.payload.jugada;
            document.getElementById('duelo-mensaje').textContent = "El rival ya jugó. ¡Tu turno!";
        }
    });

    // ─── Escuchar cambios de presencia (sync es más confiable que join) ───
    canal.on('presence', { event: 'sync' }, () => {
        const estado = canal.presenceState();
        const roles = Object.keys(estado);
        const hayProfesor = roles.includes('profesor');
        const hayEstudiante = roles.includes('estudiante');

        console.log('👥 Presence sync:', { hayProfesor, hayEstudiante, roles });

        // Si ambos están conectados → iniciar juego
        if (hayProfesor && hayEstudiante) {
            iniciarInterfazJuego();
        }
    });

    // ─── Suscribirse y hacer track ───
    canal.subscribe(async (status) => {
        console.log('🔌 Estado del canal:', status);

        if (status === 'SUBSCRIBED') {
            // ⚠️ CLAVE: ambos (profesor y estudiante) deben hacer track
            await canal.track({
                rol: rol,
                online_at: new Date().toISOString()
            });
            console.log('✅ Track enviado como', rol);
        }
    });
}

/* ============================================
   4. LÓGICA DEL JUEGO
   ============================================ */

function iniciarInterfazJuego() {
    document.getElementById('duelo-lobby').classList.add('hidden');
    document.getElementById('duelo-espera').classList.add('hidden');
    document.getElementById('duelo-juego').classList.remove('hidden');

    document.getElementById('duelo-mensaje').textContent = "¡Elige tu jugada!";

    document.querySelectorAll('[data-duelo-jugada]').forEach(btn => {
        btn.onclick = () => enviarJugada(btn.dataset.dueloJugada);
    });
}

async function enviarJugada(jugada) {
    if (!canal || miJugada) return;

    miJugada = jugada;
    document.getElementById('duelo-mensaje').textContent = "Esperando al rival...";

    await canal.send({
        type: 'broadcast',
        event: 'jugada',
        payload: { jugada: jugada, rol: miRol }
    });

    if (jugadaRivalTemp) {
        resolverDuelo(miJugada, jugadaRivalTemp);
    }
}

function resolverDuelo(p1, p2) {
    const opciones = { piedra: 'tijera', papel: 'piedra', tijera: 'papel' };
    let resultado = "";

    if (p1 === p2) {
        resultado = "¡Empate!";
    } else if (opciones[p1] === p2) {
        resultado = "¡Ganaste!";
        const ptsEl = document.getElementById(miRol === 'profesor' ? 'duelo-pts-prof' : 'duelo-pts-est');
        ptsEl.textContent = parseInt(ptsEl.textContent) + 1;
    } else {
        resultado = "¡Perdiste!";
        const ptsElRival = document.getElementById(miRol === 'profesor' ? 'duelo-pts-est' : 'duelo-pts-prof');
        ptsElRival.textContent = parseInt(ptsElRival.textContent) + 1;
    }

    document.getElementById('duelo-mensaje').textContent = resultado + ` (Tú: ${p1} vs Rival: ${p2})`;

    setTimeout(() => {
        miJugada = null;
        jugadaRivalTemp = null;
        document.getElementById('duelo-mensaje').textContent = "¡Siguiente ronda! Elige tu jugada.";
    }, 3000);
}

/* ============================================
   5. LIMPIAR AL SALIR
   ============================================ */

export function cerrarDuelo() {
    if (canal) {
        supabase.removeChannel(canal);
        canal = null;
    }
    miRol = null;
    miJugada = null;
    jugadaRivalTemp = null;

    document.getElementById('duelo-lobby').classList.remove('hidden');
    document.getElementById('duelo-espera').classList.add('hidden');
    document.getElementById('duelo-juego').classList.add('hidden');

    // Volver al panel de la carrera (o al que consideres)
    mostrarVista('view-panel-carrera');
}