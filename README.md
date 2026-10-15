# Local Connect: hyperlocal community app (UI demo)

React (Vite) front end + Node/Express API with in-memory sample data.

## Run

```bash
npm run install:all      # installs root, server and client dependencies
npm run dev              # API on :5000, web app on :5173
```

Open http://localhost:5173

If you only want the UI, `cd client && npm install && npm run dev` also works:
without the API running, the app falls back to the bundled sample data (`client/src/data.json`).

## Login and signup

- Sign up with name, email, area and password, or log in. Everyone who signs up is a normal **user**.
- Demo accounts (buttons on the login page):
  - User: `demo@localconnect.in` / `demo123`
  - Admin: `admin@localconnect.in` / `admin123`
- The **Safety desk** is admin-only: hidden from the menu for users, redirected if opened directly, and the
  API returns 403 for non-admins (GET /api/flags and PATCH /api/flags/:id). In offline demo mode the
  restriction is enforced in the UI only.
- With the API running: passwords are hashed with scrypt and the server issues a signed token
  (valid 7 days). Posting listings, alerts and safety-desk actions requires a valid token.
- Without the API: accounts are stored in the browser only (demo mode), so the UI still works.
- Set `JWT_SECRET` in the server environment before deploying anywhere real.

## Features

| Page | What it shows |
| --- | --- |
| Nearby | Radar map of everything around you, urgent alert banner, counts per section |
| Rooms | Listings, "request to contact", owner inbox with accept / decline, list a room |
| Lost & found | Found / lost tabs, claim with proof, post and notify nearby users |
| Rentals | Scooty / bike / car, hours + live-location sharing option with surcharge |
| Services | Electrician, mechanic, plumber, notes. Search and filters |
| Alerts | Urgent broadcast to a radius, "I can help" responses |
| Safety desk (admin only) | Anti-fraud: flagged accounts / regions with risk score, restrict or clear |

The radius slider in the sidebar filters every page and the map.

## API

```
POST  /api/auth/signup        { name, email, password, area } -> { user, token }
POST  /api/auth/login         { email, password }             -> { user, token }
GET   /api/auth/me            current user (Bearer token)
GET   /api/:resource          rooms | lostfound | rentals | services | alerts
GET   /api/flags              flagged accounts/areas (admin only)
POST  /api/:resource          add an item (login required, in memory)
PATCH /api/flags/:id          { "status": "restricted" | "cleared" } (admin only)
```

## Where to go next (for the real build)

- MongoDB or PostgreSQL instead of the in-memory users and data; email verification and password reset
- Real map: Leaflet + OpenStreetMap, replace `components/MapView.jsx`
- Push notifications / WebSockets for alerts and request updates
- Fraud rules: posts per hour per account, duplicate images, new-account bursts per area
