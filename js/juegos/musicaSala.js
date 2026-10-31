/* ============================================
   JUEGOS/MUSICASALA.JS
   Música de fondo de la sala de minijuegos
   (la pantalla donde se elige el juego).

   - Suena solo mientras se ve la sala; al entrar a un
     juego se pausa, y al volver continúa.
   - Tiene su propio botón para encenderla o apagarla
     (se recuerda la elección).
   - Se apaga si se silencia el sonido de toda la app.
   ============================================ */

import { estaSilenciado } from '../sonidos.js';

// Archivo de la música (cámbialo si tu archivo se llama distinto)
const RUTA_MUSICA_SALA = 'assets/sonidos/musica-sala.mp3';
const VOLUMEN_SALA = 0.2;
const CLAVE_GUARDADO = 'edunic_musica_sala';

let sala = null;
let boton = null;
let musica = null;
let activa = true;      // elección del estudiante
let falla = false;      // true si no se encontró el archivo

export function inicializarMusicaSala() {
    sala = document.getElementById('juegos-seleccion');
    if (!sala || boton) return;

    try { activa = localStorage.getItem(CLAVE_GUARDADO) !== 'off'; } catch { /* sin almacenamiento */ }

    // Botón encima de las tarjetas de juegos
    boton = document.createElement('button');
    boton.type = 'button';
    boton.className = 'rc-musica';
    boton.style.margin = '0 auto 1rem';
    boton.innerHTML = '<i class="fa-solid fa-music"></i> <span></span>';
    sala.before(boton);

    musica = new Audio(RUTA_MUSICA_SALA);
    musica.loop = true;
    musica.volume = VOLUMEN_SALA;
    musica.preload = 'auto';
    musica.addEventListener('error', () => {
        falla = true;
        console.warn('Música de la sala: no se encontró ' + RUTA_MUSICA_SALA);
        sincronizar();
    });

    boton.addEventListener('click', () => {
        activa = !activa;
        try { localStorage.setItem(CLAVE_GUARDADO, activa ? 'on' : 'off'); } catch { /* sin almacenamiento */ }
        sincronizar();
    });

    // Al hacer clic en cualquier parte (cambiar de pestaña, abrir un juego, volver)
    // se revisa enseguida; además se revisa cada segundo por si silencian la app.
    document.addEventListener('click', () => setTimeout(sincronizar, 60));
    setInterval(sincronizar, 1000);
    sincronizar();
}

function sincronizar() {
    if (!sala || !musica) return;

    const salaVisible = sala.offsetParent !== null;   // false si la pestaña o la sala están ocultas
    const debeSonar = salaVisible && !document.hidden && activa && !falla && !estaSilenciado();

    if (debeSonar && musica.paused) {
        musica.play().catch(() => { /* el navegador exige un clic antes; se reintenta */ });
    } else if (!debeSonar && !musica.paused) {
        musica.pause();
    }

    boton.style.display = salaVisible ? 'block' : 'none';
    boton.setAttribute('aria-pressed', String(activa && !falla));
    boton.querySelector('span').textContent = falla
        ? 'Música de la sala: no encontrada'
        : activa ? 'Música de la sala: encendida' : 'Música de la sala: apagada';
}