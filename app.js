// Last Updated: Just Now (Cache Fix 03)
document.addEventListener('DOMContentLoaded', () => {
    // --- Configuration ---
    // Update this URL if your backend is hosted elsewhere
    const API_URL = 'https://web-production-b230e.up.railway.app/api';

    // --- PAGE ROUTER ---
    const isWhiteboard = document.querySelector('.tasks-grid');
    const isLoginPage = document.getElementById('login-form');

    // --- WHITEBOARD LOGIC ---
    if (isWhiteboard) {
        // --- State & DOM Elements (Whiteboard) ---
        const tasksGrid = document.querySelector('.tasks-grid');
        const dynamicCardColors = ['purple', 'orange', 'cyan', 'pink'];

        // Status User Logic
        // --- Status Logic ---
        const statusPopup = document.getElementById('status-popup');
        let currentDot = null;
        const userStatusList = document.getElementById('user-status-list');

        const statusIcons = {
            'free': '⚡',
            'busy': '⛔',
            'meeting': '📅',
            'on-call': '📞',
            'away': '🚗💨',
            'break': '🍽️',
            'holiday': '🏖️'
        };

        async function loadUsers() {
            const users = await fetchUsers();
            userStatusList.innerHTML = '';

            const currentUser = JSON.parse(localStorage.getItem('user'));

            users.forEach(user => {
                const li = document.createElement('li');
                // Use the registered name, or fallback to email prefix if missing
                let displayName = user.name || user.email.split('@')[0];
                // Ensure capitalization for the fallback
                if (!user.name) {
                    displayName = displayName.charAt(0).toUpperCase() + displayName.slice(1);
                }
                const isMe = currentUser && user.id === currentUser.id;

                li.innerHTML = `
                    <span class="status-dot status-${user.status || 'free'}"></span>
                    <span>${displayName} ${isMe ? '(You)' : ''} ${statusIcons[user.status] || ''}</span>
                `;

                if (isMe) {
                    li.style.cursor = 'pointer';
                    li.onclick = (e) => {
                        e.stopPropagation();
                        // Position popup near the click (Relative to the NAME text, not the full row)
                        const textSpan = li.querySelector('span:last-child');
                        const rect = textSpan.getBoundingClientRect();
                        statusPopup.style.top = `${rect.top}px`;
                        statusPopup.style.left = `${rect.right + 10}px`; // Add small gap
                        statusPopup.classList.remove('hidden');
                        currentDot = li.querySelector('.status-dot'); // Reference for local update
                    };
                }

                userStatusList.appendChild(li);
            });
        }

        // Popup Selection
        statusPopup.querySelectorAll('li').forEach(item => {
            item.addEventListener('click', async () => {
                const newStatus = item.dataset.status;

                // Optimistic UI Update
                if (currentDot) {
                    // Generic update: wipes old status class and adds new one
                    currentDot.className = `status-dot status-${newStatus}`;
                }
                statusPopup.classList.add('hidden');

                // API Call
                await updateUserStatusAPI(newStatus);
                loadUsers(); // Refresh list to confirm
            });
        });

        window.addEventListener('click', () => {
            if (!statusPopup.classList.contains('hidden')) {
                statusPopup.classList.add('hidden');
            }
        });

        // Modal Elements
        const customConfirmModal = document.getElementById('custom-confirm-modal');
        const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
        const cancelDeleteBtn = document.getElementById('cancel-delete-btn');
        const confirmModalText = document.getElementById('confirm-modal-text');
        let groupIdToDelete = null;

        const taskModal = document.getElementById('task-modal');
        const taskModalTitle = document.getElementById('task-modal-title');
        const taskTitleInput = document.getElementById('task-title-input');
        const taskTextInput = document.getElementById('task-text-input');
        const saveTaskBtn = document.getElementById('save-task-btn');
        const closeTaskModalBtn = document.getElementById('close-task-modal-btn');
        const completeTaskBtn = document.getElementById('complete-task-btn');
        const taskDates = document.getElementById('task-dates');
        const creationDateSpan = document.getElementById('creation-date');
        const completionDateSpan = document.getElementById('completion-date');

        const addStickerBtn = document.querySelector('.add-sticker-btn');
        const filterInput = document.getElementById('filter-input');

        let activeGroupId = null;
        let currentTaskData = null;

        // --- Initialization ---
        initializeBoard();

        // Auto-Refresh every 5 minutes (300,000 ms)
        setInterval(() => {
            console.log("Auto-refreshing tasks...");
            loadGroups();
            loadUsers(); // NEW: Refresh users
        }, 300000);

        async function initializeBoard() {
            await setupFixedGroups();
            loadGroups();
            loadUsers(); // NEW: Load users
        }

        async function setupFixedGroups() {
            // Ensure fixed groups exist in DB and update DOM with their real IDs
            const groups = await fetchGroups();

            const fixedDefs = [
                { name: 'Coordinators', selector: '[data-group="coordinators"]', color: 'yellow' },
                { name: 'Supervisors', selector: '[data-group="supervisors"]', color: 'green' }
            ];

            for (const def of fixedDefs) {
                let dbGroup = groups.find(g => g.name === def.name);

                // If not found, create them to avoid 500 errors.
                if (!dbGroup) {
                    console.log(`Creating missing fixed group: ${def.name}`);
                    dbGroup = await createGroupAPI(def.name, def.color);
                }

                if (dbGroup) {
                    // Update all cards that were hardcoded with the string ID
                    const cards = document.querySelectorAll(def.selector);
                    cards.forEach(card => {
                        card.dataset.group = dbGroup.id; // Set REAL NUMERIC ID
                        card.dataset.color = def.color;
                        card.classList.remove('hidden');
                    });
                }
            }
        }

        // --- API Interactions ---
        async function fetchGroups() {
            try {
                const response = await fetch(`${API_URL}/groups`);
                if (!response.ok) throw new Error('Failed to fetch groups');
                return await response.json();
            } catch (error) {
                console.error(error);
                return [];
            }
        }

        async function createGroupAPI(name, color) {
            try {
                const response = await fetch(`${API_URL}/groups`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, color })
                });
                if (!response.ok) throw new Error('Failed to create group');
                return await response.json();
            } catch (error) {
                console.error(error);
                return null;
            }
        }

        async function deleteGroupAPI(id) {
            try {
                await fetch(`${API_URL}/groups/${id}`, { method: 'DELETE' });
                return true;
            } catch (error) {
                console.error(error);
                return false;
            }
        }

        async function renameGroupAPI(id, newName) {
            try {
                await fetch(`${API_URL}/groups/${id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name: newName })
                });
            } catch (error) {
                console.error(error);
            }
        }

        async function createTaskAPI(task) {
            try {
                const response = await fetch(`${API_URL}/tasks`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(task)
                });
                if (!response.ok) throw new Error('Failed to create task');
                return await response.json();
            } catch (error) {
                console.error(error);
                return null;
            }
        }

        async function updateTaskAPI(id, updates) {
            try {
                await fetch(`${API_URL}/tasks/${id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(updates)
                });
                return true;
            } catch (error) {
                console.error(error);
                return false;
            }
        }

        async function deleteTaskAPI(taskId) {
            try {
                await fetch(`${API_URL}/tasks/${taskId}`, { method: 'DELETE' });
                return true;
            } catch (error) {
                console.error(error);
                return false;
            }
        }

        async function updateTaskStatusAPI(taskId, status, solution = null) {
            const body = { status };
            if (solution !== null) body.solution = solution;

            try {
                await fetch(`${API_URL}/tasks/${taskId}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body)
                });
                return true;
            } catch (error) {
                console.error(error);
                return false;
            }
        }

        async function fetchUsers() {
            try {
                const response = await fetch(`${API_URL}/users`);
                if (!response.ok) return [];
                return await response.json();
            } catch (error) {
                console.error(error);
                return [];
            }
        }

        async function updateUserStatusAPI(status) {
            const token = localStorage.getItem('authToken');
            try {
                await fetch(`${API_URL}/users/status`, {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ status })
                });
                return true;
            } catch (error) {
                console.error(error);
                return false;
            }
        }

        // --- Rendering Logic ---
        async function loadGroups() {
            const groups = await fetchGroups();

            // Identify Fixed Group IDs
            const coordGroup = groups.find(g => g.name === 'Coordinators');
            const superGroup = groups.find(g => g.name === 'Supervisors');
            const fixedIds = [coordGroup?.id, superGroup?.id].filter(id => id);

            // 1. Clear tasks from FIXED cards
            document.querySelectorAll('.non-deletable ul').forEach(ul => ul.innerHTML = '');

            // 2. Remove DYNAMIC cards (those that are not in fixedIds)
            const dynamicCards = document.querySelectorAll('.task-card:not(.non-deletable)');
            dynamicCards.forEach(card => card.remove());

            // 3. Render Groups
            groups.forEach(group => {
                if (fixedIds.includes(group.id)) {
                    // It's a fixed group, just render its tasks into existing DOM
                    renderFixedGroupTasks(group);
                } else {
                    // It's a dynamic group, create full card
                    renderGroup(group);
                }
            });
        }

        function renderFixedGroupTasks(group) {
            // Find the DOM elements for this group (now using ID match)
            const todoCard = document.querySelector(`.task-card[data-group="${group.id}"][data-type="todo"]`);
            const doneCard = document.querySelector(`.task-card[data-group="${group.id}"][data-type="done"]`);

            if (todoCard && doneCard) {
                const todoList = todoCard.querySelector('ul');
                const doneList = doneCard.querySelector('ul');

                group.tasks.forEach(task => {
                    const taskEl = createTaskElement(task);
                    if (task.status === 'done') {
                        doneList.appendChild(taskEl);
                    } else {
                        todoList.appendChild(taskEl);
                    }
                });
            }
        }

        // --- Logout Logic ---
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                localStorage.removeItem('authToken');
                localStorage.removeItem('user');
                sessionStorage.removeItem('authToken');
                sessionStorage.removeItem('user');
                window.location.href = 'login.html';
            });
        }

        function renderGroup(group) {
            const todoCard = createCardElement(group, 'todo');
            const doneCard = createCardElement(group, 'done');
            tasksGrid.appendChild(todoCard);
            tasksGrid.appendChild(doneCard);

            const todoList = todoCard.querySelector('ul');
            const doneList = doneCard.querySelector('ul');

            group.tasks.forEach(task => {
                const taskEl = createTaskElement(task);
                if (task.status === 'done') {
                    doneList.appendChild(taskEl);
                } else {
                    todoList.appendChild(taskEl);
                }
            });
        }

        function createCardElement(group, type) {
            const div = document.createElement('div');
            div.className = 'task-card';
            div.dataset.group = group.id;
            div.dataset.type = type;
            div.dataset.color = group.color;

            const titlePrefix = type === 'todo' ? 'To Do' : 'Tasks done';
            const deleteBtnHTML = `<button class="delete-sticker-btn">&times;</button>`;
            const addTaskBtnHTML = type === 'todo' ? `<button class="add-task-item-btn">+</button>` : '';

            div.innerHTML = `
                ${deleteBtnHTML}
                <div class="card-header">
                    <h3>${titlePrefix} - ${group.name}</h3>
                    ${addTaskBtnHTML}
                </div>
                <ul></ul>
            `;
            return div;
        }

        function createTaskElement(task) {
            const li = document.createElement('li');
            li.dataset.id = task.id;
            li.dataset.text = task.description || '';
            li.dataset.creationDate = task.created_at;
            li.dataset.completionDate = task.completed_at || '';
            li.dataset.priority = task.priority;
            li.dataset.title = task.title;
            li.dataset.solution = task.solution || '';
            li.dataset.created_by = task.created_by || ''; // Store ownership info

            const creationDate = new Date(task.created_at).toLocaleDateString('pt-BR');
            const completionInfo = task.completed_at
                ? ` - <em>completed on ${new Date(task.completed_at).toLocaleDateString('en-US')}</em>`
                : ` - <em>added on ${creationDate}</em>`;

            li.innerHTML = `<span class="task-item-priority-dot ${task.priority}"></span><span>${task.title}${completionInfo}</span>`;
            return li;
        }



        window.addEventListener('click', () => {
            if (!statusPopup.classList.contains('hidden')) {
                statusPopup.classList.add('hidden');
            }
        });

        // --- Event Listeners (Global Grid) ---
        addStickerBtn.addEventListener('click', async () => {
            const timestamp = new Date().getTime().toString().slice(-4);
            const name = `Group ${timestamp}`;
            const color = dynamicCardColors[Math.floor(Math.random() * dynamicCardColors.length)];

            const newGroup = await createGroupAPI(name, color);
            if (newGroup) {
                renderGroup(newGroup);
            }
        });

        tasksGrid.addEventListener('click', (e) => {
            const target = e.target;

            if (target.classList.contains('delete-sticker-btn')) {
                const card = target.closest('.task-card');
                if (card) {
                    groupIdToDelete = card.dataset.group;
                    confirmModalText.textContent = 'Are you sure you want to delete this entire group and all its tasks?';
                    customConfirmModal.classList.remove('hidden');
                }
            }
            else if (target.classList.contains('add-task-item-btn')) {
                const card = target.closest('.task-card');
                if (card) {
                    activeGroupId = card.dataset.group;
                    showTaskModal('create');
                }
            }
            else if (target.closest('li')) {
                const li = target.closest('li');
                const card = li.closest('.task-card');

                currentTaskData = {
                    id: li.dataset.id,
                    title: li.querySelector('span:last-child').innerText.split(' - ')[0],
                    description: li.dataset.text,
                    created_at: li.dataset.creationDate,
                    completed_at: li.dataset.completionDate,
                    priority: li.dataset.priority,
                    status: card.dataset.type === 'done' ? 'done' : 'todo',
                    solution: li.dataset.solution,
                    created_by: li.dataset.created_by // Retrieve ownership info
                };

                showTaskModal('view');
            }
        });

        // --- Rename Logic ---
        tasksGrid.addEventListener('dblclick', (e) => {
            const target = e.target;
            if (target.tagName === 'H3') {
                const cardHeader = target.parentElement;
                const currentTitle = target.textContent;
                const prefix = currentTitle.startsWith('To Do') ? 'To Do - ' : 'Tasks done - ';
                const baseTitle = currentTitle.replace(prefix, '');

                const input = document.createElement('input');
                input.type = 'text';
                input.value = baseTitle;
                input.className = 'title-edit-input';

                cardHeader.replaceChild(input, target);
                input.focus();

                const saveTitle = async () => {
                    const newBaseTitle = input.value.trim();
                    const card = cardHeader.closest('.task-card');
                    const groupId = card.dataset.group;

                    if (newBaseTitle) {
                        const newH3 = document.createElement('h3');
                        newH3.textContent = prefix + newBaseTitle;
                        cardHeader.replaceChild(newH3, input);

                        const otherType = card.dataset.type === 'todo' ? 'done' : 'todo';
                        const otherCard = document.querySelector(`.task-card[data-group="${groupId}"][data-type="${otherType}"]`);
                        if (otherCard) {
                            const otherH3 = otherCard.querySelector('h3');
                            const otherPrefix = otherType === 'todo' ? 'To Do - ' : 'Tasks done - ';
                            otherH3.textContent = otherPrefix + newBaseTitle;
                        }

                        await renameGroupAPI(groupId, newBaseTitle);
                    } else {
                        const oldH3 = document.createElement('h3');
                        oldH3.textContent = currentTitle;
                        cardHeader.replaceChild(oldH3, input);
                    }
                };

                input.addEventListener('blur', saveTitle);
                input.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') saveTitle();
                });
            }
        });

        // --- Confirm Delete Modal ---
        confirmDeleteBtn.addEventListener('click', async () => {
            // Case 1: Deleting a Group
            if (groupIdToDelete) {
                const success = await deleteGroupAPI(groupIdToDelete);
                if (success) {
                    const cards = document.querySelectorAll(`.task-card[data-group="${groupIdToDelete}"]`);
                    cards.forEach(card => card.remove());
                }
                groupIdToDelete = null;
            }
            // Case 2: Deleting a Task (New)
            else if (window.pendingDeleteTaskId) {
                const success = await deleteTaskAPI(window.pendingDeleteTaskId); // Need to implement this
                if (success) {
                    loadGroups(); // Refresh to remove from UI
                    showNotification('Task deleted.', 'success');
                }
                window.pendingDeleteTaskId = null;
            }

            customConfirmModal.classList.add('hidden');
        });

        cancelDeleteBtn.addEventListener('click', () => {
            customConfirmModal.classList.add('hidden');
            groupIdToDelete = null;
            window.pendingDeleteTaskId = null;
        });

        // --- Task Modal ---
        function showTaskModal(mode) {
            taskModal.classList.remove('hidden');

            if (mode === 'create') {
                taskModalTitle.textContent = 'New Task';
                taskTitleInput.value = '';
                taskTextInput.value = '';
                taskTitleInput.readOnly = false;
                taskTextInput.readOnly = false;

                saveTaskBtn.classList.remove('hidden');
                completeTaskBtn.classList.add('hidden');
                taskDates.classList.add('hidden');
                // Hide solution in create mode
                document.getElementById('solution-label').classList.add('hidden');
                document.getElementById('task-solution-input').classList.add('hidden');
                document.getElementById('task-solution-input').value = '';
            } else if (mode === 'view') {
                taskModalTitle.textContent = 'Task Details';
                taskTitleInput.value = currentTaskData.title;
                taskTextInput.value = currentTaskData.description || '';
                taskTitleInput.readOnly = true;
                taskTextInput.readOnly = true;

                // Solution Field Logic
                const solutionInput = document.getElementById('task-solution-input');
                const solutionLabel = document.getElementById('solution-label');
                solutionInput.value = currentTaskData.solution || '';

                if (currentTaskData.status === 'done') {
                    // If done, show solution as read-only
                    saveTaskBtn.classList.add('hidden');
                    completeTaskBtn.classList.add('hidden');
                    solutionInput.readOnly = true;
                    solutionLabel.classList.remove('hidden');
                    solutionInput.classList.remove('hidden');
                } else {
                    // If todo, allow writing solution
                    saveTaskBtn.classList.add('hidden');
                    completeTaskBtn.classList.remove('hidden');
                    solutionInput.readOnly = false;
                    solutionLabel.classList.remove('hidden');
                    solutionInput.classList.remove('hidden');
                }

                taskDates.classList.remove('hidden');
                if (currentTaskData.created_at) {
                    creationDateSpan.textContent = new Date(currentTaskData.created_at).toLocaleString('pt-BR');
                }
                if (currentTaskData.completed_at) {
                    completionDateSpan.textContent = new Date(currentTaskData.completed_at).toLocaleString('pt-BR');
                } else {
                    completionDateSpan.textContent = 'Pending...';
                }

                if (currentTaskData.priority) {
                    const radio = document.querySelector(`input[name="priority"][value="${currentTaskData.priority}"]`);
                    if (radio) radio.checked = true;
                }
                document.querySelectorAll('input[name="priority"]').forEach(r => r.disabled = true);
            }
        }

        function hideTaskModal() {
            taskModal.classList.add('hidden');
            activeGroupId = null;
            currentTaskData = null;
            document.querySelectorAll('input[name="priority"]').forEach(r => r.disabled = false);
        }

        closeTaskModalBtn.addEventListener('click', hideTaskModal);

        saveTaskBtn.addEventListener('click', async () => {
            const title = taskTitleInput.value.trim();
            const text = taskTextInput.value.trim();
            const priority = document.querySelector('input[name="priority"]:checked').value;

            if (title && activeGroupId) {
                // --- Duplicate Check ---
                const groupCard = document.querySelector(`.task-card[data-group="${activeGroupId}"][data-type="todo"]`);
                if (groupCard) {
                    const existingLis = groupCard.querySelectorAll('li');
                    let isDuplicate = false;
                    existingLis.forEach(li => {
                        const existingTitle = li.dataset.title || li.querySelector('span:last-child').innerText.split(' - ')[0].trim();
                        if (existingTitle && existingTitle.toLowerCase() === title.toLowerCase()) {
                            isDuplicate = true;
                        }
                    });

                    if (isDuplicate) {
                        showNotification('Task with this name already exists in this group!', 'error');
                        return; // Stop creation
                    }
                }
                // -----------------------

                const newTask = await createTaskAPI({
                    group_id: activeGroupId,
                    title: title,
                    description: text,
                    priority: priority,
                    status: 'todo'
                });

                if (newTask) {
                    const todoCard = document.querySelector(`.task-card[data-group="${activeGroupId}"][data-type="todo"]`);
                    if (todoCard) {
                        const ul = todoCard.querySelector('ul');
                        ul.appendChild(createTaskElement(newTask));
                    }
                    hideTaskModal();
                }
            }
        });

        completeTaskBtn.addEventListener('click', async () => {
            if (currentTaskData && currentTaskData.id) {
                // MySQL Friendly Date Format: YYYY-MM-DD HH:MM:SS
                const now = new Date();
                const mysqlDate = now.toISOString().slice(0, 19).replace('T', ' ');

                const success = await updateTaskAPI(currentTaskData.id, {
                    status: 'done',
                    completed_at: mysqlDate
                });

                if (success) {
                    const oldLi = document.querySelector(`li[data-id="${currentTaskData.id}"]`);
                    if (oldLi) {
                        oldLi.dataset.completionDate = mysqlDate;
                        const titleSpan = oldLi.querySelector('span:last-child');
                        const title = titleSpan.innerText.split(' - ')[0]; // Basic parse
                        const dateStr = now.toLocaleDateString('en-US');
                        titleSpan.innerHTML = `${title} - <em>completed on ${dateStr}</em>`;

                        const card = oldLi.closest('.task-card');
                        if (card) {
                            const groupId = card.dataset.group;
                            const doneCard = document.querySelector(`.task-card[data-group="${groupId}"][data-type="done"]`);
                            if (doneCard) {
                                doneCard.querySelector('ul').appendChild(oldLi);
                            }
                        }
                    }
                    hideTaskModal();
                    showNotification('Task marked as done!', 'success');
                } else {
                    showNotification('Failed to update task status.', 'error');
                }
            }
        });

        filterInput.addEventListener('input', () => {
            const filterText = filterInput.value.toLowerCase().trim();
            const allCards = document.querySelectorAll('.task-card');
            const groupsToShow = new Set();

            allCards.forEach(card => {
                const title = card.querySelector('h3').textContent.toLowerCase();
                if (title.includes(filterText)) {
                    groupsToShow.add(card.dataset.group);
                }
            });

            allCards.forEach(card => {
                if (groupsToShow.has(card.dataset.group)) {
                    card.style.display = '';
                } else {
                    card.style.display = 'none';
                }
            });
        });
    }

    // --- HELPERS ---
    function showNotification(message, type = 'success') {
        const container = document.getElementById('notification-container');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `notification-toast ${type}`;
        toast.innerHTML = `
            <span>${message}</span>
            <button onclick="this.parentElement.remove()" style="background:none;border:none;color:inherit;cursor:pointer;font-size:1.2rem;">&times;</button>
        `;

        container.appendChild(toast);

        // Auto remove after 3s (animation handles visual ease out)
        setTimeout(() => {
            if (toast.parentElement) toast.remove();
        }, 3000);
    }

    // --- LOGIN LOGIC ---
    if (isLoginPage) {
        // Auto-Redirect if already logged in
        const existingToken = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
        if (existingToken) {
            window.location.href = 'whiteboard.html';
        }

        const loginContainer = document.getElementById('login-container');
        const registerContainer = document.getElementById('register-container');
        const showRegisterLink = document.getElementById('show-register');
        const showLoginLink = document.getElementById('show-login');
        const loginForm = document.getElementById('login-form');
        const registerForm = document.getElementById('register-form');

        // --- Auto-Fill Email ---
        const savedEmail = localStorage.getItem('savedEmail');
        if (savedEmail) {
            document.getElementById('login-email').value = savedEmail;
            document.getElementById('remember-me').checked = true;
        }
        // -----------------------

        // Toggle Forms
        showRegisterLink.addEventListener('click', (e) => {
            e.preventDefault();
            loginContainer.classList.add('hidden');
            registerContainer.classList.remove('hidden');
        });
        showLoginLink.addEventListener('click', (e) => {
            e.preventDefault();
            registerContainer.classList.add('hidden');
            loginContainer.classList.remove('hidden');
        });

        // Register Logic
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = registerForm.querySelector('button');
            const originalText = btn.innerText;
            btn.innerText = "Loading...";
            btn.disabled = true;

            const name = document.getElementById('register-name').value;
            const email = document.getElementById('register-email').value;
            const password = document.getElementById('register-password').value;
            const confirmPassword = document.getElementById('register-confirm-password').value;

            if (password !== confirmPassword) {
                showNotification("Passwords do not match!", 'error');
                btn.innerText = originalText;
                btn.disabled = false;
                return;
            }

            try {
                const response = await fetch(`${API_URL}/register`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, email, password })
                });
                const data = await response.json();

                if (response.ok) {
                    showNotification('Registration successful! Please login.', 'success');
                    setTimeout(() => showLoginLink.click(), 1500);
                } else {
                    showNotification(data.error || 'Registration failed', 'error');
                }
            } catch (error) {
                console.error("Fetch error:", error);
                showNotification('Error connecting to server.', 'error');
            } finally {
                btn.innerText = originalText;
                btn.disabled = false;
            }
        });

        // Login Logic
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = loginForm.querySelector('button');
            const originalText = btn.innerText;
            btn.innerText = "Loading...";
            btn.disabled = true;

            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-password').value;
            const rememberMe = document.getElementById('remember-me').checked;

            try {
                const response = await fetch(`${API_URL}/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });
                const data = await response.json();

                if (response.ok) {
                    showNotification('Login successful! Redirecting...', 'success');

                    // --- Storage Logic ---
                    if (rememberMe) {
                        // Persist session + email
                        localStorage.setItem('authToken', data.token);
                        localStorage.setItem('user', JSON.stringify(data.user));
                        localStorage.setItem('savedEmail', email); // Save email for next time
                    } else {
                        // Session only + clear saved email
                        sessionStorage.setItem('authToken', data.token);
                        sessionStorage.setItem('user', JSON.stringify(data.user));
                        localStorage.removeItem('savedEmail'); // Clear if they unchecked it
                    }

                    setTimeout(() => {
                        window.location.href = 'whiteboard.html';
                    }, 1000);
                } else {
                    showNotification(data.error || 'Login failed', 'error');
                }
            } catch (error) {
                console.error("Fetch error:", error);
                showNotification('Error connecting to server.', 'error');
            } finally {
                btn.innerText = originalText;
                btn.disabled = false;
            }
        });
    }

});
