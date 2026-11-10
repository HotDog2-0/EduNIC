/* ============================================
   DUELO EN VIVO - Piedra, Papel o Tijera
   ============================================ */

import { supabase } from './supabaseClient.js';
import { mostrarNotificacion } from './utils.js';
import { mostrarVista } from './navegacion.js';

let miRol = null;
let miIdDuelo = null;
let suscripcion = null;

/* ============================================
   INICIALIZACIÓN
   ============================================ */

export function inicializarDuelo() {
    console.log('⚔️ Duelo: inicializando...');

    document.getElementById('btn-crear-sala')?.addEventListener('click', crearSala);
    document.getElementById('btn-unirse-duelo')?.addEventListener('click', unirseSala);

    console.log('⚔️ Duelo: listo');
}

/* ============================================
   PROFESOR: CREAR SALA
   ============================================ */

async function crearSala() {
    const codigo = Math.floor(1000 + Math.random() * 9000).toString();
    const id = 'duelo-' + Date.now();

    const { error } = await supabase.from('duelos').insert([{
        id,
        codigo,
        juego: 'ppt',
        jugador1: 'profesor',
        estado: 'esperando'
    }]);

    if (error) {
        mostrarNotificacion('Error al crear sala: ' + error.message, 'error');
        return;
    }

    miRol = 'profesor';
    miIdDuelo = id;

    mostrarVista('view-duelo');
    document.getElementById('duelo-lobby').classList.add('hidden');
    document.getElementById('duelo-espera').classList.remove('hidden');
    document.getElementById('duelo-juego').classList.add('hidden');
    document.getElementById('duelo-codigo').textContent = codigo;

    escucharDuelo(id);
}

/* ============================================
   ESTUDIANTE: UNIRSE
   ============================================ */

async function unirseSala() {
    const input = document.getElementById('duelo-input-codigo');
    const codigo = input?.value.trim();

    if (!codigo || codigo.length !== 4) {
        mostrarNotificacion('Escribe un código de 4 dígitos', 'error');
        return;
    }

    const { data, error } = await supabase
        .from('duelos')
        .select('*')
        .eq('codigo', codigo)
        .eq('estado', 'esperando')
        .maybeSingle();

    if (error || !data) {
        mostrarNotificacion('Código no válido o sala cerrada', 'error');
        return;
    }

    await supabase.from('duelos')
        .update({ jugador2: 'estudiante', estado: 'jugando' })
        .eq('id', data.id);

    miRol = 'estudiante';
    miIdDuelo = data.id;

    mostrarVista('view-duelo');
    document.getElementById('duelo-lobby').classList.add('hidden');
    document.getElementById('duelo-espera').classList.add('hidden');
    document.getElementById('duelo-juego').classList.remove('hidden');

    iniciarPPT();
    escucharDuelo(data.id);
}

/* ============================================
   ESCUCHAR CAMBIOS
   ============================================ */

function escucharDuelo(id) {
    if (suscripcion) supabase.removeChannel(suscripcion);

    suscripcion = supabase
        .channel(`duelo-${id}`)
        .on('postgres_changes',
            { event: 'UPDATE', schema: 'public', table: 'duelos', filter: `id=eq.${id}` },
            (payload) => {
                const fila = payload.new;
                console.log('🔄 Duelo actualizado:', fila);

                // Profesor: cuando el estudiante se une, iniciar juego
                if (fila.jugador2 && fila.estado === 'jugando' && miRol === 'profesor') {
                    document.getElementById('duelo-espera').classList.add('hidden');
                    document.getElementById('duelo-juego').classList.remove('hidden');
                    iniciarPPT();
                }

                // ¿Hay ganador?
                if (fila.ganador) {
                    mostrarResultado(fila);
                }
            }
        )
        .subscribe();
}

/* ============================================
   JUEGO: PIEDRA, PAPEL O TIJERA
   ============================================ */

function iniciarPPT() {
    const cont = document.getElementById('duelo-juego');
    if (!cont) return;

    cont.innerHTML = `
        <div class="resultados-resumen" style="justify-content: center; gap: 2rem; margin-bottom: 1rem;">
            <div class="resultado-stat">
                <div class="resultado-stat-info">
                    <div class="resultado-stat-etiqueta">Profesor</div>
                    <div class="resultado-stat-valor" id="duelo-pts-prof">0</div>
                </div>
            </div>
            <div class="resultado-stat">
                <div class="resultado-stat-info">
                    <div class="resultado-stat-etiqueta">Estudiante</div>
                    <div class="resultado-stat-valor" id="duelo-pts-est">0</div>
                </div>
            </div>
        </div>
        <h3 id="duelo-mensaje">¡Elige tu jugada!</h3>
        <div class="ppt-opciones margin-top" style="display: flex; justify-content: center; gap: 1rem;">
            <button class="ppt-opcion" data-ppt="piedra">🪨</button>
            <button class="ppt-opcion" data-ppt="papel">📄</button>
            <button class="ppt-opcion" data-ppt="tijera">✂️</button>
        </div>
        <button class="btn btn-secondary margin-top" type="button" id="btn-salir-duelo">Salir del Duelo</button>
    `;

    document.querySelectorAll('[data-ppt]').forEach(btn => {
        btn.onclick = () => enviarJugadaPPT(btn.dataset.ppt);
    });
    document.getElementById('btn-salir-duelo')?.addEventListener('click', salirDuelo);
}

async function enviarJugadaPPT(jugada) {
    const campo = miRol === 'profesor' ? 'jugada1' : 'jugada2';
    await supabase.from('duelos')
        .update({ [campo]: { tipo: 'ppt', valor: jugada } })
        .eq('id', miIdDuelo);

    document.getElementById('duelo-mensaje').textContent = `Elegiste ${jugada}. Esperando al rival...`;
    await comprobarResultadoPPT();
}

async function comprobarResultadoPPT() {
    const { data } = await supabase
        .from('duelos')
        .select('*')
        .eq('id', miIdDuelo)
        .maybeSingle();

    if (!data || !data.jugada1 || !data.jugada2) return;

    const j1 = data.jugada1.valor;
    const j2 = data.jugada2.valor;
    const opciones = { piedra: 'tijera', papel: 'piedra', tijera: 'papel' };
    let ganador;

    if (j1 === j2) ganador = 'empate';
    else if (opciones[j1] === j2) ganador = 'profesor';
    else ganador = 'estudiante';

    await supabase.from('duelos')
        .update({ ganador, estado: 'terminado' })
        .eq('id', miIdDuelo);
}

function mostrarResultado(fila) {
    let texto = '';
    if (fila.ganador === 'empate') texto = '¡Empate!';
    else if (fila.ganador === miRol) texto = '¡Ganaste! 🎉';
    else texto = '¡Perdiste! 💀';

    const miJugada = miRol === 'profesor' ? fila.jugada1?.valor : fila.jugada2?.valor;
    const rivalJugada = miRol === 'profesor' ? fila.jugada2?.valor : fila.jugada1?.valor;

    const mensaje = document.getElementById('duelo-mensaje');
    if (mensaje) {
        mensaje.textContent = `${texto} — Tú: ${miJugada || '?'} vs Rival: ${rivalJugada || '?'}`;
    }
}

/* ============================================
   SALIR
   ============================================ */

async function salirDuelo() {
    if (suscripcion) { supabase.removeChannel(suscripcion); suscripcion = null; }
    if (miIdDuelo) {
        await supabase.from('duelos')
            .update({ estado: 'terminado' })
            .eq('id', miIdDuelo);
    }
    miRol = null;
    miIdDuelo = null;

    document.getElementById('duelo-lobby').classList.remove('hidden');
    document.getElementById('duelo-espera').classList.add('hidden');
    document.getElementById('duelo-juego').classList.add('hidden');
    mostrarVista('view-panel-carrera');
}