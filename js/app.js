/* Punto de entrada de la aplicación */

console.log('🔵 app.js: archivo cargado');

/* IMPORTS */

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
import { 
    toggleSilencio, 
    estaSilenciado, 
    iniciarMusicaFondo, 
    toggleMusicaFondo,
    setVolumenMusica,
    getVolumenMusica,
    cambiarPista,
    siguientePista,
    getPistaActual,
    listaPistas
} from './sonidos.js';
import { inicializarRuleta } from './ruleta.js';
import { inicializarDuelo } from './duelo.js';

/* INICIALIZACIÓN */

async function iniciarApp() {
    console.log('🟢 iniciarApp: ejecutándose');

    await inicializarBaseDatos();
    console.log('🟢 Base de datos lista.');

    // 2. INICIALIZAR MÓDULOS
    inicializarLanding();
    inicializarCarreras();
    inicializarEstudiantes();
    inicializarTemas();
    inicializarEvaluaciones();
    inicializarPanelEstudiante();
    inicializarQuiz();
    inicializarCalificaciones();
    inicializarRegistro();
    await inicializarAsistente();
    inicializarRuleta();
    inicializarDuelo();

    // 3. CONFIGURAR NAVEGACIÓN Y MODALES
    configurarBotonesVolver();
    configurarPestanas('view-panel-carrera');
    configurarPestanas('view-panel-estudiante');
    configurarCierreModalVideo();
    configurarAperturaVideos();

    // 4. EVENTOS DE AUDIO Y MÚSICA
    document.getElementById('btn-silenciar')?.addEventListener('click', (e) => {
        e.stopPropagation();
        const silenciado = toggleSilencio();
        const icono = e.currentTarget.querySelector('i');
        if (icono) {
            icono.className = silenciado ? 'fa-solid fa-volume-xmark' : 'fa-solid fa-volume-high';
        }
        mostrarNotificacion(silenciado ? 'Sonido silenciado' : 'Sonido activado');
    });

    document.getElementById('btn-musica')?.addEventListener('click', (e) => {
        e.stopPropagation();
        const activa = toggleMusicaFondo();
        const icono = e.currentTarget.querySelector('i');
        if (icono) {
            icono.className = activa ? 'fa-solid fa-music' : 'fa-solid fa-volume-xmark';
        }
        mostrarNotificacion(activa ? 'Música activada' : 'Música pausada');
    });

    document.addEventListener('click', (e) => {
        if (e.target.closest('#btn-musica') || e.target.closest('#btn-silenciar') || e.target.closest('#btn-config-audio')) {
            return;
        }
        iniciarMusicaFondo();
    });

    // === CONFIGURACIÓN DE AUDIO (VOLUMEN Y PISTAS) ===
    const modalAudio = document.getElementById('modal-audio');
    const btnConfigAudio = document.getElementById('btn-config-audio');
    const sliderVolumen = document.getElementById('audio-volumen');
    const textoVolumen = document.getElementById('audio-volumen-valor');
    const selectPista = document.getElementById('audio-pista');

    if (modalAudio && btnConfigAudio && sliderVolumen) {
        // Abrir modal
        btnConfigAudio.addEventListener('click', (e) => {
            e.stopPropagation();
            const volActual = Math.round(getVolumenMusica() * 100);
            sliderVolumen.value = volActual;
            textoVolumen.textContent = `${volActual}%`;
            if (selectPista) selectPista.value = getPistaActual();   // muestra la canción actual
            modalAudio.classList.remove('hidden');
        });

        // Cerrar modal
        modalAudio.querySelectorAll('[data-cerrar-modal]').forEach(b => {
            b.addEventListener('click', () => modalAudio.classList.add('hidden'));
        });
        modalAudio.addEventListener('click', (e) => {
            if (e.target === modalAudio) modalAudio.classList.add('hidden');
        });

        // Cambiar volumen en tiempo real
        sliderVolumen.addEventListener('input', (e) => {
            const val = e.target.value;
            textoVolumen.textContent = `${val}%`;
            setVolumenMusica(val / 100);
        });

        // Cambiar pista de música
        if (selectPista) {
            // Llenar el selector con todas las canciones que hay en sonidos.js
            listaPistas().forEach(({ ruta, nombre }) => {
                const opcion = document.createElement('option');
                opcion.value = ruta;
                opcion.textContent = nombre;
                selectPista.appendChild(opcion);
            });
            selectPista.value = getPistaActual();

            selectPista.addEventListener('change', (e) => {
                cambiarPista(e.target.value);
                mostrarNotificacion('Pista cambiada: ' + e.target.options[e.target.selectedIndex].text);
            });

            // Botón "siguiente canción"
            document.getElementById('audio-siguiente')?.addEventListener('click', () => {
                siguientePista();
                selectPista.value = getPistaActual();
                mostrarNotificacion('Pista: ' + selectPista.options[selectPista.selectedIndex].text);
            });
        }
    }

    // ==========================================
    // 4.5 CONFIGURACIÓN DEL DUELO EN VIVO
    // ==========================================
    
    // Profesor: Abrir la vista del duelo
    document.getElementById('btn-abrir-duelo-profesor')?.addEventListener('click', () => {
        document.getElementById('duelo-lobby').classList.remove('hidden');
        document.getElementById('duelo-espera').classList.add('hidden');
        document.getElementById('duelo-juego').classList.add('hidden');
        mostrarVista('view-duelo');
    });

    // Profesor: Crear la sala (genera el código)
    document.getElementById('btn-crear-sala')?.addEventListener('click', async () => {
        const { crearSalaDuelo } = await import('./duelo.js');
        crearSalaDuelo();
    });

    // Cualquiera de los dos: Salir del duelo y volver
    document.getElementById('btn-salir-duelo')?.addEventListener('click', () => {
        cerrarDuelo();
        if (bd.obtener(CLAVES.USUARIO_ACTUAL)?.rol === 'profesor') {
            window.abrirPanelCarrera(bd.obtener(CLAVES.CARRERA_ACTIVA));
        } else {
            mostrarVista('view-panel-estudiante');
        }
    });

    // Estudiante: Unirse al duelo con el código
    document.getElementById('btn-unirse-duelo')?.addEventListener('click', async () => {
        const codigo = prompt("Ingresa el código de sala que te dio tu profesor:");
        if (codigo) {
            const { unirseADuelo } = await import('./duelo.js');
            unirseADuelo(codigo);
        }
    });

    // ==========================================
    // FIN DE LA CONFIGURACIÓN DEL DUELO
    // ==========================================

    // 5. LOGIN DEL PROFESOR
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

    // 6. LOGOUT GLOBAL
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

    // 7. RECUPERAR SESIÓN ACTIVA
    const usuarioActual = bd.obtener(CLAVES.USUARIO_ACTUAL);

    if (usuarioActual && usuarioActual.rol === 'profesor') {
        mostrarHeaderProfesor(usuarioActual.nombre);
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

    console.log('🎰 EduNIC - Listo');
}

/* FUNCIONES AUXILIARES */

function mostrarHeaderProfesor(nombre) {
    const infoSesion = document.getElementById('session-info');
    const etiquetaUsuario = document.getElementById('user-display');
    if (!infoSesion || !etiquetaUsuario) return;
    infoSesion.classList.remove('hidden');
    etiquetaUsuario.innerHTML = `<i class="fa-solid fa-chalkboard-user"></i> ${nombre} <span class="text-muted">(Profesor)</span>`;
}

function resetearPestanas(idContenedor) {
    const contenedor = document.getElementById(idContenedor);
    if (!contenedor) return;
    const btns = contenedor.querySelectorAll('.tab-btn');
    const contents = contenedor.querySelectorAll('.tab-content');
    btns.forEach((b, i) => { b.classList.toggle('active', i === 0); });
    contents.forEach((c, i) => {
        c.classList.toggle('hidden', i !== 0);
        c.classList.toggle('active', i === 0);
    });
}

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

/* ARRANCAR LA APP */

document.addEventListener('DOMContentLoaded', () => {
    iniciarApp().catch(err => {
        console.error('❌ Error al iniciar la app:', err);
        mostrarNotificacion('Error de conexión. Trabajando en modo local.', 'error');
        mostrarVista('view-landing');
    });
});

console.log('🔵 app.js: archivo terminó de ejecutarse');