# Whiteboard Project 📝

**Live App:** [https://glasnevinoffice.online/](https://glasnevinoffice.online/)  
**GitHub Repository:** [https://github.com/daniloluzjr/whiteboard](https://github.com/daniloluzjr/whiteboard)  
**Hosting:** Heroku (Single Domain for Frontend + Backend)

This is a real-time, collaborative whiteboard application designed for team task management. It separates "To Do" and "Done" tasks into intuitive card groups, providing a visual overview of team activity, now featuring a modern **Glassmorphism** UI.

---

## 🚀 Deployment Architecture

This project uses a decoupled architecture for maximum stability and free-tier optimization.

### 1. Architecture (Monolith)
- **Host:** Heroku / Custom Domain (`glasnevinoffice.online`)
- **Structure:** Single Node.js application (`server.js`) that serves both the API and the static frontend files.
- **Frontend:** Static HTML/JS/CSS served from the root.
- **Backend:** Express API available at `/api`.
- **Database:** MySQL (Remote).

---

## ✨ Key Features

### User System
*   **Authentication:** Secure Login/Register with JWT tokens.
*   **Auto-Logout:** Robust session handling checks on page load and every minute. Enforces daily login refresh at 08:30 AM to ensure accurate daily tracking.
*   **Domain Lock:** Registration restricted to `@inicare.ie` emails.
*   **Real-Time Status:** Users can set their status (Available ⚡, Busy ⛔, Lunch 🍽️, etc.) visible to all colleagues in the sidebar.

### Task Management
*   **Auto-Refresh:** The board automatically updates every 5 seconds to ensure all users see the latest changes without manual refreshing.
*   **Smart Groups:**
    *   **Fixed Groups:** "Admitted to Hospital", "Returned from Hospital", "Supervisors", and "Sheets Needed" (Permanent).
    *   **Introduction Group:** Specialized group with "Carer Name" fields and chronological scheduling.
*   **Task Lifecycle:** Create -> To Do -> Done -> Delete.
*   **Safeguards:** Red "Permanent Action" warning modal appears before deletion.
*   **Admin Dashboard:** (`/admin.html`) to view/manage all data.

### 🎨 UI/UX Design (New!)
*   **Glassmorphism:** Global application of transparency (`rgba`) and blur filters (`backdrop-filter`) for a premium, modern feel.
*   **Smart Transparency:** Group cards use tinted transparent backgrounds (e.g., Blue Tint for Coordinators) to maintain the glass effect without losing color coding.
*   **Standardized Headers:** Date headers (e.g., "Monday 23/12") use a consistent, high-contrast semi-transparent white style across all groups for readability.
*   **Refined Shadows & Borders:** Subtle shadows and cleaner borders for a less cluttered interface.
*   **Mobile Responsiveness:** Sidebar scrolling enabled for small screens to ensure all menu items and the Logout button are always accessible. Optimized for mobile with a compact menu width (65%), smaller fonts, and scaled-down interactive elements (buttons/inputs) for a delicate, native-app feel.

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
    ```bash
    node server.js
    ```

4.  **Run Frontend:**
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
1.  Edit files.
2.  Commit and Push to GitHub.
3.  Deploy key triggers update to Heroku (or manual deploy via CLI/Dashboard).

### To Update Backend:
1.  Edit `server.js`.
2.  Commit and Push.
1.  Edit `server.js`.
2.  Commit and Push.
3.  Deploy to Heroku.

---

## 🚑 Troubleshooting

*   **White Screen / Loading Forever:**
    *   Check the browser console (F12).
    *   API might be sleeping. Wait 10s and refresh.
*   **"Session Expired" / Redirect to Login:**
    *   This is normal behavior if your token expires (approx 24h). Just log in again.
*   **Changes not appearing:**
    *   Clear browser cache or check if you are editing the correct file (local vs live).
