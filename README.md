# SARVESHTWR.IN — Student Learning Portal (Version 2)

A responsive learning portal rebuilt around the requirements discussed:
- HTML, CSS, JavaScript and Tailwind CSS frontend
- GitHub for source control and static frontend hosting
- Node.js + Express backend API
- MongoDB Atlas database for chapter text/content
- Admin login to create, edit and delete chapters
- Students can read chapters without signing in
- Rich-text editor: headings, bold, italic, lists, links, images, tables and quotes
- Normal chapter view + distraction-free reading mode
- Responsive layouts for phones, tablets, laptops, desktops and large classroom displays / smart boards

## Project folders
- `frontend/` — static website (publish this folder's contents with GitHub Pages)
- `backend/` — API server (deploy to a Node.js host such as Render)
- `backend/.env.example` — environment variable template

## A. Run locally in VS Code

### 1. Requirements
Install:
- VS Code
- Node.js 18 or newer
- VS Code extension: Live Server

### 2. Configure MongoDB Atlas
1. Create a free MongoDB Atlas account and an M0 free cluster (if available in your region).
2. Create a database user with a strong password.
3. In Network Access, allow your development IP address. For a hosted API, allow the API host's outbound IP if known. `0.0.0.0/0` is convenient for some free dynamic hosts but exposes the database login endpoint to the internet; use a strong unique database password and least-privilege database user, and tighten the rule if the provider supports stable egress IPs.
4. Copy the connection string. Replace the username, password and cluster placeholder.

### 3. Configure backend
1. Open a terminal in VS Code.
2. Run:
   ```bash
   cd backend
   npm install
   ```
3. Copy `.env.example` to `.env`.
4. Edit `backend/.env`:
   - `MONGODB_URI` = your Atlas connection string
   - `JWT_SECRET` = long random secret (at least 32 characters)
   - `ADMIN_EMAIL` and `ADMIN_PASSWORD` = your own admin credentials; use a unique password of at least 12 characters
   - `CLIENT_ORIGINS` = `http://127.0.0.1:5500,http://localhost:5500`
5. Create the admin account:
   ```bash
   npm run create-admin
   ```
6. Start the API:
   ```bash
   npm run dev
   ```
   Health check: `http://localhost:5000/api/health`

### 4. Run frontend
1. Open the `frontend` folder in VS Code.
2. Edit `frontend/js/config.js`. For local work keep:
   ```js
   API_BASE_URL: "http://localhost:5000"
   ```
3. Right-click `frontend/index.html` → **Open with Live Server**.
4. Open `frontend/admin.html` to sign in and create chapters.
5. Students use `frontend/index.html`; no login is required.

## B. Publish online

GitHub Pages serves the frontend only. It does not run Node.js or MongoDB. The backend API must be deployed separately.

### 1. Deploy backend API
Deploy the `backend` folder as a Node.js web service on a provider that supports Node.js (for example Render; check current free-plan availability and sleep/usage limits).
- Build command: `npm install`
- Start command: `npm start`
- Set environment variables in the host dashboard:
  - `MONGODB_URI`
  - `JWT_SECRET`
  - `ADMIN_EMAIL`
  - `ADMIN_PASSWORD`
  - `CLIENT_ORIGINS=https://sarveshtwr.in,https://www.sarveshtwr.in`
- If the host deploys from a monorepo, set its Root Directory to `backend`.
- Once deployed, test `https://YOUR-API-HOST/api/health`.

### 2. Point frontend to API
Edit `frontend/js/config.js`:
```js
window.PORTAL_CONFIG = {
  API_BASE_URL: "https://YOUR-API-HOST"
};
```
Commit and push this change to GitHub.

### 3. Publish frontend with GitHub Pages
1. Create a GitHub repository and upload the contents of `frontend/` to the repository root (or configure Pages to publish the `frontend` folder if your repo settings support it).
2. Repository → Settings → Pages.
3. Choose deploy from branch `main`, folder `/ (root)`, then Save.
4. Confirm the GitHub Pages URL works before connecting your custom domain.

### 4. Connect GoDaddy domain `sarveshtwr.in`
In GitHub repository Settings → Pages → Custom domain, enter `sarveshtwr.in`.
Then in GoDaddy DNS management add the DNS records currently recommended by GitHub Pages. Typical apex records are:
- A `@` → `185.199.108.153`
- A `@` → `185.199.109.153`
- A `@` → `185.199.110.153`
- A `@` → `185.199.111.153`
And CNAME:
- CNAME `www` → `YOUR-GITHUB-USERNAME.github.io`
Do not put a repository path in the CNAME target. Remove conflicting old records only after checking whether they are used for email or other services. Keep MX/TXT records used by email. DNS can take time to update. Enable HTTPS in GitHub Pages when available.

## C. Add images to chapter notes
The editor has an **Image URL** button. For images you own or are licensed to use:
1. Put image files in `frontend/assets/` (for example `python-flowchart.webp`).
2. Commit/push them with the website.
3. In the chapter editor, use Image URL and enter `assets/python-flowchart.webp`.
You can also use direct HTTPS image URLs from an image host you control. Do not use private, copyrighted or hotlinked images without permission. Compress images and prefer WebP for faster loading. Images inserted in chapter HTML are sanitized on the backend.

## D. Important cost and service notes
- GitHub Pages has usage/size limits and is static hosting only.
- MongoDB Atlas M0 is a limited free tier when available; storage, backup, throughput and region availability limits apply and can change.
- Node.js hosting free plans (if offered) may sleep, throttle, or change terms. A reliable always-on backend may eventually require a paid plan.
- Domain renewal at GoDaddy remains a recurring cost.
- This architecture can start with low/no monthly service cost within free-plan limits, but zero cost and uninterrupted availability cannot be guaranteed.
- This starter stores chapter text and HTML in MongoDB. It does not upload PDFs.
- The admin login uses an 8-hour JWT in sessionStorage. Protect admin credentials, do not share the admin account, and use HTTPS in production.
- Before public launch, test the admin flow and ask for a security review if you plan to store sensitive information. Do not store student personal data in this starter.

## E. If something does not work
- `Failed to fetch`: confirm backend is running and API URL is correct.
- CORS error: add the exact frontend origin (including `https://` and `www` if used) to `CLIENT_ORIGINS`, then redeploy backend.
- MongoDB connection error: check Atlas database user, password URL-encoding, network access and URI.
- Admin login error: run `npm run create-admin` with correct `.env` values.
- Page says backend not connected: test `/api/health` and check `frontend/js/config.js`.
