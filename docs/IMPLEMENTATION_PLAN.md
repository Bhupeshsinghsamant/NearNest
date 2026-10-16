# NearNest — Master Engineering Implementation Plan

**Execution Horizon**: October 2026  
**Architecture**: React (Web) + React Native / Expo (Mobile) + Express/Node.js (API) + MongoDB Atlas  
**Implementation Methodology**: Phased, Non-Destructive, Test-Driven & Student Review Ready  

---

## Stage 1: Baseline & Discovery (COMPLETED)
- [x] Comprehensive repository audit of Web, Backend, and Mobile codebases.
- [x] Initialized Phase Zero documentation suite:
  - `docs/PROJECT_AUDIT.md`
  - `docs/REQUIREMENTS.md`
  - `docs/IMPLEMENTATION_PLAN.md`
  - `docs/TEST_PLAN.md`
  - `docs/DEPLOYMENT_GUIDE.md`
  - `docs/KNOWN_LIMITATIONS.md`
- [x] Executed backend automated test suite (`run-tests.js`): 17/17 tests passing on in-memory MongoDB.
- [x] Built React client production bundle: 1,590 modules compiled with 0 errors.

---

## Stage 2: Resolve Critical Risks & Data Safety (NEXT)

### 2.1 Destructive Database Safeguard
- **Target File**: `server/src/seed.js`
- **Actions**:
  - Add strict safety guard:
    ```javascript
    if (process.env.NODE_ENV === "production" || !process.env.ALLOW_DESTRUCTIVE_SEED) {
      console.error("❌ Refusing to seed: ALLOW_DESTRUCTIVE_SEED=true is required to execute seed script.");
      process.exit(1);
    }
    ```
  - Verify that executing `npm run seed` without explicit environment override fails safely without deleting Atlas data.

### 2.2 Production JWT Secret Fail-Closed
- **Target File**: `server/src/middleware/auth.js`
- **Actions**:
  - Fail closed if running in production without `process.env.JWT_SECRET`:
    ```javascript
    if (process.env.NODE_ENV === "production" && !process.env.JWT_SECRET) {
      throw new Error("FATAL: JWT_SECRET environment variable is missing in production!");
    }
    ```
  - Enforce minimum length check (at least 32 characters for production tokens).

### 2.3 API Rate Limiting & Abuse Prevention
- **Target Files**: `server/package.json`, `server/index.js`, `server/src/routes/authRoutes.js`
- **Actions**:
  - Add `express-rate-limit` to `server/package.json`.
  - Apply general limiter (100 req/min) across all `/api/` and `/api/v1/` routes.
  - Apply strict limiter (15 req/15min) specifically to `/api/v1/auth/login` and `/api/v1/auth/signup` to prevent credential stuffing.

---

## Stage 3: Repair Core Flows & Cross-Platform Alignment

### 3.1 Mobile Upload Route & Response Contract Fix
- **Target Files**: `mobile/src/api/listings.ts`, `server/src/routes/uploadRoutes.js`
- **Actions**:
  - In `mobile/src/api/listings.ts`:
    - Update endpoint URL from `/upload` to `/upload/media`.
    - Map response items so both `originalName` and `name` are supported:
      ```typescript
      return (response.data.files || []).map((f: any) => ({
        url: f.url,
        originalName: f.name || f.originalName || "",
        size: f.size || 0,
        mimeType: f.mimeType || "",
      }));
      ```
  - In `server/src/routes/uploadRoutes.js`:
    - Add backward-compatible route handler on `router.post("/", ...)` identical to `/media` so both `/api/v1/upload` and `/api/v1/upload/media` resolve successfully.

### 3.2 Coordinate & Geospatial Search Integrity
- **Target Files**: `server/index.js`, `server/src/controllers/listingController.js`
- **Actions**:
  - Remove silent Delhi fallback (`28.6139, 77.2090`) when listing or user coordinates are unknown.
  - When coordinates are omitted: set `km: null` and fallback gracefully to text-based locality matching.
  - Use MongoDB `$geoWithin` with `$centerSphere` when coordinates and radius are explicitly passed.

---

## Stage 4: Test & Regression Checks

### 4.1 Expand Automated Test Suite
- **Target File**: `server/test-api.js`
- **Actions**:
  - Add automated test verifying `ALLOW_DESTRUCTIVE_SEED` blocks accidental deletions.
  - Add automated test verifying JWT fail-closed in production.
  - Add automated test for rate limiting (verifying 429 status on threshold breach).
  - Add automated test for mobile `/api/v1/upload` route compatibility.

---

## Stage 5: Room Discovery Pilot Enhancements

### 5.1 Availability Reconfirmation Tracking
- **Target Files**: `server/src/models/Listing.js`, `client/src/pages/Rooms.jsx`
- **Actions**:
  - Add `availabilityConfirmedAt: { type: Date, default: Date.now }` to `roomDetails`.
  - In `Rooms.jsx`: Display freshness indicator (`🟢 Confirmed Available` if updated within 7 days, `🟡 Awaiting Update` if older).
  - Provide one-click "Confirm Availability" button for listing owners on their rooms.

### 5.2 Room Details Quality Fields
- **Target Files**: `server/src/models/Listing.js`, `client/src/pages/Rooms.jsx`
- **Actions**:
  - Add `depositAmount` and `roomType` (Single, 1RK, 1BHK, 2BHK, Shared) to `roomDetails`.
  - Render explicit Deposit and Room Type badges on listing cards and detail modals.

---

## Stage 6: Deployment Preparation & Verification

- **Target Files**: `docs/DEPLOYMENT_GUIDE.md`, `.github/workflows/ci.yml`
- **Actions**:
  - Create GitHub Actions workflow for PR linting and in-memory test execution.
  - Document verified zero-budget hosting options (Render Free / Railway Free / Vercel Web + Atlas Free).
  - Verify zero console errors, zero secret leaks, and clean production builds.

---

## Stage 7: Definition of Done & Handover

- [ ] All Stage 2 security & data-integrity fixes deployed and tested.
- [ ] All Stage 3 mobile upload & API consistency fixes verified.
- [ ] Automated test suite expanded and passing 100%.
- [ ] Zero uncommitted changes made without approval.
- [ ] Final release readiness report published in `walkthrough.md`.
