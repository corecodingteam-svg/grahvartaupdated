# GrahVarta — Technical Documentation Index

> Generated from source code analysis following the ConfluenceGenerator.md specification.  
> All content is derived from actual source code. Unverified items are marked explicitly.

---

## Documentation Map

### Architecture

| Document | Description |
|---|---|
| [System Overview](architecture/system-overview.md) | Executive summary — purpose, capabilities, tech stack, high-level architecture diagram |
| [Architecture](architecture/architecture.md) | Component architecture, interaction diagrams, deployment topology, auth flows, cron jobs |

### API

| Document | Description |
|---|---|
| [API Reference](api/api-reference.md) | All REST endpoints, request/response formats, Socket.io events |

### Database

| Document | Description |
|---|---|
| [Data Model](database/data-model.md) | ER diagram, table schemas, migration history, design decisions |

### Features

| Document | Description |
|---|---|
| [Real-Time System](features/real-time.md) | Socket.io architecture, consultation lifecycle, billing engine, FCM notifications |

### Mobile

| Document | Description |
|---|---|
| [Flutter Applications](mobile/flutter-apps.md) | All three Flutter apps — structure, startup, state management, build instructions |

### Deployment

| Document | Description |
|---|---|
| [Deployment Guide](deployment/deployment-guide.md) | Docker Compose setup, environment variables, SSL, migrations, monitoring |

---

## System at a Glance

| Property | Value |
|---|---|
| **Product** | GrahVarta — Astrology consultation marketplace |
| **Backend** | Node.js 20, Express 4.x, Socket.io 4.x |
| **Database** | PostgreSQL 15 |
| **User app** | Flutter (Android/iOS), 9 Indian languages |
| **Astrologer app** | Flutter (Android/iOS) |
| **Onboarding app** | Flutter (lightweight) |
| **Admin portal** | React 18 + Vite + Tailwind |
| **Astrologer portal** | React 18 + Vite + Tailwind |
| **Payments** | Razorpay (primary), Stripe |
| **Video/Voice** | Agora RTC |
| **Notifications** | Firebase FCM |
| **Deployment** | Docker Compose, single VPS, Nginx, Let's Encrypt |
| **API base** | `https://api.grahvarta.com/api` |
| **Auth** | JWT (30-day), Bearer token |

---

## Key Integrations

| Service | Purpose | Docs location |
|---|---|---|
| Razorpay | Wallet recharge, subscription | [API Reference → Wallet](api/api-reference.md) |
| Agora | Video/voice RTC | [Real-Time System](features/real-time.md), [API Reference → Agora](api/api-reference.md) |
| Firebase FCM | Push notifications | [Real-Time System → FCM](features/real-time.md), [Flutter Apps](mobile/flutter-apps.md) |
| Socket.io | Real-time consultation events + billing | [Real-Time System](features/real-time.md) |
| PostgreSQL | All persistent data | [Data Model](database/data-model.md) |

---

## Quick Navigation for New Developers

| I want to understand... | Read this |
|---|---|
| What this system does and who uses it | [System Overview](architecture/system-overview.md) |
| How the backend is structured | [Architecture → Backend Component](architecture/architecture.md) |
| How to call the API | [API Reference](api/api-reference.md) |
| How the database is structured | [Data Model](database/data-model.md) |
| How real-time consultation billing works | [Real-Time System → Billing Engine](features/real-time.md) |
| How to set up a local dev environment | [Deployment Guide → Local Development](deployment/deployment-guide.md) |
| How to deploy to production | [Deployment Guide](deployment/deployment-guide.md) |
| How the Flutter apps are organized | [Flutter Applications](mobile/flutter-apps.md) |
| How to build release APKs | [Flutter Apps → Build Instructions](mobile/flutter-apps.md) |
| What push notifications are sent and when | [Real-Time System → FCM](features/real-time.md) |
