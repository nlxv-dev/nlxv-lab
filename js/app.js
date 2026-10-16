/* ============================================================
   NLXV — APPLICATION LOGIC
   ============================================================ */

const CONFIG = {
    entriesPath: 'entries/',
    manifestFile: 'entries/manifest.json'
};

/* ------------------------------------------------------------
   I18N
   ------------------------------------------------------------ */
const content = {
    en: {
        stealth: 'NLXV / Research — [Stealth Mode] / Internal ecosystem & closed R&D prototypes.',
        back: 'Back',
        catalogTitle: 'Selected Works',
        devlogTitle: 'Dev Log',
        visit: 'Visit',
        read: 'Read',
        projects: [
            { title: 'NLXV / Projects', desc: 'digital products, web systems, and software tools.' },
            { title: 'NLXV / Concepts', desc: 'AI research, generative graphics, and visual experiments.' },
            { title: 'NLXV / Vision', desc: 'conceptual video, sound design, and media art.' },
            { title: 'NLXV / Process', desc: 'engineering backstage, technical solutions analysis, and error architecture.' }
        ]
    },
    ru: {
        stealth: 'NLXV / Research — [Stealth Mode] / Внутренняя экосистема и закрытые R&D-прототипы.',
        back: 'Назад',
        catalogTitle: 'Selected Works',
        devlogTitle: 'Dev Log',
        visit: 'Открыть',
        read: 'Читать',
        projects: [
            { title: 'NLXV / Projects', desc: 'цифровые продукты, веб-системы и программные инструменты.' },
            { title: 'NLXV / Concepts', desc: 'ИИ-исследования, генеративная графика и визуальные эксперименты.' },
            { title: 'NLXV / Vision', desc: 'концептуальное видео, саунд-дизайн и медиа-арт.' },
            { title: 'NLXV / Process', desc: 'инженерный бэкстейдж, разбор технических решений и архитектура ошибок.' }
        ]
    }
};

/* ------------------------------------------------------------
   СТАТИЧЕСКИЕ ДАННЫЕ
   ------------------------------------------------------------ */
const staticHeroEnglish = 'NLXV — <span class="font-serif-italic">Independent</span> Digital Laboratory.';

const subProjects = [
    {
        num: '01',
        title: 'Neo Finance',
        tech: 'React + TypeScript · Vite · Tailwind CSS · HTML Canvas API · Web Platform APIs · PWA',
        url: '#'
    },
    {
        num: '02',
        title: 'EcoPrint Norway',
        tech: 'HTML · Tailwind CSS (CDN) · custom CSS · Vanilla JS · Google Fonts',
        url: 'https://github.io'
    }
];

/* ------------------------------------------------------------
   СОСТОЯНИЕ
   ------------------------------------------------------------ */
let currentLang = 'en';
let currentTheme = 'dark';
let currentView = null;
let processEntries = [];
let activeEntry = null;

/* ------------------------------------------------------------
   DOM
   ------------------------------------------------------------ */
const bodyElem        = document.getElementById('bodyRoot');
const langToggle      = document.getElementById('langToggle');
const themeToggle     = document.getElementById('themeToggle');
const themeIconMoon   = document.getElementById('themeIconMoon');
const themeIconSun    = document.getElementById('themeIconSun');
const labList         = document.getElementById('labList');
const projectsCatalog = document.getElementById('projectsCatalog');
const processWrap     = document.getElementById('processWrap');
const processList     = document.getElementById('processList');
const processCounter  = document.getElementById('processCounter');
const articleWrap     = document.getElementById('articleWrap');
const articleHero     = document.getElementById('articleHero');
const articleContent  = document.getElementById('articleContent');

/* ============================================================
   МЕНЕДЖЕР ВИДОВ
   ============================================================ */
const ALL_VIEWS = ['main', 'projects', 'process', 'article'];

function getViewEl(name) {
    return document.querySelector(`[data-view="${name}"]`);
}

function switchView(toName, instant = false) {
    if (toName === currentView) return;

    const from = currentView ? getViewEl(currentView) : null;
    const to   = getViewEl(toName);
    if (!to) return;

    if (instant || !from) {
        ALL_VIEWS.forEach(v => {
            const el = getViewEl(v);
            if (el) el.classList.remove('is-shown', 'is-visible');
        });
        to.classList.add('is-shown');
        void to.offsetHeight;
        to.classList.add('is-visible');
        currentView = toName;
        return;
    }

    from.classList.remove('is-visible');

    setTimeout(() => {
        from.classList.remove('is-shown');

        to.classList.add('is-shown');
        void to.offsetHeight;
        to.classList.add('is-visible');

        currentView = toName;
    }, 400);
}

/* ============================================================
   FRONT MATTER PARSER
   ============================================================ */
function parseFrontMatter(raw) {
    const match = raw.match(/^---\s*\r?\n([\s\S]*?)\r?\n---\s*\r?\n?([\s\S]*)$/);
    if (!match) return { meta: {}, body: raw.trim() };

    const meta = {};
    match[1].split(/\r?\n/).forEach(line => {
        const idx = line.indexOf(':');
        if (idx === -1) return;

        const key = line.slice(0, idx).trim();
        let value = line.slice(idx + 1).trim();

        if ((value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
        }
        meta[key] = value;
    });

    return { meta, body: match[2].trim() };
}

/* ============================================================
   ЗАГРУЗКА ENTRIES
   ============================================================ */

/**
 * Проверяем протокол — fetch() не работает на file://
 */
function warnIfFileProtocol() {
    if (location.protocol === 'file:') {
        console.warn(
            '%c[NLXV] ⚠ Страница открыта как file:// — fetch() будет блокирован CORS.\n' +
            'Запусти локальный сервер:\n' +
            '  python3 -m http.server 8000\n' +
            'и открой http://localhost:8000',
            'color:#ff6b6b;font-weight:bold;'
        );
        return true;
    }
    return false;
}

async function loadEntries() {
    // Ранний выход + понятное предупреждение
    if (warnIfFileProtocol()) {
        processEntries = [];
        return;
    }

    try {
        console.log(`[NLXV] Fetching manifest: ${CONFIG.manifestFile}`);
        const res = await fetch(CONFIG.manifestFile, { cache: 'no-store' });

        if (!res.ok) {
            console.error(`[NLXV] Manifest HTTP ${res.status} — файл не найден или путь неверный: ${CONFIG.manifestFile}`);
            processEntries = [];
            return;
        }

        const data = await res.json();

        // Поддержка двух форматов: ["a.md"] и { entries: ["a.md"] }
        const files = Array.isArray(data) ? data : (data.entries || []);
        console.log(`[NLXV] Manifest loaded. Entries listed:`, files);

        if (!files.length) {
            console.warn('[NLXV] manifest.json пустой — нет файлов для загрузки.');
            processEntries = [];
            return;
        }

        const loaded = await Promise.all(files.map(async (file) => {
            const url = `${CONFIG.entriesPath}${file}`;
            try {
                const r = await fetch(url, { cache: 'no-store' });
                if (!r.ok) {
                    console.error(`[NLXV] Не удалось загрузить ${url} — HTTP ${r.status}`);
                    return null;
                }
                const raw = await r.text();
                const { meta } = parseFrontMatter(raw);
                console.log(`[NLXV] Parsed ${file}:`, meta);
                return { file, meta };
            } catch (e) {
                console.error(`[NLXV] Ошибка загрузки ${url}:`, e);
                return null;
            }
        }));

        processEntries = loaded
            .filter(Boolean)
            .sort((a, b) => b.file.localeCompare(a.file));

        console.log(`[NLXV] Entries ready: ${processEntries.length}`);
    } catch (err) {
        console.error('[NLXV] Критическая ошибка загрузки manifest:', err);
        processEntries = [];
    }
}

async function openArticle(file) {
    try {
        const raw = await fetch(`${CONFIG.entriesPath}${file}`, { cache: 'no-store' })
            .then(r => r.text());
        const { meta, body } = parseFrontMatter(raw);
        activeEntry = { file, meta, body };
        renderArticle();
        switchView('article');
    } catch (err) {
        console.error('[NLXV] Не удалось открыть статью:', err);
    }
}

/* ============================================================
   РЕНДЕРЫ
   ============================================================ */
function renderMainList() {
    document.getElementById('heroTitle').innerHTML = staticHeroEnglish;
    document.getElementById('stealthText').textContent = content[currentLang].stealth;

    labList.innerHTML = '';

    content[currentLang].projects.forEach((item, index) => {
        const row = document.createElement('div');
        row.className = 'list-item';

        let handler = null;
        if (index === 0) handler = () => switchView('projects');
        if (index === 3) handler = () => switchView('process');

        if (handler) {
            row.setAttribute('role', 'button');
            row.setAttribute('tabindex', '0');
            row.addEventListener('click', handler);
            row.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handler();
                }
            });
        }

        row.innerHTML = `
            <div class="item-title">${item.title}</div>
            <div class="item-desc">${item.desc}</div>
        `;

        row.addEventListener('mouseenter', () => {
            row.querySelector('.item-desc').style.color =
                currentTheme === 'dark' ? '#ffffff' : '#1c1c1e';
        });
        row.addEventListener('mouseleave', () => {
            row.querySelector('.item-desc').style.color = 'var(--text-muted)';
        });

        labList.appendChild(row);
    });
}

function renderCatalog() {
    const data = content[currentLang];

    let cardsHtml = '';
    subProjects.forEach(p => {
        const isLink = p.url && p.url !== '#';
        const tag = isLink ? 'a' : 'div';
        const attrs = isLink
            ? `href="${p.url}" target="_blank" rel="noopener noreferrer"`
            : '';

        cardsHtml += `
            <${tag} class="project-card" ${attrs}>
                <div class="project-num">${p.num}</div>
                <div class="project-info">
                    <div class="project-name">${p.title}</div>
                    <div class="project-stack">${p.tech}</div>
                </div>
                <div class="project-link">
                    <span>${data.visit}</span>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M7 17L17 7M17 7H8M17 7V16"/>
                    </svg>
                </div>
            </${tag}>
        `;
    });

    projectsCatalog.innerHTML = `
        <div class="catalog-header">
            <button class="back-btn" id="projectsBackBtn" type="button">
                <svg class="back-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M19 12H5M12 19l-7-7 7-7"/>
                </svg>
                <span>${data.back}</span>
            </button>
            <div class="catalog-counter">${data.catalogTitle} / ${String(subProjects.length).padStart(2, '0')}</div>
        </div>
        <div class="catalog-list">${cardsHtml}</div>
    `;

    document.getElementById('projectsBackBtn')
        .addEventListener('click', () => switchView('main'));
}

function renderProcessList() {
    const data = content[currentLang];

    if (processCounter) {
        processCounter.textContent =
            `${data.devlogTitle} / ${String(processEntries.length).padStart(2, '0')}`;
    }

    const backLabel = processWrap.querySelector('.back-label');
    if (backLabel) backLabel.textContent = data.back;

    processList.innerHTML = '';

    // ⬇⬇⬇ ЗДЕСЬ УБРАНО сообщение "No entries yet" — если пусто, просто ничего не рисуем
    if (!processEntries.length) return;

    processEntries.forEach((entry, idx) => {
        const title   = entry.meta[`title_${currentLang}`]   || entry.meta.title_en   || 'Untitled';
        const summary = entry.meta[`summary_${currentLang}`] || entry.meta.summary_en || '';
        const date    = entry.meta.date || '';
        const num     = String(idx + 1).padStart(2, '0');

        const row = document.createElement('a');
        row.href = '#';
        row.className = 'project-card';
        row.dataset.entryFile = entry.file;
        row.innerHTML = `
            <div class="project-num">${num}</div>
            <div class="project-info">
                ${date ? `<div class="project-date">${date}</div>` : ''}
                <div class="project-name">${title}</div>
                ${summary ? `<div class="project-stack">${summary}</div>` : ''}
            </div>
            <div class="project-link">
                <span>${data.read}</span>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M7 17L17 7M17 7H8M17 7V16"/>
                </svg>
            </div>
        `;

        row.addEventListener('click', (e) => {
            e.preventDefault();
            openArticle(entry.file);
        });

        processList.appendChild(row);
    });
}

function renderArticle() {
    if (!activeEntry) return;

    const { meta, body } = activeEntry;
    const title = meta[`title_${currentLang}`] || meta.title_en || 'Untitled';
    const date  = meta.date || '';

    const backLabel = articleWrap.querySelector('.back-label');
    if (backLabel) backLabel.textContent = content[currentLang].back;

    articleHero.innerHTML = `
        ${date ? `<div class="article-date">${date}</div>` : ''}
        <h1 class="article-title">${title}</h1>
    `;

    const html = (typeof marked !== 'undefined')
        ? marked.parse(body, { gfm: true, breaks: false })
        : `<pre>${body.replace(/</g, '&lt;')}</pre>`;

    articleContent.innerHTML = html;

    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function renderContent() {
    renderMainList();
    renderCatalog();
    renderProcessList();
    if (activeEntry && currentView === 'article') renderArticle();
}

/* ============================================================
   UI-ОБРАБОТЧИКИ
   ============================================================ */
langToggle.addEventListener('click', () => {
    currentLang = currentLang === 'en' ? 'ru' : 'en';
    langToggle.textContent = currentLang.toUpperCase();
    document.documentElement.lang = currentLang;
    renderContent();
});

themeToggle.addEventListener('click', () => {
    if (currentTheme === 'dark') {
        bodyElem.classList.remove('dark');
        bodyElem.classList.add('light');
        currentTheme = 'light';
        themeIconMoon.style.display = 'block';
        themeIconSun.style.display  = 'none';
    } else {
        bodyElem.classList.remove('light');
        bodyElem.classList.add('dark');
        currentTheme = 'dark';
        themeIconMoon.style.display = 'none';
        themeIconSun.style.display  = 'block';
    }
    renderContent();
});

document.getElementById('processBackBtn').addEventListener('click', () => {
    switchView('main');
});

document.getElementById('articleBackBtn').addEventListener('click', () => {
    switchView('process');
});

/* ============================================================
   ИНИЦИАЛИЗАЦИЯ
   ============================================================ */
async function init() {
    renderMainList();
    renderCatalog();
    switchView('main', true);

    await loadEntries();
    renderProcessList();
}

init();
