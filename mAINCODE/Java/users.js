// =========================
// ENHANCED USERS.JS
// =========================

// =========================
// USERS DATA
// =========================
let users = JSON.parse(localStorage.getItem("users")) || [
    { id: 1, name: "John Doe", username: "jdoe", role: "Admin", status: "Active", date: new Date().toISOString().split("T")[0], createdBy: "System" },
    { id: 2, name: "Jane Smith", username: "jsmith", role: "Staff", status: "Active", date: new Date().toISOString().split("T")[0], createdBy: "System" }
];

// =========================
// STATE VARIABLES
// =========================
let userPage = 1;
const rowsPerPage = 10;
let editId = null;
let currentFilter = {
    search: "",
    role: "All",
    status: "All"
};

// =========================
// DOM ELEMENTS
// =========================
const table = document.getElementById("usersTable");
const searchInput = document.getElementById("searchUser");
const pagination = document.getElementById("userPagination");
const modal = document.getElementById("userModal");
const modalTitle = document.getElementById("modalTitle");
const u_name = document.getElementById("u_name");
const u_username = document.getElementById("u_username");
const u_role = document.getElementById("u_role");
const u_status = document.getElementById("u_status");
const u_password = document.getElementById("u_password");
const u_confirmPassword = document.getElementById("u_confirmPassword");
const u_email = document.getElementById("u_email");
const u_department = document.getElementById("u_department");

// =========================
// HELPER FUNCTIONS
// =========================
const showToast = (message, type = "success") => {
    let toast = document.querySelector(".user-toast");
    if (!toast) {
        toast = document.createElement("div");
        toast.className = "user-toast";
        document.body.appendChild(toast);
        
        const style = document.createElement("style");
        style.textContent = `
            .user-toast {
                position: fixed;
                bottom: 20px;
                right: 20px;
                padding: 12px 20px;
                border-radius: 8px;
                color: white;
                font-weight: bold;
                z-index: 10000;
                animation: slideIn 0.3s ease;
                max-width: 350px;
            }
            .user-toast.success { background: #28a745; }
            .user-toast.error { background: #dc3545; }
            .user-toast.warning { background: #ffc107; color: #333; }
            .user-toast.info { background: #17a2b8; }
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
        `;
        document.head.appendChild(style);
    }
    
    toast.className = `user-toast ${type}`;
    toast.textContent = message;
    toast.style.display = "block";
    
    setTimeout(() => {
        toast.style.display = "none";
    }, 3000);
};

const escapeHtml = (str) => {
    if (!str) return "";
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
};

const formatDate = (dateString) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return date.toLocaleDateString();
};

// =========================
// AUDIT LOG FUNCTION
// =========================
function addAuditLog({ user, action, details }) {
    let logs = JSON.parse(localStorage.getItem("auditLogs")) || [];
    logs.unshift({
        id: Date.now(),
        date: new Date().toLocaleString(),
        user: user || "System",
        action: action,
        itemName: "User Management",
        description: action,
        details: details
    });
    localStorage.setItem("auditLogs", JSON.stringify(logs));
}

// =========================
// SAVE TO LOCALSTORAGE
// =========================
function saveStorage() {
    localStorage.setItem("users", JSON.stringify(users));
}

// =========================
// VALIDATION FUNCTIONS
// =========================
function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

function validateUsername(username) {
    const re = /^[a-zA-Z0-9_]{3,20}$/;
    return re.test(username);
}

function isUsernameUnique(username, excludeId = null) {
    return !users.some(user => user.username === username && user.id !== excludeId);
}

// =========================
// OPEN MODAL (ENHANCED)
// =========================
function openModal(user = null) {
    modal.style.display = "flex";
    
    // Reset form
    document.querySelectorAll(".modal-box input, .modal-box select").forEach(el => {
        if (el.type !== "button" && el.type !== "submit") {
            el.value = "";
        }
    });
    
    if (user) {
        editId = user.id;
        modalTitle.innerText = "✏️ Edit User";
        u_name.value = user.name || "";
        u_username.value = user.username || "";
        u_role.value = user.role || "";
        u_status.value = user.status || "Active";
        if (u_email) u_email.value = user.email || "";
        if (u_department) u_department.value = user.department || "";
        // Hide password fields on edit
        if (u_password) u_password.style.display = "none";
        if (u_confirmPassword) u_confirmPassword.style.display = "none";
        if (document.querySelector(".password-group")) {
            document.querySelector(".password-group").style.display = "none";
        }
    } else {
        editId = null;
        modalTitle.innerText = "➕ Add New User";
        u_status.value = "Active";
        // Show password fields on add
        if (u_password) u_password.style.display = "block";
        if (u_confirmPassword) u_confirmPassword.style.display = "block";
        if (document.querySelector(".password-group")) {
            document.querySelector(".password-group").style.display = "block";
        }
    }
}

// =========================
// CLOSE MODAL
// =========================
function closeModal() {
    modal.style.display = "none";
    editId = null;
}

// =========================
// SAVE USER (ADD + EDIT) - ENHANCED
// =========================
function saveUser() {
    const name = u_name.value.trim();
    const username = u_username.value.trim();
    const role = u_role.value;
    const status = u_status.value;
    const email = u_email ? u_email.value.trim() : "";
    const department = u_department ? u_department.value.trim() : "";
    const password = u_password ? u_password.value : "";
    const confirmPassword = u_confirmPassword ? u_confirmPassword.value : "";
    
    // Validation
    if (!name) {
        showToast("Please enter full name", "error");
        u_name.focus();
        return;
    }
    
    if (name.length < 2) {
        showToast("Name must be at least 2 characters", "error");
        return;
    }
    
    if (!username) {
        showToast("Please enter username", "error");
        u_username.focus();
        return;
    }
    
    if (!validateUsername(username)) {
        showToast("Username must be 3-20 characters (letters, numbers, underscore only)", "error");
        return;
    }
    
    if (!isUsernameUnique(username, editId)) {
        showToast("Username already exists. Please choose another", "error");
        return;
    }
    
    if (!role) {
        showToast("Please select a role", "error");
        u_role.focus();
        return;
    }
    
    if (email && !validateEmail(email)) {
        showToast("Please enter a valid email address", "error");
        return;
    }
    
    // Password validation for new users
    if (!editId) {
        if (!password) {
            showToast("Please enter password", "error");
            if (u_password) u_password.focus();
            return;
        }
        if (password.length < 6) {
            showToast("Password must be at least 6 characters", "error");
            return;
        }
        if (password !== confirmPassword) {
            showToast("Passwords do not match", "error");
            return;
        }
    }
    
    // Confirm before saving
    if (!confirm(`Save ${editId ? 'changes to' : 'new user'} "${name}"?`)) {
        return;
    }
    
    const currentUser = localStorage.getItem("currentUser") || "Admin";
    
    if (editId) {
        // EDIT EXISTING USER
        const userIndex = users.findIndex(u => u.id === editId);
        if (userIndex !== -1) {
            const oldUser = users[userIndex];
            users[userIndex] = {
                ...users[userIndex],
                name,
                username,
                role,
                status,
                email: email || users[userIndex].email,
                department: department || users[userIndex].department,
                updatedBy: currentUser,
                updatedAt: new Date().toISOString()
            };
            
            addAuditLog({
                user: currentUser,
                action: "Edit User",
                details: `Edited user "${name}" (${username}) | Role: ${role} | Status: ${status}`
            });
            
            showToast(`✓ User "${name}" updated successfully`, "success");
        }
    } else {
        // ADD NEW USER
        const newUser = {
            id: Date.now(),
            name,
            username,
            role,
            status,
            email: email || "",
            department: department || "",
            date: new Date().toISOString().split("T")[0],
            createdBy: currentUser,
            createdAt: new Date().toISOString(),
            password: btoa(password) // Simple encoding (in production, use proper hashing)
        };
        users.push(newUser);
        
        addAuditLog({
            user: currentUser,
            action: "Add User",
            details: `Added new user "${name}" (${username}) | Role: ${role}`
        });
        
        showToast(`✓ User "${name}" added successfully!`, "success");
    }
    
    saveStorage();
    closeModal();
    render();
}

// =========================
// DELETE USER (ENHANCED)
// =========================
function del(id) {
    const user = users.find(u => u.id === id);
    if (!user) return;
    
    // Prevent deleting last Admin
    const adminCount = users.filter(u => u.role === "Admin" && u.status === "Active").length;
    if (user.role === "Admin" && adminCount === 1 && user.status === "Active") {
        showToast("Cannot delete the last active Admin user", "error");
        return;
    }
    
    if (!confirm(`⚠️ Delete user "${user.name}" (${user.username})?\n\nRole: ${user.role}\nStatus: ${user.status}\n\nThis action cannot be undone!`)) {
        return;
    }
    
    const currentUser = localStorage.getItem("currentUser") || "Admin";
    
    addAuditLog({
        user: currentUser,
        action: "Delete User",
        details: `Deleted user "${user.name}" (${user.username}) | Role: ${user.role}`
    });
    
    users = users.filter(u => u.id !== id);
    saveStorage();
    render();
    
    showToast(`✓ User "${user.name}" deleted successfully`, "success");
}

// =========================
// TOGGLE USER STATUS
// =========================
function toggleStatus(id) {
    const user = users.find(u => u.id === id);
    if (!user) return;
    
    const newStatus = user.status === "Active" ? "Inactive" : "Active";
    const currentUser = localStorage.getItem("currentUser") || "Admin";
    
    // Prevent deactivating last Admin
    if (user.role === "Admin" && newStatus === "Inactive") {
        const activeAdmins = users.filter(u => u.role === "Admin" && u.status === "Active").length;
        if (activeAdmins === 1) {
            showToast("Cannot deactivate the last active Admin user", "error");
            return;
        }
    }
    
    if (confirm(`Change status of "${user.name}" from ${user.status} to ${newStatus}?`)) {
        user.status = newStatus;
        saveStorage();
        render();
        
        addAuditLog({
            user: currentUser,
            action: "Toggle Status",
            details: `${newStatus === "Active" ? "Activated" : "Deactivated"} user "${user.name}"`
        });
        
        showToast(`✓ User "${user.name}" is now ${newStatus}`, "success");
    }
}

// =========================
// RENDER USERS TABLE (ENHANCED)
// =========================
function render() {
    if (!table) return;
    
    let searchTerm = searchInput?.value.toLowerCase() || "";
    let roleFilter = currentFilter.role;
    let statusFilter = currentFilter.status;
    
    // Apply filters
    let filtered = users.filter(user => {
        const matchesSearch = searchTerm === "" ||
            user.name.toLowerCase().includes(searchTerm) ||
            user.username.toLowerCase().includes(searchTerm) ||
            user.role.toLowerCase().includes(searchTerm);
        
        const matchesRole = roleFilter === "All" || user.role === roleFilter;
        const matchesStatus = statusFilter === "All" || user.status === statusFilter;
        
        return matchesSearch && matchesRole && matchesStatus;
    });
    
    // Update stats
    updateUserStats(filtered);
    
    // Pagination
    const totalPages = Math.ceil(filtered.length / rowsPerPage) || 1;
    if (userPage > totalPages) userPage = totalPages;
    
    const start = (userPage - 1) * rowsPerPage;
    const pageData = filtered.slice(start, start + rowsPerPage);
    
    // Render table rows
    if (pageData.length === 0) {
        table.innerHTML = `
            <tr>
                <td colspan="7" style="text-align:center; padding: 40px;">
                    <div class="empty-state">
                        <span>👥</span>
                        <p>No users found</p>
                        <small>Try adjusting your search or add a new user</small>
                    </div>
                </td>
            </tr>
        `;
    } else {
        table.innerHTML = pageData.map(user => `
            <tr class="user-row" data-id="${user.id}">
                <td data-label="Name">
                    <div class="user-info">
                        <div class="user-avatar">${user.name.charAt(0).toUpperCase()}</div>
                        <div>
                            <strong>${escapeHtml(user.name)}</strong>
                            ${user.email ? `<br><small>${escapeHtml(user.email)}</small>` : ''}
                        </div>
                    </div>
                </td>
                <td data-label="Username">${escapeHtml(user.username)}</td>
                <td data-label="Role">
                    <span class="role-badge role-${user.role.toLowerCase()}">
                        ${getRoleIcon(user.role)} ${user.role}
                    </span>
                </td>
                <td data-label="Status">
                    <span class="status-badge status-${user.status.toLowerCase()}" onclick="toggleStatus(${user.id})">
                        ${user.status === "Active" ? "🟢" : "🔴"} ${user.status}
                    </span>
                </td>
                <td data-label="Date">${formatDate(user.date)}</td>
                <td data-label="Department">${escapeHtml(user.department || "-")}</td>
                <td data-label="Actions">
                    <button class="edit-btn" onclick="openModal(${JSON.stringify(user).replace(/"/g, '&quot;')})">
                        ✏️ Edit
                    </button>
                    <button class="delete-btn" onclick="del(${user.id})">
                        🗑️ Delete
                    </button>
                </td>
            </tr>
        `).join("");
    }
    
    renderPagination(totalPages, filtered.length);
}

function getRoleIcon(role) {
    switch(role?.toLowerCase()) {
        case "admin": return "👑";
        case "staff": return "👤";
        case "viewer": return "👁️";
        default: return "👥";
    }
}

function updateUserStats(filteredUsers) {
    const totalUsers = filteredUsers.length;
    const activeUsers = filteredUsers.filter(u => u.status === "Active").length;
    const inactiveUsers = filteredUsers.filter(u => u.status === "Inactive").length;
    const adminCount = filteredUsers.filter(u => u.role === "Admin").length;
    const staffCount = filteredUsers.filter(u => u.role === "Staff").length;
    const viewerCount = filteredUsers.filter(u => u.role === "Viewer").length;
    
    // Update stats display if exists
    let statsContainer = document.querySelector(".user-stats");
    if (!statsContainer) {
        statsContainer = document.createElement("div");
        statsContainer.className = "user-stats";
        const header = document.querySelector(".header");
        if (header) header.insertAdjacentElement('afterend', statsContainer);
    }
    
    statsContainer.innerHTML = `
        <div class="stats-grid">
            <div class="stat-card-mini">
                <span class="stat-icon">👥</span>
                <div>
                    <strong>${totalUsers}</strong>
                    <small>Total Users</small>
                </div>
            </div>
            <div class="stat-card-mini">
                <span class="stat-icon">🟢</span>
                <div>
                    <strong>${activeUsers}</strong>
                    <small>Active</small>
                </div>
            </div>
            <div class="stat-card-mini">
                <span class="stat-icon">🔴</span>
                <div>
                    <strong>${inactiveUsers}</strong>
                    <small>Inactive</small>
                </div>
            </div>
            <div class="stat-card-mini">
                <span class="stat-icon">👑</span>
                <div>
                    <strong>${adminCount}</strong>
                    <small>Admins</small>
                </div>
            </div>
            <div class="stat-card-mini">
                <span class="stat-icon">👤</span>
                <div>
                    <strong>${staffCount}</strong>
                    <small>Staff</small>
                </div>
            </div>
            <div class="stat-card-mini">
                <span class="stat-icon">👁️</span>
                <div>
                    <strong>${viewerCount}</strong>
                    <small>Viewers</small>
                </div>
            </div>
        </div>
    `;
}

// =========================
// RENDER PAGINATION
// =========================
function renderPagination(totalPages, totalItems) {
    if (!pagination) return;
    
    pagination.innerHTML = `
        <div class="pagination-controls">
            <button onclick="prevPage()" ${userPage === 1 ? 'disabled' : ''}>
                ◀ Previous
            </button>
            <div class="pagination-numbers">
                ${generatePageNumbers(totalPages)}
            </div>
            <button onclick="nextPage(${totalPages})" ${userPage === totalPages ? 'disabled' : ''}>
                Next ▶
            </button>
        </div>
        <div class="pagination-info">
            Showing ${((userPage - 1) * rowsPerPage) + 1} - ${Math.min(userPage * rowsPerPage, totalItems)} of ${totalItems} users
        </div>
    `;
}

function generatePageNumbers(totalPages) {
    let html = '';
    const maxVisible = 5;
    let startPage = Math.max(1, userPage - Math.floor(maxVisible / 2));
    let endPage = Math.min(totalPages, startPage + maxVisible - 1);
    
    if (endPage - startPage + 1 < maxVisible) {
        startPage = Math.max(1, endPage - maxVisible + 1);
    }
    
    if (startPage > 1) {
        html += `<button onclick="goToPage(1)">1</button>`;
        if (startPage > 2) html += `<span class="dots">...</span>`;
    }
    
    for (let i = startPage; i <= endPage; i++) {
        html += `<button class="${i === userPage ? 'active' : ''}" onclick="goToPage(${i})">${i}</button>`;
    }
    
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) html += `<span class="dots">...</span>`;
        html += `<button onclick="goToPage(${totalPages})">${totalPages}</button>`;
    }
    
    return html;
}

function prevPage() {
    if (userPage > 1) {
        userPage--;
        render();
    }
}

function nextPage(totalPages) {
    if (userPage < totalPages) {
        userPage++;
        render();
    }
}

function goToPage(page) {
    userPage = page;
    render();
}

// =========================
// FILTER FUNCTIONS
// =========================
function filterByRole(role) {
    currentFilter.role = role;
    userPage = 1;
    render();
    showToast(`Filtering by role: ${role}`, "info");
}

function filterByStatus(status) {
    currentFilter.status = status;
    userPage = 1;
    render();
    showToast(`Filtering by status: ${status}`, "info");
}

function resetFilters() {
    currentFilter = { search: "", role: "All", status: "All" };
    if (searchInput) searchInput.value = "";
    userPage = 1;
    render();
    showToast("Filters reset", "info");
}

// =========================
// ADD FILTER BAR TO HTML
// =========================
function addFilterBar() {
    const header = document.querySelector(".header");
    if (header && !document.querySelector(".user-filter-bar")) {
        const filterBar = document.createElement("div");
        filterBar.className = "user-filter-bar";
        filterBar.innerHTML = `
            <div class="filter-group">
                <label>Role:</label>
                <select id="roleFilter" onchange="filterByRole(this.value)">
                    <option value="All">All Roles</option>
                    <option value="Admin">Admin</option>
                    <option value="Staff">Staff</option>
                    <option value="Viewer">Viewer</option>
                </select>
            </div>
            <div class="filter-group">
                <label>Status:</label>
                <select id="statusFilter" onchange="filterByStatus(this.value)">
                    <option value="All">All Status</option>
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                </select>
            </div>
            <div class="filter-group">
                <button onclick="resetFilters()" class="reset-filters-btn">🔄 Reset Filters</button>
            </div>
        `;
        header.insertAdjacentElement('afterend', filterBar);
    }
}

// =========================
// SEARCH EVENT
// =========================
if (searchInput) {
    searchInput.addEventListener("input", () => {
        userPage = 1;
        render();
    });
}

// =========================
// MODAL CLOSE HANDLERS
// =========================
window.onclick = (e) => {
    if (e.target === modal) closeModal();
};

document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeModal();
});

// =========================
// EXPORT USERS FUNCTION
// =========================
function exportUsers() {
    if (users.length === 0) {
        showToast("No users to export", "warning");
        return;
    }
    
    const csvContent = [
        ["Name", "Username", "Role", "Status", "Email", "Department", "Date Created"],
        ...users.map(u => [u.name, u.username, u.role, u.status, u.email || "", u.department || "", u.date])
    ].map(row => row.map(cell => `"${cell}"`).join(",")).join("\n");
    
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.setAttribute("download", `users_export_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    showToast(`✓ Exported ${users.length} users to CSV`, "success");
}

// =========================
// INITIALIZATION
// =========================
function init() {
    addFilterBar();
    render();
    
    // Add export button if not exists
    const headerControls = document.querySelector(".header-controls");
    if (headerControls && !document.querySelector(".export-users-btn")) {
        const exportBtn = document.createElement("button");
        exportBtn.className = "export-users-btn";
        exportBtn.innerHTML = "📥 Export Users";
        exportBtn.onclick = exportUsers;
        headerControls.appendChild(exportBtn);
    }
    
    showToast(`👥 ${users.length} users loaded`, "info");
}

// Start the application
init();