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

    // Crear nuevo audio
    musicaFondo = new Audio('assets/musica/casino-bg.mp3');
    musicaFondo.loop = true;
    musicaFondo.volume = 0.15;
    musicaFondo.preload = 'auto';

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