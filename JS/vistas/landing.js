/* VA AL LOGIN */

import { mostrarVista } from '../navegacion.js';

export function inicializarLanding() {
    const btnProfesor   = document.getElementById('select-profesor');
    const btnEstudiante = document.getElementById('select-estudiante');

    btnProfesor?.addEventListener('click', () => {
        mostrarVista('view-login-profesor');
    });

    btnEstudiante?.addEventListener('click', () => {
        mostrarVista('view-login-estudiante');
    });
}