# Whiteboard Project

**Live Demo:** [https://bit.ly/glasnevinoffice](https://bit.ly/glasnevinoffice)  
**Source Code:** [https://github.com/daniloluzjr/whiteboard](https://github.com/daniloluzjr/whiteboard)

This is a real-time, collaborative whiteboard application designed for team task management.

## Features

- **Dynamic Task Panels:** Create and manage separate task boards for different teams or projects.
- **Task Management:** Add, view, and complete tasks within each panel.
- **Visual Grouping:** Panels are color-coded in pairs (To-Do and Done) for easy identification.
- **User Status System (New!):** Real-time status indicators (Available ⚡, Busy ⛔, Meeting 📅, On Call 📞, Away 🚗💨, On Break 🍽️, On Holiday 🏖️).
- **User Authentication:** Secure login and registration with `@inicare.ie` domain enforcement.

## Tech Stack

- **Frontend:** HTML, CSS, JavaScript (no frameworks)
- **Backend:** Node.js, Express.js
- **Database:** MySQL

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (which includes npm)
- A running MySQL server

### Installation & Setup

1.  **Clone the repository:**
    ```bash
    git clone <your-repository-url>
    cd todoweb
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Set up environment variables:**

    Create a file named `.env` in the root of the project by copying the example file:

    ```bash
    # On Windows (Command Prompt)
    copy .env.example .env

    # On macOS/Linux
    cp .env.example .env
    ```

    Now, open the `.env` file and replace the placeholder values with your actual MySQL database credentials.

    ```
    DB_HOST=localhost
    DB_USER=your_mysql_user
    DB_PASSWORD=your_mysql_password
    DB_NAME=todoweb_db
    ```

4.  **Set up the database:**

    Connect to your MySQL server and run the following command to create the database:

    ```sql
    CREATE DATABASE IF NOT EXISTS todoweb_db;
    ```

5.  **Run the application:**

    You will need two terminals for this project:

    -   **Terminal 1: Start the Frontend**
        This project uses `serve` to run the frontend. If you don't have it, install it globally:
        ```bash
        npm install -g serve
        ```
        Then, start the frontend server:
        ```bash
        serve
        ```
        Your frontend will be available at `http://localhost:3000` (or another port if 3000 is busy).

    -   **Terminal 2: Start the Backend**
        ```bash
        node server.js
        ```
        Your backend will be running on `http://localhost:3000`.

> **Note:** The default port for both `serve` and our backend is `3000`. You will likely need to configure one of them to run on a different port to avoid conflicts. For example, you can run the frontend on port 5000 with `serve -l 5000`.

## Deployment

### Backend (Render)
1.  Create a new **Web Service** on [Render](https://render.com/).
2.  Connect your GitHub repository.
3.  Select **Node** as the runtime.
4.  Add the following **Environment Variables** (Advanced section):
    -   `DB_HOST`: Your MySQL Host
    -   `DB_USER`: Your MySQL User
    -   `DB_PASSWORD`: Your MySQL Password
    -   `DB_NAME`: Your MySQL Database Name
5.  Render will automatically install dependencies (`npm install`) and start the server (`node server.js`).

### Frontend (Vercel)
### Database Config (Reference)
**Use these values in your Render Environment Variables or local .env file:**

-   **DB_HOST**: `gateway01.eu-central-1.prod.aws.tidbcloud.com`
-   **DB_USER**: `2xJL2J6QqbSD35.root`
-   **DB_PASSWORD**: `b0OwomktiieiPVt`
-   **DB_NAME**: `test` (or your chosen name)
-   **PORT**: `4000` (TiDB Port)

> **IMPORTANT**: Delete this password from the README after configuring Render to keep your project secure!
