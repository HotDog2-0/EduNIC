/* Gestión de efectos de sonido y música de fondo */

const SONIDOS = {
    ficha: 'assets/sonidos/ficha.mp3',
    jackpot: 'assets/sonidos/jackpot.mp3',
    buzzer: 'assets/sonidos/buzzer.mp3'
};

const cacheAudio = {};
let silenciado = false;

export function reproducirSonido(nombre, volumen = 0.5) {
    if (silenciado) return;
    const ruta = SONIDOS[nombre];
    if (!ruta) return;

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

export function toggleSilencio() {
    silenciado = !silenciado;
    return silenciado;
}

export function estaSilenciado() {
    return silenciado;
}

/* MÚSICA DE FONDO */
let musicaFondo = null;
let musicaActiva = false;

export const PISTAS = [
    'assets/musica/casino-bg.mp3',
    'assets/musica/casino-02.mp3',
    'assets/musica/casino-03.mp3',
    'assets/musica/casino-04.mp3'
];
let pistaActual = 0;
let fallosSeguidos = 0;

export function siguientePista() {
    if (!musicaFondo) return;
    pistaActual = (pistaActual + 1) % PISTAS.length;
    musicaFondo.src = PISTAS[pistaActual];
    if (musicaActiva && !enSeccionPropia) {
        musicaFondo.play().catch(() => {});
    }
}

let enSeccionPropia = false;
let reanudarAlSalir = false;

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

export function iniciarMusicaFondo() {
    if (enSeccionPropia) {
        reanudarAlSalir = true;
        return;
    }

    if (musicaFondo) {
        if (!musicaFondo.paused) return;
        musicaFondo.play()
            .then(() => { musicaActiva = true; })
            .catch(err => {
                if (err.name === 'AbortError') return;
                console.warn('⚠️ No se pudo reanudar:', err.message);
            });
        return;
    }

    musicaFondo = new Audio(PISTAS[pistaActual]);
    musicaFondo.loop = PISTAS.length === 1;
    musicaFondo.volume = 0.15;
    musicaFondo.preload = 'auto';
    musicaFondo.addEventListener('ended', siguientePista);
    musicaFondo.addEventListener('playing', () => { fallosSeguidos = 0; });
    musicaFondo.addEventListener('error', () => {
        fallosSeguidos++;
        if (fallosSeguidos < PISTAS.length) siguientePista();
    });

    musicaFondo.play()
        .then(() => { musicaActiva = true; })
        .catch(err => {
            if (err.name === 'AbortError') return;
            console.warn('⚠️ Autoplay bloqueado:', err.message);
            musicaActiva = false;
        });
}

export function toggleMusicaFondo() {
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
        return false;
    } else {
        musicaFondo.play()
            .then(() => { musicaActiva = true; })
            .catch(err => console.warn('No se pudo reanudar:', err.message));
        return true;
    }
}

export function estaMusicaActiva() {
    return musicaActiva;
}

export function setVolumenMusica(volumen) {
    if (musicaFondo) {
        musicaFondo.volume = Math.max(0, Math.min(1, volumen));
    }
}

export function getVolumenMusica() {
    return musicaFondo ? musicaFondo.volume : 0.15;
}

export function cambiarPista(ruta) {
    const nuevoIndice = PISTAS.indexOf(ruta);
    if (nuevoIndice === -1) {
        console.warn('Pista no encontrada:', ruta);
        return;
    }

    pistaActual = nuevoIndice;

    if (musicaFondo) {
        musicaFondo.src = PISTAS[pistaActual];
        if (musicaActiva && !enSeccionPropia) {
            musicaFondo.play().catch(err => console.warn('Error al cambiar pista:', err));
        }
    } else {
        iniciarMusicaFondo();
    }
}

export function getPistaActual() {
    return PISTAS[pistaActual];
}