## Стек

- **Backend:** Node.js 20+, Hono, SQLite (`better-sqlite3`), JWT, bcrypt
- **Frontend:** Angular 19 (standalone, Signals)
- **Файлы:** LibreOffice (DOC/DOCX/PPT/PPTX → PDF), ClamAV (антивирус)
- **Пакетный менеджер:** pnpm

## Структура
```
backend/ # Hono API, SQLite, конвертация файлов 
frontend/ # Angular-приложение 
create-admin.js # Создание первого администратора 
generate-env.js # Генерация .env со случайным JWT_SECRET 
start.js # Запуск бэкенда и фронтенда одной командой 
.env.example # Шаблон переменных окружения 
README.md
```

## Запуск

Установка зависимостей

```bash
cd backend && pnpm install
cd ../frontend && pnpm install
```

Генерация .env

```bash
node generate-env.js
```
Скрипт создаёт .env в корне проекта и заполняет JWT_SECRET случайным значением. Остальные переменные (SOFFICE_PATH, SMTP_*) при необходимости отредактируйте вручную.

Создание администратора

```bash
node create-admin.js
```
Скрипт создаёт администратора с логином admin, генерирует случайный пароль и выводит его в консоль один раз. Сохраните пароль — повторно он не отображается.

Запуск

```bash
node start.js
```
Скрипт проверяет зависимости, создаёт БД при первом запуске, запускает бэкенд на http://localhost:3000 и фронтенд на http://localhost:4200.
