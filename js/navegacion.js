/* Control de cambio de vistas */

/**
 * Muestra una vista y oculta todas las demás.
 *
 * @param {string} idVista - ID de la sección a mostrar
 *                          Ej: 'view-landing', 'view-login-profesor'
 */
export function mostrarVista(idVista) {
    // Guardar la vista actual
    localStorage.setItem('edunic_ultima_vista', idVista);
    
    document.querySelectorAll('.view-section').forEach(vista => {
        vista.classList.add('hidden');
    });

    const vistaDestino = document.getElementById(idVista);
    if (vistaDestino) {
        vistaDestino.classList.remove('hidden');
    } else {
        console.error('No se encontró la vista:', idVista);
    }
}

/**
 * Conecta todos los botones con atributo [data-volver].
 * Al hacer clic, navegan a la vista indicada en el atributo.
 */
export function configurarBotonesVolver() {
    document.querySelectorAll('[data-volver]').forEach(btn => {
        btn.addEventListener('click', () => {
            const destino = btn.getAttribute('data-volver');
            if (destino) mostrarVista(destino);
        });
    });
}

/**
 * Conecta las pestañas (tabs) de un contenedor.
 * Al hacer clic en una, la activa y muestra su contenido.
 *
 * @param {string} idContenedor - ID del section que contiene las pestañas
 */
export function configurarPestanas(idContenedor) {
    const contenedor = document.getElementById(idContenedor);
    if (!contenedor) return;

    const nav = contenedor.querySelector('.tabs-nav');
    if (!nav) return;

    nav.addEventListener('click', (e) => {
        const btn = e.target.closest('.tab-btn');
        if (!btn) return;

        // Quitar "active" de todos los botones y ocultar todos los contenidos
        contenedor.querySelectorAll('.tab-btn').forEach(b => {
            b.classList.remove('active');
            b.setAttribute('aria-selected', 'false');
        });
        contenedor.querySelectorAll('.tab-content').forEach(c => {
            c.classList.add('hidden');
            c.classList.remove('active');
        });

        // Activar el botón clicado
        btn.classList.add('active');
        btn.setAttribute('aria-selected', 'true');

        // Mostrar el contenido correspondiente
        const target = document.getElementById(btn.dataset.tab);
        if (target) {
            target.classList.remove('hidden');
            target.classList.add('active');
        }
    });
}