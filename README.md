# WilkenPoelker App

## Overview

A React Native (Expo) + Express.js application for **WilkenPoelker GmbH & Co. KG** - a German shop in Ostrhauderfehn selling bicycles, cleaning devices (Karcher, Nilfisk, Stihl), and motor equipment. The app provides customers with product browsing, repair tracking (with Taifun ERP integration), appointment scheduling, push notifications, and an AI chatbot.

## Tech Stack

- **Frontend**: React Native + Expo SDK 54, React Navigation, i18next
- **Backend**: Node.js + Express.js, Sequelize ORM
- **Database**: PostgreSQL 18 (SQLite for quick dev)
- **Auth**: JWT (15min access + 7d refresh tokens with rotation)
- **Push**: Firebase Cloud Messaging (FCM)
- **AI**: OpenAI GPT-4o-mini
- **i18n**: German + English

## Prerequisites

- Node.js 20+
- PostgreSQL 18+
- Expo CLI
- Firebase project (for push notifications)
- OpenAI API key (for AI chatbot)

## Setup

### Backend

```bash
cd backend
npm install
cp .env.example .env  # Configure your environment variables
node src/seeds/index.js --reset  # Seed test data
node src/app.js  # Start server on port 5002
```

### Frontend

```bash
cd frontend
npm install
npx expo start --web  # Start Expo web
npx expo start  # Start Expo (iOS/Android)
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `DB_HOST` | PostgreSQL host |
| `DB_PORT` | PostgreSQL port |
| `DB_NAME` | Database name |
| `DB_USER` | Database user |
| `DB_PASSWORD` | Database password |
| `JWT_SECRET` | Secret for access tokens |
| `JWT_REFRESH_SECRET` | Secret for refresh tokens |
| `FIREBASE_SERVICE_ACCOUNT` | Firebase service account JSON |
| `OPENAI_API_KEY` | OpenAI API key for chatbot |
| `EMAIL_HOST` | SMTP host |
| `EMAIL_PORT` | SMTP port |
| `EMAIL_USER` | SMTP user |
| `EMAIL_PASSWORD` | SMTP password |
| `CORS_ORIGINS` | Allowed CORS origins |

## Project Structure

```
backend/src/
  config/          # Database, auth, Firebase config
  models/ (23)     # Sequelize models
  middlewares/     # Auth, validation, error handling
  routes/ (14)     # Express route definitions
  controllers/ (14)# Request handlers
  services/ (13)   # Business logic
  utils/           # Helpers and utilities
  seeds/           # Test data seeders

frontend/src/
  api/ (13)        # API client and service modules
  components/      # UI (17), shared (10), feature (21)
  context/ (5)     # React contexts (Auth, Theme, etc.)
  hooks/ (7)       # Custom React hooks
  i18n/            # German (de.json) + English (en.json)
  navigation/ (8)  # React Navigation setup
  screens/ (26+)   # App screens
  theme/ (5)       # Theme system (light/dark/system, accent colors)
  utils/           # Utility functions
```

## Test Users

| Role | Email | Password |
|------|-------|----------|
| Super Admin | superadmin@wilkenpoelker.de | Test1234! |
| Admin | admin@wilkenpoelker.de | Test1234! |
| Bike Manager | bike@wilkenpoelker.de | Test1234! |
| Cleaning Manager | cleaning@wilkenpoelker.de | Test1234! |
| Motor Manager | motor@wilkenpoelker.de | Test1234! |
| Service Manager | service@wilkenpoelker.de | Test1234! |
| Robby Manager | robby@wilkenpoelker.de | Test1234! |
| Customer | julia.schmidt@test.de | Test1234! |

## Features

- **Product Catalog** - Bikes, cleaning devices, and motor equipment with categories and top tabs
- **Repair Tracking** - Taifun ERP simulation with traffic light status indicators
- **Appointment Scheduling** - Book service appointments with available time slots
- **Push Notifications** - Firebase Cloud Messaging for order updates and promotions
- **AI Chatbot** - Domain-restricted GPT-4o-mini assistant for customer support
- **Admin Panel** - User management, content moderation, and analytics
- **Community Feed** - Posts and interactions for the customer community
- **FAQ Management** - Categorized FAQs with admin editing
- **Theme System** - Dark/Light/System mode with 5 accent colors and 4 text sizes
- **Internationalization** - Full German and English support (~500 translation keys)

## Docker

```bash
docker-compose up -d
```

## License

Proprietary - WilkenPoelker GmbH & Co. KG
