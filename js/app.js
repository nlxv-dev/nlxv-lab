/* ============================================================
   NLXV — APPLICATION LOGIC
   Структура файла:
     1. Данные (направления, проекты, переводы)  ← сюда добавлять новое
     2. Утилиты
     3. Тема и язык
     4. Роутер (#hash) и менеджер видов
     5. Рендеры
     6. Инициализация
   ============================================================ */

'use strict';

/* ============================================================
   1. ДАННЫЕ
   ============================================================ */

/** Направления на главной. `view` — на какой экран ведёт строка (null = пока ни на какой). */
const DIRECTIONS = [
    {
        title: 'NLXV / Projects',
        view: 'projects',
        desc: {
            en: 'digital products, web systems, and software tools.',
            ru: 'цифровые продукты, веб-системы и программные инструменты.'
        }
    },
    {
        title: 'NLXV / Concepts',
        view: null,
        desc: {
            en: 'AI research, generative graphics, and visual experiments.',
            ru: 'ИИ-исследования, генеративная графика и визуальные эксперименты.'
        }
    },
    {
        title: 'NLXV / Vision',
        view: null,
        desc: {
            en: 'conceptual video, sound design, and media art.',
            ru: 'концептуальное видео, саунд-дизайн и медиа-арт.'
        }
    },
    {
        // Раздел временно отключён: пункт остаётся в меню, но никуда не ведёт.
        // Чтобы включить — задай `view` и добавь соответствующий экран.
        title: 'NLXV / Process',
        view: null,
        later: true,
        desc: {
            en: 'unfolding in due time.',
            ru: 'всё в своё время.'
        }
    }
];

/** Проекты в каталоге NLXV / Projects. */
const PROJECTS = [
    {
        title: 'Neo Finance',
        url: 'https://nlxv-dev.github.io/neo-finance/',
        stack: ['React', 'TypeScript', 'Vite', 'Tailwind CSS', 'HTML Canvas API', 'Web Platform APIs', 'PWA']
    },
    {
        title: 'EcoPrint Norway',
        url: 'https://nlxv-dev.github.io/ecoprint.norway/',
        stack: ['HTML', 'Tailwind CSS (CDN)', 'Custom CSS', 'Vanilla JS', 'Google Fonts']
    }
];

/** Интерфейсные строки. */
const I18N = {
    en: {
        stealth: 'NLXV / Research — [Stealth Mode] / Internal ecosystem & closed R&D prototypes.',
        back: 'Back',
        catalogTitle: 'Selected Works',
        visit: 'Visit',
        later: 'Later',
        index: 'Index'
    },
    ru: {
        stealth: 'NLXV / Research — [Stealth Mode] / Внутренняя экосистема и закрытые R&D-прототипы.',
        back: 'Назад',
        catalogTitle: 'Selected Works',
        visit: 'Открыть',
        later: 'Позже',
        index: 'Индекс'
    }
};

const VIEWS = ['main', 'projects'];
const VIEW_SWAP_MS = 400;

const ARROW_UP_RIGHT =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 17L17 7M17 7H8M17 7V16"/></svg>';
const ARROW_LEFT =
    '<svg class="back-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>';

/* ============================================================
   2. УТИЛИТЫ
   ============================================================ */

const $ = (id) => document.getElementById(id);

const pad2 = (n) => String(n).padStart(2, '0');

const escapeHtml = (str) =>
    String(str).replace(/[&<>"']/g, (c) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));

/** localStorage может быть недоступен (приватный режим и т.п.) — не падаем. */
const storage = {
    get(key) {
        try { return localStorage.getItem(key); } catch (e) { return null; }
    },
    set(key, value) {
        try { localStorage.setItem(key, value); } catch (e) { /* ignore */ }
    }
};

/**
 * «Катящийся» текст (приём с visuvate.com): каждая буква — окошко с двумя копиями,
 * при hover родителя с классом .js-roll буквы по очереди прокручиваются вверх.
 * `hoverText` — что показать после прокрутки (по умолчанию тот же текст).
 */
function roll(text, hoverText = text) {
    const a = Array.from(text);
    const b = Array.from(hoverText);
    const len = Math.max(a.length, b.length);
    let chars = '';

    for (let i = 0; i < len; i++) {
        const from = a[i] === ' ' || a[i] === undefined ? ' ' : escapeHtml(a[i]);
        const to   = b[i] === ' ' || b[i] === undefined ? ' ' : escapeHtml(b[i]);
        chars += `<span class="roll-char" style="--i:${i}"><span>${from}</span><span>${to}</span></span>`;
    }
    return `<span class="roll" aria-hidden="true">${chars}</span><span class="sr-only">${escapeHtml(text)}</span>`;
}

/* ============================================================
   3. ТЕМА И ЯЗЫК
   ============================================================ */

const root        = document.documentElement;
const langToggle  = $('langToggle');
const themeToggle = $('themeToggle');
const metaTheme   = $('metaThemeColor');

let currentLang = 'en';

const THEME_COLORS = { light: '#fcfbfa', dark: '#070708' };

function getTheme() {
    return root.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
}

function applyTheme(theme) {
    root.setAttribute('data-theme', theme);
    if (metaTheme) metaTheme.setAttribute('content', THEME_COLORS[theme]);
    themeToggle.setAttribute('aria-pressed', String(theme === 'dark'));
}

themeToggle.addEventListener('click', () => {
    const next = getTheme() === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    storage.set('nlxv-theme', next);
});

function renderLangButton() {
    const other = currentLang === 'en' ? 'ru' : 'en';
    langToggle.innerHTML = roll(currentLang.toUpperCase(), other.toUpperCase());
}

langToggle.addEventListener('click', () => {
    currentLang = currentLang === 'en' ? 'ru' : 'en';
    document.documentElement.lang = currentLang;
    renderLangButton();
    renderContent({ animate: false });
});

/* ============================================================
   4. РОУТЕР (#hash) И МЕНЕДЖЕР ВИДОВ
   Ссылки — обычные <a href="#projects">, поэтому кнопка «Назад»
   в браузере работает сама, а к экрану можно дать прямую ссылку.
   ============================================================ */

let currentView = null;
let swapTimer = null;

const getViewEl = (name) => document.querySelector(`[data-view="${name}"]`);

function viewFromHash() {
    const name = location.hash.replace('#', '');
    return VIEWS.includes(name) ? name : 'main';
}

function showView(el) {
    el.classList.remove('no-anim');
    el.classList.add('is-shown');
    void el.offsetHeight; // reflow — чтобы сработала CSS-транзиция
    el.classList.add('is-visible');
}

function switchView(toName, { instant = false } = {}) {
    if (toName === currentView) return;

    clearTimeout(swapTimer); // быстрые клики не должны оставлять два вида одновременно

    const to = getViewEl(toName);
    if (!to) return;

    const from = currentView ? getViewEl(currentView) : null;

    VIEWS.forEach((name) => {
        const el = getViewEl(name);
        if (el && el !== from && el !== to) el.classList.remove('is-shown', 'is-visible');
    });

    currentView = toName;

    if (instant || !from) {
        if (from) from.classList.remove('is-shown', 'is-visible');
        showView(to);
        return;
    }

    from.classList.remove('is-visible');
    swapTimer = setTimeout(() => {
        from.classList.remove('is-shown');
        showView(to);
        window.scrollTo({ top: 0 });
    }, VIEW_SWAP_MS);
}

window.addEventListener('hashchange', () => switchView(viewFromHash()));

/* ============================================================
   5. РЕНДЕРЫ
   ============================================================ */

const labList         = $('labList');
const projectsCatalog = $('projectsCatalog');

function renderMainList() {
    const t = I18N[currentLang];

    labList.innerHTML = DIRECTIONS.map((item, i) => {
        const isLink = Boolean(item.view);
        const tag    = isLink ? 'a' : 'div';
        const attrs  = isLink ? `href="#${item.view}"` : '';
        const badge  = item.later ? `<span class="item-tag">${escapeHtml(t.later)}</span>` : '';
        const arrow  = isLink ? `<span class="item-arrow">${ARROW_UP_RIGHT}</span>` : '';

        return `
            <${tag} class="list-item${isLink ? ' is-link' : ''}" ${attrs} style="--i:${i}">
                <div class="item-head">
                    <span class="item-num">${pad2(i + 1)}</span>
                    <span class="item-title">${escapeHtml(item.title)}</span>
                    ${badge}
                </div>
                <div class="item-desc">${escapeHtml(item.desc[currentLang])}</div>
                ${arrow}
            </${tag}>
        `;
    }).join('');

    $('eyebrowText').textContent = `${t.index} / ${pad2(DIRECTIONS.length)}`;
    $('stealthText').textContent = t.stealth;
}

function renderCatalog() {
    const t = I18N[currentLang];

    const cards = PROJECTS.map((p, i) => `
        <a class="project-card js-roll" style="--i:${i}"
           href="${escapeHtml(p.url)}" target="_blank" rel="noopener noreferrer"
           aria-label="${escapeHtml(t.visit)}: ${escapeHtml(p.title)}">
            <div class="project-num">${pad2(i + 1)}</div>
            <div class="project-info">
                <div class="project-name">${escapeHtml(p.title)}</div>
                <div class="project-stack">${escapeHtml(p.stack.join(' · '))}</div>
            </div>
            <div class="project-link">
                <span class="project-link-label">${roll(t.visit)}</span>
                ${ARROW_UP_RIGHT}
            </div>
        </a>
    `).join('');

    projectsCatalog.innerHTML = `
        <div class="catalog-header">
            <a class="back-btn js-roll" href="#">
                ${ARROW_LEFT}
                <span>${roll(t.back)}</span>
            </a>
            <div class="catalog-counter">${escapeHtml(t.catalogTitle)} / ${pad2(PROJECTS.length)}</div>
        </div>
        <div class="catalog-list">${cards}</div>
    `;
}

/** Бегущая строка со стеком — собирается из стеков всех проектов, без дублей. */
function renderMarquee() {
    const unique = [...new Set(PROJECTS.flatMap((p) => p.stack))];
    const items = unique.map((s) => `<li>${escapeHtml(s)}</li>`).join('');
    // Внутри группы список повторён дважды — чтобы лента не «обрывалась» на широких экранах.
    const group = `<ul class="marquee-group">${items}${items}</ul>`;
    $('stackMarquee').innerHTML = `<div class="marquee-track">${group}${group}</div>`;
}

function renderContent({ animate = true } = {}) {
    if (!animate) {
        VIEWS.forEach((name) => getViewEl(name)?.classList.add('no-anim'));
    }
    renderMainList();
    renderCatalog();
}

/* ============================================================
   6. ИНИЦИАЛИЗАЦИЯ
   ============================================================ */
function init() {
    applyTheme(getTheme());
    renderLangButton();
    renderContent();
    renderMarquee();
    switchView(viewFromHash(), { instant: true });
}

init();
