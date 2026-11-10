/* ============================================
   DUELO EN VIVO - Piedra, Papel o Tijera
   ============================================ */

import { supabase } from './supabaseClient.js';
import { mostrarNotificacion } from './utils.js';
import { mostrarVista } from './navegacion.js';

let miRol = null;
let miIdDuelo = null;
let suscripcion = null;
let jugadaEnviada = false;

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
    jugadaEnviada = false;

    console.log('✅ Profesor: miRol =', miRol, '· miIdDuelo =', miIdDuelo);

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
    jugadaEnviada = false;

    console.log('✅ Estudiante: miRol =', miRol, '· miIdDuelo =', miIdDuelo);

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
                console.log('🔄 Duelo actualizado:', {
                    estado: fila.estado,
                    jugador1: fila.jugador1,
                    jugador2: fila.jugador2,
                    jugada1: fila.jugada1,
                    jugada2: fila.jugada2,
                    ganador: fila.ganador
                });

                if (fila.jugador2 && fila.estado === 'jugando' && miRol === 'profesor' && !document.querySelector('#duelo-juego .ppt-opciones')) {
                    document.getElementById('duelo-espera').classList.add('hidden');
                    document.getElementById('duelo-juego').classList.remove('hidden');
                    iniciarPPT();
                }

                if (fila.ganador && fila.estado === 'terminado') {
                    mostrarResultado(fila);
                }
            }
        )
        .subscribe();
}

/* ============================================
   JUEGO
   ============================================ */

function iniciarPPT() {
    console.log('🎮 iniciarPPT. miIdDuelo:', miIdDuelo, '· miRol:', miRol);

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
    console.log('📤 enviarJugadaPPT: jugada =', jugada, '· miRol =', miRol, '· miIdDuelo =', miIdDuelo);

    if (!miIdDuelo) {
        mostrarNotificacion('Error: no hay duelo activo', 'error');
        return;
    }
    if (jugadaEnviada) {
        mostrarNotificacion('Ya enviaste tu jugada', 'error');
        return;
    }

    jugadaEnviada = true;
    const campo = miRol === 'profesor' ? 'jugada1' : 'jugada2';

    console.log('📝 Actualizando columna:', campo, 'con:', { tipo: 'ppt', valor: jugada });

    // ⚠️ .select() para verificar que el update afectó la fila
    const { data, error } = await supabase.from('duelos')
        .update({ [campo]: { tipo: 'ppt', valor: jugada } })
        .eq('id', miIdDuelo)
        .select();

    console.log('🔍 Resultado del update:', { data, error });

    if (error) {
        mostrarNotificacion('Error al enviar: ' + error.message, 'error');
        jugadaEnviada = false;
        return;
    }

    if (!data || data.length === 0) {
        mostrarNotificacion('Error: el duelo no existe o no se actualizó', 'error');
        jugadaEnviada = false;
        return;
    }

    document.getElementById('duelo-mensaje').textContent = `Elegiste ${jugada}. Esperando al rival...`;
    await comprobarResultadoPPT();
}

async function comprobarResultadoPPT() {
    const { data } = await supabase
        .from('duelos')
        .select('*')
        .eq('id', miIdDuelo)
        .maybeSingle();

    console.log('🔍 comprobarResultadoPPT:', {
        jugada1: data?.jugada1,
        jugada2: data?.jugada2,
        ganador: data?.ganador
    });

    if (!data || !data.jugada1 || !data.jugada2) return;
    if (data.ganador) return;

    const j1 = data.jugada1.valor;
    const j2 = data.jugada2.valor;
    const opciones = { piedra: 'tijera', papel: 'piedra', tijera: 'papel' };
    let ganador;

    if (j1 === j2) ganador = 'empate';
    else if (opciones[j1] === j2) ganador = 'profesor';
    else ganador = 'estudiante';

    console.log('🏆 Ganador calculado:', ganador, '· j1:', j1, '· j2:', j2);

    await supabase.from('duelos')
        .update({ ganador, estado: 'terminado' })
        .eq('id', miIdDuelo)
        .is('ganador', null);
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
    miRol = null;
    miIdDuelo = null;
    jugadaEnviada = false;

    document.getElementById('duelo-lobby').classList.remove('hidden');
    document.getElementById('duelo-espera').classList.add('hidden');
    document.getElementById('duelo-juego').classList.add('hidden');
    mostrarVista('view-panel-carrera');
}