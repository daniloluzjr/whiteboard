document.addEventListener('DOMContentLoaded', () => {
    // --- Configuration ---
    // Update this URL if your backend is hosted elsewhere
    const API_URL = 'https://ourwhiteboard.onrender.com/api';

    // --- State & DOM Elements ---
    const tasksGrid = document.querySelector('.tasks-grid');
    const dynamicCardColors = ['purple', 'orange', 'cyan', 'pink'];

    // Status User Logic (kept from original)
    const statusDots = document.querySelectorAll('.status-dot');
    const statusPopup = document.getElementById('status-popup');
    let currentDot = null;

    // Modal Elements
    const customConfirmModal = document.getElementById('custom-confirm-modal');
    const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
    const cancelDeleteBtn = document.getElementById('cancel-delete-btn');
    const confirmModalText = document.getElementById('confirm-modal-text');
    let groupIdToDelete = null; // Changed from element reference to ID

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

    let activeGroupId = null; // ID of the group we are adding a task to
    let currentTaskData = null; // Data of the task currently being viewed/completed

    // --- Initialization ---
    loadGroups();

    // --- API Interactions ---

    async function fetchGroups() {
        try {
            const response = await fetch(`${API_URL}/groups`);
            if (!response.ok) throw new Error('Failed to fetch groups');
            return await response.json();
        } catch (error) {
            console.error(error);
            return []; // Return empty on error to avoid crash
            // Ideally show a toast/notification here
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

    // --- Rendering Logic ---

    async function loadGroups() {
        tasksGrid.innerHTML = ''; // Clear existing
        const groups = await fetchGroups();
        groups.forEach(group => renderGroup(group));
    }

    function renderGroup(group) {
        // Render To-Do Card
        const todoCard = createCardElement(group, 'todo');
        // Render Done Card
        const doneCard = createCardElement(group, 'done');

        tasksGrid.appendChild(todoCard);
        tasksGrid.appendChild(doneCard);

        // Populate Tasks
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
        div.dataset.group = group.id; // Use DB ID
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
            <ul><!-- Tasks go here --></ul>
        `;
        return div;
    }

    function createTaskElement(task) {
        const li = document.createElement('li');
        li.dataset.id = task.id; // Store DB ID
        li.dataset.text = task.description || '';
        li.dataset.creationDate = task.created_at;
        li.dataset.completionDate = task.completed_at || '';
        li.dataset.priority = task.priority;

        const creationDate = new Date(task.created_at).toLocaleDateString('pt-BR');
        const completionInfo = task.completed_at
            ? ` - <em>completed on ${new Date(task.completed_at).toLocaleDateString('en-US')}</em>`
            : ` - <em>added on ${creationDate}</em>`;

        li.innerHTML = `<span class="task-item-priority-dot ${task.priority}"></span><span>${task.title}${completionInfo}</span>`;
        return li;
    }

    // --- Event Listeners (User Status) ---
    // (Kept identical to original)
    statusDots.forEach(dot => {
        dot.addEventListener('click', (e) => {
            e.stopPropagation();
            currentDot = e.target;
            const rect = currentDot.getBoundingClientRect();
            statusPopup.style.left = `${rect.right + 10}px`;
            statusPopup.style.top = `${rect.top}px`;
            statusPopup.classList.remove('hidden');
        });
    });

    statusPopup.querySelectorAll('li').forEach(item => {
        item.addEventListener('click', () => {
            if (currentDot) {
                const newStatus = item.dataset.status;
                currentDot.classList.remove('status-free', 'status-busy', 'status-meeting', 'status-on-call', 'status-away');
                currentDot.classList.add(`status-${newStatus}`);
                statusPopup.classList.add('hidden');
            }
        });
    });

    window.addEventListener('click', () => {
        if (!statusPopup.classList.contains('hidden')) {
            statusPopup.classList.add('hidden');
        }
    });

    // --- Event Listeners (Global Grid) ---

    addStickerBtn.addEventListener('click', async () => {
        // Determine name and color (simplified logic for now)
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

        // Delete Logic
        if (target.classList.contains('delete-sticker-btn')) {
            const card = target.closest('.task-card');
            if (card) {
                groupIdToDelete = card.dataset.group;
                confirmModalText.textContent = 'Are you sure you want to delete this entire group and all its tasks?';
                customConfirmModal.classList.remove('hidden');
            }
        }
        // Add Task Logic
        else if (target.classList.contains('add-task-item-btn')) {
            const card = target.closest('.task-card');
            if (card) {
                activeGroupId = card.dataset.group;
                showTaskModal('create');
            }
        }
        // View Task Logic
        else if (target.closest('li')) {
            const li = target.closest('li');
            const card = li.closest('.task-card');

            // Build task data object from DOM attributes
            currentTaskData = {
                id: li.dataset.id,
                title: li.querySelector('span:last-child').innerText.split(' - ')[0],
                description: li.dataset.text,
                created_at: li.dataset.creationDate,
                completed_at: li.dataset.completionDate,
                priority: li.dataset.priority,
                status: card.dataset.type === 'done' ? 'done' : 'todo'
            };

            showTaskModal('view');
        }
    });

    // --- Rename Logic (Double Click) ---
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
                    // Optimistic update
                    const newH3 = document.createElement('h3');
                    newH3.textContent = prefix + newBaseTitle;
                    cardHeader.replaceChild(newH3, input);

                    // Update other card in pair
                    const otherType = card.dataset.type === 'todo' ? 'done' : 'todo';
                    const otherCard = document.querySelector(`.task-card[data-group="${groupId}"][data-type="${otherType}"]`);
                    if (otherCard) {
                        const otherH3 = otherCard.querySelector('h3');
                        const otherPrefix = otherType === 'todo' ? 'To Do - ' : 'Tasks done - ';
                        otherH3.textContent = otherPrefix + newBaseTitle;
                    }

                    // API Call
                    await renameGroupAPI(groupId, newBaseTitle);
                } else {
                    // Revert if empty
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
        if (groupIdToDelete) {
            const success = await deleteGroupAPI(groupIdToDelete);
            if (success) {
                // Remove from DOM
                const cards = document.querySelectorAll(`.task-card[data-group="${groupIdToDelete}"]`);
                cards.forEach(card => card.remove());
            }
        }
        customConfirmModal.classList.add('hidden');
        groupIdToDelete = null;
    });

    cancelDeleteBtn.addEventListener('click', () => {
        customConfirmModal.classList.add('hidden');
        groupIdToDelete = null;
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
        } else if (mode === 'view') {
            taskModalTitle.textContent = 'Task Details';
            taskTitleInput.value = currentTaskData.title;
            taskTextInput.value = currentTaskData.description || '';
            taskTitleInput.readOnly = true;
            taskTextInput.readOnly = true;

            saveTaskBtn.classList.add('hidden');

            // Show complete button only if not already done
            if (currentTaskData.status === 'done') {
                completeTaskBtn.classList.add('hidden');
            } else {
                completeTaskBtn.classList.remove('hidden');
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

            // Set priority radio
            if (currentTaskData.priority) {
                const radio = document.querySelector(`input[name="priority"][value="${currentTaskData.priority}"]`);
                if (radio) radio.checked = true;
            }
            // Disable radios
            document.querySelectorAll('input[name="priority"]').forEach(r => r.disabled = true);
        }
    }

    function hideTaskModal() {
        taskModal.classList.add('hidden');
        activeGroupId = null;
        currentTaskData = null;
        // Re-enable radios for next time
        document.querySelectorAll('input[name="priority"]').forEach(r => r.disabled = false);
    }

    closeTaskModalBtn.addEventListener('click', hideTaskModal);

    saveTaskBtn.addEventListener('click', async () => {
        const title = taskTitleInput.value.trim();
        const text = taskTextInput.value.trim();
        const priority = document.querySelector('input[name="priority"]:checked').value;

        if (title && activeGroupId) {
            const newTask = await createTaskAPI({
                group_id: activeGroupId,
                title: title,
                description: text,
                priority: priority,
                status: 'todo'
            });

            if (newTask) {
                // Find the ToDo card for this group and append
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
            const now = new Date();
            const success = await updateTaskAPI(currentTaskData.id, {
                status: 'done',
                completed_at: now.toISOString()
            });

            if (success) {
                // Move in DOM
                const oldLi = document.querySelector(`li[data-id="${currentTaskData.id}"]`);
                if (oldLi) {
                    // Update data attributes
                    oldLi.dataset.completionDate = now.toISOString();
                    // Update text
                    const titleSpan = oldLi.querySelector('span:last-child');
                    const title = titleSpan.innerText.split(' - ')[0]; // Basic parse
                    const dateStr = now.toLocaleDateString('en-US');
                    titleSpan.innerHTML = `${title} - <em>completed on ${dateStr}</em>`;

                    // Move to Done card
                    // Find group ID from the LI's parent card
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
            }
        }
    });

    // Filter Logic
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
});
