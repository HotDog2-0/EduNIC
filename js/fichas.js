/* Genera fichas de casino a partir de puntos */

/**
 * Genera el HTML de fichas a partir de puntos obtenidos.
 * 
 * Cada ficha vale 10 puntos. Si hay fracción, se muestra una ficha parcial.
 * 
 * @param {number} puntosObtenidos - Puntos obtenidos
 * @param {number} puntosTotal - Puntos totales de la evaluación
 * @returns {string} HTML de las fichas
 */
export function generarFichas(puntosObtenidos, puntosTotal) {
    if (typeof puntosObtenidos !== 'number' || typeof puntosTotal !== 'number') {
        return '';
    }

    if (puntosTotal === 0) return '';

    // Calcular cuántas fichas completas y si hay parcial
    const proporcion = puntosObtenidos / puntosTotal;
    const fichasCompletas = Math.floor(proporcion * 10);
    const resto = (proporcion * 10) - fichasCompletas;
    const hayParcial = resto > 0.3; // si el resto es mayor a 0.3, mostrar parcial

    let html = '<div class="fichas-container">';

    // Fichas completas
    for (let i = 0; i < fichasCompletas; i++) {
        html += '<span class="ficha">10</span>';
    }

    // Ficha parcial
    if (hayParcial) {
        html += '<span class="ficha parcial"></span>';
    }

    // Si no hay fichas, mostrar "vacío"
    if (fichasCompletas === 0 && !hayParcial) {
        html += '<span class="text-muted" style="font-size: 0.85rem;">Sin puntos</span>';
    }

    html += '</div>';
    return html;
}