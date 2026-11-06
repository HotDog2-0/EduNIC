/* ============================================
   PERFILESTUDIANTE.JS
   Foto de perfil y monedero de fichas del estudiante

   - Foto: se elige desde el botón de la cámara, se recorta
     en cuadrado y se guarda en el navegador junto al estudiante.
   - Monedero: saldo de fichas del estudiante (empieza en 1000).
     Lo usa la Ruleta de Casino y se ve siempre en su cabecera.
   ============================================ */

import { bd, CLAVES } from './storage.js';
import { mostrarNotificacion } from './utils.js';

const SALDO_INICIAL = 1000;
const TAM_FOTO = 256;                       // la foto se guarda de 256 x 256
const MAX_ARCHIVO = 10 * 1024 * 1024;       // 10 MB

let idActivo = null;                        // estudiante con sesión abierta

/* ==========================================
   PUNTO DE ENTRADA
   ========================================== */

/**
 * Pone la foto y el monedero en la cabecera del estudiante.
 * Se llama cada vez que se llena la cabecera del panel.
 * @param {{id: string, nombre: string}} estudiante
 */
export function montarPerfil(estudiante) {
    if (!estudiante) return;
    idActivo = estudiante.id;
    agregarEstilos();

    const info = document.querySelector('#view-panel-estudiante .carrera-header-info');
    const lineaCarrera = document.getElementById('estudiante-carrera');
    if (!info || !lineaCarrera) return;

    // Quitar lo anterior (por si se entra otra vez sin recargar)
    info.querySelectorAll('.perfil-avatar-caja, .monedero-pill').forEach(el => el.remove());

    info.prepend(crearAvatar(estudiante.nombre));
    lineaCarrera.after(crearMonedero());
}

/** Se llama al cerrar sesión. */
export function desmontarPerfil() {
    idActivo = null;
}

/* ==========================================
   ACCESO A LOS DATOS DEL ESTUDIANTE
   ========================================== */

function leerEstudiante() {
    const todos = bd.obtener(CLAVES.ESTUDIANTES) || [];
    return todos.find(e => e.id === idActivo) || null;
}

function guardarCampo(campo, valor) {
    const todos = bd.obtener(CLAVES.ESTUDIANTES) || [];
    const est = todos.find(e => e.id === idActivo);
    if (!est) return false;
    if (valor === null) delete est[campo];
    else est[campo] = valor;
    try {
        bd.guardar(CLAVES.ESTUDIANTES, todos);
        return true;
    } catch (e) {
        console.warn('No se pudo guardar:', e.message);
        return false;
    }
}

/* ==========================================
   MONEDERO
   ========================================== */

/** true si hay un estudiante con sesión (y por lo tanto, monedero). */
export function hayMonedero() {
    return idActivo !== null && leerEstudiante() !== null;
}

/** Saldo de fichas del estudiante. */
export function saldoActual() {
    const est = leerEstudiante();
    if (!est) return 0;
    if (typeof est.monedero !== 'number') {
        guardarCampo('monedero', SALDO_INICIAL);   // primera vez: se le da el saldo inicial
        return SALDO_INICIAL;
    }
    return est.monedero;
}

/**
 * Suma (positivo) o resta (negativo) fichas. Nunca baja de 0.
 * @returns {number} el saldo nuevo
 */
export function cambiarSaldo(cantidad) {
    const nuevo = Math.max(0, saldoActual() + cantidad);
    guardarCampo('monedero', nuevo);
    pintarMonedero(cantidad);
    return nuevo;
}

/** Deja el saldo en una cantidad exacta. */
export function fijarSaldo(cantidad) {
    const nuevo = Math.max(0, Math.round(cantidad));
    guardarCampo('monedero', nuevo);
    pintarMonedero(0);
    return nuevo;
}

function crearMonedero() {
    const pill = document.createElement('div');
    pill.className = 'monedero-pill';
    pill.id = 'monedero-pill';
    pill.title = 'Tu monedero de fichas';
    pill.innerHTML = '<i class="fa-solid fa-coins"></i> <strong id="monedero-saldo"></strong> fichas';
    pill.querySelector('strong').textContent = formatear(saldoActual());
    return pill;
}

function pintarMonedero(cambio) {
    const saldo = document.getElementById('monedero-saldo');
    if (!saldo) return;
    saldo.textContent = formatear(saldoActual());

    // Destello verde si ganó fichas, rojo si perdió
    const pill = document.getElementById('monedero-pill');
    if (pill && cambio !== 0) {
        pill.classList.remove('monedero-gana', 'monedero-pierde');
        void pill.offsetWidth;   // reinicia la animación
        pill.classList.add(cambio > 0 ? 'monedero-gana' : 'monedero-pierde');
    }
}

function formatear(n) {
    return Number(n).toLocaleString('es');
}

/* ==========================================
   FOTO DE PERFIL
   ========================================== */

function iniciales(nombre) {
    const letras = (nombre || '?').trim().split(/\s+/).slice(0, 2).map(p => p[0]).join('');
    return letras.toUpperCase();
}

function crearAvatar(nombre) {
    const caja = document.createElement('div');
    caja.className = 'perfil-avatar-caja';
    caja.innerHTML = `
        <div class="perfil-avatar" role="img" aria-label="Foto de perfil"></div>
        <button class="perfil-camara" type="button" aria-label="Cambiar foto de perfil" title="Cambiar foto">
            <i class="fa-solid fa-camera"></i>
        </button>
        <button class="perfil-quitar" type="button" aria-label="Quitar foto de perfil" title="Quitar foto" hidden>
            <i class="fa-solid fa-xmark"></i>
        </button>
        <input type="file" accept="image/*" hidden>
    `;

    const avatar = caja.querySelector('.perfil-avatar');
    const quitar = caja.querySelector('.perfil-quitar');
    const archivo = caja.querySelector('input[type=file]');

    function pintar() {
        const foto = leerEstudiante()?.foto;
        avatar.innerHTML = '';
        avatar.classList.toggle('con-foto', !!foto);
        if (foto) {
            const img = document.createElement('img');
            img.src = foto;
            img.alt = 'Foto de ' + nombre;
            avatar.appendChild(img);
        } else {
            avatar.textContent = iniciales(nombre);
        }
        quitar.hidden = !foto;
    }

    caja.querySelector('.perfil-camara').addEventListener('click', () => archivo.click());

    archivo.addEventListener('change', async () => {
        const elegido = archivo.files[0];
        archivo.value = '';
        if (!elegido) return;
        try {
            const foto = await prepararFoto(elegido);
            if (!guardarCampo('foto', foto)) throw new Error('No hay espacio para guardar la foto');
            pintar();
            mostrarNotificacion('Foto de perfil actualizada');
        } catch (err) {
            mostrarNotificacion(err.message || 'No se pudo usar esa imagen', 'error');
        }
    });

    quitar.addEventListener('click', () => {
        guardarCampo('foto', null);
        pintar();
        mostrarNotificacion('Foto de perfil quitada');
    });

    pintar();
    return caja;
}

/** Recorta la imagen en cuadrado y la reduce a 256 x 256 (JPEG liviano). */
function prepararFoto(archivo) {
    return new Promise((resolve, reject) => {
        if (!archivo.type.startsWith('image/')) return reject(new Error('Elige un archivo de imagen'));
        if (archivo.size > MAX_ARCHIVO) return reject(new Error('La imagen pesa más de 10 MB'));

        const url = URL.createObjectURL(archivo);
        const img = new Image();
        img.onload = () => {
            const lado = Math.min(img.width, img.height);
            const canvas = document.createElement('canvas');
            canvas.width = canvas.height = TAM_FOTO;
            canvas.getContext('2d').drawImage(
                img, (img.width - lado) / 2, (img.height - lado) / 2, lado, lado, 0, 0, TAM_FOTO, TAM_FOTO
            );
            URL.revokeObjectURL(url);
            resolve(canvas.toDataURL('image/jpeg', 0.85));
        };
        img.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error('No se pudo leer esa imagen. Prueba con JPG o PNG.'));
        };
        img.src = url;
    });
}

/* ==========================================
   ESTILOS (se agregan una sola vez)
   ========================================== */

function agregarEstilos() {
    if (document.getElementById('estilos-perfil')) return;
    const estilo = document.createElement('style');
    estilo.id = 'estilos-perfil';
    estilo.textContent = `
        .perfil-avatar-caja { position: relative; width: 96px; height: 96px; margin: 0 auto 0.4rem; }
        .perfil-avatar {
            width: 100%; height: 100%; border-radius: 50%; overflow: hidden;
            display: grid; place-items: center;
            background: #1a1a24; color: var(--primary-color);
            font: 700 2rem Georgia, serif;
            border: 3px solid var(--primary-color);
            box-shadow: 0 0 18px rgba(212, 175, 55, 0.45);
        }
        .perfil-avatar img { width: 100%; height: 100%; object-fit: cover; display: block; }
        .perfil-camara, .perfil-quitar {
            position: absolute; width: 32px; height: 32px; border-radius: 50%;
            display: grid; place-items: center; cursor: pointer;
            background: #0a0a0c; color: var(--primary-color);
            border: 2px solid var(--primary-color); font-size: 0.8rem; padding: 0;
        }
        .perfil-camara { right: -6px; bottom: -4px; }
        .perfil-quitar { right: -6px; top: -4px; width: 26px; height: 26px; font-size: 0.7rem; }
        .perfil-quitar[hidden] { display: none; }
        .perfil-camara:hover, .perfil-quitar:hover { background: var(--primary-color); color: #000; }
        .perfil-camara:focus-visible, .perfil-quitar:focus-visible { outline: 3px solid var(--text-color); outline-offset: 2px; }

        .monedero-pill {
            display: inline-flex; align-items: center; gap: 0.5rem;
            padding: 0.35rem 1.1rem; border-radius: var(--radius-pill);
            border: 1.5px solid var(--primary-color);
            background: rgba(212, 175, 55, 0.08); color: var(--text-color); font-weight: 700;
        }
        .monedero-pill i { color: var(--primary-color); }
        .monedero-pill strong { color: var(--primary-color); font-size: 1.15rem; }
        .monedero-gana { animation: monederoGana 0.9s ease; }
        .monedero-pierde { animation: monederoPierde 0.9s ease; }
        @keyframes monederoGana { 0%, 100% { box-shadow: none; } 30% { box-shadow: 0 0 18px #22c55e; border-color: #22c55e; } }
        @keyframes monederoPierde { 0%, 100% { box-shadow: none; } 30% { box-shadow: 0 0 18px #ef4444; border-color: #ef4444; } }
        @media (prefers-reduced-motion: reduce) { .monedero-gana, .monedero-pierde { animation: none; } }
    `;
    document.head.appendChild(estilo);
}