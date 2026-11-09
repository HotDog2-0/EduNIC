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

// --- 1. CREAR SALA (PROFESOR) ---
export function crearSalaDuelo() {
    const codigo = Math.floor(1000 + Math.random() * 9000).toString();
    
    document.getElementById('duelo-lobby').classList.add('hidden');
    document.getElementById('duelo-espera').classList.remove('hidden');
    document.getElementById('duelo-codigo').textContent = codigo;

    miRol = 'profesor';
    miJugada = null;
    jugadaRivalTemp = null;

    conectarAlCanal(codigo);
}

// --- 2. UNIRSE A SALA (ESTUDIANTE) ---
export function unirseADuelo(codigo) {
    if (!codigo) return;
    
    miRol = 'estudiante';
    miJugada = null;
    jugadaRivalTemp = null;

    document.getElementById('duelo-lobby').classList.add('hidden');
    document.getElementById('duelo-espera').classList.add('hidden');
    
    mostrarVista('view-duelo');
    conectarAlCanal(codigo);
}

// --- 3. CONEXIÓN AL CANAL DE SUPABASE ---
function conectarAlCanal(codigoSala) {
    // Desconectar canal anterior si existe
    if (canal) supabase.removeChannel(canal);

    canal = supabase.channel(`duelo-${codigoSala}`, {
        config: { presence: { key: miRol } }
    });

    // Escuchar la jugada del rival
    canal.on('broadcast', { event: 'jugada' }, (payload) => {
        if (payload.payload.rol === miRol) return; // Ignorar mis propios mensajes

        if (miJugada) {
            // Si yo ya jugué, resolvemos el duelo
            resolverDuelo(miJugada, payload.payload.jugada);
        } else {
            // Si el rival jugó primero, guardamos su jugada
            jugadaRivalTemp = payload.payload.jugada;
            document.getElementById('duelo-mensaje').textContent = "El rival ya jugó. ¡Tu turno!";
        }
    });

    // Escuchar cuando alguien se conecta (Presence)
    canal.on('presence', { event: 'join' }, ({ newPresences }) => {
        const seUnioEstudiante = newPresences.some(p => p.key === 'estudiante');
        if (miRol === 'profesor' && seUnioEstudiante) {
            mostrarNotificacion('¡Estudiante conectado!');
            iniciarInterfazJuego();
        }
    });

    // Suscribirse al canal
    canal.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
            if (miRol === 'estudiante') {
                await canal.track({ online_at: new Date().toISOString() });
                iniciarInterfazJuego();
            }
        }
    });
}

// --- 4. LÓGICA DEL JUEGO ---
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

    // Si el rival ya había jugado antes de que yo eligiera
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
    
    // Resetear para la siguiente ronda después de 3 segundos
    setTimeout(() => {
        miJugada = null;
        jugadaRivalTemp = null;
        document.getElementById('duelo-mensaje').textContent = "¡Siguiente ronda! Elige tu jugada.";
    }, 3000);
}

// --- 5. LIMPIAR AL SALIR ---
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
}