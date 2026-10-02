# University Connect: Frontend (nacoskdu)

React + Vite + Tailwind web app for the University Connect learning management system (NACOS Connect '26). It provides the student, teacher and admin dashboards.

- Runs on: http://localhost:8080
- Backend: lives in a separate repo/folder (`University Connect`). See its own README. Both must be running at the same time, each in its own terminal.

Commands below are for **Windows PowerShell** in **VS Code**, run from the `nacoskdu` folder (the one that contains `package.json`).

---

## Prerequisites

- **Node.js (LTS)** from https://nodejs.org. This also installs `npm`.
- **VS Code**.
- The **backend running** (see the backend README), otherwise the app loads but nothing works.

## 1. Install Node.js

Download the LTS version from https://nodejs.org and install it. Then **close and reopen VS Code** and check:

```powershell
node -v
npm -v
```

Both should print a version number.

## 2. Open the project

In VS Code: **File > Open Folder** and choose `nacoskdu`. Open a terminal with **Ctrl + `** (backtick). If you are not already in the folder:

```powershell
cd path\to\nacoskdu
```

## 3. Install the packages

```powershell
npm install
```

This creates the `node_modules` folder. You only need to do this once, and again whenever `package.json` changes.

## 4. Point the frontend at the backend

Locally you do nothing: `src/components/api/api.tsx` defaults to `http://localhost:8000`. In production the address comes from the `VITE_API_URL` variable (see "Deploying" below), so you never edit this file.

## 5. Run the frontend

```powershell
npm run dev
```

Open the address it prints, normally **http://localhost:8080**. Stop it with **Ctrl + C**.

Other commands: `npm run build` (production build), `npm run lint` (check code).

## 6. Log in

Log in with the `ADMIN_USERNAME` and `ADMIN_PASSWORD` from the backend's `.env`. Teacher and admin accounts are created from the admin dashboard. Students sign up on the signup page.

---

# Deploying

Login uses cookies, so the browser must see the frontend and the API as **one site**. Otherwise Safari on iPhone blocks the login. The setup below does that: the frontend host forwards `/api/*` to the backend.

1. Deploy the backend first (see its README) and note its public address.
2. In `vercel.json`, replace `YOUR-RAILWAY-APP.up.railway.app` with that address (no `https://` change needed, keep the rest as is):
   ```json
   { "source": "/api/:path*", "destination": "https://YOUR-RAILWAY-APP.up.railway.app/:path*" }
   ```
3. In Vercel > Project > Settings > Environment Variables, add:
   ```
   VITE_API_URL=/api
   ```
4. On the backend host, set `ALLOWED_ORIGINS` to the frontend's address and `API_PATH_PREFIX=/api` (see the backend README).
5. Run `npm run build` to check it builds, then deploy. Environment variables only apply to a new deploy, so redeploy after adding `VITE_API_URL`.

On another host than Vercel, do the same with its own forwarding rule (for example a Netlify redirect with status 200, or an nginx `proxy_pass`).

Local development needs none of this.

---

# Troubleshooting

| Problem | Fix |
| --- | --- |
| `npm` is not recognized | Install Node.js, then close and reopen VS Code. |
| Browser shows a CORS or "Failed to fetch" error | Check the backend is running and the API address is correct (local default `http://localhost:8000`, production `VITE_API_URL=/api`). The backend allows the frontend on ports 8080, 5173 and 4173 locally, and any address listed in its `ALLOWED_ORIGINS` variable. Open the app as `localhost`, not `127.0.0.1`. |
| Pages load but logging in fails | The API address is wrong, or the backend is not running. Open `http://localhost:8000/docs` in the browser to check the backend. |
| Cannot log in as admin | Use the lowercase `ADMIN_USERNAME` from the backend's `.env`. After 10 failed attempts in a minute for the same username, wait a minute. |
| Changes to `package.json` are not picked up | Run `npm install` again. |
| Logged in but sent back to the login page, only on a deployed site | The browser sees two different sites, so cookies are blocked. Check the `/api` rewrite in `vercel.json`, `VITE_API_URL=/api` and the backend's `API_PATH_PREFIX=/api`. |
| Port 8080 already in use | Another copy is running. Stop it with Ctrl + C. |
| Weird errors after switching branches or updating packages | Delete the `node_modules` folder and run `npm install` again. |

---

# Project structure

```
nacoskdu/
├── src/
│   ├── App.tsx              routes
│   ├── pages/               student / teacher / admin pages
│   └── components/          DashboardLayout, ProtectedRoute, api/api.tsx, ...
├── public/                  static files
├── package.json
└── vite.config.ts           dev server (port 8080)
```