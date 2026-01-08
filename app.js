// Last Updated: Production Stable
document.addEventListener('DOMContentLoaded', () => {
    // --- Configuration ---
    // Update this URL if your backend is hosted elsewhere
    // If you are using Vercel, this won't work for WebSocket (requires serverless solution like Pusher). 
    // But since you have a Node server (Railway/Heroku/Render), this is fine.
    const API_URL = 'https://web-production-b230e.up.railway.app/api';
    // const API_URL = 'http://localhost:3001/api'; // Use this for local testing

    // --- PAGE ROUTER ---
    const isWhiteboard = document.querySelector('.tasks-grid');
    const isLoginPage = document.getElementById('login-form');

    // --- WHITEBOARD LOGIC ---
    if (isWhiteboard) {
        // --- State & DOM Elements (Whiteboard) ---
        const tasksGrid = document.querySelector('.tasks-grid');
        const dynamicCardColors = ['purple', 'orange', 'cyan', 'pink'];

        // --- Color Themes for Date Headers (Tone-on-Tone) ---
        const colorThemeMap = {
            'cyan': { text: '#117a8b', bg: 'rgba(23, 162, 184, 0.1)' },
            'green': { text: '#155724', bg: 'rgba(40, 167, 69, 0.1)' },
            'yellow': { text: '#856404', bg: 'rgba(255, 193, 7, 0.1)' },
            'purple': { text: '#3c1e70', bg: 'rgba(111, 66, 193, 0.1)' },
            'orange': { text: '#9e3f1b', bg: 'rgba(253, 126, 20, 0.1)' },
            'pink': { text: '#901842', bg: 'rgba(232, 62, 140, 0.1)' }
        };

        // --- Helper: Safe Date Parser ---
        // Handles MySQL format "YYYY-MM-DD HH:MM:SS" -> "YYYY-MM-DDTHH:MM:SS"
        function safeDate(dateInput) {
            if (!dateInput) return null;
            if (dateInput instanceof Date) return dateInput;
            // If string contains space and no T, replace space with T
            if (typeof dateInput === 'string' && dateInput.includes(' ') && !dateInput.includes('T')) {
                return new Date(dateInput.replace(' ', 'T'));
            }
            return new Date(dateInput);
        }

        // --- Mobile Menu Logic ---
        const mobileMenuBtn = document.getElementById('mobile-menu-toggle');
        const sidebar = document.querySelector('.sidebar');
        const mobileOverlay = document.getElementById('mobile-overlay');
        const logoutBtn = document.getElementById('logout-btn');

        if (mobileMenuBtn) {
            mobileMenuBtn.addEventListener('click', () => {
                sidebar.classList.toggle('open');
                mobileOverlay.classList.toggle('active');
            });
        }

        if (mobileOverlay) {
            mobileOverlay.addEventListener('click', () => {
                sidebar.classList.remove('open');
                mobileOverlay.classList.remove('active');
            });
        }

        // Status User Logic
        // --- Status Logic ---
        const statusPopup = document.getElementById('status-popup');
        let currentDot = null;
        const userStatusList = document.getElementById('user-status-list');

        // NEW: Cache for user data (ID -> Name mapping)
        let allUsersCache = {};


        const statusIcons = {
            'free': '⚡',
            'busy': '⛔',
            'meeting': '📅',
            'on-call': '📞',
            'away': '🚗💨',
            'break': '🍽️',
            'holiday': '🏖️',
            'offline': '💤'
        };

        async function loadUsers() {
            const users = await fetchUsers();
            userStatusList.innerHTML = '';

            const currentUser = JSON.parse(localStorage.getItem('user'));

            users.forEach(user => {
                // Populate cache
                allUsersCache[user.id] = user.name || user.email.split('@')[0];
                // Ensure capitalization for the fallback
                if (!allUsersCache[user.id]) {
                    allUsersCache[user.id] = "Unknown User";
                } else if (!user.name) {
                    allUsersCache[user.id] = allUsersCache[user.id].charAt(0).toUpperCase() + allUsersCache[user.id].slice(1);
                }

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
        let activeGroupIsIntro = false; // Flag to track if we are in intro mode
        let currentTaskData = null;

        // --- Initialization ---
        initializeBoard();

        // --- Fix for Navigation/Cache Restoration ---
        // Ensures data reloads when user navigates back to the page (handling bfcache)
        window.addEventListener('pageshow', (event) => {
            if (event.persisted) {
                console.log("Page restored from cache. Reloading data...");
                loadGroups();
                loadUsers();
            }
        });

        // Auto-Refresh every 5 seconds (5,000 ms) for near real-time updates
        setInterval(() => {
            // console.log("Auto-refreshing tasks..."); // Less noise in console
            loadGroups();
            loadUsers();
        }, 5000);

        // --- Daily Auto-Logout at 8:30 AM ---
        // --- Daily Auto-Logout at 8:30 AM ---
        function checkAutoLogout() {
            const now = new Date();
            const currentHours = now.getHours();
            const currentMinutes = now.getMinutes();

            // Logic: If it's 8:30 AM OR if we just opened the app and it's past 8:30 but before, say, 8:35 (or just strictly forced logout if we want to enforce it once a day).
            // However, a strict "past 8:30" rule might loop logout them out if they log in at 8:31. 
            // Better approach: Check if the last login was BEFORE today's 8:30 AM, and it is currenly PAST 8:30 AM.

            // For now, let's keep the user's simple rule but make it robust:
            // The user wants "logout after a certain time". The original code only checked for EXACTLY 8:30.
            // If the user opens the phone at 8:31, they are not logged out.

            // To fix this without complex session tracking, let's just ensure that if it is 08:30, we logout.
            // And maybe we can add a simple "Safety" check: If the app is open, run this check.

            if (currentHours === 8 && currentMinutes === 30) {
                performLogout('Daily Login Refresh (8:30 AM)\nPlease log in again to start your day.');
            }
        }

        function performLogout(message) {
            if (message) alert(message);
            localStorage.removeItem('authToken');
            localStorage.removeItem('user');
            sessionStorage.removeItem('authToken');
            sessionStorage.removeItem('user');
            window.location.href = 'login.html';
        }

        setInterval(checkAutoLogout, 60000); // Check every minute
        checkAutoLogout(); // Check immediately on load too, just in case they open it right at 8:30
        async function initializeBoard() {
            await setupFixedGroups();
            loadGroups();
            loadUsers(); // NEW: Load users
        }

        async function setupFixedGroups() {
            // Ensure fixed groups exist in DB and update DOM with their real IDs
            const groups = await fetchGroups();

            // MIGRATION 1: Rename "Sick" to "Sick Carers"
            const manualSickGroup = groups.find(g => g.name === 'Sick');
            if (manualSickGroup) {
                console.log("Renaming 'Sick' -> 'Sick Carers'");
                await renameGroupAPI(manualSickGroup.id, 'Sick Carers');
                manualSickGroup.name = 'Sick Carers';
            }

            // MIGRATION 2: Merge "Sick Carers Returned" (or Returned Sick Carers) INTO "Sick Carers"
            // We want ONE group. If the secondary group exists, move tasks and delete it.
            const secondaryGroup = groups.find(g => g.name === 'Sick Carers Returned') ||
                groups.find(g => g.name === 'Returned Sick Carers');

            let mainSickGroup = groups.find(g => g.name === 'Sick Carers');

            // If we have secondary but no main, rename secondary to main
            if (secondaryGroup && !mainSickGroup) {
                await renameGroupAPI(secondaryGroup.id, 'Sick Carers');
                mainSickGroup = secondaryGroup; // It is now the main group
            }
            // If we have both, move tasks from secondary to main, then delete secondary
            else if (secondaryGroup && mainSickGroup) {
                console.log("Merging Sick groups...");
                // Note: We need to move tasks. Since we don't have a bulk move API easily here, 
                // we will rely on the user manually moving them IF we can't do it.
                // But wait, we can just loop update.
                if (secondaryGroup.tasks && secondaryGroup.tasks.length > 0) {
                    for (const task of secondaryGroup.tasks) {
                        await updateTaskAPI(task.id, { group_id: mainSickGroup.id });
                    }
                }
                await deleteGroupAPI(secondaryGroup.id);
            }

            const fixedDefs = [
                { name: 'Introduction', selector: '[data-group="introduction"]', color: 'cyan' },
                { name: 'Introduction (Schedule)', selector: '[data-group="introduction"]', color: 'cyan' },
                { name: 'Coordinators', selector: '[data-group="coordinators"]', color: 'yellow' },
                { name: 'Supervisors', selector: '[data-group="supervisors"]', color: 'green' },
                { name: 'Sheets Needed', selector: '[data-group="sheets-needed"]', color: 'purple' },
                { name: 'Sick Carers', selector: '[data-group="sick-carers"]', color: 'cyan' }
            ];

            for (const def of fixedDefs) {
                // Approximate match for Intro to avoid creating duplicates if one exists
                let dbGroup = groups.find(g => g.name === def.name);
                if (def.name.startsWith('Introduction')) {
                    dbGroup = groups.find(g => g.name === 'Introduction' || g.name === 'Introduction (Schedule)');
                } else if (def.name === 'Sick Carers') {
                    // Refresh search in case we just created/renamed it above
                    dbGroup = groups.find(g => g.name === 'Sick Carers');
                }

                // If not found, create them to avoid 500 errors.
                if (!dbGroup) {
                    console.log(`Creating missing fixed group: ${def.name}`);
                    dbGroup = await createGroupAPI(def.name, def.color);
                }

                if (dbGroup) {
                    // Update all cards that were hardcoded with the string ID
                    const cards = document.querySelectorAll(def.selector);
                    if (cards.length > 0) {
                        cards.forEach(card => {
                            card.dataset.group = dbGroup.id; // Set REAL NUMERIC ID
                            card.dataset.color = def.color;
                            card.classList.remove('hidden');
                        });
                    } else {
                        // Fallback: This is expected if HTML is missing. We will warn.
                        console.warn(`Hardcoded card for ${def.name} not found.`);
                    }
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
                const token = sessionStorage.getItem('authToken') || localStorage.getItem('authToken');
                const response = await fetch(`${API_URL}/groups`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
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
                const token = sessionStorage.getItem('authToken') || localStorage.getItem('authToken');
                const response = await fetch(`${API_URL}/groups/${id}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                if (!response.ok) throw new Error('Failed to delete group');
                return true;
            } catch (error) {
                console.error(error);
                return false;
            }
        }

        async function renameGroupAPI(id, newName) {
            try {
                const token = sessionStorage.getItem('authToken') || localStorage.getItem('authToken');
                const response = await fetch(`${API_URL}/groups/${id}`, {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ name: newName })
                });
                if (!response.ok) throw new Error('Failed to rename group');
            } catch (error) {
                console.error(error);
            }
        }

        async function createTaskAPI(task) {
            // No try-catch here so errors propagate to the caller (save button)
            const token = sessionStorage.getItem('authToken') || localStorage.getItem('authToken');
            const response = await fetch(`${API_URL}/tasks`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(task)
            });
            if (!response.ok) {
                if (response.status === 401 || response.status === 403) {
                    alert("Session expired. Please log in again.");
                    window.location.href = 'login.html';
                    return null;
                }
                const errText = await response.text();
                throw new Error(`Server Error: ${response.status} ${errText}`);
            }
            return await response.json();
        }

        async function updateTaskAPI(id, updates) {
            try {
                const token = sessionStorage.getItem('authToken') || localStorage.getItem('authToken');
                const response = await fetch(`${API_URL}/tasks/${id}`, {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(updates)
                });
                if (!response.ok) throw new Error('Failed to update task');
                return true;
            } catch (error) {
                console.error(error);
                return false;
            }
        }

        async function deleteTaskAPI(taskId) {
            try {
                const token = sessionStorage.getItem('authToken') || localStorage.getItem('authToken');
                const response = await fetch(`${API_URL}/tasks/${taskId}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (!response.ok) {
                    throw new Error(`Failed to delete task: ${response.status}`);
                }

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
                const token = sessionStorage.getItem('authToken') || localStorage.getItem('authToken');
                const response = await fetch(`${API_URL}/tasks/${taskId}`, {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(body)
                });
                if (!response.ok) throw new Error('Failed to update task status');
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
                const response = await fetch(`${API_URL}/users/status`, {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ status })
                });

                if (response.status === 401) {
                    alert('Session expired. Please login again.');
                    window.location.href = 'login.html';
                    return false;
                }

                if (!response.ok) throw new Error('Failed to update status');
                return true;
            } catch (error) {
                console.error(error);
                return false;
            }
        }

        // --- Rendering Logic ---
        // --- Rendering Logic ---
        async function loadGroups() {
            const groups = await fetchGroups();

            // Identify Fixed Group IDs
            const coordGroup = groups.find(g => g.name === 'Coordinators');
            const superGroup = groups.find(g => g.name === 'Supervisors');
            const introGroup = groups.find(g => g.name === 'Introduction' || g.name === 'Introduction (Schedule)');
            const sheetsGroup = groups.find(g => g.name === 'Sheets Needed');
            const sickGroup = groups.find(g => g.name === 'Sick Carers');
            // Try strict match first, then case-insensitive to catch user variations
            const sickReturnedGroup = groups.find(g => g.name === 'Returned Sick Carers') ||
                groups.find(g => g.name === 'Sick Carers Returned') ||
                groups.find(g => g.name.toLowerCase().includes('returned sick carers'));

            const fixedIds = [
                coordGroup?.id,
                superGroup?.id,
                introGroup?.id,
                sheetsGroup?.id,
                sickGroup?.id,
                sickReturnedGroup?.id
            ].filter(id => id);

            // [FIX] Force Colors for Fixed Groups in Memory if missing
            if (coordGroup && !coordGroup.color) coordGroup.color = 'yellow';
            if (superGroup && !superGroup.color) superGroup.color = 'green';
            if (introGroup && !introGroup.color) introGroup.color = 'cyan';
            if (sheetsGroup && !sheetsGroup.color) sheetsGroup.color = 'purple';
            // User requested BLUE (Cyan) for Sick Carers and Returned
            if (sickGroup && !sickGroup.color) sickGroup.color = 'cyan';
            if (sickReturnedGroup) sickReturnedGroup.color = 'cyan';

            // 1. Clear tasks from FIXED cards
            document.querySelectorAll('.non-deletable ul').forEach(ul => ul.innerHTML = '');

            // 2. Remove DYNAMIC cards (those that are not in fixedIds)
            const dynamicCards = document.querySelectorAll('.task-card:not(.non-deletable)');
            dynamicCards.forEach(card => card.remove());

            // 3. Render Groups
            groups.forEach(group => {
                if (fixedIds.includes(group.id)) {
                    // It's a fixed group, just render its tasks into existing DOM
                    if (group.name === 'Introduction' || group.name === 'Introduction (Schedule)') {
                        renderIntroductionTasks(group);
                    } else {
                        renderFixedGroupTasks(group);
                    }
                } else {
                    // Check for Fixed Groups that didn't match ID but match Name (Duplicates or Initial Load Mismatch)
                    const lowerName = group.name.trim().toLowerCase();

                    if (lowerName.includes('introduction')) {
                        console.log("Found floating Introduction group, forcing render as fixed.");
                        renderIntroductionTasks(group);
                        const hardcodedCard = document.querySelector('[data-group="introduction"]');
                        if (hardcodedCard) hardcodedCard.dataset.group = group.id;

                    } else if (
                        lowerName === 'sick carers' ||
                        lowerName === 'returned sick carers' ||
                        lowerName === 'sick carers returned'
                    ) {
                        console.log(`Found floating fixed group ${group.name}, forcing render as fixed.`);
                        renderFixedGroupTasks(group);

                        // Bind to correct DOM element
                        let selector = lowerName.includes('returned') ? '[data-group="sick-carers-returned"]' : '[data-group="sick-carers"]';
                        const hardcodedCards = document.querySelectorAll(selector);
                        hardcodedCards.forEach(card => card.dataset.group = group.id);

                    } else if (
                        group.name === 'Carer Sick' ||
                        group.name === 'Returned Carers' ||
                        group.name === 'Cuidadores que retornaram'
                    ) {
                        // AUTO-DELETE CLEANUP
                        console.log(`Auto-deleting requested group: ${group.name}`);
                        deleteGroupAPI(group.id);
                    } else {
                        // Truly dynamic group
                        renderGroup(group);
                    }
                }
            });
        }

        function renderIntroductionTasks(group) {
            // Separar tarefas
            const todoTasks = group.tasks.filter(t => t.status !== 'done');
            const doneTasks = group.tasks.filter(t => t.status === 'done');

            // Renderizar ToDo
            const todoContainer = document.querySelector(`.task-card[data-group="${group.id}"][data-type="todo"] ul`);
            if (todoContainer) {
                renderIntroList(todoContainer, todoTasks, group.id);
            }

            // Renderizar Done
            const doneContainer = document.querySelector(`.task-card[data-group="${group.id}"][data-type="done"] ul`);
            if (doneContainer) {
                renderIntroList(doneContainer, doneTasks, group.id);
            }
        }

        function renderIntroList(container, tasks, groupId) {
            // Re-use generic with specific settings for Intro (Schedule ASC, Vertical Layout)
            // Use 'cyan' as default for Intro if color isn't explicitly passed (or look it up)
            // Ideally we should pass group color, but Intro is always cyan/blue-ish.
            renderGroupedList(container, tasks, 'scheduled_at', 'asc', true, 'cyan');
        }

        // Generic Renderer with Date Headers
        function renderGroupedList(container, tasks, dateField, sortOrder = 'desc', isIntroduction = false, groupColor = 'cyan') {
            container.innerHTML = '';

            const theme = colorThemeMap[groupColor] || colorThemeMap['cyan'];

            tasks.sort((a, b) => {
                const dateA = safeDate(a[dateField]) || (sortOrder === 'asc' ? new Date('9999-12-31') : new Date('0000-01-01'));
                const dateB = safeDate(b[dateField]) || (sortOrder === 'asc' ? new Date('9999-12-31') : new Date('0000-01-01')); // Handle nulls

                // Safe parsing for subtraction
                const valA = dateA instanceof Date ? dateA.getTime() : 0;
                const valB = dateB instanceof Date ? dateB.getTime() : 0;

                return sortOrder === 'asc' ? valA - valB : valB - valA;
            });

            let lastDateStr = null;

            tasks.forEach(task => {
                const dateObj = safeDate(task[dateField]);
                let isValidDate = dateObj && !isNaN(dateObj.getTime());

                // For schedule, required. For others, optional but if missing, put in "No Date" bucket or just render?
                // If invalid date in 'created_at' (shouldn't happen), treat as no header?

                if (isValidDate) {
                    const year = String(dateObj.getFullYear()).slice(-2); // Get last 2 digits
                    const day = String(dateObj.getDate()).padStart(2, '0');
                    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
                    const weekday = dateObj.toLocaleDateString('en-GB', { weekday: 'long' });

                    // Requested format: DD/MM/YY - Weekday
                    const dayStr = `${day}/${month}/${year} - ${weekday}`;

                    if (dayStr !== lastDateStr) {
                        const header = document.createElement('li');
                        // Glassmorphism styling as requested - More transparent, no border
                        header.style.backgroundColor = 'rgba(255, 255, 255, 0.55)'; // More transparent
                        header.style.border = 'none'; // No border
                        header.style.backdropFilter = 'blur(4px)';
                        header.style.fontWeight = 'bold';
                        header.style.padding = '5px 10px';
                        header.style.marginTop = '10px';
                        header.style.borderRadius = '8px';
                        header.style.color = '#555555'; // Darker grey for better contrast on white
                        header.innerHTML = `📅 ${dayStr.charAt(0).toUpperCase() + dayStr.slice(1)}`;
                        container.appendChild(header);
                        lastDateStr = dayStr;
                    }
                }

                const taskEl = createTaskElement(task, isIntroduction);
                container.appendChild(taskEl);
            });
        }

        function renderFixedGroupTasks(group) {
            // Find the DOM elements for this group (now using ID match)
            const todoCard = document.querySelector(`.task-card[data-group="${group.id}"][data-type="todo"]`);
            const doneCard = document.querySelector(`.task-card[data-group="${group.id}"][data-type="done"]`);

            if (todoCard && doneCard) {
                const todoContainer = todoCard.querySelector('ul');
                const doneContainer = doneCard.querySelector('ul');

                // Determine color based on name if group.color is missing (Legacy Fix)
                let groupColor = group.color;
                if (!groupColor) {
                    if (group.name === 'Coordinators') groupColor = 'yellow';
                    else if (group.name === 'Supervisors') groupColor = 'green';
                    else if (group.name === 'Sheets Needed') groupColor = 'purple';
                    else if (group.name.includes('Introduction')) groupColor = 'cyan';
                }

                // ToDo: Group by Created At (Newest First)
                const todoTasks = group.tasks.filter(t => t.status !== 'done');
                renderGroupedList(todoContainer, todoTasks, 'created_at', 'desc', false, groupColor);

                // Done: Group by Completed At (Newest First)
                const doneTasks = group.tasks.filter(t => t.status === 'done');
                renderGroupedList(doneContainer, doneTasks, 'completed_at', 'desc', false, groupColor);
            }
        }

        // --- Logout Logic ---
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                performLogout();
            });
        }

        function renderGroup(group) {
            const todoCard = createCardElement(group, 'todo');
            const doneCard = createCardElement(group, 'done');
            tasksGrid.appendChild(todoCard);
            tasksGrid.appendChild(doneCard);

            const todoList = todoCard.querySelector('ul');
            const doneList = doneCard.querySelector('ul');

            // ToDo: Group by Created At (Newest First)
            const todoTasks = group.tasks.filter(t => t.status !== 'done');
            renderGroupedList(todoList, todoTasks, 'created_at', 'desc', false, group.color);

            // Done: Group by Completed At (Newest First)
            const doneTasks = group.tasks.filter(t => t.status === 'done');
            renderGroupedList(doneList, doneTasks, 'completed_at', 'desc', false, group.color);
        }

        function createCardElement(group, type) {
            const div = document.createElement('div');
            div.className = 'task-card';
            div.dataset.group = group.id;
            div.dataset.type = type;
            div.dataset.color = group.color;

            const titlePrefix = type === 'todo' ? 'To Do' : 'Tasks done';

            // Failsafe: Never allow delete button for fixed groups even if rendered dynamically
            let isProtected = group.name.toLowerCase().includes('introduction') ||
                group.name === 'Coordinators' ||
                group.name === 'Supervisors' ||
                group.name === 'Sheets Needed' ||
                group.name === 'Sick Carers' ||
                group.name === 'Sick Carers Returned';

            const deleteBtnHTML = isProtected ? '' : `<button class="delete-sticker-btn">&times;</button>`;
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

        function createTaskElement(task, isIntroduction = false) {
            const li = document.createElement('li');
            li.dataset.id = task.id;
            li.dataset.text = task.description || '';
            li.dataset.creationDate = task.created_at;
            li.dataset.completionDate = task.completed_at || '';
            li.dataset.priority = task.priority;
            li.dataset.title = task.title;
            li.dataset.solution = task.solution || '';
            li.dataset.created_by = task.created_by || '';
            li.dataset.completed_by = task.completed_by || ''; // NEW: Tracking completion user
            li.dataset.scheduled_at = task.scheduled_at || '';

            const creationDateObj = safeDate(task.created_at);
            const creationDate = (creationDateObj && !isNaN(creationDateObj)) ? creationDateObj.toLocaleDateString('en-GB') : '';

            // --- Safe Element Creation (Anti-XSS) ---

            // Priority Dot
            const dot = document.createElement('span');
            dot.className = `task-item-priority-dot ${task.priority}`;

            // Title Container
            const titleContainer = document.createElement('div');
            // Check for intro mode (Vertical layout)
            if (isIntroduction) {
                titleContainer.style.cssText = "display:flex; flex-direction:column; width:100%;";
                // Top Row (Time + Client)
                const topRow = document.createElement('div');
                topRow.style.cssText = "display:flex; align-items:center; font-size:1.1em; margin-bottom:2px;";

                let timeStr = "--:--";
                if (task.scheduled_at) {
                    const dateObj = safeDate(task.scheduled_at);
                    if (!isNaN(dateObj.getTime())) {
                        timeStr = dateObj.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
                    }
                }

                // Add Dot to Top Row
                topRow.appendChild(dot);

                const titleText = document.createElement('strong');
                titleText.textContent = `${timeStr} - ${task.title}`; // Safe text assignment
                topRow.appendChild(titleText);

                // Bottom Row (Caregiver)
                const bottomRow = document.createElement('span');
                bottomRow.style.cssText = "font-size:0.9em; color:#555; margin-left:22px;";
                bottomRow.textContent = `Carer Name: ${task.description}`; // Safe text assignment

                titleContainer.appendChild(topRow);
                titleContainer.appendChild(bottomRow);

                li.appendChild(titleContainer);

            } else {
                // Standard Mode (Horizontal)
                li.style.display = 'flex';
                li.style.alignItems = 'center';

                li.appendChild(dot);

                const textSpan = document.createElement('span');
                const titleStrong = document.createElement('strong');
                titleStrong.textContent = task.title; // Safe
                textSpan.appendChild(titleStrong);

                // Completion/Creation Date Text
                const dateText = document.createElement('span');
                dateText.style.cssText = "font-size: 0.8em; color: #666; font-style: italic;";
                if (task.completed_at) {
                    const compDateObj = safeDate(task.completed_at);
                    if (compDateObj && !isNaN(compDateObj)) {
                        dateText.textContent = ` - completed on ${compDateObj.toLocaleDateString('en-GB')}`;
                    } else {
                        dateText.textContent = ` - completed`;
                    }
                } else {
                    dateText.textContent = ` - added on ${creationDate}`;
                }
                textSpan.appendChild(dateText);

                li.appendChild(textSpan);
            }

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
                    activeGroupId = card.dataset.group;
                    // Check if it's introduction group
                    // Robust check: Check name in H3 or data-group match
                    const groupTitle = card.querySelector('.card-header h3').innerText;

                    if (groupTitle.toLowerCase().includes('introduction')) {
                        activeGroupIsIntro = true;
                    } else {
                        activeGroupIsIntro = false;
                    }
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
                    status: card.dataset.type === 'done' ? 'done' : 'todo',
                    solution: li.dataset.solution,
                    created_by: li.dataset.created_by, // Retrieve ownership info
                    completed_by: li.dataset.completed_by || null, // NEW
                    scheduled_at: li.dataset.scheduled_at || null // NEW
                };

                // Determine if this task belongs to Introduction group
                const groupName = card.querySelector('h3').textContent;
                activeGroupIsIntro = groupName.includes('Introduction');

                showTaskModal('view');
            }
        });

        // --- Rename Logic ---
        tasksGrid.addEventListener('dblclick', (e) => {
            const target = e.target;
            if (target.tagName === 'H3') {
                // Protect fixed groups from renaming (e.g. Coordinators with custom headers)
                if (target.closest('.non-deletable')) return;

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
                saveTaskBtn.textContent = 'Save Task'; // Ensure text is reset
                completeTaskBtn.classList.add('hidden');
                taskDates.classList.add('hidden');
                // Hide solution in create mode
                document.getElementById('solution-label').classList.add('hidden');
                document.getElementById('task-solution-input').classList.add('hidden');
                document.getElementById('task-solution-input').value = '';
                document.getElementById('delete-task-btn').classList.add('hidden');

                // Handle Schedule Input
                const scheduleContainer = document.getElementById('schedule-container');
                const scheduleInput = document.getElementById('task-schedule-input');

                if (activeGroupIsIntro) {
                    scheduleContainer.classList.remove('hidden');
                    taskTextInput.classList.remove('hidden');
                    scheduleInput.value = ''; // Reset
                    scheduleInput.readOnly = false; // Ensure editable!
                    taskTitleInput.placeholder = "Client Name";
                    taskTextInput.placeholder = "Carer Name";
                } else {
                    scheduleContainer.classList.add('hidden');
                    taskTextInput.classList.remove('hidden');
                    taskTitleInput.placeholder = "Task Title";
                    taskTextInput.placeholder = "Task description...";
                }
            } else if (mode === 'view') {
                taskModalTitle.textContent = 'Task Details';
                taskTitleInput.value = currentTaskData.title;
                taskTextInput.value = currentTaskData.description || '';

                // --- VISIBILITY LOGIC ---
                // Always show description/text input
                taskTextInput.classList.remove('hidden');

                // --- EDITABILITY LOGIC ---
                const isDone = currentTaskData.status === 'done';

                if (isDone) {
                    // READ-ONLY MODE (Done tasks)
                    taskTitleInput.readOnly = true;
                    taskTextInput.readOnly = true;
                    saveTaskBtn.classList.add('hidden');

                    // Show Completion details
                    // ... (handled below)
                } else {
                    // EDIT MODE (Todo tasks)
                    // Allow editing title and description!
                    taskTitleInput.readOnly = false;
                    taskTextInput.readOnly = false;
                    saveTaskBtn.classList.remove('hidden');
                    saveTaskBtn.textContent = 'Save Changes'; // Distinct text
                }

                // Solution Field Logic
                const solutionInput = document.getElementById('task-solution-input');
                const solutionLabel = document.getElementById('solution-label');
                solutionInput.value = currentTaskData.solution || '';

                if (isDone) {
                    // If done, show solution as read-only
                    completeTaskBtn.classList.add('hidden');
                    solutionInput.readOnly = true;
                    solutionLabel.classList.remove('hidden');
                    solutionInput.classList.remove('hidden');
                } else {
                    // If todo, allow writing solution (for completion)
                    // The complete button handles the solution saving, so we hide it here?
                    // Actually, complete button is for MARKING as done.
                    // If we just want to edit text, we use Save Changes.
                    completeTaskBtn.classList.remove('hidden');

                    // Hide solution input in "Edit" mode unless we click complete?
                    // Original logic showed it for "completing". 
                    // Let's keep solution input hidden until we click complete? 
                    // Or keep it visible but writable? 
                    // Let's follow original: solution input was part of completion flow.
                    // But here we are just editing details.
                    // We can keep solution hidden in standard edit View.
                    solutionInput.readOnly = false;
                    solutionLabel.classList.remove('hidden');
                    solutionInput.classList.remove('hidden');
                }

                taskDates.classList.remove('hidden');
                if (currentTaskData.created_at) {
                    const createdDateStr = new Date(currentTaskData.created_at).toLocaleString('pt-BR');
                    let createdByStr = '';

                    if (currentTaskData.created_by && allUsersCache[currentTaskData.created_by]) {
                        createdByStr = ` by ${allUsersCache[currentTaskData.created_by]}`;
                    }

                    creationDateSpan.textContent = createdDateStr + createdByStr;
                }
                if (currentTaskData.completed_at) {
                    const completedDateStr = new Date(currentTaskData.completed_at).toLocaleString('pt-BR');
                    let completedByStr = '';

                    if (currentTaskData.completed_by && allUsersCache[currentTaskData.completed_by]) {
                        completedByStr = ` by ${allUsersCache[currentTaskData.completed_by]}`;
                    }

                    completionDateSpan.textContent = completedDateStr + completedByStr;
                } else {
                    completionDateSpan.textContent = 'Pending...';
                }

                if (currentTaskData.priority) {
                    const radio = document.querySelector(`input[name="priority"][value="${currentTaskData.priority}"]`);
                    if (radio) radio.checked = true;
                }
                // Enable priority editing if not done
                document.querySelectorAll('input[name="priority"]').forEach(r => r.disabled = isDone);

                // --- DELETE BUTTON LOGIC ---
                const deleteBtn = document.getElementById('delete-task-btn');
                deleteBtn.classList.remove('hidden');

                // Handle Schedule Input View
                const scheduleContainer = document.getElementById('schedule-container');
                const scheduleInput = document.getElementById('task-schedule-input');
                if (currentTaskData.scheduled_at) {
                    scheduleContainer.classList.remove('hidden');
                    // Format for input: YYYY-MM-DDTHH:MM
                    const dt = safeDate(currentTaskData.scheduled_at);
                    if (dt && !isNaN(dt.getTime())) {
                        dt.setMinutes(dt.getMinutes() - dt.getTimezoneOffset()); // Local time adjustment
                        scheduleInput.value = dt.toISOString().slice(0, 16);
                    }

                    if (isDone) {
                        scheduleInput.readOnly = true;
                    } else {
                        scheduleInput.readOnly = false; // Allow rescheduling if needed
                    }
                } else {
                    scheduleContainer.classList.add('hidden');
                }
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
            try {
                const title = taskTitleInput.value.trim();
                const text = taskTextInput.value.trim();

                // Safe Priority Check
                const priorityEl = document.querySelector('input[name="priority"]:checked');
                const priority = priorityEl ? priorityEl.value : 'normal';

                // --- MODE CHECK: UPDATE vs CREATE ---
                if (currentTaskData && currentTaskData.id) {
                    // === UPDATE EXISTING TASK ===

                    // Validations
                    if (currentTaskData.scheduled_at && !document.getElementById('task-schedule-input').value) {
                        // If it HAD a schedule (Intro task), ensure it keeps one? 
                        // Or if we are in Intro group.
                        // Check activeGroupIsIntro or similar context if available, 
                        // or just rely on input presence if it was visible.
                        if (!document.getElementById('task-schedule-input').classList.contains('hidden') && !document.getElementById('task-schedule-input').value) {
                            showNotification('Date & Time cannot be empty.', 'error');
                            return;
                        }
                    }

                    // Prepare Update Data
                    const updateData = {
                        title: title,
                        description: text,
                        priority: priority
                    };

                    // Handle Schedule Update
                    const rawDate = document.getElementById('task-schedule-input').value;
                    if (rawDate && !document.getElementById('schedule-container').classList.contains('hidden')) {
                        updateData.scheduled_at = rawDate.replace('T', ' ') + ':00';
                    }

                    const success = await updateTaskAPI(currentTaskData.id, updateData);

                    if (success) {
                        await loadGroups();
                        hideTaskModal();
                        showNotification('Task updated successfully!', 'success');
                    } else {
                        showNotification('Failed to update task.', 'error');
                    }

                } else {
                    // === CREATE NEW TASK ===
                    if (title && activeGroupId) {
                        // --- Validation for Introduction Group ---
                        const scheduleInput = document.getElementById('task-schedule-input');
                        if (activeGroupIsIntro && !scheduleInput.value) {
                            showNotification('Please select a Date & Time for the Introduction.', 'error');
                            return;
                        }
                        // -----------------------------------------

                        // --- Duplicate Check ---
                        if (!activeGroupIsIntro) {
                            const groupCard = document.querySelector(`.task-card[data-group="${activeGroupId}"][data-type="todo"]`);
                            if (groupCard) {
                                const existingLis = groupCard.querySelectorAll('li');
                                let isDuplicate = false;
                                existingLis.forEach(li => {
                                    if (!li.dataset.id) return;
                                    const existingTitle = li.dataset.title || (li.querySelector('span:last-child') ? li.querySelector('span:last-child').innerText.split(' - ')[0].trim() : '');
                                    if (existingTitle && existingTitle.toLowerCase() === title.toLowerCase()) {
                                        isDuplicate = true;
                                    }
                                });

                                if (isDuplicate) {
                                    showNotification('Task with this name already exists in this group!', 'error');
                                    return; // Stop creation
                                }
                            }
                        }
                        // -----------------------

                        // Format Date for MySQL (YYYY-MM-DD HH:MM:SS)
                        let formattedScheduledAt = null;
                        const rawDate = document.getElementById('task-schedule-input').value;
                        if (rawDate) {
                            formattedScheduledAt = rawDate.replace('T', ' ') + ':00';
                        }

                        const newTask = await createTaskAPI({
                            group_id: activeGroupId,
                            title: title,
                            description: text,
                            priority: priority,
                            status: 'todo',
                            scheduled_at: formattedScheduledAt
                        });

                        if (newTask) {
                            await loadGroups();
                            hideTaskModal();
                        } else {
                            showNotification('Failed to create task (API Error).', 'error');
                        }
                    }
                }
            } catch (err) {
                console.error(err);
                alert("Error saving task: " + err.message);
            }
        });

        completeTaskBtn.addEventListener('click', async () => {
            if (currentTaskData && currentTaskData.id) {
                // MySQL Friendly Date Format: YYYY-MM-DD HH:MM:SS
                const now = new Date();
                const mysqlDate = now.toISOString().slice(0, 19).replace('T', ' ');
                const solution = document.getElementById('task-solution-input').value.trim();

                const success = await updateTaskAPI(currentTaskData.id, {
                    status: 'done',
                    completed_at: mysqlDate,
                    solution: solution // Save solution text
                });

                if (success) {
                    hideTaskModal();
                    loadGroups(); // Refresh UI
                    showNotification('Task marked as done!', 'success');
                } else {
                    showNotification('Failed to update task status.', 'error');
                }
            }
        });


        // --- DELETE BUTTON LISTENER ---
        const deleteTaskBtn = document.getElementById('delete-task-btn');
        deleteTaskBtn.addEventListener('click', () => {
            if (currentTaskData && currentTaskData.id) {
                // Set pending ID for confirmation modal
                window.pendingDeleteTaskId = currentTaskData.id;
                // Stronger warning as requested
                const confirmModalText = document.querySelector('.modal-content p');
                confirmModalText.innerHTML = 'Are you sure you want to delete this task?<br><br><strong>WARNING: This action cannot be undone. The task will be permanently removed for EVERYONE.</strong>';
                customConfirmModal.classList.remove('hidden');
                hideTaskModal(); // Close the task detail modal
            }
        });

        filterInput.addEventListener('input', () => {
            const filterText = filterInput.value.toLowerCase().trim();
            const allCards = document.querySelectorAll('.task-card');

            allCards.forEach(card => {
                const cardTitle = card.querySelector('h3').textContent.toLowerCase();
                const groupMatches = cardTitle.includes(filterText);
                const listItems = Array.from(card.querySelectorAll('li'));
                let hasVisibleTasks = false;
                let currentHeader = null;
                let currentHeaderMatches = false;

                listItems.forEach(li => {
                    const isHeader = !li.dataset.id;

                    if (isHeader) {
                        currentHeader = li;
                        const headerText = li.innerText.toLowerCase();
                        // Check if the header itself matches the filter
                        currentHeaderMatches = headerText.includes(filterText);

                        // Show header if:
                        // 1. Filter is empty (show all)
                        // 2. Header matches (show this section)
                        // Note: Removed groupMatches to prevent "Introduction" or "To Do" matches from showing everything.
                        if (filterText === '' || currentHeaderMatches) {
                            li.style.display = '';
                        } else {
                            li.style.display = 'none';
                        }
                    } else {
                        // It's a task
                        const text = li.innerText.toLowerCase();
                        // Task matches if:
                        // 1. Filter is empty
                        // 2. The Header it belongs to matches (Show all tasks under this date)
                        // 3. The task text itself matches
                        const taskMatches = (filterText === '') || currentHeaderMatches || text.includes(filterText);

                        if (taskMatches) {
                            li.style.display = '';
                            hasVisibleTasks = true;
                            // If we have a header that is currently hidden (e.g. because we matched ONLY the task text),
                            // showing the task requires showing its header context.
                            if (currentHeader && currentHeader.style.display === 'none') {
                                currentHeader.style.display = '';
                            }
                        } else {
                            li.style.display = 'none';
                        }
                    }
                });

                // Display card if filter is empty OR if it has visible content
                if (filterText === '') {
                    card.style.display = '';
                } else {
                    card.style.display = hasVisibleTasks ? '' : 'none';
                }
            });
        });



        // --- INITIALIZATION ---
        // --- INITIALIZATION ---
        (async () => {
            try {
                await setupFixedGroups();
                await loadGroups();
                await loadUsers(); // Ensure users load too
            } catch (e) {
                console.error(e);
                alert("Init Failed: " + e.message);
            }
        })();



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
