/* VA AL LOGIN */

import { mostrarVista } from '../navegacion.js';
import { mostrarNotificacion } from '../utils.js';

/**
 * Inicializa la vista de selección de usuario (landing).
 * Conecta los 3 botones de la pantalla:
 *  - Profesor: va al login del profesor
 *  - Estudiante: va al login del estudiante
 *  - Registro: va a la pantalla de auto-registro con código de clase
 */
export function inicializarLanding() {
    const btnProfesor   = document.getElementById('select-profesor');
    const btnEstudiante = document.getElementById('select-estudiante');
    const btnRegistro   = document.getElementById('select-registro');

    btnProfesor?.addEventListener('click', () => {
        mostrarVista('view-login-profesor');
    });

    btnEstudiante?.addEventListener('click', () => {
        mostrarVista('view-login-estudiante');
    });

    btnRegistro?.addEventListener('click', () => {
        // Resetear el registro a su estado inicial
        import('./estudiante/registro.js').then(({ resetearRegistro }) => {
            resetearRegistro();
        });
        mostrarVista('view-registro-estudiante');
    });
}