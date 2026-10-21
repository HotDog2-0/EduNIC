/* CONFIG.EXAMPLE.JS
   Plantilla de configuración para EduNIC
   
   INSTRUCCIONES:
   
   1. Copia este archivo y renómbralo a "config.js"
   2. Reemplaza "TU_API_KEY_AQUI" con tu propia API key
   3. NO subas "config.js" a GitHub (ya está en .gitignore)
   
   ¿Cómo obtener una API key de Gemini?
   
   1. Ve a https://aistudio.google.com
   2. Inicia sesión con tu cuenta de Google
   3. Clic en "Get API key"
   4. Copia la clave generada (empieza con "AQ." o "AIza")
   5. Pégala en config.js
   
 Nota: La capa gratuita de Gemini permite ~500-1500
   requests por día. Para un proyecto escolar es suficiente. */

export const CONFIG = {
    // Reemplaza esto con tu API key real
    GEMINI_API_KEY: 'TU_API_KEY_AQUI',
    
    // Modelo de Gemini a usar
    GEMINI_MODEL: 'gemini-3.5-flash-lite'
};