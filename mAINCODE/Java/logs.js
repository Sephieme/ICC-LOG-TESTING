// =========================
// ENHANCED LOGS.JS WITH FUNCTIONAL FILTERS
// =========================

// =========================
// STORAGE & CONFIGURATION
// =========================
const AUDIT_KEY = "auditLogs";
let auditLogs = JSON.parse(localStorage.getItem(AUDIT_KEY)) || [];

// =========================
// PAGINATION
// =========================
let currentPage = 1;
const rowsPerPage = 10;

// Filter state
let currentFilters = {
    action: "All",
    dateFrom: "",
    dateTo: "",
    search: ""
};

// =========================
// DOM ELEMENTS
// =========================
const searchInput = document.getElementById("searchLog");
const actionFilter = document.getElementById("actionFilter");
const dateFromInput = document.getElementById("dateFrom");
const dateToInput = document.getElementById("dateTo");

// =========================
// HELPER FUNCTIONS
// =========================
const showToast = (message, type = "success") => {
    let toast = document.querySelector(".log-toast");
    if (!toast) {
        toast = document.createElement("div");
        toast.className = "log-toast";
        document.body.appendChild(toast);
        
        const style = document.createElement("style");
        style.textContent = `
            .log-toast {
                position: fixed;
                bottom: 20px;
                right: 20px;
                padding: 12px 20px;
                border-radius: 10px;
                color: white;
                font-weight: bold;
                z-index: 10000;
                animation: slideIn 0.3s ease;
                max-width: 350px;
                box-shadow: 0 5px 15px rgba(0,0,0,0.2);
            }
            .log-toast.success { background: linear-gradient(135deg, #28a745 0%, #20c997 100%); }
            .log-toast.error { background: linear-gradient(135deg, #dc3545 0%, #c82333 100%); }
            .log-toast.warning { background: linear-gradient(135deg, #ffc107 0%, #e0a800 100%); color: #333; }
            .log-toast.info { background: linear-gradient(135deg, #17a2b8 0%, #138496 100%); }
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
        `;
        document.head.appendChild(style);
    }
    
    toast.className = `log-toast ${type}`;
    toast.textContent = message;
    toast.style.display = "block";
    
    setTimeout(() => {
        toast.style.display = "none";
    }, 3000);
};

const formatDate = (dateString) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return date.toLocaleDateString() + " " + date.toLocaleTimeString();
};

const formatTimestamp = (timestamp) => {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    return date.toLocaleDateString();
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

const getActionBadgeClass = (action) => {
    switch(action?.toLowerCase()) {
        case "add": return "action-add";
        case "edit": return "action-edit";
        case "delete": return "action-delete";
        case "bulk delete": return "action-bulk";
        case "borrow": return "action-borrow";
        case "return": return "action-return";
        default: return "action-other";
    }
};

const getActionIcon = (action) => {
    switch(action?.toLowerCase()) {
        case "add": return "➕";
        case "edit": return "✏️";
        case "delete": return "🗑️";
        case "bulk delete": return "⚠️";
        case "borrow": return "📤";
        case "return": return "🔄";
        default: return "📋";
    }
};

const truncateText = (text, maxLength = 50) => {
    if (!text) return "-";
    return text.length > maxLength ? text.substring(0, maxLength) + "..." : text;
};

// =========================
// FILTER FUNCTIONS
// =========================
function applyFilters() {
    // Update filter state from inputs
    currentFilters = {
        action: actionFilter?.value || "All",
        dateFrom: dateFromInput?.value || "",
        dateTo: dateToInput?.value || "",
        search: searchInput?.value.toLowerCase() || ""
    };
    
    currentPage = 1;
    renderAuditLogs();
    updateActiveFiltersDisplay();
    showToast("Filters applied successfully", "success");
}

function resetFilters() {
    // Reset input values
    if (actionFilter) actionFilter.value = "All";
    if (dateFromInput) dateFromInput.value = "";
    if (dateToInput) dateToInput.value = "";
    if (searchInput) searchInput.value = "";
    
    // Reset filter state
    currentFilters = {
        action: "All",
        dateFrom: "",
        dateTo: "",
        search: ""
    };
    
    currentPage = 1;
    renderAuditLogs();
    updateActiveFiltersDisplay();
    showToast("All filters reset", "info");
}

function getFilteredLogs() {
    let filtered = [...auditLogs];
    
    // Search filter
    if (currentFilters.search) {
        filtered = filtered.filter(log =>
            log.user?.toLowerCase().includes(currentFilters.search) ||
            log.itemCode?.toLowerCase().includes(currentFilters.search) ||
            log.itemName?.toLowerCase().includes(currentFilters.search) ||
            log.action?.toLowerCase().includes(currentFilters.search) ||
            log.description?.toLowerCase().includes(currentFilters.search) ||
            log.details?.toLowerCase().includes(currentFilters.search)
        );
    }
    
    // Action filter
    if (currentFilters.action !== "All") {
        filtered = filtered.filter(log => log.action === currentFilters.action);
    }
    
    // Date range filter - From Date
    if (currentFilters.dateFrom) {
        filtered = filtered.filter(log => {
            const logDate = new Date(log.date).toISOString().split("T")[0];
            return logDate >= currentFilters.dateFrom;
        });
    }
    
    // Date range filter - To Date
    if (currentFilters.dateTo) {
        filtered = filtered.filter(log => {
            const logDate = new Date(log.date).toISOString().split("T")[0];
            return logDate <= currentFilters.dateTo;
        });
    }
    
    return filtered;
}

function updateActiveFiltersDisplay() {
    const container = document.getElementById("activeFilters");
    if (!container) return;
    
    const activeFilters = [];
    
    if (currentFilters.action !== "All") {
        activeFilters.push(`<span class="filter-tag">🎯 Action: ${currentFilters.action}</span>`);
    }
    if (currentFilters.dateFrom) {
        activeFilters.push(`<span class="filter-tag">📅 From: ${currentFilters.dateFrom}</span>`);
    }
    if (currentFilters.dateTo) {
        activeFilters.push(`<span class="filter-tag">📅 To: ${currentFilters.dateTo}</span>`);
    }
    if (currentFilters.search) {
        activeFilters.push(`<span class="filter-tag">🔍 Search: "${currentFilters.search}"</span>`);
    }
    
    if (activeFilters.length > 0) {
        container.innerHTML = `
            <div class="active-filters-label">Active Filters:</div>
            <div class="filter-tags">${activeFilters.join('')}</div>
        `;
    } else {
        container.innerHTML = '';
    }
}

// =========================
// STATISTICS
// =========================
function updateAuditStats() {
    const filtered = getFilteredLogs();
    const total = filtered.length;
    const borrow = filtered.filter(x => x.action === "Borrow").length;
    const returns = filtered.filter(x => x.action === "Return").length;
    const system = filtered.filter(x => ["Add", "Edit", "Delete", "Bulk Delete"].includes(x.action)).length;
    
    const totalEl = document.getElementById("totalLogs");
    const borrowEl = document.getElementById("borrowLogs");
    const returnEl = document.getElementById("returnLogs");
    const systemEl = document.getElementById("systemLogs");
    
    if (totalEl) totalEl.innerText = total;
    if (borrowEl) borrowEl.innerText = borrow;
    if (returnEl) returnEl.innerText = returns;
    if (systemEl) systemEl.innerText = system;
    
    // Add visual indication if filters are active
    const hasFilters = currentFilters.action !== "All" || currentFilters.dateFrom || currentFilters.dateTo || currentFilters.search;
    if (hasFilters && total !== auditLogs.length) {
        if (totalEl) totalEl.style.color = "#17a2b8";
        if (borrowEl) borrowEl.style.color = "#17a2b8";
        if (returnEl) returnEl.style.color = "#17a2b8";
        if (systemEl) systemEl.style.color = "#17a2b8";
    } else {
        if (totalEl) totalEl.style.color = "";
        if (borrowEl) borrowEl.style.color = "";
        if (returnEl) returnEl.style.color = "";
        if (systemEl) systemEl.style.color = "";
    }
}

// =========================
// RENDER LOGS
// =========================
function renderAuditLogs() {
    const tb = document.getElementById("auditTable");
    if (!tb) return;
    
    const filtered = getFilteredLogs();
    updateAuditStats();
    
    // Pagination
    const totalPages = Math.ceil(filtered.length / rowsPerPage) || 1;
    if (currentPage > totalPages) currentPage = totalPages;
    
    const start = (currentPage - 1) * rowsPerPage;
    const pageData = filtered.slice(start, start + rowsPerPage);
    
    // Render table
    if (pageData.length === 0) {
        tb.innerHTML = `
            <tr>
                <td colspan="7" style="text-align:center; padding: 60px;">
                    <div class="empty-state">
                        <span>📭</span>
                        <p>No logs found</p>
                        <small>Try adjusting your filters or search</small>
                    </div>
                </td>
            </tr>
        `;
    } else {
        tb.innerHTML = pageData.map(log => {
            const actionClass = getActionBadgeClass(log.action);
            return `
                <tr class="log-row" data-id="${log.id}">
                    <td data-label="Date">
                        <div class="date-cell">
                            <span class="date-main">${escapeHtml(log.date)}</span>
                            <small class="date-tooltip">${formatTimestamp(log.timestamp || log.date)}</small>
                        </div>
                    </td>
                    <td data-label="User">
                        <div class="user-cell">
                            <span class="user-avatar">${escapeHtml(log.user?.charAt(0) || 'A')}</span>
                            <span>${escapeHtml(log.user)}</span>
                        </div>
                    </td>
                    <td data-label="Item Code">
                        <code class="item-code">${escapeHtml(log.itemCode)}</code>
                    </td>
                    <td data-label="Item Name">
                        <strong>${escapeHtml(log.itemName)}</strong>
                    </td>
                    <td data-label="Action">
                        <span class="action-badge ${actionClass}">
                            ${getActionIcon(log.action)} ${escapeHtml(log.action)}
                        </span>
                    </td>
                    <td data-label="Description">
                        <span class="description-text">${escapeHtml(log.description)}</span>
                    </td>
                    <td data-label="Details">
                        <span class="details-text" title="${escapeHtml(log.details)}">
                            ${truncateText(log.details, 50)}
                        </span>
                    </td>
                </tr>
            `;
        }).join('');
    }
    
    renderPagination(totalPages, filtered.length);
}

function renderPagination(totalPages, totalItems) {
    let container = document.getElementById("auditPagination");
    
    if (!container) {
        container = document.createElement("div");
        container.id = "auditPagination";
        container.className = "pagination-container";
        const tableCard = document.querySelector(".table-card");
        if (tableCard) tableCard.appendChild(container);
    }
    
    if (totalPages <= 1 && totalItems === 0) {
        container.innerHTML = "";
        return;
    }
    
    container.innerHTML = `
        <div class="pagination">
            <button ${currentPage === 1 ? "disabled" : ""} onclick="changePage(${currentPage - 1})">
                ◀ Previous
            </button>
            <span class="pagination-info">Page ${currentPage} of ${totalPages}</span>
            <button ${currentPage === totalPages ? "disabled" : ""} onclick="changePage(${currentPage + 1})">
                Next ▶
            </button>
        </div>
        <div class="pagination-stats">
            Showing ${((currentPage - 1) * rowsPerPage) + 1} - ${Math.min(currentPage * rowsPerPage, totalItems)} of ${totalItems} logs
        </div>
    `;
}

function changePage(page) {
    if (page < 1) return;
    currentPage = page;
    renderAuditLogs();
}

// =========================
// CLEAR LOGS
// =========================
function clearLogs() {
    const logCount = auditLogs.length;
    
    if (logCount === 0) {
        showToast("No logs to clear", "warning");
        return;
    }
    
    if (confirm(`⚠️ WARNING: This will permanently delete ${logCount} audit log(s).\n\nThis action cannot be undone!\n\nClick OK to confirm.`)) {
        auditLogs = [];
        localStorage.removeItem(AUDIT_KEY);
        currentPage = 1;
        renderAuditLogs();
        updateAuditStats();
        showToast(`✓ Cleared ${logCount} audit log(s)`, "success");
    }
}

// =========================
// ADD AUDIT LOG (for other pages to use)
// =========================
function addAuditLog({
    user = "Admin",
    itemCode = "-",
    itemName = "-",
    action = "-",
    description = "-",
    details = "-"
}) {
    const log = {
        id: Date.now(),
        date: new Date().toLocaleString(),
        timestamp: new Date().toISOString(),
        user: user || "System",
        itemCode: itemCode || "-",
        itemName: itemName || "-",
        action: action || "-",
        description: description || "-",
        details: details || "-"
    };

    auditLogs.unshift(log);
    localStorage.setItem(AUDIT_KEY, JSON.stringify(auditLogs));
    
    renderAuditLogs();
    updateAuditStats();
}

// =========================
// EVENT LISTENERS
// =========================
if (searchInput) {
    searchInput.addEventListener("input", () => {
        currentFilters.search = searchInput.value.toLowerCase();
        currentPage = 1;
        renderAuditLogs();
        updateActiveFiltersDisplay();
    });
}

// Auto-apply filters when select or date changes
if (actionFilter) {
    actionFilter.addEventListener("change", () => {
        applyFilters();
    });
}

if (dateFromInput) {
    dateFromInput.addEventListener("change", () => {
        applyFilters();
    });
}

if (dateToInput) {
    dateToInput.addEventListener("change", () => {
        applyFilters();
    });
}

// Keyboard shortcut for search
document.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        if (searchInput) searchInput.focus();
    }
});

// =========================
// INITIALIZATION
// =========================
document.addEventListener("DOMContentLoaded", () => {
    renderAuditLogs();
    updateAuditStats();
    
    // Set default date range for better UX (optional)
    // const today = new Date().toISOString().split("T")[0];
    // const lastMonth = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    // if (dateFromInput) dateFromInput.value = lastMonth;
    // if (dateToInput) dateToInput.value = today;
    
    showToast(`📋 ${auditLogs.length} audit logs loaded`, "info");
});