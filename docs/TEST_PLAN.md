# NearNest — Quality Assurance & Test Plan

**Document Version**: 1.0.0  
**Test Strategy**: Multi-Tiered (In-Memory Unit/Integration + Mocked Contracts + Production Smoke Tests)  
**Target Environment**: Isolated In-Memory MongoDB Server (`mongodb-memory-server`) & Local Test Runner  

---

## 1. Test Strategy Overview

NearNest employs a zero-risk testing approach designed to protect production Atlas data:
1. **Zero Production Mutation**: Automated test suites NEVER run destructive operations against the production Atlas cluster.
2. **In-Memory Isolation**: Automated API and security tests run against an ephemeral in-memory MongoDB instance (`mongodb-memory-server`) spun up dynamically and torn down immediately upon test completion.
3. **Explicit Commands**: All test commands are registered in `package.json` manifests and can be executed without manual configuration.

---

## 2. Test Suites & Execution Matrix

### 2.1 Backend Automated API Suite (`server/test-api.js`)

**Execution Command**:
```powershell
npm test --prefix server
```

**Target Server**: In-Memory Express server bound dynamically to Port 5001.

| Test ID | Test Name | Target Endpoint | Assertion / Criteria | Status |
|---|---|---|---|---|
| TC-B01 | Health Check Endpoint | `GET /api/v1/health` | Returns HTTP 200, `{ success: true, status: "ok" }`, and database connected. | `PASSED` |
| TC-B02 | User 1 Registration | `POST /api/v1/auth/signup` | Returns HTTP 201, signed JWT token, and sanitized user object (no passwordHash). | `PASSED` |
| TC-B03 | User 1 Login | `POST /api/v1/auth/login` | Returns HTTP 200 and valid JWT token. | `PASSED` |
| TC-B04 | Reject Invalid Credentials | `POST /api/v1/auth/login` | Returns HTTP 401 on incorrect password with sanitized error. | `PASSED` |
| TC-B05 | User 2 Registration | `POST /api/v1/auth/signup` | Registers secondary user for cross-user permission verification. | `PASSED` |
| TC-B06 | Create Room Listing | `POST /api/v1/listings` | Persists room listing with ownerId, title, rent, and amenities. | `PASSED` |
| TC-B07 | Create Vehicle Listing | `POST /api/v1/listings` | Persists vehicle rental listing with hourly pricing. | `PASSED` |
| TC-B08 | Create Lost & Found Listing | `POST /api/v1/listings` | Persists lost item with incident location. | `PASSED` |
| TC-B09 | Create Civil Help Listing | `POST /api/v1/listings` | Persists service listing with category and pricing info. | `PASSED` |
| TC-B10 | Category Isolation: Rooms | `GET /api/v1/listings?type=room` | Returns only room listings (count: 1). | `PASSED` |
| TC-B11 | Category Isolation: Vehicles | `GET /api/v1/listings?type=vehicle` | Returns only vehicle listings (count: 1). | `PASSED` |
| TC-B12 | Category Isolation: Lost & Found | `GET /api/v1/listings?type=lost_found` | Returns only lost & found listings (count: 1). | `PASSED` |
| TC-B13 | Category Isolation: Civil Help | `GET /api/v1/listings?type=service` | Returns only civil service listings (count: 1). | `PASSED` |
| TC-B14 | Deny Unauthorized Edit | `PATCH /api/v1/listings/:id` | Returns HTTP 403 when User 2 attempts to edit User 1's listing. | `PASSED` |
| TC-B15 | Permit Owner Edit | `PATCH /api/v1/listings/:id` | Returns HTTP 200 when User 1 updates rent on their own listing. | `PASSED` |
| TC-B16 | Deny Unauthorized Delete | `DELETE /api/v1/listings/:id` | Returns HTTP 403 when User 2 attempts to delete User 1's listing. | `PASSED` |
| TC-B17 | Permit Owner Delete | `DELETE /api/v1/listings/:id` | Returns HTTP 200 and permanently removes listing. | `PASSED` |

**Baseline Execution Result**: **17/17 Tests Passed (100% Pass Rate)**.

---

### 2.2 Security & Protection Test Extensions (To Add in Stage 4)

| Test ID | Test Scope | Verification Method | Expected Result |
|---|---|---|---|
| TC-SEC01 | Destructive Seed Safeguard | Execute `node src/seed.js` without `ALLOW_DESTRUCTIVE_SEED` | Process exits with code 1; no database mutation occurs. |
| TC-SEC02 | Production JWT Fail-Closed | Start server with `NODE_ENV=production` and missing `JWT_SECRET` | Server throws fatal error and refuses to start. |
| TC-SEC03 | Rate Limiting Enforcement | Send 16 consecutive login requests within 60 seconds | Request 16 receives HTTP 429 Too Many Requests. |
| TC-SEC04 | Banned User Lockout | Attempt login or authenticated request with banned user token | Returns HTTP 403 Forbidden with suspension reason. |
| TC-SEC05 | Mass Assignment Prevention | Attempt to send `{ role: "admin", isVerified: true }` in listing create | Server ignores or rejects unauthorized fields. |

---

### 2.3 Web Client Verification (`client/`)

**Execution Command**:
```powershell
cmd /c npm run build --prefix client
```

**Results**:
- Built in 7.32s.
- Total modules transformed: 1,590.
- Production assets generated in `client/dist/` without linting or bundling errors.

**Manual Browser QA Checklist**:
- [x] Responsive layout on 375px mobile viewport.
- [x] Auto-read sync: active chat clears unread count immediately.
- [x] Instagram Seen receipts display `✓ Sent` and `✓✓ Seen`.
- [x] Verified Call modal opens only when inquiry is accepted.
- [x] Master Admin Console displays dedicated operations rail and suppresses consumer marketplace tools.

---

### 2.4 Mobile Client Verification (`mobile/`)

**Verification Checks**:
- [x] `client.ts` automatically resolves bundler IP (`http://${ip}:5000/api/v1`) with fallback to Android emulator (`10.0.2.2`).
- [x] Token management integrated with `expo-secure-store`.
- [ ] Contract Fix: Align upload route from `/upload` to `/upload/media` and response type mapping.
- [ ] TypeScript compilation check (`npx tsc --noEmit`).

---

## 3. End-to-End Regression Flow

To verify full system integrity before pilot deployment, execute this sequence:
1. **User Registration**: Register Seeker A and Owner B.
2. **Room Publishing**: Owner B publishes a 1BHK room with rent, deposit, amenities, and photo.
3. **Discovery & Filter**: Seeker A filters by budget and finds Owner B's room.
4. **Inquiry Initiation**: Seeker A clicks "Contact Owner" and sends initial message.
5. **Call Lock Verification**: Verify Call button is locked (`🔒 Call (Locked)`).
6. **Owner Acceptance**: Owner B clicks "Accept Request".
7. **Call Unlock Verification**: Seeker A clicks unlocked `📞 Call Now`, verifying phone dialer and WhatsApp triggers.
8. **Real-time Seen Status**: Verify `✓✓ Seen` and `Seen [time]` appear beneath read messages.
