# Design

Источник: Claude Design, «Gridfinity Generator Design»
https://claude.ai/artifact/1pxef89L7V9x1vegeHkHSQ (выгружено 2026-10-10). Бриф: [BRIEF.md](BRIEF.md).

- `artboards/*.dc.html` — исходники артбордов (формат Design Component; сами по себе в браузере не открываются, нужен `support.js` редактора. Смотреть в артефакте по ссылке выше). Внутри хорошо читаются разметка, CSS и значения размеров.
- `artboards/canvas.json` — расположение и названия артбордов.
- `theme.reference.css` — токены в виде Tailwind v4 `@theme`, готовы к переносу в `src/app/theme.css`.

## Артборды → changes

| Артборд | Файл | Change / задачи |
|---|---|---|
| 0 · Start page | `Main.dc.html` | `01-app-foundation` 2.3 |
| 1 · Baseplate | `Baseplate.dc.html` | `01` 2.2, 3.2; `04` 2.x; `05` 2.x |
| 2 · Baseplate split + connectors | `BaseplateSplit.dc.html` | `06-baseplate-split` 3.x |
| 3 · Box / Tray | `Box.dc.html` | `07-box-mode` 3.x |
| 4 · Cutout | `Cutout.dc.html` | `08-cutout-mode` 3.x, 4.x |
| 5 · Export + bed preview | `Export.dc.html` | `09-export-3mf-bambu` 1.2, 3.x |
| 6 · Baseplate, RU locale | `BaseplateRU.dc.html` | `01` 4.x, проверка длины русских подписей |
| 7 · Mobile, drawer open | `Mobile.dc.html` | `01` 2.6 |
| 8 · Component library | `Components.dc.html` | `01` 3.1 |
| 9 · Tokens | `Tokens.dc.html` | `01` 1.2 |
| 10 · Viewport styling | `ViewportStyle.dc.html` | `01` 2.2 (цвета, сетка, подписи во вьюпорте) |

## Решения дизайна, которые отличаются от плана

- **Экспорт живёт в нижней липкой панели** (формат STL/3MF, принтер, кнопка Download, чип «Fits the bed»), а не в диалоге. Задачи `09` секции «Dialog» делать как этот блок.
- **Шрифты** Manrope, Unbounded, JetBrains Mono (все с кириллицей). Артборды грузят их с Google Fonts; в приложении подключать локально (`@fontsource-variable/*`), чтобы работало офлайн.
- **На старте** есть плашка «Continue: Baseplate 6 × 4, saved 12 min ago» и горячие клавиши 1/2/3 на карточках.
- **Мобильный вид:** выбор режима выпадающим списком, параметры в нижней шторке, единицы и язык компактно.
- Одна акцентная гамма (`#7C9CFF`) и три статусных цвета; тёмная тема.
