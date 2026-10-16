/* Funciones auxiliares reutilizables */

/**
 * Muestra una notificación flotante (toast).
 * @param {string} mensaje
 * @param {'success'|'error'|'info'} tipo
 */
export function mostrarNotificacion(mensaje, tipo = 'success') {
    const toast = document.getElementById('toast');
    if (!toast) return;

    toast.textContent = mensaje;
    toast.className = `toast ${tipo}`;
    toast.classList.remove('hidden');

    if (toast._timeout) clearTimeout(toast._timeout);
    toast._timeout = setTimeout(() => {
        toast.classList.add('hidden');
    }, 3000);
}

/**
 * Genera un ID único basado en timestamp + aleatorio.
 * @returns {string}
 */
export function generarId() {
    return String(Date.now()) + Math.random().toString(36).slice(2, 6);
}

/**
 * Escapa caracteres HTML para evitar inyecciones.
 * @param {string} texto
 * @returns {string}
 */
export function escaparHTML(texto) {
    const div = document.createElement('div');
    div.textContent = texto ?? '';
    return div.innerHTML;
}

/**
 * Normaliza texto: quita espacios extremos y pasa a mayúsculas.
 * @param {string} texto
 * @returns {string}
 */
export function normalizar(texto) {
    return (texto || '').trim().toUpperCase();
}

/**
 * Limpia un nombre: quita espacios dobles y extremos.
 * @param {string} nombre
 * @returns {string}
 */
export function limpiarNombre(nombre) {
    return (nombre || '').replace(/\s+/g, ' ').trim();
}

/**
 * Convierte un dataURL (data:application/pdf;base64,...) 
 * en un blob URL (blob:http://...) que el navegador sí permite abrir.
 * 
 * @param {string} dataURL
 * @returns {string} blob URL o el dataURL original si falla
 */
export function dataURLtoBlobURL(dataURL) {
    try {
        const [header, base64] = dataURL.split(',');
        const mime = header.match(/:(.*?);/)[1];
        const binario = atob(base64);
        const bytes = new Uint8Array(binario.length);

        for (let i = 0; i < binario.length; i++) {
            bytes[i] = binario.charCodeAt(i);
        }

        const blob = new Blob([bytes], { type: mime });
        return URL.createObjectURL(blob);
    } catch (e) {
        console.error('Error al convertir dataURL a blob:', e);
        return dataURL;
    }
}

/* DETECCIÓN Y REPRODUCCIÓN DE VIDEOS
   Soporta YouTube y Vimeo */

/**
 * Detecta si una URL corresponde a un video de YouTube o Vimeo.
 * 
 * Formatos soportados:
 *   YouTube: youtube.com/watch?v=ID, youtu.be/ID, youtube.com/embed/ID
 *   Vimeo:   vimeo.com/ID, player.vimeo.com/video/ID
 * 
 * @param {string} url - URL a analizar
 * @returns {Object|null} { tipo, id, embedURL, urlOriginal } o null si no es video
 */
export function detectarVideo(url) {
    if (!url || typeof url !== 'string') return null;

    const urlLimpia = url.trim();

    // ----- YouTube -----
    // El ID de YouTube siempre tiene 11 caracteres
    const regexYouTube = /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
    const matchYouTube = urlLimpia.match(regexYouTube);

    if (matchYouTube && matchYouTube[1]) {
        return {
            tipo: 'youtube',
            id: matchYouTube[1],
            embedURL: `https://www.youtube.com/embed/${matchYouTube[1]}`,
            urlOriginal: urlLimpia
        };
    }

    // ----- Vimeo -----
    const regexVimeo = /vimeo\.com\/(?:video\/)?(\d+)/;
    const matchVimeo = urlLimpia.match(regexVimeo);

    if (matchVimeo && matchVimeo[1]) {
        return {
            tipo: 'vimeo',
            id: matchVimeo[1],
            embedURL: `https://player.vimeo.com/video/${matchVimeo[1]}`,
            urlOriginal: urlLimpia
        };
    }

    return null;
}

/**
 * Muestra el modal de video embebido.
 * 
 * @param {string} embedURL - URL del iframe (ya en formato embed)
 * @param {string} titulo - Título del video
 * @param {string} urlOriginal - URL original (para botón "abrir externo")
 */
export function abrirModalVideo(embedURL, titulo, urlOriginal) {
    const modal = document.getElementById('modal-video');
    const iframe = document.getElementById('video-iframe');
    const nombre = document.getElementById('modal-video-nombre');
    const enlace = document.getElementById('video-enlace-externo');

    if (!modal || !iframe || !nombre || !enlace) return;

    iframe.src = embedURL;
    nombre.textContent = titulo || 'Video';
    enlace.href = urlOriginal || '#';

    modal.classList.remove('hidden');
}

/**
 * Cierra el modal de video.
 * 
 * Importante: limpia el src del iframe para detener la reproducción
 * (si no, el audio sigue sonando en segundo plano).
 */
export function cerrarModalVideo() {
    const modal = document.getElementById('modal-video');
    const iframe = document.getElementById('video-iframe');
    if (!modal || !iframe) return;

    iframe.src = '';
    modal.classList.add('hidden');
}