# Kimyo Olami

Telegram Mini App orqali kimyo kurslari, video/PDF darslar, testlar va o‘quv progressini boshqarish platformasi.

## Texnologiyalar

- Frontend: Next.js 16, React 19, TypeScript, Tailwind CSS
- Backend: NestJS 11, Prisma 7, PostgreSQL
- Auth: Telegram Mini App `initData` HMAC + JWT
- Production: Docker Compose, health checks, migrations

## Lokal ishga tushirish

1. Environment fayllarini tayyorlang:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
```

2. PostgreSQL yarating va `backend/.env` ichidagi `DATABASE_URL`ni sozlang.

3. Backendni tayyorlang:

```bash
cd backend
npm ci
npm run prisma:generate
npm run prisma:migrate
npm run start:dev
```

4. Boshqa terminalda frontendni ishga tushiring:

```bash
cd frontend
npm ci
npm run dev
```

Frontend `http://localhost:3000`, backend `http://localhost:3001/api` manzilida ishlaydi.

## Docker Compose

Root `.env.example` faylini `.env` nomi bilan nusxalang, barcha secretlarni almashtiring va ishga tushiring:

```bash
docker compose up --build -d
docker compose ps
```

Backend container ishga tushishda migratsiyalarni avtomatik qo‘llaydi.

## Birinchi administrator

Foydalanuvchi avval Telegram Mini App orqali kamida bir marta kirishi kerak. Keyin backend ichida:

```bash
npm run admin:promote -- TELEGRAM_ID
```

Docker ishlatilsa:

```bash
docker compose exec backend npm run admin:promote -- TELEGRAM_ID
```

## Muhim endpointlar

- `GET /api/health/live` — process holati
- `GET /api/health/ready` — database tayyorligi
- `POST /api/auth/telegram` — Telegram autentifikatsiyasi
- `GET /api/courses` — nashr qilingan kurslar
- `GET /api/learning/progress` — foydalanuvchi progressi
- `/api/admin/*` — faqat administrator uchun kontent boshqaruvi

## Tekshiruvlar

```bash
cd backend
npm run lint
npm test -- --runInBand
npm run test:e2e -- --runInBand
npm run build

cd ../frontend
npm run lint
npx tsc --noEmit --incremental false
npm run build
```

## Production talablari

- HTTPS domen va Telegram BotFather’da shu domenning Web App URL’i
- Kuchli, noyob `JWT_SECRET` va PostgreSQL paroli
- Haqiqiy `TELEGRAM_BOT_TOKEN`
- Backend CORS uchun aniq `FRONTEND_URL`
- Tashqi video/PDF fayllari uchun barqaror HTTPS storage
