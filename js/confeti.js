/* Efecto de confeti dorado al aprobar */

/**
 * Lanza confeti dorado desde el centro de la pantalla.
 * Usa CSS puro (sin librerías).
 * 
 * @param {number} cantidad - Número de partículas (default: 60)
 */
export function lanzarConfeti(cantidad = 60) {
    const contenedor = document.createElement('div');
    contenedor.className = 'confeti-contenedor';
    document.body.appendChild(contenedor);

    const colores = ['#fbbf24', '#d4af37', '#f59e0b', '#fde047', '#fef3c7'];

    for (let i = 0; i < cantidad; i++) {
        const particula = document.createElement('div');
        particula.className = 'confeti-particula';

        // Posición inicial (centro de la pantalla)
        const x = window.innerWidth / 2;
        const y = window.innerHeight / 2;

        // Dirección aleatoria
        const angulo = Math.random() * Math.PI * 2;
        const distancia = 200 + Math.random() * 400;
        const destinoX = Math.cos(angulo) * distancia;
        const destinoY = Math.sin(angulo) * distancia - 100; // ligera tendencia hacia arriba

        // Rotación aleatoria
        const rotacion = Math.random() * 720 - 360;

        // Tamaño aleatorio
        const tamaño = 8 + Math.random() * 8;

        // Color aleatorio
        const color = colores[Math.floor(Math.random() * colores.length)];

        // Forma: cuadrado o círculo
        const esCirculo = Math.random() > 0.5;

        particula.style.cssText = `
            position: fixed;
            left: ${x}px;
            top: ${y}px;
            width: ${tamaño}px;
            height: ${tamaño}px;
            background: ${color};
            border-radius: ${esCirculo ? '50%' : '2px'};
            pointer-events: none;
            z-index: 99999;
            --destino-x: ${destinoX}px;
            --destino-y: ${destinoY}px;
            --rotacion: ${rotacion}deg;
            animation: confetiVolar ${1.5 + Math.random() * 1}s cubic-bezier(0.16, 1, 0.3, 1) forwards;
            animation-delay: ${Math.random() * 0.3}s;
        `;

        contenedor.appendChild(particula);
    }

    // Eliminar el contenedor después de la animación
    setTimeout(() => {
        contenedor.remove();
    }, 3000);
}