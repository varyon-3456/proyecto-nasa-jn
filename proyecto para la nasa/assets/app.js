const form = document.querySelector('#chat-form');
const input = document.querySelector('#message-input');
const conversation = document.querySelector('#conversation');
const sendButton = form.querySelector('.send-button');
const assistantPanel = document.querySelector('#assistant-panel');
const assistantToggle = document.querySelector('#assistant-toggle');
const searchForm = document.querySelector('#guide-search');
const searchInput = document.querySelector('#search-input');
const guideCards = [...document.querySelectorAll('.guide-card')];
const history = [];
const maxHistoryMessages = 12;

function setAssistantOpen(open) {
    assistantPanel.hidden = !open;
    assistantToggle.setAttribute('aria-expanded', String(open));

    if (open) {
        input.focus();
    } else {
        assistantToggle.focus();
    }
}

function appendMessage(role, text, options = {}) {
    const article = document.createElement('article');
    article.className = `message ${role === 'user' ? 'user-message' : 'assistant-message'}${options.error ? ' error-message' : ''}`;

    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    avatar.setAttribute('aria-hidden', 'true');
    avatar.textContent = role === 'user' ? 'T' : '✳';

    const body = document.createElement('div');
    body.className = 'message-body';

    const label = document.createElement('span');
    label.className = 'message-label';
    label.textContent = role === 'user' ? 'EXPLORADOR' : 'ASISTENTE';

    const paragraph = document.createElement('p');
    paragraph.textContent = text;
    body.append(label, paragraph);
    article.append(avatar, body);
    conversation.append(article);
    conversation.scrollTop = conversation.scrollHeight;
    return article;
}

function setBusy(busy) {
    sendButton.disabled = busy;
    input.disabled = busy;
    form.setAttribute('aria-busy', String(busy));
}

async function sendMessage(message) {
    const cleanMessage = message.trim();
    if (!cleanMessage || sendButton.disabled) {
        return;
    }

    appendMessage('user', cleanMessage);
    input.value = '';
    input.style.height = 'auto';
    setBusy(true);

    const loadingMessage = appendMessage('assistant', '');
    const loadingText = loadingMessage.querySelector('p');
    loadingText.setAttribute('aria-label', 'El asistente está preparando una respuesta');
    loadingText.innerHTML = '<span class="typing-indicator" aria-hidden="true"><span></span><span></span><span></span></span>';

    try {
        const response = await fetch('/api/assistant', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: cleanMessage,
                history: history.slice(-maxHistoryMessages),
            }),
        });
        const result = await response.json();
        loadingMessage.remove();

        if (!response.ok) {
            throw new Error(result.error || 'No se pudo obtener una respuesta.');
        }

        if (typeof result.reply !== 'string' || !result.reply.trim()) {
            throw new Error('El asistente devolvió una respuesta vacía. Inténtalo de nuevo.');
        }

        history.push(
            { role: 'user', content: cleanMessage },
            { role: 'assistant', content: result.reply },
        );
        appendMessage('assistant', result.reply);
    } catch (error) {
        loadingMessage.remove();
        const messageText = error instanceof TypeError
            ? 'No se pudo conectar con el servidor. Comprueba que la aplicación Python esté iniciada y vuelve a intentarlo.'
            : error.message;
        appendMessage('assistant', messageText, { error: true });
    } finally {
        setBusy(false);
        input.focus();
    }
}

form.addEventListener('submit', (event) => {
    event.preventDefault();
    sendMessage(input.value);
});

input.addEventListener('input', () => {
    input.style.height = 'auto';
    input.style.height = `${Math.min(input.scrollHeight, 125)}px`;
});

input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        form.requestSubmit();
    }
});

document.querySelectorAll('.suggestion').forEach((button) => {
    button.addEventListener('click', () => sendMessage(button.dataset.prompt));
});

assistantToggle.addEventListener('click', () => {
    setAssistantOpen(assistantPanel.hidden);
});

document.querySelector('.close-assistant').addEventListener('click', () => {
    setAssistantOpen(false);
});

document.querySelectorAll('[data-open-assistant]').forEach((link) => {
    link.addEventListener('click', (event) => {
        event.preventDefault();
        setAssistantOpen(true);
    });
});

document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !assistantPanel.hidden) {
        setAssistantOpen(false);
    }
});

function filterGuide(query) {
    const normalizedQuery = query
        .trim()
        .toLocaleLowerCase('es')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
    let visibleCards = 0;

    guideCards.forEach((card) => {
        const searchableText = `${card.dataset.search} ${card.textContent}`
            .toLocaleLowerCase('es')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '');
        card.hidden = normalizedQuery !== '' && !searchableText.includes(normalizedQuery);
        visibleCards += Number(!card.hidden);
    });

    document.querySelector('#search-empty').hidden = visibleCards !== 0;
}

searchForm.addEventListener('submit', (event) => {
    if (guideCards.length === 0) {
        return;
    }

    event.preventDefault();
    filterGuide(searchInput.value);
    document.querySelector('#guide').scrollIntoView({ behavior: 'smooth', block: 'start' });
});

if (guideCards.length > 0) {
    searchInput.addEventListener('input', () => filterGuide(searchInput.value));
    if (searchInput.value) {
        filterGuide(searchInput.value);
    }
}

document.querySelectorAll('[data-ask-assistant]').forEach((button) => {
    button.addEventListener('click', () => {
        setAssistantOpen(true);
        input.value = button.dataset.askAssistant;
        input.dispatchEvent(new Event('input'));
        input.focus();
    });
});

document.querySelectorAll('.sidebar-link:not([data-open-assistant])').forEach((link) => {
    link.addEventListener('click', () => {
        document.querySelectorAll('.sidebar-link').forEach((item) => {
            item.classList.remove('is-active');
            item.removeAttribute('aria-current');
        });
        link.classList.add('is-active');
        link.setAttribute('aria-current', 'page');
    });
});

if (document.querySelector('.mission-tools')) {
const missionStorageKey = 'guia-marciana-mission-data';
const preferencesStorageKey = 'guia-marciana-preferences';
const correctAnswers = ['b', 'a', 'b'];
const siteDetails = {
    curiosity: {
        title: 'Gale — Curiosity',
        text: 'Curiosity aterrizó en el cráter Gale el 6 de agosto de 2012 (UTC) y estudia la geología y la habitabilidad pasada.',
        url: 'https://science.nasa.gov/mission/msl-curiosity/',
    },
    perseverance: {
        title: 'Jezero — Perseverance',
        text: 'Perseverance aterrizó en el cráter Jezero el 18 de febrero de 2021 (UTC). Investiga su antiguo delta y recolecta muestras.',
        url: 'https://science.nasa.gov/mission/mars-2020-perseverance/',
    },
    insight: {
        title: 'Elysium Planitia — InSight',
        text: 'InSight aterrizó en Elysium Planitia el 26 de noviembre de 2018 (UTC) para estudiar el interior y el entorno de Marte.',
        url: 'https://science.nasa.gov/mission/insight/',
    },
};

function readStoredObject(key, fallback) {
    const serialized = localStorage.getItem(key);
    if (!serialized) {
        return fallback;
    }

    try {
        const stored = JSON.parse(serialized);
        return stored && typeof stored === 'object' ? stored : fallback;
    } catch (error) {
        console.error(`No se pudieron leer los datos guardados (${key}).`, error);
        return fallback;
    }
}

let missionData = readStoredObject(missionStorageKey, {
    favorites: [],
    checklist: {},
    bestScore: 0,
});

function saveMissionData() {
    localStorage.setItem(missionStorageKey, JSON.stringify(missionData));
    renderMissionProgress();
}

function renderMissionProgress() {
    const favoriteItems = Array.isArray(missionData.favorites) ? missionData.favorites : [];
    document.querySelectorAll('[data-favorite]').forEach((button) => {
        const isSaved = favoriteItems.includes(button.dataset.favorite);
        button.classList.toggle('is-favorite', isSaved);
        button.setAttribute('aria-pressed', String(isSaved));
        button.textContent = `${isSaved ? '★' : '☆'} ${button.dataset.favorite.startsWith('Pregunta:') ? (isSaved ? 'Pregunta guardada' : 'Guardar pregunta') : button.dataset.favorite}`;
    });

    document.querySelectorAll('[data-checklist-item]').forEach((checkbox) => {
        checkbox.checked = missionData.checklist?.[checkbox.dataset.checklistItem] === true;
    });

    const checkedItems = Object.values(missionData.checklist || {}).filter(Boolean).length;
    document.querySelector('#checklist-count').textContent = `${checkedItems} de 8 listos`;
    document.querySelector('#quiz-score').textContent = `Mejor resultado: ${missionData.bestScore || 0}/3`;

    const summary = document.querySelector('#progress-summary');
    if (favoriteItems.length === 0 && checkedItems === 0 && !missionData.hasQuizResult) {
        summary.textContent = 'Aún no hay favoritos ni resultados guardados.';
        return;
    }

    const favoritesText = favoriteItems.length
        ? `Favoritos: ${favoriteItems.join(', ')}.`
        : 'Todavía no guardaste favoritos.';
    const quizText = missionData.hasQuizResult
        ? ` Último quiz: ${missionData.lastScore}/3; mejor: ${missionData.bestScore}/3.`
        : '';
    summary.textContent = `${favoritesText} Checklist: ${checkedItems}/8 completados.${quizText}`;
}

document.querySelectorAll('[data-favorite]').forEach((button) => {
    button.addEventListener('click', () => {
        const favorite = button.dataset.favorite;
        const favorites = Array.isArray(missionData.favorites) ? missionData.favorites : [];
        missionData.favorites = favorites.includes(favorite)
            ? favorites.filter((item) => item !== favorite)
            : [...favorites, favorite];
        saveMissionData();
    });
});

document.querySelectorAll('[data-checklist-item]').forEach((checkbox) => {
    checkbox.addEventListener('change', () => {
        missionData.checklist = missionData.checklist || {};
        missionData.checklist[checkbox.dataset.checklistItem] = checkbox.checked;
        saveMissionData();
    });
});

document.querySelector('#quiz-form').addEventListener('submit', (event) => {
    event.preventDefault();
    const answers = [...document.querySelectorAll('.quiz-question')];
    const score = answers.reduce((total, question, index) => {
        const selected = question.querySelector('input:checked');
        question.classList.toggle('answer-correct', selected?.value === correctAnswers[index]);
        question.classList.toggle('answer-incorrect', selected?.value !== correctAnswers[index]);
        return total + Number(selected?.value === correctAnswers[index]);
    }, 0);

    missionData.lastScore = score;
    missionData.bestScore = Math.max(missionData.bestScore || 0, score);
    missionData.hasQuizResult = true;
    saveMissionData();
    document.querySelector('#quiz-feedback').textContent = `Obtuviste ${score} de 3. ${score === 3 ? '¡Excelente exploración!' : 'Revisa las respuestas y vuelve a intentarlo.'}`;
});

document.querySelector('#clear-progress').addEventListener('click', () => {
    localStorage.removeItem(missionStorageKey);
    missionData = { favorites: [], checklist: {}, bestScore: 0 };
    document.querySelector('#quiz-form').reset();
    document.querySelector('#quiz-feedback').textContent = '';
    document.querySelectorAll('.quiz-question').forEach((question) => {
        question.classList.remove('answer-correct', 'answer-incorrect');
    });
    saveMissionData();
});

document.querySelectorAll('[data-site]').forEach((marker) => {
    marker.addEventListener('click', () => {
        const site = siteDetails[marker.dataset.site];
        const detail = document.querySelector('#map-detail');
        detail.querySelector('h3').textContent = site.title;
        detail.querySelector('p:not(.section-kicker)').textContent = site.text;
        detail.querySelector('a').href = site.url;
        document.querySelectorAll('[data-site]').forEach((item) => {
            item.setAttribute('aria-pressed', String(item === marker));
        });
    });
});

async function loadNasaGallery() {
    const status = document.querySelector('#gallery-status');
    const gallery = document.querySelector('#gallery-grid');
    try {
        const response = await fetch('https://images-api.nasa.gov/search?q=mars%20rover&media_type=image&page_size=8');
        if (!response.ok) {
            throw new Error(`NASA Images respondió con estado ${response.status}.`);
        }
        const result = await response.json();
        const items = (result.collection?.items || [])
            .filter((item) => item.data?.[0] && item.links?.some((link) => link.rel === 'preview'))
            .slice(0, 3);
        if (items.length === 0) {
            throw new Error('El catálogo no devolvió imágenes con vista previa.');
        }

        items.forEach((item) => {
            const metadata = item.data[0];
            const preview = item.links.find((link) => link.rel === 'preview');
            const card = document.createElement('article');
            card.className = 'gallery-card';

            const image = document.createElement('img');
            image.src = preview.href;
            image.alt = metadata.title || 'Imagen marciana del catálogo NASA';
            image.loading = 'lazy';

            const copy = document.createElement('div');
            copy.className = 'gallery-copy';
            const title = document.createElement('h3');
            title.textContent = metadata.title || 'Imagen de Marte';
            const date = document.createElement('time');
            if (metadata.date_created) {
                date.dateTime = metadata.date_created;
                date.textContent = `Publicada: ${new Intl.DateTimeFormat('es', { dateStyle: 'long', timeZone: 'UTC' }).format(new Date(metadata.date_created))}`;
            } else {
                date.textContent = 'Fecha de publicación no disponible';
            }
            const description = document.createElement('p');
            description.textContent = metadata.description || 'Consulta el registro original de NASA para ver los detalles de esta imagen.';
            const link = document.createElement('a');
            link.href = item.href;
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
            link.textContent = 'Abrir registro en NASA ↗';
            copy.append(title, date, description, link);
            card.append(image, copy);
            gallery.append(card);
        });
        status.textContent = `${items.length} imágenes del catálogo de NASA.`;
    } catch (error) {
        status.textContent = `No se pudo cargar la galería: ${error.message} Comprueba tu conexión o visita NASA Images.`;
        const fallbackLink = document.createElement('a');
        fallbackLink.href = 'https://images.nasa.gov/search?q=mars%20rover';
        fallbackLink.target = '_blank';
        fallbackLink.rel = 'noopener noreferrer';
        fallbackLink.textContent = 'Explorar el catálogo de NASA ↗';
        status.append(' ', fallbackLink);
    }
}

const preferences = readStoredObject(preferencesStorageKey, { theme: 'light', textSize: 'normal' });
const themeToggle = document.querySelector('#theme-toggle');

function applyPreferences() {
    document.body.dataset.theme = preferences.theme === 'dark' ? 'dark' : 'light';
    document.body.dataset.accessibilitySize = ['small', 'normal', 'large'].includes(preferences.textSize)
        ? preferences.textSize
        : 'normal';
    const darkMode = preferences.theme === 'dark';
    themeToggle.setAttribute('aria-pressed', String(darkMode));
    themeToggle.textContent = darkMode ? 'Activar modo claro' : 'Activar modo oscuro';
}

themeToggle.addEventListener('click', () => {
    preferences.theme = preferences.theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem(preferencesStorageKey, JSON.stringify(preferences));
    applyPreferences();
});

document.querySelectorAll('button[data-text-size]').forEach((button) => {
    button.addEventListener('click', () => {
        preferences.textSize = button.dataset.textSize;
        localStorage.setItem(preferencesStorageKey, JSON.stringify(preferences));
        applyPreferences();
    });
});

renderMissionProgress();
applyPreferences();
if (!document.body.dataset.toolView || document.body.dataset.toolView === 'nasa-gallery') {
    loadNasaGallery();
}
}
