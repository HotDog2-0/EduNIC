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