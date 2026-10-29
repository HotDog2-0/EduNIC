/* Gestión de efectos de sonido */

const SONIDOS = {
    ficha: 'assets/sonidos/ficha.mp3',
    jackpot: 'assets/sonidos/jackpot.mp3',
    buzzer: 'assets/sonidos/buzzer.mp3'
};

// Caché de audios (para no recargarlos cada vez)
const cacheAudio = {};

// Estado global (para silenciar)
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
        // Silenciar errores (algunos navegadores bloquean autoplay)
        console.warn('No se pudo reproducir el sonido:', err.message);
    });
}

/**
 * Alterna el estado de silencio.
 * 
 * @returns {boolean} true si está silenciado, false si no
 */
export function toggleSilencio() {
    silenciado = !silenciado;
    return silenciado;
}

/**
 * Verifica si está silenciado.
 */
export function estaSilenciado() {
    return silenciado;
}