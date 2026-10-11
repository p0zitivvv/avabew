/**
 * IELTS Tracker Application Logic
 */

// Configuration defaults
const DEFAULT_STATE = {
    targetDate: new Date(new Date().getTime() + 63 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 63 days from now
    initialScore: 4.5,
    targetScore: 7.0,
    dailyGoalMin: 180, // 3 hours
    theme: 'dark', // 'dark' or 'light'
    tasks: [], // { id, title, category, duration, date, completed, priority }
    streak: 0,
    lastActiveDate: null
};

const CATEGORY_COLORS = {
    'Listening': 'var(--c-cyan)',
    'Reading': 'var(--c-purple)',
    'Writing': 'var(--c-orange)',
    'Speaking': 'var(--c-green)',
    'Grammar': 'var(--c-yellow)',
    'Vocabulary': 'var(--c-pink)'
};

// Application State
let state = { ...DEFAULT_STATE };
let currentDisplayWeekStart = new Date();

// DOM Elements
const els = {
    themeToggle: document.getElementById('themeToggle'),
    daysLeft: document.getElementById('daysLeft'),
    initialScore: document.getElementById('initialScore'),
    targetScore: document.getElementById('targetScore'),

    // Overall Stats
    overallPercent: document.getElementById('overallPercent'),
    overallProgressFill: document.getElementById('overallProgressFill'),
    tasksCompletedStat: document.getElementById('tasksCompletedStat'),
    studyHoursStat: document.getElementById('studyHoursStat'),
    daysRemainingStat: document.getElementById('daysRemainingStat'),

    // Streak
    streakBadge: document.getElementById('streakBadge'),
    streakCount: document.getElementById('streakCount'),
    currentStreakStat: document.getElementById('currentStreakStat'),

    // Today Goal
    todayGoalTime: document.getElementById('todayGoalTime'),
    todayCompletedTime: document.getElementById('todayCompletedTime'),
    todayProgressFill: document.getElementById('todayProgressFill'),
    todayPercent: document.getElementById('todayPercent'),

    // Planner
    daysContainer: document.getElementById('daysContainer'),
    weekRangeDisplay: document.getElementById('weekRangeDisplay'),
    prevWeekBtn: document.getElementById('prevWeekBtn'),
    nextWeekBtn: document.getElementById('nextWeekBtn'),

    // Modals
    addTaskModal: document.getElementById('addTaskModal'),
    addTaskBtn: document.getElementById('addTaskBtn'),
    addTaskForm: document.getElementById('addTaskForm'),

    settingsModal: document.getElementById('settingsModal'),
    navSettingsBtn: document.getElementById('navSettingsBtn'),
    mobileSettingsBtn: document.getElementById('mobileSettingsBtn'),
    settingsForm: document.getElementById('settingsForm'),

    // Day Chips & Mobile Nav
    dayChipsContainer: document.getElementById('dayChipsContainer'),
    bottomNavDash: document.getElementById('bottomNavDash'),
    bottomNavPlanner: document.getElementById('bottomNavPlanner'),
    bottomNavAdd: document.getElementById('bottomNavAdd'),
    bottomNavStats: document.getElementById('bottomNavStats'),
    bottomNavSettings: document.getElementById('bottomNavSettings')
};

// --- Initialization ---

function init() {
    loadState();
    setupEventListeners();

    // Initialize date to start of current week (Monday as start)
    const today = new Date();
    currentDisplayWeekStart = getStartOfWeek(today);

    processDailyStreak();
    applyTheme();
    renderAll();
}

function loadState() {
    const saved = localStorage.getItem('ieltsTrackerState');
    if (saved) {
        state = { ...DEFAULT_STATE, ...JSON.parse(saved) };
    }
}

function saveState() {
    localStorage.setItem('ieltsTrackerState', JSON.stringify(state));
    renderAll();
}

function processDailyStreak() {
    const todayStr = getLocalDateString(new Date());

    // Handle streak logic
    if (state.lastActiveDate) {
        const lastActive = new Date(state.lastActiveDate);
        const todayD = new Date(todayStr);
        const diffTime = Math.abs(todayD - lastActive);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays > 1) {
            // Missed a day, streak reset
            state.streak = 0;
        }
    }

    // Calculate if today's goal was met to increment streak
    const todaysTasks = state.tasks.filter(t => t.date === todayStr);
    const completedTasks = todaysTasks.filter(t => t.completed);

    if (completedTasks.length > 0 && state.lastActiveDate !== todayStr) {
        // Did at least something today, maybe full goal? 
        // We'll increment streak just for doing any task for now to keep it encouraging.
        state.streak += 1;
        state.lastActiveDate = todayStr;
        saveState();
    }
}

// --- Rendering ---

function renderAll() {
    updateDashboardHeader();
    updateOverallProgress();
    updateSkillsProgress();
    updateTodayGoal();
    renderWeeklyPlanner();
}

function updateDashboardHeader() {
    // Countdown
    const targetDate = new Date(state.targetDate);
    const today = new Date();
    // Neutralize time
    targetDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);

    const diffTime = targetDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    els.daysLeft.textContent = diffDays > 0 ? diffDays : 0;
    els.daysRemainingStat.textContent = diffDays > 0 ? diffDays : 0;

    // Scores
    els.initialScore.textContent = state.initialScore.toFixed(1);
    els.targetScore.textContent = state.targetScore.toFixed(1);

    // Streak
    els.streakCount.textContent = state.streak;
    els.currentStreakStat.textContent = state.streak;
}

function updateOverallProgress() {
    const totalTasks = state.tasks.length;
    const completedTasks = state.tasks.filter(t => t.completed).length;

    const percent = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

    els.overallPercent.textContent = `${percent}%`;
    els.overallProgressFill.style.width = `${percent}%`;

    els.tasksCompletedStat.textContent = completedTasks;

    const totalMinutes = state.tasks.filter(t => t.completed).reduce((sum, t) => sum + parseInt(t.duration), 0);
    els.studyHoursStat.textContent = formatHours(totalMinutes);
}

function updateSkillsProgress() {
    const skills = ['Listening', 'Reading', 'Writing', 'Speaking', 'Grammar', 'Vocabulary'];

    skills.forEach(skill => {
        const skillTasks = state.tasks.filter(t => t.category === skill);
        const completed = skillTasks.filter(t => t.completed).length;

        const percent = skillTasks.length === 0 ? 0 : Math.round((completed / skillTasks.length) * 100);

        const textEl = document.getElementById(`${skill.toLowerCase()}ProgressText`);
        const fillEl = document.getElementById(`${skill.toLowerCase()}ProgressFill`);

        if (textEl && fillEl) {
            textEl.textContent = `${percent}%`;
            fillEl.style.width = `${percent}%`;
        }
    });
}

function updateTodayGoal() {
    const todayStr = getLocalDateString(new Date());
    const todayTasks = state.tasks.filter(t => t.date === todayStr);

    const plannedMin = todayTasks.reduce((sum, t) => sum + parseInt(t.duration), 0);
    const completedMin = todayTasks.filter(t => t.completed).reduce((sum, t) => sum + parseInt(t.duration), 0);

    // The user goal could be the manual setting (dailyGoalMin) or whatever is planned today.
    // Let's use planned tasks as today's actual goal if it exists, otherwise the setting.
    const goalMin = Math.max(state.dailyGoalMin, plannedMin);

    els.todayGoalTime.textContent = formatHoursDuration(plannedMin); // Show total planned
    els.todayCompletedTime.textContent = formatHoursDuration(completedMin);

    const percent = plannedMin === 0 ? 0 : Math.min(100, Math.round((completedMin / plannedMin) * 100));
    els.todayPercent.textContent = `${percent}%`;
    els.todayProgressFill.style.width = `${percent}%`;
}


function renderWeeklyPlanner() {
    // Clear containers
    els.daysContainer.innerHTML = '';
    if (els.dayChipsContainer) els.dayChipsContainer.innerHTML = '';

    const startDate = new Date(currentDisplayWeekStart);
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6);

    // Update header text
    els.weekRangeDisplay.textContent = `${formatDateShort(startDate)} — ${formatDateShort(endDate)}`;

    const todayStr = getLocalDateString(new Date());

    // Generate 7 days
    for (let i = 0; i < 7; i++) {
        const currDate = new Date(startDate);
        currDate.setDate(startDate.getDate() + i);
        const dateStr = getLocalDateString(currDate);

        // Get tasks for this day
        const dayTasks = state.tasks.filter(t => t.date === dateStr);
        const completedMin = dayTasks.filter(t => t.completed).reduce((sum, t) => sum + parseInt(t.duration), 0);
        const totalMin = dayTasks.reduce((sum, t) => sum + parseInt(t.duration), 0);

        const isToday = dateStr === todayStr;

        // 1. Day Chip for 1-tap navigation
        if (els.dayChipsContainer) {
            const chip = document.createElement('div');
            chip.className = `day-chip ${isToday ? 'active' : ''}`;
            chip.dataset.index = i;
            chip.dataset.date = dateStr;

            const weekdayShort = new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(currDate);
            const dayNum = currDate.getDate();

            chip.innerHTML = `
                <span class="day-chip-weekday">${weekdayShort}</span>
                <span class="day-chip-number">${dayNum}</span>
                ${dayTasks.length > 0 ? `
                    <div class="day-chip-dots">
                        <span class="day-chip-dot"></span>
                    </div>
                ` : ''}
            `;

            chip.addEventListener('click', () => {
                document.querySelectorAll('.day-chip').forEach(c => c.classList.remove('active'));
                chip.classList.add('active');
                const targetCard = document.getElementById(`dayCard_${i}`);
                if (targetCard) {
                    targetCard.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
                }
            });

            els.dayChipsContainer.appendChild(chip);
        }

        // 2. Day Card
        const card = document.createElement('div');
        card.id = `dayCard_${i}`;
        card.className = `day-card ${isToday ? 'active-today' : ''}`;

        const dayName = new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(currDate);
        const dayDateStr = new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric' }).format(currDate);

        let tasksHtml = '';
        if (dayTasks.length === 0) {
            tasksHtml = '<div class="empty-state">No tasks planned</div>';
        } else {
            tasksHtml = dayTasks.map(t => `
                <div class="task-item ${t.completed ? 'completed' : ''}" data-id="${t.id}">
                    <div class="task-checkbox">
                        <i class="fa-solid fa-check"></i>
                    </div>
                    <div class="task-content">
                        <div class="task-name">${escapeHtml(t.title)}</div>
                        <div class="task-meta">
                            <span class="task-category-dot" style="background-color: ${CATEGORY_COLORS[t.category]}"></span>
                            <span>${t.category}</span>
                            <span>•</span>
                            <span>${t.duration}m</span>
                        </div>
                    </div>
                    <button class="delete-task-btn" onclick="deleteTask(event, '${t.id}')">
                        <i class="fa-solid fa-trash-can"></i>
                    </button>
                </div>
            `).join('');
        }

        card.innerHTML = `
            <div class="day-header">
                <div class="day-date">${dayDateStr}</div>
                <div class="day-name">${dayName}</div>
                <div class="day-time-summary">
                    <span>${formatHoursDuration(totalMin)} planned</span>
                    <span>•</span>
                    <span class="${completedMin === totalMin && totalMin > 0 ? 'text-green' : ''}">${formatHoursDuration(completedMin)} completed</span>
                </div>
            </div>
            <div class="task-list">
                ${tasksHtml}
            </div>
        `;

        els.daysContainer.appendChild(card);
    }

    // Add Click listeners to new task items
    document.querySelectorAll('.task-item').forEach(item => {
        item.addEventListener('click', (e) => {
            // ignore if clicked on delete button
            if (e.target.closest('.delete-task-btn')) return;
            toggleTask(item.dataset.id);
        });
    });

    // Sync Day Chips when swiping day cards
    if (els.dayChipsContainer) {
        let scrollTimeout;
        els.daysContainer.addEventListener('scroll', () => {
            clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(() => {
                const containerRect = els.daysContainer.getBoundingClientRect();
                const containerCenter = containerRect.left + containerRect.width / 2;

                let closestIndex = 0;
                let minDiff = Infinity;

                for (let i = 0; i < 7; i++) {
                    const card = document.getElementById(`dayCard_${i}`);
                    if (card) {
                        const cardRect = card.getBoundingClientRect();
                        const cardCenter = cardRect.left + cardRect.width / 2;
                        const diff = Math.abs(cardCenter - containerCenter);
                        if (diff < minDiff) {
                            minDiff = diff;
                            closestIndex = i;
                        }
                    }
                }

                document.querySelectorAll('.day-chip').forEach((c, idx) => {
                    if (idx === closestIndex) {
                        c.classList.add('active');
                        c.scrollIntoView({ behavior: 'smooth', inline: 'nearest', block: 'nearest' });
                    } else {
                        c.classList.remove('active');
                    }
                });
            }, 80);
        }, { passive: true });
    }
}

// --- Actions & Helpers ---

function toggleTask(id) {
    const task = state.tasks.find(t => t.id === id);
    if (task) {
        task.completed = !task.completed;
        saveState();
        processDailyStreak(); // update streak if needed
    }
}

window.deleteTask = function (e, id) {
    e.stopPropagation();
    state.tasks = state.tasks.filter(t => t.id !== id);
    saveState();
};

function applyTheme() {
    if (state.theme === 'light') {
        document.body.classList.replace('dark-theme', 'light-theme');
        els.themeToggle.innerHTML = '<i class="fa-solid fa-sun"></i><span>Light Mode</span>';
    } else {
        document.body.classList.replace('light-theme', 'dark-theme');
        els.themeToggle.innerHTML = '<i class="fa-solid fa-moon"></i><span>Dark Mode</span>';
    }
}

function toggleTheme() {
    state.theme = state.theme === 'dark' ? 'light' : 'dark';
    applyTheme();
    saveState();
}

// Event Listeners
function setupEventListeners() {
    els.themeToggle.addEventListener('click', toggleTheme);

    // Sidebar Navigation Interactions
    const navLinks = document.querySelectorAll('.nav-menu .nav-item:not(#navSettingsBtn)');
    navLinks.forEach((link, index) => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            navLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');

            // Basic scroll behaviors
            if (index === 0) {
                // Dashboard
                window.scrollTo({ top: 0, behavior: 'smooth' });
            } else if (index === 1) {
                // Planner
                const plannerSec = document.querySelector('.planner-section');
                if (plannerSec) plannerSec.scrollIntoView({ behavior: 'smooth', block: 'start' });
            } else if (index === 2) {
                // Statistics
                const statSec = document.querySelector('.skills-section');
                if (statSec) statSec.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        });
    });

    // Planner Nav
    els.prevWeekBtn.addEventListener('click', () => {
        currentDisplayWeekStart.setDate(currentDisplayWeekStart.getDate() - 7);
        renderWeeklyPlanner();
    });

    els.nextWeekBtn.addEventListener('click', () => {
        currentDisplayWeekStart.setDate(currentDisplayWeekStart.getDate() + 7);
        renderWeeklyPlanner();
    });

    // Add Task Modal
    els.addTaskBtn.addEventListener('click', () => {
        document.getElementById('taskDateInput').value = getLocalDateString(new Date());
        els.addTaskModal.classList.add('active');
    });

    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', () => els.addTaskModal.classList.remove('active'));
    });

    els.addTaskForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const newTask = {
            id: 'task_' + Date.now(),
            title: document.getElementById('taskNameInput').value,
            category: document.getElementById('taskCategorySelect').value,
            duration: parseInt(document.getElementById('taskDurationInput').value),
            date: document.getElementById('taskDateInput').value,
            priority: document.getElementById('taskPrioritySelect').value,
            notes: document.getElementById('taskNotesInput').value,
            completed: false
        };

        state.tasks.push(newTask);
        saveState();
        els.addTaskForm.reset();
        els.addTaskModal.classList.remove('active');
    });

    // Settings Modal Open Helper
    function openSettingsModal() {
        document.getElementById('settingsDateInput').value = state.targetDate;
        document.getElementById('settingsInitialInput').value = state.initialScore;
        document.getElementById('settingsTargetInput').value = state.targetScore;
        document.getElementById('settingsGoalInput').value = state.dailyGoalMin;
        els.settingsModal.classList.add('active');
    }

    // Add Task Modal Open Helper
    function openAddTaskModal() {
        document.getElementById('taskDateInput').value = getLocalDateString(new Date());
        els.addTaskModal.classList.add('active');
    }

    // Add Task Modal Triggers
    els.addTaskBtn.addEventListener('click', openAddTaskModal);
    if (els.bottomNavAdd) {
        els.bottomNavAdd.addEventListener('click', openAddTaskModal);
    }

    // Tab Switching Function
    function switchTab(tabId) {
        const isMobile = window.innerWidth <= 768;

        // Update Bottom Nav Active States
        if (els.bottomNavDash) els.bottomNavDash.classList.toggle('active', tabId === 'tabDashboard');
        if (els.bottomNavPlanner) els.bottomNavPlanner.classList.toggle('active', tabId === 'tabPlanner');
        if (els.bottomNavStats) els.bottomNavStats.classList.toggle('active', tabId === 'tabSkills');

        if (isMobile) {
            // Mobile: Switch tab view display
            document.querySelectorAll('.tab-view').forEach(tab => {
                tab.classList.remove('active');
            });
            const targetTab = document.getElementById(tabId);
            if (targetTab) {
                targetTab.classList.add('active');
            }
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
            // Desktop: Smooth scroll
            const targetSec = document.getElementById(tabId);
            if (targetSec) {
                targetSec.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }
    }

    // Mobile Bottom Navigation Handlers
    if (els.bottomNavDash) {
        els.bottomNavDash.addEventListener('click', () => switchTab('tabDashboard'));
    }
    if (els.bottomNavPlanner) {
        els.bottomNavPlanner.addEventListener('click', () => switchTab('tabPlanner'));
    }
    if (els.bottomNavStats) {
        els.bottomNavStats.addEventListener('click', () => switchTab('tabSkills'));
    }
    if (els.bottomNavSettings) {
        els.bottomNavSettings.addEventListener('click', openSettingsModal);
    }

    // Mobile Header Settings Button
    if (els.mobileSettingsBtn) {
        els.mobileSettingsBtn.addEventListener('click', (e) => {
            e.preventDefault();
            openSettingsModal();
        });
    }

    // Desktop Settings Modal Trigger
    els.navSettingsBtn.addEventListener('click', (e) => {
        e.preventDefault();
        openSettingsModal();
    });

    document.querySelectorAll('.close-settings').forEach(btn => {
        btn.addEventListener('click', () => els.settingsModal.classList.remove('active'));
    });

    els.settingsForm.addEventListener('submit', (e) => {
        e.preventDefault();
        state.targetDate = document.getElementById('settingsDateInput').value;
        state.initialScore = parseFloat(document.getElementById('settingsInitialInput').value);
        state.targetScore = parseFloat(document.getElementById('settingsTargetInput').value);
        state.dailyGoalMin = parseInt(document.getElementById('settingsGoalInput').value);

        saveState();
        els.settingsModal.classList.remove('active');
    });
}

// Utility Functions
function getLocalDateString(date) {
    const d = new Date(date);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().split('T')[0];
}

function getStartOfWeek(date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
    return new Date(d.setDate(diff));
}

function formatHours(minutes) {
    if (minutes === 0) return '0h';
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h > 0 && m > 0) return `${h}h ${m}m`;
    if (h > 0) return `${h}h`;
    return `${m}m`;
}

function formatHoursDuration(minutes) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h}h ${m.toString().padStart(2, '0')}m`;
}

function formatDateShort(date) {
    return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(date);
}

function escapeHtml(unsafe) {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// Start App
document.addEventListener('DOMContentLoaded', init);
