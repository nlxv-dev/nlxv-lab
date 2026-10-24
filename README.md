# nlxv-lab
NLXV — Independent Digital Laboratory

https://nlxv-dev.github.io/nlxv-lab/

## Структура

```
index.html     — разметка, мета-теги, pre-paint скрипт темы
css/main.css   — токены тем (светлая по умолчанию), стили, анимации
js/app.js      — данные + рендер + роутер (#hash) + тема/язык
```

## Как добавить проект

В `js/app.js`, массив `PROJECTS`:

```js
{ title: 'Name', url: 'https://…', stack: ['React', 'Vite'] }
```

Стек автоматически попадёт и в карточку, и в бегущую строку.

## Раздел NLXV / Process

Временно отключён: пункт в меню остаётся, но ни на что не ведёт
(`DIRECTIONS` → `view: null`, `later: true`). Папка `entries/` сейчас не используется.
Старая логика девлогов (Markdown + manifest + marked.js) осталась в истории git.
