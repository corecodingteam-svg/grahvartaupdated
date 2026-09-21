# GrahVarta — API Reference

**Base URL**: `https://api.grahvarta.com/api`  
**Auth**: Bearer token in `Authorization` header (JWT, 30-day expiry)  
**Rate Limit**: 200 requests per 15 minutes per IP  
**Content-Type**: `application/json` (unless multipart for file uploads)

---

## Authentication

All routes marked **[Auth]** require the `Authorization: Bearer <token>` header.  
Admin routes marked **[Admin]** require an admin JWT.  
Routes marked **[SuperAdmin]** are superadmin-only.

---

## Auth Routes — `/api/auth`

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/auth/register` | No | Register new user account |
| POST | `/auth/login` | No | Login, returns JWT token |
| GET | `/auth/profile` | [Auth] | Get current user profile |
| PUT | `/auth/profile` | [Auth] | Update user profile |
| POST | `/auth/avatar` | [Auth] | Upload profile avatar (multipart) |
| POST | `/auth/change-password` | [Auth] | Change password |
| POST | `/auth/fcm-token` | [Auth] | Register FCM push token |

**Register payload:**
```json
{
  "name": "string",
  "email": "string",
  "password": "string",
  "phone": "string",
  "date_of_birth": "YYYY-MM-DD",
  "time_of_birth": "HH:MM",
  "place_of_birth": "string"
}
```

**Login response:**
```json
{
  "token": "jwt_string",
  "user": { "id": 1, "name": "...", "email": "...", "zodiac_sign": "..." }
}
```

---

## Horoscope Routes — `/api/horoscope`

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/horoscope/daily` | [Auth] | Today's horoscope for user's zodiac sign |
| GET | `/horoscope/weekly` | [Auth] | Weekly horoscope |
| GET | `/horoscope/monthly` | [Auth] | Monthly horoscope |
| GET | `/horoscope/compatibility` | [Auth] | Compatibility reading |

---

## Astrologer Routes — `/api/astrologers`

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/astrologers` | [Auth] | List all active astrologers (paginated) |
| GET | `/astrologers/:id` | [Auth] | Get astrologer profile + availability |
| GET | `/astrologers/:id/reviews` | [Auth] | Get reviews for an astrologer |
| POST | `/astrologers/:id/reviews` | [Auth] | Submit a review after consultation |
| POST | `/astrologers/register` | No | Astrologer self-registration |
| PUT | `/astrologers/profile` | [Auth] | Update astrologer profile |
| PUT | `/astrologers/availability` | [Auth] | Toggle online/offline status |
| GET | `/astrologers/earnings` | [Auth] | Astrologer earnings summary |

**Astrologer list query params:**
- `page`, `limit` (default: 20)
- `specialty` — filter by expertise area
- `sort` — `rating`, `price`, `experience`

---

## Consultation Routes — `/api/consultations`

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/consultations` | [Auth] | User's consultation history (paginated) |
| GET | `/consultations/:id` | [Auth] | Get single consultation detail |
| POST | `/consultations/request` | [Auth] | Request a consultation (triggers Socket.io) |
| PUT | `/consultations/:id/end` | [Auth] | End active consultation |
| GET | `/consultations/active` | [Auth] | Get current active consultation |
| POST | `/consultations/:id/message` | [Auth] | Send chat message in consultation |
| GET | `/consultations/:id/messages` | [Auth] | Get messages for a consultation |

**Consultation request payload:**
```json
{
  "astrologer_id": 42,
  "type": "chat | voice | video"
}
```

---

## Wallet Routes — `/api/wallet`

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/wallet` | [Auth] | Get wallet balance and summary |
| GET | `/wallet/transactions` | [Auth] | Transaction history (paginated) |
| POST | `/wallet/recharge` | [Auth] | Create Razorpay recharge order |
| POST | `/wallet/verify-payment` | [Auth] | Verify Razorpay payment signature |
| GET | `/wallet/recharge-offers` | [Auth] | Available recharge bonus offers |
| GET | `/wallet/subscription-plans` | [Auth] | Available subscription plans |
| POST | `/wallet/subscribe` | [Auth] | Purchase a subscription plan |

**Recharge order payload:**
```json
{
  "amount": 500,
  "offer_id": 3
}
```

---

## Reports Routes — `/api/reports`

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/reports` | [Auth] | List all available report types |
| GET | `/reports/unlocked` | [Auth] | Reports unlocked by this user |
| POST | `/reports/unlock` | [Auth] | Unlock/purchase a report |
| GET | `/reports/:id` | [Auth] | Get unlocked report content |
| POST | `/reports/:id/review` | [Auth] | Submit a report review |

**Unlock payload:**
```json
{
  "report_id": 5,
  "family_member_id": null
}
```

---

## Family Members Routes — `/api/family-members`

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/family-members` | [Auth] | List user's family member profiles |
| POST | `/family-members` | [Auth] | Add a family member |
| PUT | `/family-members/:id` | [Auth] | Update family member |
| DELETE | `/family-members/:id` | [Auth] | Remove family member |

---

## Chat Threads Routes — `/api/threads`

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/threads` | [Auth] | List all user's chat threads |
| GET | `/threads/:astrologer_id` | [Auth] | Get thread with specific astrologer |
| GET | `/threads/:id/messages` | [Auth] | Get thread message history |

---

## Live Sessions Routes — `/api/live`

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/live/sessions` | [Auth] | List active/upcoming live sessions |
| POST | `/live/sessions` | [Auth] | Astrologer creates a live session |
| PUT | `/live/sessions/:id/end` | [Auth] | End a live session |
| GET | `/live/community` | [Auth] | Community feed posts |
| POST | `/live/community` | [Auth] | Create a community post |
| POST | `/live/community/:id/like` | [Auth] | Like a post |
| POST | `/live/community/:id/comment` | [Auth] | Comment on a post |
| POST | `/live/notifications` | [Auth] | Send notification (astrologer broadcast) |

---

## Agora Routes — `/api/agora`

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/agora/token` | [Auth] | Generate Agora RTC token for a consultation |

**Payload:**
```json
{
  "consultation_id": 123,
  "channel_name": "string",
  "role": "publisher | subscriber"
}
```

---

## Withdrawal Routes — `/api/withdrawal`

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/withdrawal` | [Auth] | Astrologer's withdrawal request history |
| POST | `/withdrawal/request` | [Auth] | Submit a withdrawal request |
| GET | `/withdrawal/balance` | [Auth] | Available balance for withdrawal |

---

## Content Routes — `/api/content`

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/content/courses` | [Auth] | List astrology courses |
| GET | `/content/audio` | [Auth] | Audio content / meditations |
| GET | `/content/courses/:id` | [Auth] | Course detail |

---

## Agent Hirings Routes — `/api/hirings`

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/hirings/apply` | No | Submit agent/astrologer onboarding application |
| GET | `/hirings/status/:id` | No | Check application status |

---

## Admin Routes — `/api/admin`

> All admin routes require admin JWT (`[Admin]`).

### Dashboard

| Method | Path | Description |
|---|---|---|
| GET | `/admin/dashboard` | Platform stats (users, revenue, consultations) |

### Users

| Method | Path | Description |
|---|---|---|
| GET | `/admin/users` | Paginated user list with search/filter |
| GET | `/admin/users/:id` | User detail with wallet, consultations |
| PUT | `/admin/users/:id/ban` | Ban/unban user account |

### Astrologers

| Method | Path | Description |
|---|---|---|
| GET | `/admin/astrologers` | Paginated astrologer list |
| GET | `/admin/astrologers/:id` | Astrologer profile + earnings |
| PUT | `/admin/astrologers/:id/approve` | Approve pending astrologer |
| PUT | `/admin/astrologers/:id/reject` | Reject astrologer application |
| PUT | `/admin/astrologers/:id/rates` | Set consultation rates |

### Reports (Admin)

| Method | Path | Description |
|---|---|---|
| GET | `/admin/reports` | List report templates |
| POST | `/admin/reports` | Create a new report template |
| PUT | `/admin/reports/:id` | Update report template |
| DELETE | `/admin/reports/:id` | Delete report template |

### Transactions

| Method | Path | Description |
|---|---|---|
| GET | `/admin/transactions` | Full transaction ledger (paginated) |
| POST | `/admin/transactions/:id/refund` | Issue a refund |

### Withdrawals

| Method | Path | Description |
|---|---|---|
| GET | `/admin/withdrawals` | Pending and processed withdrawal requests |
| PUT | `/admin/withdrawals/:id/approve` | Approve withdrawal |
| PUT | `/admin/withdrawals/:id/reject` | Reject withdrawal |

### Community

| Method | Path | Description |
|---|---|---|
| GET | `/admin/community` | Community posts pending moderation |
| PUT | `/admin/community/:id/approve` | Approve post |
| PUT | `/admin/community/:id/reject` | Reject post |

### Notifications

| Method | Path | Description |
|---|---|---|
| POST | `/admin/notifications/broadcast` | FCM broadcast to all users |
| POST | `/admin/notifications/segment` | FCM to segmented user group |

### Hirings (Admin)

| Method | Path | Description |
|---|---|---|
| GET | `/admin/hirings` | All onboarding applications |
| GET | `/admin/hirings/:id` | Application detail |
| PUT | `/admin/hirings/:id/activate` | Activate as astrologer |
| PUT | `/admin/hirings/:id/reject` | Reject application |

### Recharge Offers

| Method | Path | Description |
|---|---|---|
| GET | `/admin/recharge-offers` | List recharge offers |
| POST | `/admin/recharge-offers` | Create recharge offer |
| PUT | `/admin/recharge-offers/:id` | Update offer |
| DELETE | `/admin/recharge-offers/:id` | Delete offer |

### Sub-admins — `[SuperAdmin]`

| Method | Path | Description |
|---|---|---|
| GET | `/admin/sub-admins` | List sub-admin accounts |
| POST | `/admin/sub-admins` | Create sub-admin with permissions |
| PUT | `/admin/sub-admins/:id` | Update sub-admin permissions |
| DELETE | `/admin/sub-admins/:id` | Remove sub-admin |

---

## Error Response Format

```json
{
  "error": "Human-readable error message",
  "code": "OPTIONAL_ERROR_CODE"
}
```

| HTTP Status | Meaning |
|---|---|
| 200 | Success |
| 201 | Created |
| 400 | Bad request / validation error |
| 401 | Unauthenticated (invalid or missing token) |
| 403 | Forbidden (insufficient permissions) |
| 404 | Resource not found |
| 429 | Rate limit exceeded |
| 500 | Internal server error |

---

## Socket.io Events

**Connection URL**: `wss://api.grahvarta.com`  
**Auth**: `{ auth: { token: "<jwt>" } }` in Socket.io handshake options

### Client → Server Events

| Event | Payload | Description |
|---|---|---|
| `set_role` | `{ role: "user"|"astrologer" }` | Register socket with user role |
| `request_consultation` | `{ astrologer_id, type }` | Request a consultation |
| `accept_consultation` | `{ consultation_id }` | Astrologer accepts request |
| `decline_consultation` | `{ consultation_id }` | Astrologer declines |
| `send_message` | `{ consultation_id, message }` | Send chat message |
| `typing` | `{ consultation_id }` | Typing indicator |
| `end_consultation` | `{ consultation_id }` | End active session |
| `astrologer_online` | `{}` | Astrologer marks as online |
| `astrologer_offline` | `{}` | Astrologer marks as offline |

### Server → Client Events

| Event | Payload | Description |
|---|---|---|
| `new_consultation_request` | `{ consultation, user }` | New request for astrologer |
| `consultation_started` | `{ consultation, agora_token? }` | Session started (both parties) |
| `consultation_ended` | `{ consultation, summary }` | Session ended |
| `new_message` | `{ message, sender }` | Incoming chat message |
| `typing` | `{ user_id }` | Typing indicator |
| `billing_update` | `{ balance, elapsed_minutes }` | Real-time wallet update |
| `queue_position` | `{ position }` | User queue position update |
| `astrologer_status` | `{ astrologer_id, online }` | Presence update |
