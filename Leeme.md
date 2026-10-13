EduNIC — Sistema de Gestión Educativa

Sistema web para la gestión de contenido educativo y evaluaciones, desarrollado como proyecto para la clase de Estadística.

Permite a un **profesor* administrar carreras, estudiantes, módulos, temas y evaluaciones, y a los **estudiantes** acceder al material de estudio y responder evaluaciones en línea.



Características principales

Panel del Profesor:

- **Gestión de carreras**: crear, editar y eliminar carreras (con doble confirmación).
  
- **Gestión de estudiantes**: registro manual o importación desde archivos CSV/TXT.
  
- **Módulos/Unidades**: organizar el contenido por unidades temáticas (ej: "Estadística", "Diseño Web").
  
- **Temas**: publicar temas con título, descripción, ejemplo y material de apoyo.
  
- **Material de apoyo**: adjuntar archivos PDF (hasta 500 KB) o enlaces externos (videos, sitios web).
  
- **Evaluaciones**: crear evaluaciones con 3 tipos de preguntas:
  - Selección múltiple (4 opciones)
  - Verdadero / Falso
  - Respuesta corta (con auto-calificación opcional)
    
- **Calificaciones**: ver notas de todos los estudiantes, filtrar por estado, y calificar manualmente las respuestas cortas pendientes.

Panel del Estudiante:

- **Acceso con código único** asignado por el profesor (ej: `EST-101`).
  
- **Ver temas**: acceder a todos los módulos y temas de su carrera, con material de apoyo descargable.
  
- **Responder evaluaciones**: interfaz de quiz paginada (3 preguntas por página) con barra de progreso.
  
- **Ver resultados**: historial completo de evaluaciones con filtros y resumen de rendimiento.



Tecnologías utilizadas:

- **HTML5** semántico
  
- **CSS3** con arquitectura modular (variables CSS, componentes reutilizables)
  
- **JavaScript ES6+** con módulos (`import` / `export`)
  
- **localStorage** para persistencia de datos
  
- **FontAwesome** para iconografía
  
- **Blob URLs** para visualización de PDFs subidos


Cómo ejecutar el proyecto:

### Requisitos

- Un navegador moderno
  
- [VS Code](https://code.visualstudio.com/) (recomendado)
  
- Extensión [Live Server]

### Pasos

1. **Clona el repositorio**:
   ```bash
   git clone https://github.com/TU-USUARIO/edunic.git
