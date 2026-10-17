/* VISTAS/ESTUDIANTE/REGISTRO.JS
   Auto-registro de estudiantes con código de clase

   Responsabilidades:
   - Verificar el código de clase
   - Mostrar la carrera encontrada
   - Registrar al estudiante con su nombre
   - Mostrar la pantalla de éxito con el código asignado */

import { bd, CLAVES } from '../../storage.js';
import {
    mostrarNotificacion,
    generarId,
    escaparHTML,
    normalizar,
    limpiarNombre
} from '../../utils.js';
import { mostrarVista } from '../../navegacion.js';

/* ESTADO INTERNO */

let carreraEncontrada = null; // Carrera a la que se va a unir el estudiante
let codigoAsignado = '';      // Código único que se le asigna al estudiante

/* PUNTO DE ENTRADA */

/**
 * Inicializa el módulo de registro.
 * Se llama una sola vez desde app.js.
 */
export function inicializarRegistro() {
    console.log('Módulo Registro: iniciando');

    conectarVerificarCodigo();
    conectarVolverAlPaso1();
    conectarFormularioRegistro();
    conectarBotonCopiarCodigo();
    conectarBotonIrALogin();

    console.log('Módulo Registro: listo');
}

/**
 * Resetea la vista de registro a su estado inicial.
 * Se llama cada vez que el usuario entra al registro.
 */
export function resetearRegistro() {
    carreraEncontrada = null;
    codigoAsignado = '';

    // Resetear formulario y inputs
    const form = document.getElementById('form-registro-estudiante');
    if (form) form.reset();

    // Volver al paso 1
    mostrarPaso(1);
}

/* NAVEGACIÓN ENTRE PASOS */

/**
 * Muestra un paso específico (1, 2 o 3) y oculta los demás.
 * 
 * @param {1|2|3} numero - Número del paso a mostrar
 */
function mostrarPaso(numero) {
    const pasos = {
        1: document.getElementById('registro-paso-1'),
        2: document.getElementById('registro-paso-2'),
        3: document.getElementById('registro-paso-3')
    };

    Object.values(pasos).forEach(p => p?.classList.add('hidden'));

    if (pasos[numero]) {
        pasos[numero].classList.remove('hidden');
    }
}

/* PASO 1: VERIFICAR CÓDIGO */

function conectarVerificarCodigo() {
    const btn = document.getElementById('btn-verificar-codigo');
    const input = document.getElementById('registro-codigo-clase');
    if (!btn || !input) return;

    btn.addEventListener('click', verificarCodigo);

    // También permitir Enter en el campo
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            verificarCodigo();
        }
    });
}

/**
 * Verifica que el código de clase ingresado exista.
 * Si existe, pasa al paso 2 y muestra la carrera.
 */
function verificarCodigo() {
    const input = document.getElementById('registro-codigo-clase');
    const codigo = normalizar(input.value);

    // Validación básica
    if (!codigo) {
        mostrarNotificacion('Ingresa un código de clase', 'error');
        return;
    }

    // Buscar la carrera con ese código
    const carreras = bd.obtener(CLAVES.CARRERAS) || [];
    const carrera = carreras.find(c => normalizar(c.codigoClase) === codigo);

    if (!carrera) {
        mostrarNotificacion('Código no válido. Verifica con tu profesor.', 'error');
        return;
    }

    // Guardar la carrera encontrada
    carreraEncontrada = carrera;

    // Rellenar la info de la carrera en el paso 2
    document.getElementById('registro-carrera-nombre').textContent = carrera.nombre;
    document.getElementById('registro-carrera-anio').textContent = carrera.anio;

    // Ir al paso 2
    mostrarPaso(2);

    // Enfocar el input del nombre
    setTimeout(() => {
        document.getElementById('registro-nombre').focus();
    }, 100);

    mostrarNotificacion(`Código válido: ${carrera.nombre}`);
}

/* PASO 2: REGISTRAR ESTUDIANTE */

function conectarVolverAlPaso1() {
    const btn = document.getElementById('btn-registro-volver');
    if (!btn) return;

    btn.addEventListener('click', () => {
        // Limpiar el nombre y volver al paso 1
        document.getElementById('registro-nombre').value = '';
        carreraEncontrada = null;
        mostrarPaso(1);

        // Enfocar el input del código
        setTimeout(() => {
            document.getElementById('registro-codigo-clase').focus();
        }, 100);
    });
}

function conectarFormularioRegistro() {
    const form = document.getElementById('form-registro-estudiante');
    if (!form) return;

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        registrarEstudiante();
    });
}

/**
 * Registra al estudiante en la carrera seleccionada.
 * Crea el estudiante con un código único (EST-XXX).
 */
function registrarEstudiante() {
    // Verificaciones previas
    if (!carreraEncontrada) {
        mostrarNotificacion('No hay una carrera seleccionada', 'error');
        mostrarPaso(1);
        return;
    }

    const inputNombre = document.getElementById('registro-nombre');
    const nombre = limpiarNombre(inputNombre.value);

    if (!nombre) {
        mostrarNotificacion('Escribe tu nombre completo', 'error');
        return;
    }

    if (nombre.length < 3) {
        mostrarNotificacion('El nombre es demasiado corto', 'error');
        return;
    }

    // Cargar todos los estudiantes
    const estudiantes = bd.obtener(CLAVES.ESTUDIANTES) || [];

    // Verificar que no exista ese nombre en la misma carrera
    const duplicado = estudiantes.some(e =>
        String(e.idCarrera) === String(carreraEncontrada.id) &&
        normalizar(e.nombre) === normalizar(nombre)
    );

    if (duplicado) {
        mostrarNotificacion(
            'Ya existe un estudiante con ese nombre en esta carrera. ' +
            'Si eres tú, pide ayuda a tu profesor.',
            'error'
        );
        return;
    }

    // Generar código único (global, no por carrera)
    const codigo = calcularSiguienteCodigoGlobal(estudiantes);

    // Crear el nuevo estudiante
    const nuevoEstudiante = {
        id: generarId(),
        nombre,
        codigo,
        idCarrera: String(carreraEncontrada.id)
    };

    estudiantes.push(nuevoEstudiante);
    bd.guardar(CLAVES.ESTUDIANTES, estudiantes);

    // Guardar el código asignado para mostrarlo en el paso 3
    codigoAsignado = codigo;

    // Mostrar pantalla de éxito
    mostrarExitoRegistro();

    mostrarNotificacion(`¡Bienvenido, ${nombre}!`);
}

/**
 * Calcula el siguiente código único global (EST-101, EST-102...).
 * El código es global, no por carrera.
 * 
 * @param {Array} estudiantes - Lista de todos los estudiantes
 * @returns {string} Ej: "EST-115"
 */
function calcularSiguienteCodigoGlobal(estudiantes) {
    if (estudiantes.length === 0) return 'EST-101';

    const numeros = estudiantes
        .map(e => parseInt((e.codigo || '').replace(/\D/g, ''), 10))
        .filter(n => !isNaN(n));

    if (numeros.length === 0) return 'EST-101';

    return `EST-${Math.max(...numeros) + 1}`;
}

/* PASO 3: PANTALLA DE ÉXITO */

/**
 * Muestra la pantalla de éxito con el código asignado.
 */
function mostrarExitoRegistro() {
    document.getElementById('registro-codigo-asignado').textContent = codigoAsignado;
    mostrarPaso(3);
}

function conectarBotonCopiarCodigo() {
    const btn = document.getElementById('btn-copiar-codigo-estudiante');
    if (!btn) return;

    btn.addEventListener('click', async () => {
        if (!codigoAsignado) return;

        try {
            await navigator.clipboard.writeText(codigoAsignado);
            mostrarNotificacion('Código copiado');
        } catch (e) {
            // Fallback para navegadores sin clipboard API
            const textarea = document.createElement('textarea');
            textarea.value = codigoAsignado;
            textarea.style.position = 'fixed';
            textarea.style.opacity = '0';
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            mostrarNotificacion('Código copiado');
        }
    });
}

function conectarBotonIrALogin() {
    const btn = document.getElementById('btn-ir-a-login');
    if (!btn) return;

    btn.addEventListener('click', () => {
        resetearRegistro();
        mostrarVista('view-login-estudiante');
    });
}