import json
import logging
import os
import unicodedata
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from flask import Flask, jsonify, render_template, request


MODULES = {
    "entorno": {
        "number": "01",
        "title": "El entorno marciano",
        "label": "CIENCIA · PLANETA ROJO",
        "intro": "Marte es un mundo frío y seco con una atmósfera muy delgada. Comprender sus condiciones ayuda a interpretar los datos y preparar una exploración responsable.",
        "topics": [
            {"title": "Atmósfera y clima", "description": "La atmósfera está compuesta principalmente por dióxido de carbono. La presión es muy baja y las temperaturas pueden cambiar ampliamente según la estación y el lugar."},
            {"title": "Terreno y polvo", "description": "Cráteres, dunas, rocas y pendientes influyen en el paso de un rover. El polvo puede cubrir paneles solares y afectar instrumentos."},
            {"title": "Radiación y gravedad", "description": "La superficie recibe más radiación que la Tierra y la gravedad es menor. Son factores importantes para estudiar en el diseño de futuras misiones humanas."},
        ],
        "prompt": "¿Cuáles son los principales riesgos ambientales de Marte y cómo se estudian?",
    },
    "equipo": {
        "number": "02",
        "title": "Tu equipo",
        "label": "TECNOLOGÍA · PREPARACIÓN",
        "intro": "Las misiones robóticas utilizan vehículos e instrumentos que permiten investigar Marte a distancia. Las misiones humanas necesitarán además sistemas de soporte vital y protección.",
        "topics": [
            {"title": "Traje espacial", "description": "Protege a la tripulación y ayuda a mantener condiciones adecuadas de presión, oxígeno y temperatura durante las actividades extravehiculares."},
            {"title": "Rovers e instrumentos", "description": "Cámaras, sensores y laboratorios a bordo observan el terreno y analizan muestras para estudiar la geología marciana."},
            {"title": "Comunicaciones y energía", "description": "Las antenas transmiten datos con retraso entre Marte y la Tierra. Los equipos pueden usar paneles solares o generadores según el diseño de cada misión."},
        ],
        "prompt": "¿Qué equipo y sistemas necesita un rover para explorar Marte?",
    },
    "rutas": {
        "number": "03",
        "title": "Rutas y destinos",
        "label": "MAPAS · EXPLORACIÓN",
        "intro": "Elegir un destino de exploración exige comparar objetivos científicos con el relieve y la información disponible. Los mapas y los datos de misión son esenciales para evaluar cada recorrido.",
        "topics": [
            {"title": "Define el objetivo", "description": "Relaciona la ruta con una pregunta científica: estudiar capas de roca, minerales, antiguos cauces o cambios del paisaje."},
            {"title": "Observa el terreno", "description": "Considera pendientes, dunas, rocas, cráteres, distancia y comunicación antes de planificar un desplazamiento."},
            {"title": "Planifica alternativas", "description": "Compara más de una ruta y revisa las condiciones con mapas e imágenes recientes. Una ruta propuesta no sustituye el análisis del equipo de misión."},
        ],
        "prompt": "¿Qué datos debería comparar para elegir una ruta de exploración en Marte?",
    },
    "condiciones": {
        "number": "04",
        "title": "Condiciones de vida",
        "label": "HÁBITAT · SALUD",
        "intro": "Vivir en Marte requeriría un hábitat que proteja a las personas del entorno y mantenga recursos esenciales. Estos retos se estudian mediante investigación y pruebas en la Tierra.",
        "topics": [
            {"title": "Aire y agua", "description": "El hábitat tendría que gestionar el aire respirable y el agua, además de controlar fugas y recuperar recursos con sistemas de soporte vital."},
            {"title": "Temperatura y radiación", "description": "El aislamiento, la calefacción y la protección del hábitat ayudarían a estudiar cómo afrontar el frío y la radiación del entorno."},
            {"title": "Salud y rutina", "description": "La alimentación, el descanso, el ejercicio, la atención médica y el bienestar psicológico son aspectos importantes de una misión prolongada."},
        ],
        "prompt": "¿Qué necesita un hábitat para proteger a las personas en Marte?",
    },
    "consejos": {
        "number": "05",
        "title": "Consejos de supervivencia",
        "label": "SEGURIDAD · PREPARACIÓN",
        "intro": "La seguridad de una misión depende de una buena preparación, comunicación y seguimiento de procedimientos revisados por especialistas.",
        "topics": [
            {"title": "Antes de cada salida", "description": "Comprueba los sistemas, revisa el plan de actividad y confirma los objetivos y las comunicaciones con el equipo."},
            {"title": "Durante la exploración", "description": "Registra observaciones, vigila las condiciones y mantén contacto con el equipo. Detén la actividad si cambian las condiciones previstas."},
            {"title": "Planes alternativos", "description": "Define cómo responder ante retrasos, fallos de equipo o cambios ambientales. Los procedimientos deben validarse para cada misión concreta."},
        ],
        "prompt": "¿Qué puntos debería incluir una lista de verificación para una caminata marciana?",
    },
    "recursos": {
        "number": "06",
        "title": "Recursos y enlaces",
        "label": "DOCUMENTACIÓN · DATOS",
        "intro": "Explora fuentes científicas y materiales de las misiones para aprender sobre la superficie, la atmósfera y la historia geológica de Marte.",
        "topics": [
            {"title": "Imágenes y mapas", "description": "Compara fotografías, mapas orbitales y observaciones de rovers. Comprueba la fecha, la ubicación y el contexto de cada dato."},
            {"title": "Misiones y ciencia", "description": "Consulta la información pública sobre las misiones que estudian Marte y los instrumentos con los que recogen sus datos."},
            {"title": "Evalúa la información", "description": "Prioriza fuentes científicas identificables y distingue entre datos observados, interpretaciones y propuestas futuras."},
        ],
        "prompt": "¿Dónde puedo encontrar datos públicos y mapas científicos de Marte?",
    },
}

SYSTEM_PROMPT = (
    "Eres un asistente de planificación para exploración marciana. Responde en español "
    "con claridad. Ayuda con conceptos científicos generales, preparación de recursos, "
    "evaluación de rutas y riesgos. No inventes datos en tiempo real, coordenadas, mapas "
    "ni lecturas de sensores; aclara cuándo faltan datos. No presentes sugerencias como "
    "instrucciones operativas certificadas y recuerda que los planes reales deben "
    "validarse con especialistas y protocolos de misión."
)

app = Flask(__name__, static_folder="assets", static_url_path="/assets", template_folder="templates")
app.config["MAX_CONTENT_LENGTH"] = 20_000
TOOL_VIEWS = {
    "mars-map",
    "nasa-gallery",
    "mission-checklist",
    "rovers",
    "mars-quiz",
    "mars-weather",
    "my-progress",
}


def normalize_search_text(text):
    decomposed = unicodedata.normalize("NFD", text.casefold())
    return "".join(character for character in decomposed if not unicodedata.combining(character))


@app.get("/")
def index():
    section = request.args.get("seccion", "inicio")
    requested_tool_view = request.args.get("apartado", "")
    tool_view = requested_tool_view if requested_tool_view in TOOL_VIEWS else ""
    current_module = MODULES.get(section)
    not_found = section != "inicio" and current_module is None
    search_query = request.args.get("q", "").strip()
    matching_modules = []

    if search_query:
        terms = normalize_search_text(search_query).split()
        for module_key, module in MODULES.items():
            searchable_text = " ".join(
                [module_key, module["title"], module["label"], module["intro"]]
                + [text for topic in module["topics"] for text in (topic["title"], topic["description"])]
            )
            normalized_text = normalize_search_text(searchable_text)
            if all(term in normalized_text for term in terms):
                matching_modules.append((module_key, module))

    return render_template(
        "index.html",
        section=section,
        tool_view=tool_view,
        current_module=current_module,
        not_found=not_found,
        search_query=search_query,
        matching_modules=matching_modules,
        modules=MODULES.items(),
    ), (404 if not_found else 200)


@app.errorhandler(413)
def request_too_large(_error):
    return jsonify(error="La solicitud está vacía o supera el tamaño permitido."), 413


@app.route("/api/assistant", methods=["GET", "POST", "PUT", "PATCH", "DELETE"])
def assistant():
    if request.method != "POST":
        response = jsonify(error="Este endpoint solo acepta solicitudes POST.")
        response.headers["Allow"] = "POST, OPTIONS"
        return response, 405

    api_key = os.getenv("AI_API_KEY", "").strip()
    if not api_key:
        return jsonify(error="El asistente aún no está configurado. Añade AI_API_KEY al entorno de Python."), 503

    try:
        payload = json.loads(request.get_data(cache=False))
    except (json.JSONDecodeError, UnicodeDecodeError):
        return jsonify(error="El cuerpo de la solicitud no contiene JSON válido."), 400

    if not isinstance(payload, dict):
        return jsonify(error="El cuerpo de la solicitud no contiene JSON válido."), 400

    message = payload.get("message")
    if not isinstance(message, str) or not message.strip() or len(message) > 2000:
        return jsonify(error="Escribe una pregunta de hasta 2000 caracteres."), 400

    history = payload.get("history", [])
    if not isinstance(history, list):
        return jsonify(error="El historial de conversación no es válido."), 400

    messages = [{"role": "system", "content": SYSTEM_PROMPT}]
    for item in history[-12:]:
        if (
            not isinstance(item, dict)
            or item.get("role") not in ("user", "assistant")
            or not isinstance(item.get("content"), str)
            or len(item["content"]) > 4000
        ):
            return jsonify(error="El historial contiene un mensaje no válido."), 400
        messages.append({"role": item["role"], "content": item["content"]})
    messages.append({"role": "user", "content": message.strip()})

    provider_payload = json.dumps(
        {
            "model": os.getenv("AI_MODEL", "gpt-4o-mini"),
            "messages": messages,
            "temperature": 0.6,
        }
    ).encode("utf-8")
    provider_request = Request(
        os.getenv("AI_API_URL", "https://api.openai.com/v1/chat/completions"),
        data=provider_payload,
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        },
        method="POST",
    )

    try:
        with urlopen(provider_request, timeout=45) as response:
            provider_response = json.loads(response.read())
    except HTTPError as error:
        logging.error("AI provider returned HTTP status %s.", error.code)
        return jsonify(error="El proveedor de IA no pudo completar la solicitud. Revisa la configuración e inténtalo de nuevo."), 502
    except (URLError, TimeoutError) as error:
        logging.error("AI assistant request failed: %s", error)
        return jsonify(error="No se pudo conectar con el proveedor de IA. Inténtalo de nuevo."), 502
    except (json.JSONDecodeError, UnicodeDecodeError, OSError) as error:
        logging.error("AI provider returned an invalid response: %s", error)
        return jsonify(error="El proveedor de IA devolvió una respuesta no válida."), 502

    try:
        reply = provider_response["choices"][0]["message"]["content"]
    except (KeyError, IndexError, TypeError):
        reply = None
    if not isinstance(reply, str) or not reply.strip():
        logging.error("AI provider returned an invalid or empty response.")
        return jsonify(error="El proveedor de IA devolvió una respuesta no válida."), 502

    return jsonify(reply=reply.strip())


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=False)
