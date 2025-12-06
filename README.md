# Clone 1 Site - Docker Setup

Проект налаштований для запуску в Docker контейнері.

## Обов'язкові кроки

### 1. Створіть файл `.env`

Скопіюйте файл `.env.example` та назвіть його `.env`:

```bash
cp .env.example .env
```

### 2. Вставте Telegram дані

Відредагуйте файл `.env` та вставте ваші Telegram дані:

```
TELEGRAM_BOT_TOKEN=your_actual_bot_token_here
TELEGRAM_CHAT_ID=your_actual_chat_id_here
```

## Запуск з Docker Compose

### Збирання та запуск контейнера:

```bash
docker-compose up --build
```

Приложение буде доступне за адресою: `http://localhost:3000`

### Запуск в фоновому режимі:

```bash
docker-compose up -d --build
```

### Зупинка контейнера:

```bash
docker-compose down
```

## Запуск без Docker Compose

### Збирання образу:

```bash
docker build -t clone-1-site .
```

### Запуск контейнера:

```bash
docker run -p 3000:3000 \
  -e TELEGRAM_BOT_TOKEN=your_bot_token \
  -e TELEGRAM_CHAT_ID=your_chat_id \
  --name clone-1-site \
  clone-1-site
```

## Локальна розробка (без Docker)

### Встановлення залежностей:

```bash
npm install
```

### Запуск сервера:

```bash
npm start
```

Сервер запуститься на `http://localhost:3000`

## Структура файлів

```
.
├── app.js                 # Головний файл додатку
├── Dockerfile            # Docker образ
├── docker-compose.yml    # Docker Compose конфіг
├── .dockerignore         # Виключення файлів для Docker
├── .env.example          # Приклад змінних оточення
├── package.json          # NPM залежності
├── public/               # Статичні файли
└── views/                # EJS шаблони
```

## Важливо: Безпека

⚠️ **НІКОЛИ** не комітьте файл `.env` у репозиторій!

Файл `.env` містить чутливі дані (Telegram бот токен та ID). Його слід додати в `.gitignore`:

```
.env
```

Тільки розповсюджуйте `.env.example` з плейсхолдерами.

## Помилки при запуску

### "Cannot find module 'express'"

Переконайтеся, що залежності встановлені:

```bash
npm install
```

### Контейнер не запускається

Перевірте логи:

```bash
docker-compose logs app
```

### Порт 3000 уже використовується

Змініть порт у `docker-compose.yml`:

```yaml
ports:
  - "3001:3000"  # Зовнішній:Внутрішній
```
