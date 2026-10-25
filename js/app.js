/* ============================================
   APP.JS
   Punto de entrada de la aplicación
   ============================================ */

console.log('🔵 app.js: archivo cargado');

/* ==========================================
   IMPORTS
   ========================================== */

import { bd, CLAVES, inicializarBaseDatos } from './storage.js';
import { inicializarLanding } from './vistas/landing.js';
import { inicializarCarreras } from './vistas/profesor/carreras.js';
import { inicializarEstudiantes } from './vistas/profesor/estudiantes.js';
import { inicializarTemas } from './vistas/profesor/temas.js';
import { inicializarEvaluaciones } from './vistas/profesor/evaluaciones.js';
import {
    inicializarPanelEstudiante,
    recuperarSesionEstudiante,
    resetearPanelEstudiante
} from './vistas/estudiante/panelEstudiante.js';
import {
    mostrarVista,
    configurarBotonesVolver,
    configurarPestanas
} from './navegacion.js';
import { mostrarNotificacion, cerrarModalVideo, abrirModalVideo } from './utils.js';
import { inicializarQuiz } from './vistas/estudiante/quiz.js';
import { inicializarCalificaciones } from './vistas/profesor/calificaciones.js';
import { inicializarRegistro } from './vistas/estudiante/registro.js';
import { inicializarAsistente } from './vistas/profesor/asistente.js';
import { toggleSilencio, estaSilenciado } from './sonidos.js';

/* ==========================================
   INICIALIZACIÓN
   ========================================== */

function iniciarApp() {
    console.log('🟢 iniciarApp: ejecutándose');

    // 1. Preparar base de datos
    inicializarBaseDatos();

    // 2. Inicializar módulos
    inicializarLanding();
    inicializarCarreras();
    inicializarEstudiantes();
    inicializarTemas();
    inicializarEvaluaciones();
    inicializarPanelEstudiante();
    inicializarQuiz();
    inicializarCalificaciones();
    inicializarRegistro();
    inicializarAsistente();

    // 3. Configurar navegación y modales
    configurarBotonesVolver();
    configurarPestanas('view-panel-carrera');
    configurarPestanas('view-panel-estudiante');
    configurarCierreModalVideo();
    configurarAperturaVideos();

    // 4. Login del profesor (temporal)
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

        // Botón de silenciar
        document.getElementById('btn-silenciar')?.addEventListener('click', (e) => {
            const silenciado = toggleSilencio();
            const icono = e.currentTarget.querySelector('i');
            icono.className = silenciado ? 'fa-solid fa-volume-xmark' : 'fa-solid fa-volume-high';
            mostrarNotificacion(silenciado ? 'Sonido silenciado' : 'Sonido activado');
        });
    });

    // 5. Logout global
    document.getElementById('btn-logout')?.addEventListener('click', () => {
        bd.eliminar(CLAVES.USUARIO_ACTUAL);

        resetearPanelEstudiante();

        const infoSesion = document.getElementById('session-info');
        if (infoSesion) infoSesion.classList.add('hidden');

        resetearPestanas('view-panel-estudiante');
        resetearPestanas('view-panel-carrera');

        mostrarVista('view-landing');
        mostrarNotificacion('Sesión cerrada');
    });

    // 6. Recuperar sesión activa
    const usuarioActual = bd.obtener(CLAVES.USUARIO_ACTUAL);

    if (usuarioActual && usuarioActual.rol === 'profesor') {
        mostrarHeaderProfesor(usuarioActual.nombre);

        // Restaurar última vista si existe
        const ultimaVista = localStorage.getItem('edunic_ultima_vista');

        if (ultimaVista === 'view-panel-carrera') {
            const carreraActiva = bd.obtener(CLAVES.CARRERA_ACTIVA);
            if (carreraActiva && typeof window.abrirPanelCarrera === 'function') {
                window.abrirPanelCarrera(carreraActiva);
            } else {
                mostrarVista('view-mis-carreras');
            }
        } else if (ultimaVista && ultimaVista !== 'view-landing') {
            mostrarVista(ultimaVista);
        } else {
            mostrarVista('view-mis-carreras');
        }
    } else if (usuarioActual && usuarioActual.rol === 'estudiante') {
        const ok = recuperarSesionEstudiante();
        if (!ok) mostrarVista('view-landing');
    } else {
        mostrarVista('view-landing');
    }

    console.log('✅ EduNIC - Listo');
}

/* ==========================================
   FUNCIONES AUXILIARES
   ========================================== */

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

/**
 * Configura el cierre del modal de video.
 */
function configurarCierreModalVideo() {
    const modal = document.getElementById('modal-video');
    if (!modal) return;

    modal.querySelectorAll('[data-cerrar-modal]').forEach(b => {
        b.addEventListener('click', cerrarModalVideo);
    });

    modal.addEventListener('click', (e) => {
        if (e.target === modal) cerrarModalVideo();
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !modal.classList.contains('hidden')) {
            cerrarModalVideo();
        }
    });
}

/**
 * Listener global para abrir videos de YouTube/Vimeo.
 */
function configurarAperturaVideos() {
    document.addEventListener('click', (e) => {
        if (!e.target || typeof e.target.closest !== 'function') return;

        const btn = e.target.closest('[data-video-url]');
        if (!btn) return;

        e.preventDefault();

        const embedURL = btn.dataset.videoUrl;
        const titulo = btn.dataset.videoTitulo;
        const urlOriginal = btn.dataset.videoOriginal;

        abrirModalVideo(embedURL, titulo, urlOriginal);
    });
}

/* ==========================================
   ARRANCAR LA APP
   ========================================== */

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', iniciarApp);
} else {
    iniciarApp();
}

console.log('🔵 app.js: archivo terminó de ejecutarse');