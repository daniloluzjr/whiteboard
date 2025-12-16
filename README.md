# Whiteboard Project 📝

**Live Frontend (GitHub Pages):** [https://daniloluzjr.github.io/whiteboard/](https://daniloluzjr.github.io/whiteboard/)  
**GitHub Repository:** [https://github.com/daniloluzjr/whiteboard](https://github.com/daniloluzjr/whiteboard)  
**Backend API (Railway):** `https://web-production-b230e.up.railway.app`

This is a real-time, collaborative whiteboard application designed for team task management. It separates "To Do" and "Done" tasks into intuitive card groups, providing a visual overview of team activity.

---

## 🚀 Deployment Architecture

This project uses a decoupled architecture for maximum stability and free-tier optimization.

### 1. Frontend (Static)
- **Host:** GitHub Pages
- **Reason:** Fastest updating, no cold starts, purely static HTML/JS/CSS.
- **Files:** `index.html` (Redirects to whiteboard), `whiteboard.html`, `login.html`, `admin.html`, `app.js`, `app.css`.
- **Logic:** `app.js` makes `fetch()` calls to the backend API.

### 2. Backend (API)
- **Host:** Railway (App Service)
- **Runtime:** Node.js (Express)
- **Address:** `https://web-production-b230e.up.railway.app`
- **Logic:** `server.js` handles all business logic, authentication (JWT), and database queries.
- **Auto-Sleep:** Note that free tiers may spin down. First request might take 3-5 seconds.

### 3. Database
- **Host:** Railway (MySQL Service)
- **Type:** MySQL 8.0
- **Structure:**
    - `users`: Stores emails, hashed passwords (`bcrypt`), and current status.
    - `task_groups`: Defines the columns/cards (e.g., Coordinators, Supervisors).
    - `tasks`: Individual items linked to groups and creators.

---

## ✨ Key Features

### User System
*   **Authentication:** Secure Login/Register with JWT tokens.
*   **Domain Lock:** Registration restricted to `@inicare.ie` emails.
*   **Sessions:** 'Remember Me' uses `localStorage`, otherwise `sessionStorage`.
*   **Real-Time Status:** Users can set their status (Available ⚡, Busy ⛔, Lunch 🍽️, etc.) visible to all colleagues in the sidebar.

### Task Management
*   **Card Groups:** Dynamic grouping of tasks.
    *   **Fixed Groups:** "Coordinators" and "Supervisors" are permanent (cannot be deleted).
    *   **Dynamic Groups:** Users can create custom groups for temporary projects.
*   **Task Lifecycle:** Create -> To Do -> Done -> Delete.
*   **Smart Deletion:**
    *   **Any User** can delete any task (for flexibility).
    *   **Safeguard:** A red "Permanent Action" warning modal appears before deletion.
*   **Admin Dashboard:** (`/admin.html`)
    *   View all registered users and tasks in a table format.
    *   Force-delete users or tasks.
    *   Resolve IDs to real Names for auditing.

---

## 🛠️ Development Guide

### Prerequisites
*   Node.js (v18+)
*   Git

### Setup (Localhost)

1.  **Clone the Repo:**
    ```bash
    git clone https://github.com/daniloluzjr/whiteboard.git
    cd whiteboard
    ```

2.  **Install Dependencies:**
    ```bash
    npm install
    ```

3.  **Run Backend:**
    The backend connects to the live Railway DB by default (if env vars are set) or you can set up a local DB.
    ```bash
    node server.js
    ```

4.  **Run Frontend:**
    You can simply open `index.html` or `login.html` in your browser, or use a live server:
    ```bash
    npx serve .
    ```

### 🔐 Environment Variables (Backend)
These are configured in the Railway dashboard. Do not commit `.env` files containing real passwords.

```env
PORT=3000
DB_HOST=railway-tcp-proxy...
DB_USER=root
DB_PASSWORD=...
DB_NAME=railway
JWT_SECRET=...
```

---

## 🔄 Updates & Deployment

### To Update Frontend:
1.  Edit `app.js`, `app.css`, or `.html` files.
2.  Commit and Push to GitHub.
3.  GitHub Pages updates automatically (wait ~1-2 mins).
    *   *Tip: Cache can be sticky. Use `Ctrl+F5` to force refresh.*

### To Update Backend:
1.  Edit `server.js`.
2.  Commit and Push.
3.  Railway detects the commit and redeploys the server automatically.

---

## 🚑 Troubleshooting

*   **White Screen / Loading Forever:**
    *   Check the browser console (F12).
    *   API might be sleeping. Wait 10s and refresh.
*   **"Failed to create task":**
    *   Check if you are logged in (Session expired?). Re-login.
*   **Changes not appearing:**
    *   Clear browser cache or check if you are editing the correct file (local vs live).
