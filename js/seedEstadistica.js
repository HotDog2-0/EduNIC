/* ============================================
   SEED ESTADÍSTICA - CONTENIDO COMPLETO PARA ESTUDIANTES
   ============================================ */

import { bd, CLAVES } from './storage.js';
import { generarId } from './utils.js';

export function cargarTemarioEstadistica(idAnioActivo) {
    // 1. Verificar si ya se cargó antes para no duplicar
    const temasExistentes = bd.obtener(CLAVES.TEMAS) || [];
    if (temasExistentes.some(t => t.idAnio === idAnioActivo && t.nombre === "UNIDAD I. Tipos de variables y niveles de medición")) {
        console.log("El temario de estadística ya está cargado.");
        return false;
    }

    const nuevosModulos = [];
    const nuevosTemas = [];

    // Función auxiliar para crear módulos y temas rápidamente
    const crearUnidad = (nombreModulo, temasArray) => {
        const idModulo = generarId();
        
        // Crear el módulo (Unidad)
        nuevosModulos.push({
            id: idModulo,
            tipo: 'modulo',
            idAnio: idAnioActivo,
            nombre: nombreModulo,
            creado: new Date().toISOString()
        });

        // Crear los temas de esa unidad
        temasArray.forEach(t => {
            nuevosTemas.push({
                id: generarId(),
                tipo: 'tema',
                idModulo: idModulo,
                idAnio: idAnioActivo,
                titulo: t.titulo,
                descripcion: t.descripcion,
                ejemplo: t.ejemplo,
                material: t.material || [],
                creado: new Date().toISOString()
            });
        });
    };

    // ==========================================
    // UNIDAD I
    // ==========================================
    crearUnidad("UNIDAD I. Tipos de variables y niveles de medición", [
        {
            titulo: "Tema 1.1. Introducción a la estadística",
            descripcion: `La estadística es la ciencia que se encarga de recolectar, organizar, analizar e interpretar datos para tomar decisiones o sacar conclusiones. Su importancia radica en que nos permite entender la realidad a través de números, desde encuestas de opinión hasta ensayos médicos.

A lo largo de la historia, ha evolucionado desde simples censos en civilizaciones antiguas hasta complejos análisis computacionales. Hoy en día, se aplica en economía (para medir la inflación), ciencias sociales (estudios de población), ciencias naturales (genética) e informática (inteligencia artificial).

Se divide en dos grandes ramas:
1. Estadística Descriptiva: Se encarga de resumir y presentar los datos (ej. calcular el promedio de notas de un salón).
2. Estadística Inferencial: Busca sacar conclusiones sobre una población entera a partir de una muestra (ej. predecir quién ganará las elecciones encuestando a 1000 personas).`,
            ejemplo: "Si quieres saber la estatura promedio de los estudiantes de tu escuela, no puedes medir a todos. Mides a 50 alumnos (muestra) y con estadística inferencial concluyes la estatura promedio de toda la escuela (población).",
            material: [
                { id: generarId(), tipo: 'enlace', titulo: 'Video: ¿Qué es la estadística?', url: 'https://www.youtube.com/watch?v=toC0E2w8P5c' }
            ]
        },
        {
            titulo: "Tema 1.2. Conceptos básicos de estadística",
            descripcion: `Para hacer estadística, debemos hablar el mismo idioma. Estos son los conceptos clave:

Población: El conjunto total de elementos que queremos estudiar (ej. todos los habitantes de Nicaragua).

Muestra: Un subconjunto representativo de la población (ej. 500 nicaragüenses encuestados).

Unidad estadística: El elemento individual de la población (ej. una persona en específico).

Dato estadístico: El valor que se obtiene de medir la unidad (ej. la edad de esa persona: 25 años).

Variable: La característica que puede cambiar y que estamos midiendo (ej. Edad, Sexo, Ingresos).

Atributos: Son los valores que toma una variable cualitativa (ej. "Rojo", "Verde").`,
            ejemplo: "Población: Todos los estudiantes de la facultad. Muestra: 30 estudiantes de primer año. Variable: Nota final de Estadística. Dato: 85 puntos.",
            material: []
        },
        {
            titulo: "Tema 1.3. Tipos de datos y variables estadísticas",
            descripcion: `Las variables son las protagonistas de la estadística y se clasifican en:

Cualitativas (o categóricas): Expresan cualidades o categorías, NO números. (Ej. Estado civil, color de cabello).

Cuantitativas (o numéricas): Expresan cantidades y se pueden operar matemáticamente. Se dividen en:
- Discretas: Solo toman valores enteros (ej. Número de hijos: 0, 1, 2, 3... No puedes tener 2.5 hijos).
- Continuas: Pueden tomar cualquier valor dentro de un rango, incluyendo decimales (ej. Peso, altura, temperatura).`,
            ejemplo: "Variable cualitativa: Marca de carro. Variable cuantitativa discreta: Cantidad de materias aprobadas. Variable cuantitativa continua: Distancia recorrida en kilómetros.",
            material: []
        },
        {
            titulo: "Tema 1.4. Niveles o escalas de medición",
            descripcion: `No todas las variables se miden igual. Existen 4 escalas:

Nominal: Solo sirve para etiquetar o clasificar sin orden. (Ej. Equipos de fútbol: Real Madrid, Barcelona).

Ordinal: Tiene un orden o jerarquía, pero la diferencia entre niveles no es matemática. (Ej. Nivel socioeconómico: Bajo, Medio, Alto).

De Intervalo: Tiene orden y distancias iguales, pero el cero es arbitrario (no significa ausencia total). (Ej. Temperatura en °C: 0°C no significa que no haya calor).

De Razón: Tiene todas las propiedades anteriores, pero el cero sí significa ausencia total de la característica. (Ej. Peso en kg: 0 kg significa que no hay masa).`,
            ejemplo: "Escala nominal: Nacionalidad. Escala ordinal: Nivel de satisfacción (Muy malo, Malo, Bueno, Excelente). Escala de razón: Salario mensual.",
            material: []
        },
        {
            titulo: "Tema 1.5. Técnicas de adquisición de datos",
            descripcion: `Los datos no aparecen por arte de magia; hay que recolectarlos. Las fuentes de información pueden ser:

Primarias: Datos que tú mismo recolectas directamente (ej. hacer una encuesta en la calle).

Secundarias: Datos ya recopilados por otros (ej. usar los datos del Banco Central o del INE).

Las técnicas más usadas son: la observación directa, la entrevista, la encuesta (la más común) y la revisión de registros. Es vital seleccionar bien las variables para no perder tiempo recolectando datos inútiles.`,
            ejemplo: "Si vas a hacer un estudio sobre el desempleo, puedes usar datos secundarios del INE (Instituto Nacional de Información) o hacer una encuesta primaria en tu barrio.",
            material: []
        },
        {
            titulo: "Tema 1.6. Elaboración de cuestionarios",
            descripcion: `El cuestionario es el instrumento estrella para recolectar datos. Un buen cuestionario debe ser claro, breve y evitar ambigüedades.

Existen dos tipos de preguntas:
1. Cerradas: El encuestado elige entre opciones predefinidas (Sí/No, opción múltiple). Son fáciles de tabular.
2. Abiertas: El encuestado escribe libremente. Dan más información pero son difíciles de procesar estadísticamente.

Antes de aplicar un cuestionario masivamente, se debe hacer una validación (prueba piloto) con un grupo pequeño para ver si las preguntas se entienden bien.`,
            ejemplo: "Pregunta cerrada: ¿Cuántas horas al día estudias? (a) 0-1 hora (b) 1-3 horas (c) Más de 3. Pregunta abierta: ¿Qué mejorarías de las clases?",
            material: []
        }
    ]);

    // ==========================================
    // UNIDAD II
    // ==========================================
    crearUnidad("UNIDAD II. Distribuciones de frecuencias unidimensionales", [
        {
            titulo: "Tema 2.1. Organización y reducción de datos",
            descripcion: `Cuando recolectamos datos (ej. las edades de 100 personas), obtenemos una lista desordenada. El primer paso es ordenarlos.

Datos no agrupados: Son pocos datos y se pueden analizar uno por uno.

Datos agrupados: Cuando hay muchos datos, se agrupan en intervalos o clases (ej. de 10 a 20 años, de 20 a 30 años) para facilitar el conteo y análisis.`,
            ejemplo: "Si tienes las edades 12, 15, 11, 14, 13, 12... ordenados de menor a mayor es: 11, 12, 12, 13, 14, 15.",
            material: []
        },
        {
            titulo: "Tema 2.2. Distribuciones de frecuencias",
            descripcion: `Una tabla de distribución de frecuencias es una forma de resumir datos. Sus columnas principales son:

Frecuencia Absoluta (fi): Cuántas veces aparece un valor. (Si la suma de esta columna no da el total de datos, la tabla está mal).

Frecuencia Relativa (hi): Es la proporción de veces que aparece el valor. Se calcula dividiendo fi entre el total de datos (n). Multiplicado por 100 da el porcentaje.

Frecuencia Acumulada (Fi): La suma de las frecuencias absolutas anteriores. Sirve para saber cuántos datos hay "hasta ese valor".`,
            ejemplo: "Si en un salón hay 3 personas con nota 7. La frecuencia absoluta de 7 es 3. Si el salón tiene 30 alumnos, la frecuencia relativa es 3/30 = 0.10 (o 10%).",
            material: []
        },
        {
            titulo: "Tema 2.3. Representación gráfica de datos",
            descripcion: `Un gráfico vale más que mil números. Los gráficos estadísticos ayudan a ver patrones rápidamente.

Variables cualitativas: Se usan gráficos de barras o gráficos circulares (pastel).

Variables cuantitativas: Se usan histogramas (barras pegadas que representan intervalos), polígonos de frecuencia (líneas que unen los puntos) y ojivas (para frecuencias acumuladas).`,
            ejemplo: "Para mostrar cuántos hombres y mujeres hay en un salón, un gráfico circular (pastel) es ideal. Para mostrar cómo se distribuyen las edades de un grupo, un histograma es lo correcto.",
            material: []
        },
        {
            titulo: "Tema 2.4. Medidas de posición central",
            descripcion: `Son valores que nos indican el "centro" de nuestros datos. Las tres principales son:

Media aritmética (Promedio): La suma de todos los datos dividida entre la cantidad de datos. Es sensible a los valores extremos.

Mediana (Me): El valor que queda justo en el medio cuando los datos están ordenados. (Si son pares, es el promedio de los dos del medio). Es más robusta que la media.

Moda (Mo): El valor que más se repite. Puede haber más de una moda.`,
            ejemplo: "Datos: 5, 7, 7, 8, 9. Media = (5+7+7+8+9)/5 = 7.2. Mediana = 7 (el del centro). Moda = 7 (el que más se repite).",
            material: []
        },
        {
            titulo: "Tema 2.5. Medidas de posición no central",
            descripcion: `Así como la mediana divide los datos en dos, podemos dividirlos en más partes:

Cuartiles (Q): Dividen los datos en 4 partes iguales (Q1, Q2, Q3). El Q2 es la mediana.

Deciles (D): Dividen en 10 partes.

Percentiles (P): Dividen en 100 partes. (Ej. el Percentil 90 indica el valor que deja por debajo al 90% de los datos, muy usado en exámenes para ver quién está en el top 10%).`,
            ejemplo: "Si en un examen de admisión sacas el Percentil 85, significa que tu nota fue mejor que la del 85% de las personas que hicieron el examen.",
            material: []
        },
        {
            titulo: "Tema 2.6. Medidas de dispersión",
            descripcion: `Dos grupos pueden tener el mismo promedio, pero ser muy diferentes. Las medidas de dispersión indican qué tan "regados" están los datos:

Rango: La diferencia entre el valor máximo y el mínimo.

Varianza: Es el promedio de las distancias al cuadrado respecto a la media.

Desviación Estándar: La raíz cuadrada de la varianza. Es la más fácil de interpretar porque vuelve a las unidades originales de los datos. Una desviación pequeña indica que los datos están concentrados; una grande, que están dispersos.

Coeficiente de Variación: Permite comparar la dispersión de dos conjuntos de datos con diferentes unidades (ej. comparar la dispersión del peso en kg con la dispersión de la altura en cm).`,
            ejemplo: "Las notas de dos salones dan 8 de promedio. En el Salón A todos sacaron entre 7 y 9 (baja dispersión). En el Salón B sacaron entre 2 y 10 (alta dispersión).",
            material: []
        },
        {
            titulo: "Tema 2.7. Medidas de concentración y forma",
            descripcion: `Estas medidas nos dicen cómo se comporta la "curva" de nuestros datos:

Asimetría: Indica si la campana está inclinada hacia un lado. Si la cola es larga hacia la derecha, es asimétrica positiva (la mayoría de los datos son bajos). Si la cola es hacia la izquierda, es asimétrica negativa.

Curtosis: Indica qué tan "puntiaguda" o "plana" es la distribución en el centro comparándola con una curva normal. Puede ser leptocúrtica (muy puntiaguda), mesocúrtica (normal) o platicúrtica (aplanada).`,
            ejemplo: "Los salarios en la mayoría de los países tienen una fuerte asimetría positiva: hay mucha gente que gana poco (cerca de la base) y pocas personas que ganan millones (la cola larga hacia la derecha).",
            material: []
        },
        {
            titulo: "Tema 2.8. Análisis e interpretación de información estadística",
            descripcion: `El paso final del proceso estadístico es comunicar los resultados. No basta con calcular números, hay que interpretarlos.

Un buen informe estadístico incluye: 

La introducción (qué se quería saber).
La metodología (cómo se recolectaron los datos).
Los resultados (las tablas y gráficos).
Las conclusiones (qué significan esos números para la toma de decisiones).`,
            ejemplo: "En lugar de solo decir 'el promedio es 7.5', un buen análisis dice: 'El promedio de los estudiantes es de 7.5 puntos, con una desviación estándar de 1.2, lo que indica que la mayoría de las notas están entre 6.3 y 8.7, teniendo un rendimiento aceptable pero con margen de mejora'.",
            material: []
        }
    ]);

    // ==========================================
    // UNIDAD III
    // ==========================================
    crearUnidad("UNIDAD III. Distribuciones de frecuencias bidimensionales", [
        {
            titulo: "Tema 3.1. Introducción al análisis bidimensional",
            descripcion: `Hasta ahora hemos estudiado una variable a la vez (ej. estaturas). El análisis bidimensional estudia dos variables al mismo tiempo para ver si están relacionadas.

Por ejemplo, no solo estudiar la "Nota final", sino estudiar la relación entre "Horas de estudio" (Variable X) y "Nota final" (Variable Y). Aquí es donde nace la correlación.`,
            ejemplo: "Un estudio quiere saber si a mayor consumo de café (Variable X) hay mayor nivel de estrés (Variable Y).",
            material: []
        },
        {
            titulo: "Tema 3.2. Tablas de correlación",
            descripcion: `Son tablas donde cruzamos los datos de las dos variables. En las filas ponemos los valores de una variable y en las columnas los de la otra. Las celdas internas muestran cuántas veces se repite esa combinación.

A partir de estas tablas obtenemos frecuencias conjuntas (las de adentro) y frecuencias marginales (los totales de las filas y columnas).`,
            ejemplo: "Tabla que cruza 'Género' (Hombre/Mujer) con 'Carrera' (Ingeniería/Medicina). En las celdas vemos cuántas mujeres estudian ingeniería, cuántos hombres medicina, etc.",
            material: []
        },
        {
            titulo: "Tema 3.3. Asociación entre variables cualitativas",
            descripcion: `Cuando las dos variables son cualitativas (ej. Color de ojos y Color de cabello), no calculamos promedios, sino que usamos Tablas de Contingencia.

Para saber si están asociadas, comparamos las distribuciones condicionales (ej. ¿Cuál es la probabilidad de tener cabello negro SI tengo ojos oscuros?). Si las proporciones cambian mucho de una categoría a otra, hay asociación.`,
            ejemplo: "Si el 80% de las personas que aprobaron el examen son 'Hombres' y el 70% de los que reprobaron son 'Mujeres', podríamos sospechar una asociación entre el Género y la aprobación (aunque necesitaríamos más pruebas).",
            material: []
        },
        {
            titulo: "Tema 3.4. Representación gráfica de datos bidimensionales",
            descripcion: `El gráfico principal para dos variables cuantitativas es el Diagrama de Dispersión (Nube de Puntos). Aquí el eje X es una variable y el eje Y la otra. Cada punto en el plano representa a un individuo.

Si los puntos parecen alinearse en una línea inclinada hacia arriba, indica que hay relación positiva (a mayor X, mayor Y). Si es hacia abajo, relación negativa.`,
            ejemplo: "Si graficas en X los kilos de fertilizante usado en una planta y en Y los kilos de fruta producidos, y los puntos forman una línea diagonal ascendente, hay relación.",
            material: []
        },
        {
            titulo: "Tema 3.5. Correlación entre variables",
            descripcion: `La correlación mide la fuerza y la dirección de la relación lineal entre dos variables. Se mide con el Coeficiente de Correlación de Pearson (r).

El valor de r siempre está entre -1 y 1:

r = 1: Correlación positiva perfecta (a mayor X, mayor Y exactamente).
r = -1: Correlación negativa perfecta (a mayor X, menor Y).
r = 0: No hay correlación lineal (los puntos no forman línea).

Ojo: ¡Correlación no implica causalidad! El hecho de que dos cosas crezcan juntas no significa que una cause a la otra.`,
            ejemplo: "Si r = -0.85 entre 'Horas de ver televisión' y 'Nota en exámenes', indica que a mayor tiempo de televisión, las notas tienden a bajar (correlación negativa fuerte).",
            material: []
        },
        {
            titulo: "Tema 3.6. Regresión lineal simple",
            descripcion: `Mientras la correlación solo dice si están relacionadas, la Regresión Lineal nos permite hacer predicciones. Busca la mejor recta (línea recta) que pase por los datos.

La ecuación de la recta es: Y = a + bX

Y es la variable dependiente (la que queremos predecir).
X es la variable independiente (la que usamos para predecir).
b es la pendiente (cuánto cambia Y por cada unidad que cambia X).
a es el intercepto (donde la recta cruza el eje Y).`,
            ejemplo: "Si sabemos que Y = 50 + 5X, donde X son las horas de estudio y Y son los puntos obtenidos. Si un estudiante estudia 3 horas (X=3), predecimos Y = 50 + 5(3) = 65 puntos.",
            material: []
        }
    ]);

    // ==========================================
    // UNIDAD IV
    // ==========================================
    crearUnidad("UNIDAD IV. Indicadores y números índices", [
        {
            titulo: "Tema 4.1. Proporciones, razones, tasas e incrementos",
            descripcion: `Son medidas básicas para comparar cantidades:

Proporción: Relación de una parte con el todo (ej. 20 de 100 = 0.20). No tiene unidades.

Razón: Comparación entre dos cantidades distintas (ej. ratio de 2 hombres por cada 1 mujer).

Tasa: Es una razón que relaciona dos magnitudes con diferentes unidades (ej. personas / año, vehículos / hora). Es muy usada en demografía.

Incremento absoluto: La simple resta del valor final menos el inicial.

Incremento relativo: El cambio expresado en porcentaje respecto al valor inicial.`,
            ejemplo: "Si la inflación pasó del 4% al 5% en un año, el incremento absoluto es 1% (5-4) y el incremento relativo es 25% ((5-4)/4 * 100).",
            material: []
        },
        {
            titulo: "Tema 4.2. Introducción a los números índices",
            descripcion: `Un número índice es una medida estadística que nos permite comparar una variable a lo largo del tiempo o del espacio. Se expresa en porcentajes, donde una base (un año o lugar de referencia) siempre vale 100.

Si un índice de precios del año 2023 es 150 tomando como base el 2020 (100), significa que los precios han subido un 50% desde 2020. Los más famosos son el IPC (Índice de Precios al Consumidor) y la Bolsa de Valores.`,
            ejemplo: "Si la base de tu índice de ventas es el año 2020 (100), y en 2022 tu índice es 120, significa que tus ventas aumentaron un 20% respecto a 2020.",
            material: []
        },
        {
            titulo: "Tema 4.3. Índices simples",
            descripcion: `Se usan cuando evaluamos un solo producto o una sola variable.

Índice simple de precios: (Precio actual / Precio base) * 100.

Índice simple de cantidades: (Cantidad actual / Cantidad base) * 100.

Índice de valor: (Valor actual / Valor base) * 100. El valor es el resultado de Precio * Cantidad.`,
            ejemplo: "El precio de la libra de arroz en 2020 fue C$10 (base) y en 2023 es C$15. El índice de precio es (15/10)*100 = 150. Aumentó un 50%.",
            material: []
        },
        {
            titulo: "Tema 4.4. Índices compuestos",
            descripcion: `En la vida real, no compramos un solo producto, sino una canasta familiar (arroz, frijoles, carne, etc.). Los índices compuestos (o ponderados) combinan varios productos en un solo índice.

Los más importantes son los índices de Laspeyres (usa las cantidades del año base) y Paasche (usa las cantidades del año actual). También existen los índices agregativos y aditivos.`,
            ejemplo: "El IPC no mide solo el precio del pan, mide el precio de una canasta de cientos de productos que consume una familia promedio.",
            material: []
        },
        {
            titulo: "Tema 4.5. Deflactación y cambio de base",
            descripcion: `El dinero pierde valor por la inflación. La deflactación es el proceso de quitarle el efecto de la inflación a una serie de datos económicos (como los salarios) para saber cuál es el valor real del dinero.

Cambio de base: A veces queremos actualizar el año base de un índice (ej. pasar de base 2006 a base 2020) para que las comparaciones sean más actuales. Se hace dividiendo todos los valores del índice entre el valor del nuevo año base y multiplicando por 100.`,
            ejemplo: "Si tu salario nominal subió de 100 a 120 (un 20%), pero la inflación fue del 30%, al deflactar descubres que en términos reales tu salario bajó, porque compras menos que antes.",
            material: []
        },
        {
            titulo: "Tema 4.6. Construcción de indicadores estadísticos",
            descripcion: `Los indicadores son índices que nos dan una visión rápida de la realidad de un país. Pueden ser:

Socioeconómicos: PIB, esperanza de vida, tasa de desempleo.

Ambientales: Emisiones de CO2, deforestación, calidad del agua.

De TICs: Porcentaje de población con internet, líneas de celular.

El IDH (Índice de Desarrollo Humano) es un ejemplo clásico de indicador compuesto: combina salud, educación e ingresos para medir el bienestar de un país.`,
            ejemplo: "Nicaragua tiene un IDH que se calcula midiendo su esperanza de vida, los años de educación promedio y su PIB per cápita.",
            material: []
        },
        {
            titulo: "Tema 4.7. Índice de Gini y curva de Lorenz",
            descripcion: `Son herramientas para medir la desigualdad en la distribución del ingreso.

Curva de Lorenz: Es un gráfico. En el eje X se pone el porcentaje acumulado de la población (del más pobre al más rico) y en el eje Y el porcentaje acumulado de los ingresos. Si el ingreso se distribuyera perfectamente igual, sería una línea diagonal recta.

Índice de Gini: Es un número entre 0 y 1. 
- 0: Igualdad perfecta (todos ganan lo mismo).
- 1: Desigualdad máxima (una persona gana todo).

Mientras más alejada esté la Curva de Lorenz de la línea diagonal, más alto será el Índice de Gini y mayor la desigualdad.`,
            ejemplo: "En un país con Gini de 0.25 hay una distribución muy equitativa (como en los países nórdicos). En un país con Gini de 0.60 hay una enorme brecha entre ricos y pobres (como en algunos países de Latinoamérica o África).",
            material: []
        }
    ]);

    // Guardar todo en la base de datos
    bd.guardar(CLAVES.TEMAS, [...temasExistentes, ...nuevosModulos, ...nuevosTemas]);
    return true;
}