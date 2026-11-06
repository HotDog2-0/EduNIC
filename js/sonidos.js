/* Gestión de efectos de sonido y música de fondo */

/* EFECTOS DE SONIDO */

const SONIDOS = {
    ficha: 'assets/sonidos/ficha.mp3',
    jackpot: 'assets/sonidos/jackpot.mp3',
    buzzer: 'assets/sonidos/buzzer.mp3'
};

// Caché de audios (para no recargarlos cada vez)
const cacheAudio = {};

// Estado global (para silenciar efectos)
let silenciado = false;

/**
 * Reproduce un sonido.
 * 
 * @param {'ficha'|'jackpot'|'buzzer'} nombre - Nombre del sonido
 * @param {number} volumen - Volumen (0 a 1, default: 0.5)
 */
export function reproducirSonido(nombre, volumen = 0.5) {
    if (silenciado) return;

    const ruta = SONIDOS[nombre];
    if (!ruta) return;

    // Cargar audio (con caché)
    if (!cacheAudio[nombre]) {
        cacheAudio[nombre] = new Audio(ruta);
        cacheAudio[nombre].preload = 'auto';
    }

    const audio = cacheAudio[nombre];
    audio.currentTime = 0;
    audio.volume = volumen;

    audio.play().catch(err => {
        console.warn('No se pudo reproducir el sonido:', err.message);
    });
}

/**
 * Alterna el estado de silencio de los EFECTOS.
 * @returns {boolean} true si está silenciado, false si no
 */
export function toggleSilencio() {
    silenciado = !silenciado;
    return silenciado;
}

/**
 * Verifica si los efectos están silenciados.
 */
export function estaSilenciado() {
    return silenciado;
}

/* MÚSICA DE FONDO (bucle) */

let musicaFondo = null;
let musicaActiva = false;

// Canciones de fondo: suenan una tras otra y al terminar la lista vuelven a empezar.
// Para agregar más, pon el archivo en assets/musica/ y añade su ruta aquí.
const PISTAS = [
    'assets/musica/casino-bg.mp3',
    'assets/musica/casino-02.mp3',
    'assets/musica/casino-03.mp3',
    'assets/musica/casino-04.mp3'
];
let pistaActual = 0;
let fallosSeguidos = 0;

/** Pasa a la siguiente canción de la lista (y sigue sonando si estaba sonando). */
export function siguientePista() {
    if (!musicaFondo) return;
    pistaActual = (pistaActual + 1) % PISTAS.length;
    musicaFondo.src = PISTAS[pistaActual];
    if (musicaActiva && !enSeccionPropia) {
        musicaFondo.play().catch(() => { /* si falla, el evento "error" salta a la siguiente */ });
    }
}

// Mientras se está en la sección Minijuegos (que tiene su propia música),
// la música general se pausa y vuelve a sonar al salir.
let enSeccionPropia = false;
let reanudarAlSalir = false;

/**
 * Pausa o reanuda la música general según la sección.
 * @param {boolean} suspender - true al entrar a Minijuegos, false al salir
 */
export function suspenderMusicaFondo(suspender) {
    if (suspender === enSeccionPropia) return;
    enSeccionPropia = suspender;

    if (suspender) {
        if (musicaFondo && !musicaFondo.paused) {
            musicaFondo.pause();
            reanudarAlSalir = true;
        }
    } else if (reanudarAlSalir) {
        reanudarAlSalir = false;
        iniciarMusicaFondo();
    }
}

/**
 * Inicia la música de fondo en bucle.
 * Se llama en el primer clic del usuario (autoplay bloqueado).
 */
export function iniciarMusicaFondo() {
    console.log('🎵 Intentando iniciar música...');

    // En Minijuegos no suena la música general: queda pendiente para cuando se salga
    if (enSeccionPropia) {
        reanudarAlSalir = true;
        return;
    }

    // Si ya existe, intentar reproducir
    if (musicaFondo) {
        if (!musicaFondo.paused) {
            // Ya está sonando
            return;
        }

        musicaFondo.play()
            .then(() => {
                musicaActiva = true;
                console.log('🎵 Música reanudada');
            })
            .catch(err => {
                if (err.name === 'AbortError') return;   // la pausó el cambio de sección
                console.warn('⚠️ No se pudo reanudar:', err.message);
            });
        return;
    }

    // Crear nuevo audio (con lista de canciones)
    musicaFondo = new Audio(PISTAS[pistaActual]);
    musicaFondo.loop = PISTAS.length === 1;
    musicaFondo.volume = 0.15;
    musicaFondo.preload = 'auto';
    musicaFondo.addEventListener('ended', siguientePista);
    musicaFondo.addEventListener('playing', () => { fallosSeguidos = 0; });
    musicaFondo.addEventListener('error', () => {
        // Si un archivo no existe, se salta a la siguiente (sin dar vueltas infinitas)
        fallosSeguidos++;
        if (fallosSeguidos < PISTAS.length) siguientePista();
    });

    // Intentar reproducir
    musicaFondo.play()
        .then(() => {
            musicaActiva = true;
            console.log('🎵 Música de fondo iniciada');
        })
        .catch(err => {
            if (err.name === 'AbortError') return;       // la pausó el cambio de sección
            console.warn('⚠️ Autoplay bloqueado:', err.message);
            musicaActiva = false;
            // NO destruir musicaFondo, para reintentar en el próximo clic
        });
}

/**
 * Alterna la música de fondo (play/pause).
 * @returns {boolean} true si está reproduciéndose, false si está pausada
 */
export function toggleMusicaFondo() {
    // En Minijuegos solo se cambia si volverá a sonar al salir
    if (enSeccionPropia) {
        musicaActiva = !musicaActiva;
        reanudarAlSalir = musicaActiva;
        return musicaActiva;
    }

    if (!musicaFondo) {
        iniciarMusicaFondo();
        return true;
    }

    if (musicaActiva) {
        musicaFondo.pause();
        musicaActiva = false;
        console.log('🎵 Música pausada');
        return false;
    } else {
        musicaFondo.play()
            .then(() => {
                musicaActiva = true;
                console.log('🎵 Música reanudada');
            })
            .catch(err => {
                console.warn('No se pudo reanudar:', err.message);
            });
        return true;
    }
}

/**
 * Verifica si la música está activa.
 */
export function estaMusicaActiva() {
    return musicaActiva;
}

/**
 * Ajusta el volumen de la música.
 * @param {number} volumen - 0 a 1
 */
export function setVolumenMusica(volumen) {
    if (musicaFondo) {
        musicaFondo.volume = Math.max(0, Math.min(1, volumen));
    }
}