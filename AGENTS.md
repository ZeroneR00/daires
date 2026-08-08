
## music-diary
 
Платформа-блог для музыкальных дневников. Каждый зарегистрированный пользователь
ведёт свой блог: посты — это личный текст + прикреплённый трек, подтянутый через
внешний API. Вся творческая часть (текст, рефлексия) хранится в своей базе;
внешний API отвечает только за метаданные трека (название, артист, обложка,
превью).
 
## Стек
 
- Next.js 16+ (App Router), React 19, TypeScript
- Prisma + PostgreSQL (Supabase)
- Better Auth
- Tailwind CSS
- Supabase Storage — только для аватаров пользователей; обложки треков приходят по URL от внешнего API, свой storage для них не нужен
## Команды
 
```bash
npm run dev          # локальный дев-сервер
npm run build         # прод-сборка
npm run lint           # ESLint
npx prisma studio    # визуальный просмотр БД
npx prisma migrate dev --name <имя>   # новая миграция
```
 
## Структура маршрутов (App Router)
 
| Route | Назначение | Доступ |
|---|---|---|
| `/` | Лента публичных постов | публично |
| `/u/[username]` | Страница-дневник пользователя | публично |
| `/u/[username]/[slug]` | Отдельный пост | публично |
| `/new` | Создание поста (поиск трека + текст) | только автор, залогинен |
| `/post/[id]/edit` | Редактирование своего поста | только автор поста |
| `/settings` | Профиль, аватар, bio | залогинен |
| `/login`, `/signup` | Авторизация | публично |
 
## Карта файлов

Ниже — где что лежит, чтобы не приходилось грепать/сканировать весь проект
ради ориентировки (актуально на 2026-08-08; если структура успела уйти
вперёд — доверять коду, не этой таблице).

**Auth**
| Файл | Что там |
|---|---|
| `lib/auth.ts` | конфиг Better Auth (сервер): `prismaAdapter`, zod-валидация `username` |
| `lib/auth-client.ts` | `authClient` для клиентских компонентов |
| `app/api/auth/[...all]/route.ts` | catch-all route handler Better Auth |
| `app/login/page.tsx`, `app/signup/page.tsx` | формы, зовут `authClient` напрямую (сознательное исключение из "мутации только через Server Actions" — это плюмбинг Better Auth, не бизнес-мутация) |

**Layout / навигация**
| Файл | Что там |
|---|---|
| `app/layout.tsx` | корневой layout, монтирует `<Header />` |
| `components/Header.tsx` | шапка сайта |
| `components/SessionStatus.tsx` | реактивная часть шапки (client component, `authClient.useSession()`) — не читать сессию через `auth.api.getSession()` здесь, layout не перечитывается при клиентской навигации |
| `components/SignOutButton.tsx` | кнопка выхода |

**Создание и редактирование поста (`/new`, `/post/[id]/edit`)**
| Файл | Что там |
|---|---|
| `app/new/page.tsx` + `actions.ts` | страница создания поста; `createPost` Server Action + `searchTracksAction` |
| `app/post/[id]/edit/page.tsx` + `actions.ts` | страница редактирования; `updatePost` Server Action. Guard на владение постом — на обоих уровнях (page → `notFound()`, action → ранний `return {error}`), не полагаться только на UI |
| `components/PostForm.tsx` | общая форма (текст + треки), используется и на `/new`, и на `/post/[id]/edit`: пропы `initialText?`, `initialTracks?`, `action`, `submitLabel`, `pendingLabel` |
| `components/TrackPickerDialog.tsx` | модалка поиска трека (`<dialog>`, дебаунс) |
| `lib/post-schema.ts` | общая zod-схема `postInputSchema`/`PostInput`, используется и `createPost`, и `updatePost` — правило "текст ИЛИ трек, что-то одно обязательно" |
| `lib/post-mutations.ts` | `attachTracksToPost` — общий upsert-Track-по-`externalId` + create-`PostTrack`, вызывается внутри транзакции из обоих экшенов |
| `lib/track-api.ts` | обёртка над iTunes/MusicBrainz, тип `NormalizedTrack` |
| `lib/slug.ts` | генерация уникального slug поста (не меняется при редактировании) |

**Настройки профиля (`/settings`)**
| Файл | Что там |
|---|---|
| `app/settings/page.tsx` | `auth.api.getSession()` → `redirect("/login")` если нет сессии; префилл через `getUserByUsername` (`lib/posts.ts`), рендерит `SettingsForm` |
| `app/settings/actions.ts` | `updateProfile` Server Action — session check, zod-парсинг, `prisma.user.update({ name, bio })` напрямую (не через `authClient.updateUser()` — `bio` не зарегистрирован как Better Auth `additionalField`), без redirect, `revalidatePath` для `/` и `/u/[username]` |
| `lib/profile-schema.ts` | `profileInputSchema`/`ProfileInput` — `name` обязателен (`max(100)`), `bio` опционален (`max(280)`, пустая строка → `null`) |
| `components/SettingsForm.tsx` | форма по образу `PostForm`: поля `name`/`bio`, клиентская проверка непустого имени, инлайн "Сохранено" вместо редиректа |

Аватар (Supabase Storage) — ещё не реализован, это Phase 7 сессия 3.

**Чтение данных (лента / дневник / пост)**
| Файл | Что там |
|---|---|
| `lib/posts.ts` | единый query-слой: `getFeedPosts`, `getPostsByUsername`, `getPostBySlug`, `getPostById`, `getUserByUsername` |
| `app/page.tsx` | лента (`/`) |
| `app/u/[username]/page.tsx` + `not-found.tsx` | дневник пользователя |
| `app/u/[username]/[slug]/page.tsx` + `not-found.tsx` | отдельный пост |
| `components/PostCard.tsx` | карточка поста (лента + дневник); принимает `currentUserId?` — ссылка "Редактировать" видна только автору |
| `components/TrackRow.tsx` | строка трека (пикер, карточка, страница поста) |

**Инфраструктура**
| Файл | Что там |
|---|---|
| `lib/prisma.ts` | синглтон `PrismaClient` с `PrismaPg`-адаптером |
| `lib/format-date.ts` | `formatPostDate` (`Intl.DateTimeFormat("ru")`) |
| `prisma/schema.prisma` | схема БД |
| `prisma.config.ts` | конфиг CLI (`DIRECT_URL`, не `DATABASE_URL` — см. ниже) |

Ещё не существует: аватар на `/settings` (Supabase Storage) — это Phase 7, сессия 3.

## Data model (Prisma)
 
Ключевые модели: `User`, `Track`, `Post`, `PostTrack`, `Comment`, `Like`, `Follow`.
`Post` привязан к одному `User` (автор) и может содержать несколько `Track`
через join-таблицу `PostTrack` (many-to-many, с полем `position` для порядка
треков в посте). `Track` кешируется по `externalId`, чтобы не дублировать
записи и не дёргать внешний API повторно для уже залогированных треков.
Полная схема — в `prisma/schema.prisma`.

## Технические детали версий (сверено вручную с доками, не полагаться на training data)

**У Prisma есть собственные официальные Claude Code skills** — `npx prisma init` сам ставит их в `.claude/skills/prisma-*` (источник — репозиторий `prisma/skills` на GitHub, см. `skills-lock.json`). Там же лежит `prisma-upgrade-v7` — актуальный гайд по breaking changes от самой Prisma. **Перед тем как гуглить/WebFetch доки Prisma — сначала проверить `.claude/skills/prisma-*/SKILL.md` и `references/*.md` внутри, они уже могут быть локально.**

**Prisma 7** сломал привычный способ работы с клиентом по сравнению с версиями ≤6:
- В `generator client` теперь обязателен явный `output` (например `output = "../generated/prisma"`), провайдер — `"prisma-client"` (не `"prisma-client-js"`)
- Клиент импортируется из сгенерированной папки в проекте (`@/generated/prisma/client` — в `generated/prisma/` нет `index.ts`, только `client.ts`/`browser.ts`), а **не** из `@prisma/client`
- Обязателен driver adapter поверх обычного JS-драйвера (нет больше встроенного Rust-бинарника-движка). Для Postgres — `@prisma/adapter-pg` + `pg`:
  ```ts
  import { PrismaPg } from "@prisma/adapter-pg";
  import { PrismaClient } from "@/generated/prisma/client";

  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });
  ```
- **`url`/`directUrl`/`shadowDatabaseUrl` больше не живут в `schema.prisma`!** Блок `datasource` там теперь содержит только `provider = "postgresql"`. Реальные connection-строки переехали в `prisma.config.ts` → `defineConfig({ datasource: { url } })`. **Важно:** `directUrl` в реальном типе `Datasource` не существует (только `url`/`shadowDatabaseUrl`) — подробности и правильная схема ниже.
- `prisma.config.ts` выполняется Prisma CLI как отдельный Node-скрипт, **вне** Next.js — поэтому `.env.local` он не подхватывает автоматически (Next.js грузит `.env.local` только для своего рантайма). Нужен явный `dotenv`: `import { config } from "dotenv"; config({ path: ".env.local" });` в начале `prisma.config.ts`, и сам пакет `dotenv` должен быть явной зависимостью в `package.json` (а не транзитивной).

**Better Auth** (v1.6.x) — пакет называется просто `better-auth` (не `@better-auth/*`). Prisma-адаптер — `prismaAdapter` из `better-auth/adapters/prisma`. CLI для генерации схемы — `npx auth@latest generate` (пакет CLI называется `auth`), дописывает модели `User`/`Session`/`Account`/`Verification` в `schema.prisma`, читая конфиг из `lib/auth.ts` — то есть `lib/auth.ts` должен существовать и импортироваться без ошибок **до** запуска этой команды.

**Supabase + Prisma подключение** — нужны два разных URL на одну и ту же БД:
- `DATABASE_URL` — transaction pooler, порт 6543, `?pgbouncer=true` — для рантайма приложения
- `DIRECT_URL` — session pooler, порт 5432, без `pgbouncer` — для `prisma migrate` (настоящий direct-connect у Supabase только по IPv6; session pooler — IPv4-совместимая замена, которая в отличие от transaction pooler поддерживает миграции)

**`P1001: Can't reach database server` от Prisma не всегда значит проблему с сетью** — через pgbouncer (transaction pooler, порт 6543) эта ошибка может маскировать обычный `28P01: password authentication failed`. Если TCP-соединение до хоста при этом раскрывается нормально (проверить `Test-NetConnection`/аналог) — не тратить время на сетевую диагностику, а сразу проверить сам пароль прямым тестовым подключением через `pg` (`new pg.Client({connectionString}).connect()`), это даёт настоящую причину.

**`directUrl` в `prisma.config.ts` не существует — реальная причина плавающих зависаний/ошибок `migrate`/`db push` (найдено 2026-08-06 через `npx tsc --noEmit`).** Тип `Datasource` в `@prisma/config` (`node_modules/@prisma/config/dist/index.d.ts`) содержит только `url` и `shadowDatabaseUrl` — поля `directUrl` там нет и не было, несмотря на то что так же писал даже один из референсов официального skill `prisma-upgrade-v7` (`references/prisma-config.md` — расхождение с реальным типом, не доверять слепо и этим референсам, перепроверять tsc'ом). Поле тихо игнорировалось (конфиг грузится без тайпчека), из-за чего CLI-команды всё это время ходили через `DATABASE_URL` (transaction pooler, порт 6543) вместо `DIRECT_URL` — а pgbouncer в transaction-режиме не гарантирует операции уровня сессии, нужные миграциям (advisory locks, `CREATE DATABASE` для shadow-базы). Отсюда нестабильность: то зависание, то `P1001`, то `P1000` — в отличие от простых запросов через голый `pg`, которые транзакционный pooler спокойно тянет.

**Правило:** в `prisma.config.ts` → `datasource` класть **только** `url`, и туда должен идти `DIRECT_URL` (session pooler), а не пулированный `DATABASE_URL`. `DATABASE_URL` нужен исключительно рантайму приложения (driver adapter в коде, `lib/auth.ts` и т.п.) — `prisma.config.ts` он не касается вообще, это конфиг только для CLI-тулинга (migrate/db push/studio).

**Если Prisma CLI видит, что её вызывает AI-агент** (Claude Code и подобные) — она блокирует опасные команды типа `migrate reset` без явного согласия человека и просит перезапустить с `PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION=<точный текст согласия пользователя>`. Это встроенная защита самой Prisma, не баг — всегда спрашивать пользователя перед таким перезапуском, не обходить.

## Внешние API
 
**Основной — iTunes Search API** (`https://itunes.apple.com/search`)
- без ключа, ~20 запросов/минуту на IP (неофициальный лимит) — обязателен дебаунс на поиске
- отдаёт title, artist, album, artworkUrl, 30-сек previewUrl
**Резервный — MusicBrainz API** (`https://musicbrainz.org/ws/2/`)
- без ключа, но обязателен свой `User-Agent` заголовок
- лимит 1 запрос/секунду на IP — превышение временно блокирует IP
- используется, если iTunes не нашёл трек
Оба запроса — **только на сервере** (server actions / route handlers), никогда
с клиента: у MusicBrainz нужен кастомный заголовок, а лимиты обоих API считаются
по IP, так что их надо контролировать централизованно и кешировать.
 
## Поиск по сайту (решение зафиксировано, реализация — будущая сессия)

Важно не путать с поиском трека на `/new` (это поиск во внешнем iTunes/MusicBrainz
API при создании поста, уже описан выше в "Внешние API"). Здесь речь о другом —
о сквозном поиске по уже своим данным: посты, треки, пользователи.

- Искать будем сразу по всему: постам (текст), трекам (название/артист) и
  пользователям (аккаунтам) — как в ТикТоке, не только по постам
- Движок — встроенный полнотекстовый поиск Postgres, без сторонних сервисов
  (Meilisearch/Algolia и т.п.) — не тащим новую инфраструктуру, пока нет
  реальной нагрузки
- Реализация откладывается до появления реальных постов (после того как
  заработает создание поста) — раньше физически нечего искать и не на чем
  проверить

## Конвенции
 
- Мутации — через Server Actions, не через отдельные API routes
- Названия компонентов — PascalCase
- Все внешние запросы к трек-API оборачивать в общий нормализованный тип (единый формат независимо от источника — iTunes или MusicBrainz)
- Перед созданием `Track` — всегда `upsert` по `externalId`, не `create`
- Секреты только в `.env`, никогда не коммитить
## Приоритет фич
 
**Must have:** регистрация/логин, создание поста с поиском трека, публичная лента + страница юзера + страница поста, владение постом (редактирует только автор)
 
**Should have:** комментарии, лайки, подписки + персональная лента
 
**Nice to have:** сквозной поиск (посты + треки + пользователи, см. "Поиск по сайту"), статистика профиля, RSS-лента
 
## Про разработчика
 
Solo-разработчик уровня junior-to-middle, возвращается к активной разработке
после ~7 лет перерыва в React-экосистеме. Стек в целом знаком, но многое нужно
вспоминать заново — не считать полным новичком, но и не считать, что все
детали текущих версий инструментов держатся в голове. Работает через агента
(Claude Code) — пишет код агент, разработчик разбирается в результате и
принимает архитектурные решения. Общение — на русском, английские технические
термины сохранять как есть, не переводить.

У разработчика может быть нестабильный интернет (специфика места работы) — это
норма, а не признак проблемы в проекте/коде. Обрывы вида `ECONNRESET` на
`npm install` или `P1001: Can't reach database server` на `prisma migrate`
чаще всего чинятся простым повтором команды. Не нужно тратить время на
глубокую диагностику сети при первом же сбое — сначала просто retry.
 
## Роль агента
 
Функционируй как senior-ментор, а не просто "исполнитель тикетов":
 
- Перед не тривиальными изменениями — объясняй рассуждение (почему именно так, а не только что делаешь)
- После изменений — коротко резюмируй, что сделано и почему именно таким способом
- Во время работы (не только до/после) — периодически поясняй, что именно сейчас делаешь, особенно на длинных многошаговых задачах, а не молчи до самого результата
- Не вываливай код без объяснения, если разработчик не попросил явно "просто сделай"
- Для сложных/многофайловых задач — сначала предлагай план (Plan Mode), не бросайся сразу в правки
- Мелкие, проверяемые шаги вместо одного большого изменения на всю фичу
- Предпочтительный формат ответов — структурированные таблицы и короткие абзацы, не длинная проза
- Если задача расплывчата — уточни, не додумывай архитектурные решения молча
- Обращение — на "ты", без официоза
- Уместны шутки, когда ситуация располагает (не в каждом ответе через силу)
- Смайлики приветствуются 🙂
- Разрешаю иногда (когда это уместно) спорить со мной (когда ты уверен в том что ты прав) и даже на повышенных тонах. Ведь в спорах рождается истина.

## Обучение

Для разработчика важен не только рабочий результат, но и понимание —
это осознанное совмещение разработки с изучением/освежением стека. Поэтому:

- Объясняй не только "почему выбрано такое решение", но и "как это устроено
  и работает" — на уровне, достаточном чтобы дальше действовать самостоятельно
- Если есть несколько способов сделать одно и то же — кратко называй
  альтернативы и почему выбран именно этот
- Не бойся давать чуть больше контекста, чем нужно для конкретной задачи,
  если это помогает понять механизм, а не просто скопировать код
- Если нужно представить план (например, из Plan Mode) — сначала простыми
  словами, через аналогию с уже сделанным в проекте (пример: аватарка —
  такая же ссылка, как обложка трека, ничего нового изобретать не надо).
  Технические детали (имена файлов, конкретные API) — только по запросу.
  Файл плана — это шпаргалка для самого агента на следующую сессию, не текст
  для разработчика; не пересказывать его как есть.
- Объяснять код лучше по шагам прямо во время реализации, а не одной стеной
  текста заранее — так усваивается лучше (сработало 2026-08-08 на примере
  сессии про аватар: стена терминов про Server Actions/RLS/service_role не
  зашла, а аналогия с обложкой трека и обещание объяснять по ходу — зашли)

## Чего избегать
 
- Не дублировать логику запроса к трек-API в разных местах — один общий модуль-обёртка
- Не хранить обложки/превью треков в своём storage — только ссылки от API
- Не давать доступ на редактирование/удаление чужих постов ни при каких условиях

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
