# Guía de supervivencia interplanetaria

Guía responsive de exploración marciana con navegación por módulos, búsqueda y un asistente de IA flotante. La portada muestra la información principal y el acceso a los módulos está en el menú lateral; cada sección abre su propia página informativa. El buscador devuelve enlaces directos a los módulos relacionados. El asistente está disponible desde todas las páginas y puede iniciar una pregunta contextual sobre el módulo abierto.

El centro de misión incluye un mapa esquemático con sitios de aterrizaje, una galería conectada al catálogo NASA Images, una checklist, fichas de rovers, un quiz y contexto sobre el archivo meteorológico de InSight. Cada enlace del centro abre únicamente su apartado en una pestaña nueva. Los favoritos, el checklist, el resultado del quiz, el tema y el tamaño de texto se guardan localmente en el navegador. La galería requiere conexión a internet; el clima se presenta como archivo histórico, no como dato en tiempo real.

El chat en español apoya la planificación informativa de exploraciones en Marte. El servidor Python envía las preguntas a un proveedor compatible con la API de chat de OpenAI; la clave permanece en el servidor y no se expone al navegador.

La fotografía de portada se sirve desde el catálogo público de imágenes de NASA y las fuentes de la página desde Google Fonts; se necesita internet para cargarlas.

## Requisitos

- Python 3.9 o posterior
- Las dependencias de `requirements.txt`
- Una clave de API válida para el proveedor configurado (opcional para ver el sitio, necesaria para usar el asistente)

## Ejecutar en Windows

1. Abre PowerShell en la carpeta del proyecto.
2. Crea un entorno virtual e instala las dependencias:

   ```powershell
   py -m venv .venv
   .\.venv\Scripts\Activate.ps1
   pip install -r requirements.txt
   ```

3. Configura las variables de entorno para el asistente:

   ```powershell
   $env:AI_API_KEY = "tu-clave-secreta"
   # Opcionales:
   $env:AI_API_URL = "https://api.openai.com/v1/chat/completions"
   $env:AI_MODEL = "gpt-4o-mini"
   ```

   No guardes la clave en archivos públicos ni la escribas en JavaScript.

4. Inicia la aplicación y abre `http://127.0.0.1:5000`:

   ```powershell
   py app.py
   ```

Si falta `AI_API_KEY`, el sitio seguirá disponible, pero el asistente responderá con un error explícito de configuración sin enviar solicitudes al proveedor.

## Endpoint

`POST /api/assistant`

```json
{
  "message": "¿Qué debería incluir en una lista de recursos?",
  "history": []
}
```

El historial acepta hasta 12 mensajes anteriores con rol `user` o `assistant`. Cada pregunta nueva está limitada a 2000 caracteres.
