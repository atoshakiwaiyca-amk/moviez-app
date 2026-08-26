# Moviez — Pay-to-Download Movie App

A full working app: users register, log in, buy movies, and download them
through a secure, time-limited link. Admins get a dashboard to upload movies,
delete them, and see who has signed up.

## Project structure

```
moviez-app/
├── backend/     Node.js + Express API, SQLite database, auth, payments, secure downloads
├── frontend/    Plain HTML/CSS/JS site for end users (browse, buy, download)
└── admin/       Admin dashboard (upload movies, view users, sales stats)
```

## 1. Backend setup

```bash
cd backend
npm install
cp .env.example .env
```

Open `.env` and set:
- `JWT_SECRET` — a long random string (this signs login sessions, keep it secret)
- `ADMIN_EMAIL` / `ADMIN_PASSWORD` — your admin login (created automatically on first run)

Then start the server:

```bash
npm start
```

The API runs at `http://localhost:4000`. A SQLite file `moviez.db` is created
automatically — no separate database server needed.

## 2. Frontend & admin dashboard

These are plain static HTML files, no build step required. The easiest way to
run them locally:

```bash
# from the frontend/ folder
npx serve .
# or just open index.html directly in a browser
```

Do the same for the `admin/` folder to reach the dashboard
(`admin/dashboard.html`). Log in on the frontend `login.html` with your admin
email/password — it will redirect you straight to the dashboard.

If you deploy the backend somewhere other than `localhost:4000`, update the
`API_BASE` value in `frontend/js/config.js` and the hard-coded
`http://localhost:4000` references in the HTML files.

## Security features already built in

- Passwords hashed with bcrypt (never stored in plain text)
- Rate limiting on login/register to slow down brute-force attempts
- Account lockout for 15 minutes after 5 failed login attempts
- JWT-based sessions
- Movie video files are **never** publicly accessible — only reachable through
  a signed link that expires (15 minutes by default) and only after a
  completed purchase is confirmed in the database
- Admin-only routes protected by role check, not just by hiding the button

## Connecting real payments

Right now, `backend/routes/purchase.js` marks a purchase as `completed`
immediately (a placeholder so you can test the full flow without a merchant
account). To go live, replace that section with a real call to your payment
provider (M-Pesa, Tigo Pesa, Airtel Money, or Stripe) and only mark the
purchase complete once their API confirms the payment succeeded. Each
provider requires its own merchant/API setup outside of this codebase.

## Next steps you may want

- Deploy backend to a host with persistent storage (Render, Railway, a VPS) —
  video files can get large, so plan storage accordingly (S3 works well for
  this instead of local disk)
- Add HTTPS in production (required — right now this assumes local dev)
- Swap SQLite for PostgreSQL if you expect heavy concurrent traffic
- Add email verification on signup
