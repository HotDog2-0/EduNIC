/* Asistente IA con Gemini para el panel el profesor */

import { bd, CLAVES } from '../../storage.js';
import { mostrarNotificacion, escaparHTML } from '../../utils.js';


/* CONFIGURACIÓN SEGURA*/

let GEMINI_API_KEY = null;
let GEMINI_MODEL = 'gemini-3.5-flash-lite';
let API_DISPONIBLE = false;

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/interactions';

/**
 * Carga la configuración de forma segura.
 * Si config.js no existe, la API queda deshabilitada.
 */
async function cargarConfiguracion() {
    try {
        const { CONFIG } = await import('../../config.js');
        GEMINI_API_KEY = CONFIG.GEMINI_API_KEY;
        GEMINI_MODEL = CONFIG.GEMINI_MODEL || 'gemini-2.5-flash';
        API_DISPONIBLE = !!(GEMINI_API_KEY && GEMINI_API_KEY !== 'TU_API_KEY_AQUI');
        console.log('✅ config.js cargado. API:', API_DISPONIBLE ? 'disponible' : 'sin key');
    } catch (e) {
        console.warn('⚠️ config.js no encontrado. El asistente IA no estará disponible.');
        API_DISPONIBLE = false;
    }
}

/* ESTADO INTERNO */

let idCarreraActiva = null;
let historialChat = [];   // [{ role: 'user'|'model', partes: 'texto' }]
let enviando = false;

/* PUNTO DE ENTRADA */

/**
 * Inicializa el módulo del asistente.
 * Se llama una sola vez desde app.js.
 */
export async function inicializarAsistente() {
    console.log('Módulo Asistente: iniciando');

    await cargarConfiguracion();

    conectarBotonEnviar();
    conectarInputEnter();
    conectarBotonesRapidos();
    conectarAutoResizeTextarea();

    console.log('Módulo Asistente: listo');
}

/**
 * Carga el asistente para una carrera específica.
 * Se llama al abrir el panel de una carrera.
 * @param {string} idCarrera
 */
export function cargarAsistenteDeCarrera(idCarrera) {
    idCarreraActiva = idCarrera;
    historialChat = [];
    limpiarMensajes();
    mostrarBienvenida();

    // ─── Si no hay API, mostrar aviso ───
    if (!API_DISPONIBLE) {
        mostrarAvisoSinAPI();
    } else {
        // Habilitar input y botones
        habilitarAsistente();
    }
}

function mostrarAvisoSinAPI() {
    const cont = document.getElementById('asistente-mensajes');
    if (!cont) return;

    // Deshabilitar input
    const input = document.getElementById('asistente-input');
    const btnEnviar = document.getElementById('btn-asistente-enviar');
    if (input) {
        input.disabled = true;
        input.placeholder = 'El asistente IA no está disponible';
    }
    if (btnEnviar) btnEnviar.disabled = true;

    // Deshabilitar botones rápidos
    document.querySelectorAll('[data-accion-ia]').forEach(btn => {
        btn.disabled = true;
        btn.title = 'El asistente IA no está disponible';
    });

    // Mensaje de aviso
    cont.innerHTML += `
        <div class="asistente-aviso">
            <i class="fa-solid fa-triangle-exclamation"></i>
            <div>
                <strong>Asistente IA no disponible</strong>
                <p>Para usar el asistente, configura tu API key de Gemini en <code>js/config.js</code>.</p>
            </div>
        </div>
    `;
}

function habilitarAsistente() {
    const input = document.getElementById('asistente-input');
    const btnEnviar = document.getElementById('btn-asistente-enviar');
    if (input) {
        input.disabled = false;
        input.placeholder = 'Escribe tu pregunta aquí...';
    }
    if (btnEnviar) btnEnviar.disabled = false;

    document.querySelectorAll('[data-accion-ia]').forEach(btn => {
        btn.disabled = false;
        btn.title = '';
    });
}

/* INTERFAZ: MENSAJES */

function limpiarMensajes() {
    const cont = document.getElementById('asistente-mensajes');
    if (cont) cont.innerHTML = '';
}

function mostrarBienvenida() {
    const cont = document.getElementById('asistente-mensajes');
    if (!cont) return;

    cont.innerHTML = `
        <div class="asistente-bienvenida">
            <div class="asistente-bienvenida-icono">
                <i class="fa-solid fa-robot"></i>
            </div>
            <p>¡Hola! Soy tu asistente. Puedo ayudarte a analizar el rendimiento de tu grupo, darte ideas para clases o redactar mensajes para tus estudiantes.</p>
            <p class="text-muted">Prueba con un botón rápido o escríbeme algo.</p>
        </div>
    `;
}

/**
 * Añade un mensaje al chat.
 * @param {string} texto - Contenido del mensaje
 * @param {'user'|'model'} rol - Quién envía el mensaje
 */
function agregarMensaje(texto, rol) {
    const cont = document.getElementById('asistente-mensajes');
    if (!cont) return;

    // Eliminar la bienvenida si es el primer mensaje
    const bienvenida = cont.querySelector('.asistente-bienvenida');
    if (bienvenida) bienvenida.remove();

    const esUsuario = rol === 'user';
    const clase = esUsuario ? 'usuario' : 'ia';
    const icono = esUsuario ? 'fa-user' : 'fa-robot';

    // Para mensajes de la IA, convertir saltos de línea a <br> y negritas
    const contenidoHTML = esUsuario
        ? escaparHTML(texto)
        : formatearRespuestaIA(texto);

    const div = document.createElement('div');
    div.className = `mensaje-chat ${clase}`;
    div.innerHTML = `
        <div class="mensaje-chat-avatar">
            <i class="fa-solid ${icono}"></i>
        </div>
        <div class="mensaje-chat-burbuja">
            ${contenidoHTML}
        </div>
    `;

    cont.appendChild(div);
    scrollAbajo();
}

/**
 * Formatea la respuesta de la IA:
 * - Convierte saltos de línea en <br>
 * - Convierte **texto** en <strong>
 * - Convierte *texto* en <em>
 */
function formatearRespuestaIA(texto) {
    let html = escaparHTML(texto);
    // Negritas: **texto**
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    // Cursivas: *texto* (pero no dentro de **)
    html = html.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '<em>$1</em>');
    // Saltos de línea
    html = html.replace(/\n/g, '<br>');
    return html;
}

/**
 * Muestra el indicador de "escribiendo..." y devuelve el elemento
 * para poder eliminarlo después.
 */
function mostrarEscribiendo() {
    const cont = document.getElementById('asistente-mensajes');
    if (!cont) return null;

    const div = document.createElement('div');
    div.className = 'mensaje-chat ia';
    div.id = 'mensaje-escribiendo';
    div.innerHTML = `
        <div class="mensaje-chat-avatar">
            <i class="fa-solid fa-robot"></i>
        </div>
        <div class="mensaje-chat-burbuja">
            <div class="mensaje-chat-escribiendo">
                <span></span><span></span><span></span>
            </div>
        </div>
    `;
    cont.appendChild(div);
    scrollAbajo();
    return div;
}

function ocultarEscribiendo() {
    document.getElementById('mensaje-escribiendo')?.remove();
}

function scrollAbajo() {
    const cont = document.getElementById('asistente-mensajes');
    if (cont) cont.scrollTop = cont.scrollHeight;
}

/* CONTEXTO DE LA CARRERA */

/**
 * Construye el contexto de la carrera activa para enviarlo a Gemini.
 * Incluye: nombre de carrera, año, estudiantes, módulos, evaluaciones y notas.
 * @returns {string} Texto con el contexto
 */
function construirContexto() {
    if (!idCarreraActiva) return '';

    const carreras = bd.obtener(CLAVES.CARRERAS) || [];
    const carrera = carreras.find(c => String(c.id) === String(idCarreraActiva));
    if (!carrera) return '';

    const estudiantes = (bd.obtener(CLAVES.ESTUDIANTES) || [])
        .filter(e => String(e.idCarrera) === String(idCarreraActiva));

    const temas = bd.obtener(CLAVES.TEMAS) || [];
    const modulos = temas.filter(t => t.tipo === 'modulo' && String(t.idCarrera) === String(idCarreraActiva));

    const evaluaciones = (bd.obtener(CLAVES.EVALUACIONES) || [])
        .filter(e => String(e.idCarrera) === String(idCarreraActiva));

    const resultados = (bd.obtener(CLAVES.RESULTADOS) || [])
        .filter(r => String(r.idCarrera) === String(idCarreraActiva));

    // Construir resumen de notas por estudiante
    const notasPorEstudiante = {};
    resultados.forEach(r => {
        if (r.estado === 'calificada' && typeof r.puntosObtenidos === 'number') {
            if (!notasPorEstudiante[r.idEstudiante]) {
                notasPorEstudiante[r.idEstudiante] = { total: 0, count: 0 };
            }
            notasPorEstudiante[r.idEstudiante].total += r.puntosObtenidos;
            notasPorEstudiante[r.idEstudiante].count++;
        }
    });

    const estudiantesInfo = estudiantes.map(e => {
        const notas = notasPorEstudiante[e.id];
        const promedio = notas && notas.count > 0
            ? (notas.total / notas.count).toFixed(1)
            : 'sin notas';
        return `- ${e.nombre} (${e.codigo}): promedio ${promedio} puntos`;
    }).join('\n');

    const modulosInfo = modulos.map(m => {
        const temasDelModulo = temas.filter(t => t.tipo === 'tema' && t.idModulo === m.id);
        return `- ${m.nombre} (${temasDelModulo.length} temas)`;
    }).join('\n');

    const evaluacionesInfo = evaluaciones.map(ev => {
        const respuestas = resultados.filter(r => r.idEvaluacion === ev.id);
        const calificadas = respuestas.filter(r => r.estado === 'calificada');
        const promedio = calificadas.length > 0
            ? (calificadas.reduce((sum, r) => sum + (r.puntosObtenidos || 0), 0) / calificadas.length).toFixed(1)
            : 'sin respuestas';
        return `- ${ev.titulo}: ${respuestas.length} respuestas, promedio ${promedio} puntos`;
    }).join('\n');

    return `
=== CONTEXTO DE LA CARRERA ===
Carrera: ${carrera.nombre} — ${carrera.anio}
Total de estudiantes: ${estudiantes.length}

Estudiantes y sus promedios:
${estudiantesInfo || '(sin estudiantes)'}

Módulos/Unidades:
${modulosInfo || '(sin módulos)'}

Evaluaciones:
${evaluacionesInfo || '(sin evaluaciones)'}
=== FIN DEL CONTEXTO ===
`;
}

/* ENVÍO DE MENSAJES */

function conectarBotonEnviar() {
    document.getElementById('btn-asistente-enviar')
        ?.addEventListener('click', enviarMensaje);
}

function conectarInputEnter() {
    const input = document.getElementById('asistente-input');
    if (!input) return;

    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            enviarMensaje();
        }
    });
}

function conectarAutoResizeTextarea() {
    const input = document.getElementById('asistente-input');
    if (!input) return;

    input.addEventListener('input', () => {
        input.style.height = 'auto';
        input.style.height = Math.min(input.scrollHeight, 120) + 'px';
    });
}

async function enviarMensaje() {
    if (enviando) return;

    const input = document.getElementById('asistente-input');
    const texto = input?.value.trim();

    if (!texto) return;

    // ─── Verificar si la API está disponible ───
    if (!API_DISPONIBLE) {
        mostrarNotificacion('El asistente IA no está disponible en este entorno', 'error');
        return;
    }

    if (!idCarreraActiva) {
        mostrarNotificacion('No hay carrera activa', 'error');
        return;
    }

    enviando = true;
    input.value = '';
    input.style.height = 'auto';
    input.disabled = true;
    document.getElementById('btn-asistente-enviar').disabled = true;

    agregarMensaje(texto, 'user');

    mostrarEscribiendo();

    try {
        const respuesta = await llamarGemini(texto);
        ocultarEscribiendo();
        agregarMensaje(respuesta, 'model');
    } catch (error) {
        ocultarEscribiendo();
        console.error('Error en Gemini:', error);
        agregarMensaje('Lo siento, hubo un error al procesar tu mensaje. ' + error.message, 'model');
    } finally {
        enviando = false;
        input.disabled = false;
        document.getElementById('btn-asistente-enviar').disabled = false;
        input.focus();
    }
}

/* LLAMADA A GEMINI */

/**
 * Llama a la API de Gemini con el contexto de la carrera.
 * @param {string} mensajeUsuario
 * @returns {Promise<string>} Respuesta de la IA
 */
async function llamarGemini(mensajeUsuario) {
    const contexto = construirContexto();

    const systemPrompt = `Eres un asistente educativo útil para un profesor. 
Tu trabajo es ayudar al profesor a analizar el rendimiento de su grupo, 
sugerir ideas para clases, redactar mensajes para estudiantes, y responder 
preguntas sobre la carrera.

${contexto}

Responde de forma clara, concisa y útil. Usa español.
Si el profesor pregunta algo sobre sus estudiantes o evaluaciones, 
usa los datos del contexto para responder.
Si no tienes suficiente información, dilo honestamente.`;

    const body = {
        model: GEMINI_MODEL,
        input: mensajeUsuario,
        system_instruction: systemPrompt
    };

    // CAMBIO: autenticación con header x-goog-api-key
    const response = await fetch(GEMINI_API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': GEMINI_API_KEY
        },
        body: JSON.stringify(body)
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const mensaje = errorData?.error?.message || `Error ${response.status}`;
        throw new Error(mensaje);
    }

    const data = await response.json();

    // La nueva API devuelve los datos en 'steps'
    const modelOutput = data?.steps?.find(step => step.type === 'model_output');
    const texto = modelOutput?.content?.[0]?.text;

    if (!texto) {
        console.error('Respuesta completa de Gemini:', data);
        throw new Error('La IA no devolvió una respuesta válida');
    }

    return texto;
}

/* BOTONES RÁPIDOS */

function conectarBotonesRapidos() {
    document.querySelectorAll('[data-accion-ia]').forEach(btn => {
        btn.addEventListener('click', () => {
            const accion = btn.dataset.accionIa;
            const input = document.getElementById('asistente-input');
            if (!input) return;

            const prompts = {
                resumen: 'Hazme un resumen del estado actual de mi grupo: cuántos estudiantes tengo, cómo van sus notas, qué evaluaciones he creado.',
                refuerzo: '¿Qué estudiantes necesitan refuerzo? Basándote en sus promedios, dime quiénes tienen las notas más bajas y qué podrías sugerir para ayudarlos.',
                ideas: 'Dame 3 ideas de actividades o temas para mi próxima clase. Considera los módulos que tengo creados y el nivel de mis estudiantes.',
                mensaje: 'Redacta un mensaje para mis estudiantes recordándoles que tienen evaluaciones pendientes. Que sea amable y motivador.'
            };

            input.value = prompts[accion] || '';
            input.focus();
            // Auto-resize
            input.style.height = 'auto';
            input.style.height = Math.min(input.scrollHeight, 120) + 'px';
        });
    });
}