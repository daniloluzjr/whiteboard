const express = require('express');
const path = require('path');
const cors = require('cors');
const mysql = require('mysql2/promise');

require('dotenv').config();

const app = express();
const port = process.env.PORT || 3001;

// CORS Configuration
// Allow all origins for now to support Vercel/Localhost easy testing.
// In production, you might want to restrict this to 'https://ourwhiteboard.vercel.app'
app.use(cors());

app.use(express.json());

// Database Connection Pool
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    ssl: {
        minVersion: 'TLSv1.2',
        rejectUnauthorized: true
    }
});

// Check DB Connection on Start
pool.getConnection()
    .then(connection => {
        console.log('Successfully connected to the database.');
        connection.release();
    })
    .catch(err => {
        console.error('Error connecting to the database:', err);
    });

// API Routes

// GET /api/groups - Fetch all groups and their tasks
app.get('/api/groups', async (req, res) => {
    try {
        const [groups] = await pool.query('SELECT * FROM task_groups ORDER BY created_at');
        const [tasks] = await pool.query('SELECT * FROM tasks ORDER BY created_at');

        // Organize tasks into their groups
        const groupsWithTasks = groups.map(group => {
            return {
                ...group,
                tasks: tasks.filter(task => task.group_id === group.id)
            };
        });

        res.json(groupsWithTasks);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch data' });
    }
});

// POST /api/groups - Create a new group
app.post('/api/groups', async (req, res) => {
    const { name, color } = req.body;
    try {
        const [result] = await pool.query('INSERT INTO task_groups (name, color) VALUES (?, ?)', [name, color]);
        const newGroup = { id: result.insertId, name, color, tasks: [] };
        res.status(201).json(newGroup);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to create group' });
    }
});

// DELETE /api/groups/:id - Delete a group
app.delete('/api/groups/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM task_groups WHERE id = ?', [id]);
        res.json({ message: 'Group deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to delete group' });
    }
});

// PATCH /api/groups/:id - Rename a group
app.patch('/api/groups/:id', async (req, res) => {
    const { id } = req.params;
    const { name } = req.body;
    try {
        await pool.query('UPDATE task_groups SET name = ? WHERE id = ?', [name, id]);
        res.json({ message: 'Group updated successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to update group' });
    }
});

// POST /api/tasks - Create a new task
app.post('/api/tasks', async (req, res) => {
    const { group_id, title, description, priority, status } = req.body;
    try {
        const [result] = await pool.query(
            'INSERT INTO tasks (group_id, title, description, priority, status) VALUES (?, ?, ?, ?, ?)',
            [group_id, title, description, priority, status || 'todo']
        );
        const newTask = {
            id: result.insertId,
            group_id,
            title,
            description,
            priority,
            status: status || 'todo',
            created_at: new Date()
        };
        res.status(201).json(newTask);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to create task' });
    }
});

// PATCH /api/tasks/:id - Update task (status, completion_at, etc.)
app.patch('/api/tasks/:id', async (req, res) => {
    const { id } = req.params;
    const { status, completed_at, title, description, priority, group_id } = req.body;

    // Construct dynamic query
    let fields = [];
    let values = [];

    if (status !== undefined) { fields.push('status = ?'); values.push(status); }
    if (completed_at !== undefined) { fields.push('completed_at = ?'); values.push(completed_at); }
    if (title !== undefined) { fields.push('title = ?'); values.push(title); }
    if (description !== undefined) { fields.push('description = ?'); values.push(description); }
    if (priority !== undefined) { fields.push('priority = ?'); values.push(priority); }
    if (group_id !== undefined) { fields.push('group_id = ?'); values.push(group_id); }

    if (fields.length === 0) return res.status(400).json({ error: 'No fields to update' });

    values.push(id);
    const query = `UPDATE tasks SET ${fields.join(', ')} WHERE id = ?`;

    try {
        await pool.query(query, values);
        res.json({ message: 'Task updated successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to update task' });
    }
});

// DELETE /api/tasks/:id - Delete a task
app.delete('/api/tasks/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM tasks WHERE id = ?', [id]);
        res.json({ message: 'Task deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to delete task' });
    }
});

// Serve static files (HTML, CSS, JS)
app.use(express.static(__dirname));

// Serve index.html for the root route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
