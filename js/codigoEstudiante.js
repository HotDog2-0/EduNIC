/* ============================================
   CODIGOESTUDIANTE.JS
   Códigos únicos y personales de los estudiantes

   El código se arma con las iniciales del nombre y apellido
   + 4 caracteres al azar, así nadie puede adivinar el de otro.

   Ejemplo: "David García López"  →  DGL-7K4Q
            "Ana Pérez"           →  AP-M2X9

   Para entrar se pide el código Y el nombre del estudiante.
   ============================================ */

// Sin O, I, L, 0 ni 1 para que no se confundan al escribirlos
const ALFABETO = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

/** Mayúsculas, sin acentos y solo letras: "José Pérez" → "JOSE PEREZ" */
function limpiar(texto) {
    return (texto || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toUpperCase()
        .replace(/[^A-Z\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

/** Palabras del nombre ya limpias: ["DAVID", "GARCIA", "LOPEZ"] */
export function palabrasDeNombre(nombre) {
    const limpio = limpiar(nombre);
    return limpio ? limpio.split(' ') : [];
}

/**
 * Parte fija del código, sacada del nombre.
 * Varias palabras → sus iniciales (máximo 4). Una sola → sus 3 primeras letras.
 */
export function prefijoCodigo(nombre) {
    const palabras = palabrasDeNombre(nombre);
    if (palabras.length === 0) return '';
    if (palabras.length === 1) return palabras[0].slice(0, 3);
    return palabras.slice(0, 4).map(p => p[0]).join('');
}

function sufijoAleatorio() {
    const valores = crypto.getRandomValues(new Uint32Array(4));
    return Array.from(valores, v => ALFABETO[v % ALFABETO.length]).join('');
}

/**
 * Crea un código que no exista todavía.
 * @param {string} nombre - Nombre y apellido del estudiante
 * @param {Array} estudiantes - Lista de estudiantes ya registrados
 */
export function generarCodigoEstudiante(nombre, estudiantes = []) {
    const usados = new Set(estudiantes.map(e => String(e.codigo || '').trim().toUpperCase()));
    const prefijo = prefijoCodigo(nombre) || 'EST';

    for (let i = 0; i < 100; i++) {
        const codigo = `${prefijo}-${sufijoAleatorio()}`;
        if (!usados.has(codigo)) return codigo;
    }
    // Casi imposible, pero por si acaso
    return `${prefijo}-${sufijoAleatorio()}${sufijoAleatorio()}`;
}

/**
 * Comprueba que el nombre escrito sea el del estudiante.
 * No importan mayúsculas ni acentos, y basta con escribir nombre y apellido
 * ("david garcia" sirve para "David García López").
 */
export function nombreCoincide(escrito, guardado) {
    const tipeadas = palabrasDeNombre(escrito);
    const reales = palabrasDeNombre(guardado);
    if (reales.length === 0) return false;

    const minimo = Math.min(2, reales.length);
    if (tipeadas.length < minimo) return false;

    return tipeadas[0] === reales[0] && tipeadas.every(p => reales.includes(p));
}