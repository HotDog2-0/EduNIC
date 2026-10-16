/* Punto de entrada */

import { bd, CLAVES, inicializarBaseDatos } from './storage.js';
import { inicializarLanding } from './vistas/landing.js';
import { inicializarCarreras } from './vistas/profesor/carreras.js';
import { inicializarEstudiantes } from './vistas/profesor/estudiantes.js';
import { inicializarTemas } from './vistas/profesor/temas.js';
import { inicializarEvaluaciones } from './vistas/profesor/evaluaciones.js';
import {
    inicializarPanelEstudiante,
    recuperarSesionEstudiante
} from './vistas/estudiante/panelEstudiante.js';
import {
    mostrarVista,
    configurarBotonesVolver,
    configurarPestanas
} from './navegacion.js';
import { mostrarNotificacion } from './utils.js';
import { inicializarQuiz } from './vistas/estudiante/quiz.js';
import { resetearPanelEstudiante } from './vistas/estudiante/panelEstudiante.js';
import { inicializarCalificaciones } from './vistas/profesor/calificaciones.js';
import { cerrarModalVideo } from './utils.js';
import { abrirModalVideo } from './utils.js';

function iniciarApp() {
    console.log('EduNIC - Iniciando');

    inicializarBaseDatos();

    // Inicializar módulos
    inicializarLanding();
    inicializarCarreras();
    inicializarEstudiantes();
    inicializarTemas();
    inicializarEvaluaciones();
    inicializarPanelEstudiante();
    inicializarQuiz();
    inicializarCalificaciones();

    configurarBotonesVolver();
    configurarPestanas('view-panel-carrera');
    configurarPestanas('view-panel-estudiante');
    configurarCierreModalVideo();
    configurarAperturaVideos();      
    configurarCierreModalVideo();

    // Login del profesor (temporal)
    const formProfesor = document.getElementById('form-login-profesor');
    formProfesor?.addEventListener('submit', (e) => {
        e.preventDefault();

        const email = document.getElementById('prof-email').value.trim();
        const pass  = document.getElementById('prof-pass').value.trim();

        if (email === 'profesor@escuela.com' && pass === '123456') {
            bd.guardar(CLAVES.USUARIO_ACTUAL, {
                id: 'prof-1',
                nombre: 'Prof. Juan Pérez',
                email,
                rol: 'profesor'
            });

            mostrarHeaderProfesor('Prof. Juan Pérez');
            mostrarVista('view-mis-carreras');
            mostrarNotificacion('Bienvenido, Profesor');
            formProfesor.reset();
        } else {
            mostrarNotificacion('Credenciales incorrectas', 'error');
        }
    });

    // Logout global
    document.getElementById('btn-logout')?.addEventListener('click', () => {
        bd.eliminar(CLAVES.USUARIO_ACTUAL);

        resetearPanelEstudiante();   // ← NUEVO: limpiar el estado del módulo

        const infoSesion = document.getElementById('session-info');
        if (infoSesion) infoSesion.classList.add('hidden');

        resetearPestanas('view-panel-estudiante');
        resetearPestanas('view-panel-carrera');

        mostrarVista('view-landing');
        mostrarNotificacion('Sesión cerrada');
});

    // Recuperar sesión activa
    const usuarioActual = bd.obtener(CLAVES.USUARIO_ACTUAL);

    if (usuarioActual && usuarioActual.rol === 'profesor') {
        mostrarHeaderProfesor(usuarioActual.nombre);
        mostrarVista('view-mis-carreras');
    } else if (usuarioActual && usuarioActual.rol === 'estudiante') {
        const ok = recuperarSesionEstudiante();
        if (!ok) mostrarVista('view-landing');
    } else {
        mostrarVista('view-landing');
    }

    console.log('EduNIC - Listo');
}

/**
 * Actualiza el header global para mostrar al profesor.
 */
function mostrarHeaderProfesor(nombre) {
    const infoSesion = document.getElementById('session-info');
    const etiquetaUsuario = document.getElementById('user-display');
    if (!infoSesion || !etiquetaUsuario) return;

    infoSesion.classList.remove('hidden');
    etiquetaUsuario.innerHTML = `<i class="fa-solid fa-chalkboard-user"></i> ${nombre} <span class="text-muted">(Profesor)</span>`;
}

/**
 * Resetea las pestañas de un contenedor a la primera.
 */
function resetearPestanas(idContenedor) {
    const contenedor = document.getElementById(idContenedor);
    if (!contenedor) return;

    const btns = contenedor.querySelectorAll('.tab-btn');
    const contents = contenedor.querySelectorAll('.tab-content');

    btns.forEach((b, i) => {
        b.classList.toggle('active', i === 0);
    });
    contents.forEach((c, i) => {
        c.classList.toggle('hidden', i !== 0);
        c.classList.toggle('active', i === 0);
    });
}

document.addEventListener('DOMContentLoaded', iniciarApp);

/**
 * Configura el cierre del modal de video.
 * Se conecta una sola vez al arrancar la app.
 */
function configurarCierreModalVideo() {
    const modal = document.getElementById('modal-video');
    if (!modal) return;

    // Botones [data-cerrar-modal]
    modal.querySelectorAll('[data-cerrar-modal]').forEach(b => {
        b.addEventListener('click', cerrarModalVideo);
    });

    // Click fuera del modal
    modal.addEventListener('click', (e) => {
        if (e.target === modal) cerrarModalVideo();
    });

    // Tecla ESC
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !modal.classList.contains('hidden')) {
            cerrarModalVideo();
        }
    });
}

/* MODAL DE VIDEO EMBEBIDO
   Listener global para abrir videos de YouTube/Vimeo
   dentro de la app. Se conecta una sola vez. */

/**
 * Escucha los clics en cualquier elemento con [data-video-url]
 * y abre el modal de video embebido.
 * 
 * Funciona tanto para el panel del profesor como para el del estudiante.
 */
function configurarAperturaVideos() {
    document.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-video-url]');
        if (!btn) return;

        e.preventDefault();

        const embedURL = btn.dataset.videoUrl;
        const titulo = btn.dataset.videoTitulo;
        const urlOriginal = btn.dataset.videoOriginal;

        abrirModalVideo(embedURL, titulo, urlOriginal);
    });
}