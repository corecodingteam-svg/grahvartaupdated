# GrahVarta — System Overview

## Project Name

**GrahVarta** (Grah = Planet, Varta = News/Conversation)

---

## Purpose

GrahVarta is a full-stack astrology services platform connecting users with professional astrologers for real-time consultations (chat, voice, video), personalized horoscopes, birth chart reports, and live sessions. It serves three distinct user personas: end users seeking astrological guidance, astrologers offering professional services, and platform administrators managing operations.

---

## Business Problem

Astrology seekers typically rely on fragmented, low-quality, or expensive channels to access professional consultations. GrahVarta solves this by providing a single platform where:

- Users get instant access to vetted astrologers via chat, voice, or video
- Astrologers can monetize their expertise through a managed marketplace with per-minute billing
- Platform administrators maintain quality, trust, and financial integrity

---

## Major Capabilities

| Capability | Description |
|---|---|
| Real-time Consultations | Chat, voice, and video sessions with per-minute billing via Socket.io + Agora |
| Astrologer Marketplace | Browse, filter, and request consultations with rated professionals |
| Personalized Horoscopes | Daily, weekly, and monthly readings based on user birth data |
| Birth Chart Reports | 16+ configurable report types (Career, Marriage, Wealth, Health, etc.) |
| Wallet & Payments | In-app wallet rechargeable via Razorpay/Stripe with bonus offers and subscriptions |
| Live Sessions | Astrologers broadcast live to platform users |
| Community Feed | Social posts from astrologers and users with moderation |
| Family Profiles | Manage birth data for multiple family members for report generation |
| Push Notifications | FCM-powered notifications for consultations, horoscopes, and promotions |
| Admin Dashboard | Full operational control — users, astrologers, finances, content |
| Agent Onboarding | Dedicated app for recruiting and onboarding new astrologers |
| Multilingual | 9 Indian languages: English, Hindi, Tamil, Kannada, Malayalam, Gujarati, Marathi, Bengali, Telugu |

---

## Technology Stack

| Layer | Technology |
|---|---|
| User Mobile App | Flutter (Dart), min SDK 3.0.0 |
| Astrologer Mobile App | Flutter (Dart), min SDK 3.0.0 |
| Agent Onboarding App | Flutter (Dart), lightweight |
| Admin Web Portal | React 18 + Vite, Tailwind CSS |
| Astrologer Web Portal | React 18 + Vite, Tailwind CSS |
| Backend API | Node.js, Express.js 4.x |
| Real-time | Socket.io 4.x |
| Database | PostgreSQL 15 |
| Video/Voice Calls | Agora RTC (agora-access-token) |
| Payments | Razorpay, Stripe |
| Push Notifications | Firebase Cloud Messaging (FCM) |
| Email | Nodemailer |
| Authentication | JWT (jsonwebtoken), bcryptjs |
| File Storage | Local filesystem via Multer, served by Nginx |
| Reverse Proxy | Nginx (Docker) |
| Containerization | Docker, Docker Compose |
| SSL | Let's Encrypt (auto-renewal) |
| Process Manager | PM2 (ecosystem.config.js) |
| Scheduling | node-cron |

---

## Major Components

| Component | Type | Location |
|---|---|---|
| `backend` | REST API + Socket.io server | `/backend/` |
| `flutter_app` | End-user mobile application | `/flutter_app/` |
| `astrologer_app` | Astrologer mobile application | `/astrologer_app/` |
| `agent_onboarding_app` | Agent recruitment app | `/agent_onboarding_app/` |
| `admin-portal` | Admin web dashboard | `/admin-portal/` |
| `astrologer-portal` | Astrologer web portal | `/astrologer-portal/` |
| PostgreSQL | Primary data store | Docker service `db` |
| Nginx | Reverse proxy + static serving | Docker service `nginx` |

---

## External Systems

| System | Purpose |
|---|---|
| **Razorpay** | Primary payment gateway for wallet recharge and subscriptions |
| **Stripe** | Alternative payment gateway |
| **Agora** | Real-time video and voice call infrastructure |
| **Firebase (FCM)** | Push notification delivery to mobile apps |
| **Let's Encrypt** | SSL certificate authority |

---

## Deployment Model

GrahVarta is deployed as a **Docker Compose multi-container stack** on a single VPS. All services run as Docker containers behind an Nginx reverse proxy.

- **Production domains**: `grahvarta.com` (main), `api.grahvarta.com` (API)
- **SSL**: Let's Encrypt with auto-renewal cron
- **Storage**: Shared Docker volume for file uploads
- **Database**: PostgreSQL 15 container with persistent named volume

---

## High-Level Architecture

```mermaid
flowchart TD
    subgraph Mobile["Mobile Applications"]
        UA["flutter_app\n(User App)"]
        AA["astrologer_app\n(Astrologer App)"]
        OA["agent_onboarding_app\n(Onboarding App)"]
    end

    subgraph Web["Web Portals"]
        AP["admin-portal\n(React)"]
        ASP["astrologer-portal\n(React)"]
    end

    subgraph Infra["VPS Docker Stack"]
        NGINX["Nginx\nReverse Proxy"]
        API["backend\nNode.js + Express"]
        SOCK["Socket.io\nReal-time Engine"]
        DB[(PostgreSQL 15)]
        UPLOADS["/uploads\nFile Storage"]
    end

    subgraph External["External Services"]
        FCM["Firebase FCM\nPush Notifications"]
        RZP["Razorpay\nPayments"]
        AGORA["Agora\nVideo/Voice"]
        SMTP["Nodemailer\nEmail"]
    end

    UA -->|HTTPS REST| NGINX
    AA -->|HTTPS REST| NGINX
    OA -->|HTTPS REST| NGINX
    AP -->|HTTPS REST| NGINX
    ASP -->|HTTPS REST| NGINX

    UA <-->|WebSocket| NGINX
    AA <-->|WebSocket| NGINX

    NGINX -->|/api/*| API
    NGINX -->|/socket.io/*| SOCK
    NGINX -->|/uploads/*| UPLOADS
    NGINX -->|/admin| AP
    NGINX -->|/* (grahvarta.com)| ASP

    API --- SOCK
    API --> DB
    API --> UPLOADS

    API --> FCM
    API --> RZP
    API --> AGORA
    API --> SMTP
```

---

## Domain Routing

| Domain / Path | Destination |
|---|---|
| `api.grahvarta.com/api/*` | Backend Node.js API |
| `api.grahvarta.com/socket.io/*` | Socket.io WebSocket |
| `api.grahvarta.com/uploads/*` | Static file serving (Nginx) |
| `grahvarta.com/*` | Astrologer Portal (SPA) |
| `grahvarta.com/admin/*` | Admin Portal (SPA) |

---

## Key Non-Functional Properties

| Property | Implementation |
|---|---|
| Security | JWT auth, Helmet headers, CORS whitelist, bcrypt (12 rounds), rate limiting (200 req/15 min) |
| Scalability | Connection pool (20), Nginx gzip, Docker-based horizontal scaling path |
| Reliability | Health checks on DB, PM2 process management, Docker restart policies |
| Observability | PM2 logs, Docker logs, Node error logging |
| Multilingual | 9 Indian languages via Flutter localization |
| Offline Support | SharedPreferences / FlutterSecureStorage for token persistence |
