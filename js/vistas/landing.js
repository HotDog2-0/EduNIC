/* VA AL LOGIN */

import { mostrarVista } from '../navegacion.js';
import { iniciarMusicaFondo } from '../sonidos.js';

export function inicializarLanding() {
    const btnProfesor = document.getElementById('select-profesor');
    const btnEstudiante = document.getElementById('select-estudiante');
    const btnRegistro = document.getElementById('select-registro');

    btnProfesor?.addEventListener('click', () => {
        iniciarMusicaFondo();   // ← aquí
        mostrarVista('view-login-profesor');
    });

    btnEstudiante?.addEventListener('click', () => {
        iniciarMusicaFondo();   // ← aquí
        mostrarVista('view-login-estudiante');
    });

    btnRegistro?.addEventListener('click', () => {
        iniciarMusicaFondo();   // ← aquí
        import('./estudiante/registro.js').then(({ resetearRegistro }) => {
            resetearRegistro();
        });
        mostrarVista('view-registro-estudiante');
    });
}