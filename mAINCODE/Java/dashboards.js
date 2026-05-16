// =========================
// ENHANCED DASHBOARD.JS
// =========================

// =========================
// GLOBAL VARIABLES
// =========================
let inventory = JSON.parse(localStorage.getItem("items")) || [];
let auditLogs = JSON.parse(localStorage.getItem("auditLogs")) || [];
let refreshInterval = null;

// =========================
// DOM ELEMENTS
// =========================
const statusSelect = document.getElementById("statusSelect");
const refreshBtn = document.getElementById("refreshBtn");

// =========================
// CONFIGURATION
// =========================
const INVENTORY_STATUS_LIMIT = 10;  // Show 10 items in inventory status

// =========================
// HELPER FUNCTIONS
// =========================
const showToast = (message, type = "success") => {
  let toast = document.querySelector(".dashboard-toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.className = "dashboard-toast";
    document.body.appendChild(toast);
    
    const style = document.createElement("style");
    style.textContent = `
      .dashboard-toast {
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
      .dashboard-toast.success { background: #28a745; }
      .dashboard-toast.error { background: #dc3545; }
      .dashboard-toast.warning { background: #ffc107; color: #333; }
      .dashboard-toast.info { background: #17a2b8; }
      @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
    `;
    document.head.appendChild(style);
  }
  
  toast.className = `dashboard-toast ${type}`;
  toast.textContent = message;
  toast.style.display = "block";
  
  setTimeout(() => {
    toast.style.display = "none";
  }, 3000);
};

const formatNumber = (num) => {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
};

const getStatusIcon = (status) => {
  switch(status) {
    case "Available": return "";
    case "Borrowed": return "";
    case "Damage": return "";
    case "Out-of-Stock": return "";
    case "Lost": return "";
    default: return "";
  }
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

const formatTimestamp = (timestamp) => {
  if (!timestamp) return "-";
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

// =========================
// DASHBOARD STATS
// =========================
function loadDashboardStats() {
  const totalItems = inventory.length;
  const totalQuantity = inventory.reduce((sum, i) => sum + i.quantity, 0);
  const availableItems = inventory.filter(i => i.status === "Available").length;
  const borrowedItems = inventory.filter(i => i.status === "Borrowed").length;
  const outOfStockItems = inventory.filter(i => i.status === "Out-of-Stock").length;
  const lostItems = inventory.filter(i => i.status === "Lost").length;
  const damageItems = inventory.filter(i => i.status === "Damage").length;

  // Update stat cards
  const statCards = document.querySelectorAll(".stat-card");
  if (statCards.length >= 4) {
    statCards[0].querySelector("h3").innerHTML = `${formatNumber(totalItems)} <small style="font-size:12px;">items</small>`;
    statCards[1].querySelector("h3").innerHTML = formatNumber(totalQuantity);
    statCards[2].querySelector("h3").innerHTML = `${formatNumber(availableItems)} <small style="font-size:12px;">items</small>`;
    statCards[3].querySelector("h3").innerHTML = `${formatNumber(borrowedItems)} <small style="font-size:12px;">items</small>`;
  }
  
  // Update inventory overview table
  updateInventoryOverview(availableItems, borrowedItems, damageItems, outOfStockItems, lostItems, totalItems);
}

function updateInventoryOverview(available, borrowed, damage, outOfStock, lost, total) {
  const overviewRows = document.querySelectorAll(".inventory-overview tbody tr");
  if (overviewRows.length >= 5) {
    const totalSafe = total || 1;
    
    overviewRows[0].innerHTML = `
      <td data-label="Status"><span class="status-available"> Available</span></td>
      <td data-label="Total">${formatNumber(available)}</td>
      <td data-label="Percentage">
        <div class="progress-bar">
          <div class="progress-fill available-fill" style="width: ${(available / totalSafe) * 100}%"></div>
          <span>${((available / totalSafe) * 100).toFixed(1)}%</span>
        </div>
      </td>
    `;
    
    overviewRows[1].innerHTML = `
      <td data-label="Status"><span class="status-borrowed"> Borrowed</span></td>
      <td data-label="Total">${formatNumber(borrowed)}</td>
      <td data-label="Percentage">
        <div class="progress-bar">
          <div class="progress-fill borrowed-fill" style="width: ${(borrowed / totalSafe) * 100}%"></div>
          <span>${((borrowed / totalSafe) * 100).toFixed(1)}%</span>
        </div>
      </td>
    `;
    
    overviewRows[2].innerHTML = `
      <td data-label="Status"><span class="status-damage"> Damage</span></td>
      <td data-label="Total">${formatNumber(damage)}</td>
      <td data-label="Percentage">
        <div class="progress-bar">
          <div class="progress-fill damage-fill" style="width: ${(damage / totalSafe) * 100}%"></div>
          <span>${((damage / totalSafe) * 100).toFixed(1)}%</span>
        </div>
      </td>
    `;
    
    overviewRows[3].innerHTML = `
      <td data-label="Status"><span class="status-out"> Out-of-Stock</span></td>
      <td data-label="Total">${formatNumber(outOfStock)}</td>
      <td data-label="Percentage">
        <div class="progress-bar">
          <div class="progress-fill out-fill" style="width: ${(outOfStock / totalSafe) * 100}%"></div>
          <span>${((outOfStock / totalSafe) * 100).toFixed(1)}%</span>
        </div>
      </td>
    `;
    
    overviewRows[4].innerHTML = `
      <td data-label="Status"><span class="status-lost"> Lost</span></td>
      <td data-label="Total">${formatNumber(lost)}</td>
      <td data-label="Percentage">
        <div class="progress-bar">
          <div class="progress-fill lost-fill" style="width: ${(lost / totalSafe) * 100}%"></div>
          <span>${((lost / totalSafe) * 100).toFixed(1)}%</span>
        </div>
      </td>
    `;
  }
}

// =========================
// INVENTORY STATUS TABLE (10 ITEMS)
// =========================
function loadInventoryStatus(status = "All") {
  const tbody = document.querySelector(".inventory-status-table tbody");
  if (!tbody) return;
  
  let filtered = inventory.filter(i => status === "All" ? true : i.status === status);
  
  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding:30px;">
      📭 No ${status !== "All" ? status : ""} items found
    </td></tr>`;
    return;
  }
  
  // Sort by recently added and limit to 10 items
  filtered = filtered.sort((a, b) => b.id - a.id).slice(0, INVENTORY_STATUS_LIMIT);
  
  tbody.innerHTML = filtered.map(item => `
    <tr onclick="window.location.href='inventory.html'" style="cursor:pointer;">
      <td data-label="Name">
        <div class="item-info">
          <strong>${escapeHtml(item.name)}</strong>
          <small>${escapeHtml(item.code)}</small>
        </div>
      </td>
      <td data-label="Category">${escapeHtml(item.category)}</td>
      <td data-label="Quantity" class="${item.quantity <= 5 ? 'low-stock' : ''}">
        ${item.quantity}
        ${item.quantity <= 5 && item.quantity > 0 ? '<span class="low-stock-badge">⚠️ Low</span>' : ''}
      </td>
      <td data-label="Status">
        <span class="status-badge ${item.status.toLowerCase().replace('-', '')}">
          ${getStatusIcon(item.status)} ${item.status}
        </span>
      </td>
    </tr>
  `).join("");
}

// =========================
// STATUS DROPDOWN FILTER
// =========================
if (statusSelect) {
  statusSelect.addEventListener("change", () => {
    const selectedStatus = statusSelect.value;
    loadInventoryStatus(selectedStatus);
    showToast(`Showing ${selectedStatus === "All" ? "all" : selectedStatus} items`, "info");
  });
}

// =========================
// RECENT ACTIVITIES
// =========================
// =========================
// RECENT ACTIVITIES
// =========================
function loadRecentActivities(limit = 5) {
  const container = document.querySelector(".recent-activity");
  if (!container) return;
  
  // Update the table content without rebuilding the entire structure
  const tbody = document.querySelector(".recent-activities-table tbody");
  if (!tbody) return;
  
  const sortedLogs = [...auditLogs].sort((a, b) => b.id - a.id).slice(0, limit);
  
  if (sortedLogs.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:40px;">
      📭 No recent activity
    </td></tr>`;
  } else {
    tbody.innerHTML = sortedLogs.map(log => {
      const actionClass = getActionClass(log.action);
      return `
        <tr class="activity-row">
          <td data-label="User">
            <div class="user-info">
              <span class="user-avatar">${log.user?.charAt(0) || 'A'}</span>
              ${escapeHtml(log.user || "System")}
            </div>
           </td>
          <td data-label="Item Name"><strong>${escapeHtml(log.itemName)}</strong><br><small>${escapeHtml(log.itemCode)}</small></td>  <!-- Changed data-label from "Item" to "Item Name" -->
          <td data-label="Action"><span class="action-badge ${actionClass}">${log.action}</span></td>
          <td data-label="Details">${escapeHtml(log.details || "-")}</td>
          <td data-label="Date"><span class="timestamp">${formatTimestamp(log.date || log.timestamp)}</span></td>
        </tr>
      `;
    }).join("");
  }
}

function getActionClass(action) {
  switch(action?.toLowerCase()) {
    case "add": return "action-add";
    case "edit": return "action-edit";
    case "delete": return "action-delete";
    case "borrow": return "action-borrow";
    case "return": return "action-return";
    default: return "action-other";
  }
}

// =========================
// REFRESH FUNCTIONS
// =========================
function refreshDashboard() {
  // Reload data from localStorage
  inventory = JSON.parse(localStorage.getItem("items")) || [];
  auditLogs = JSON.parse(localStorage.getItem("auditLogs")) || [];
  
  // Update all dashboard components
  loadDashboardStats();
  loadInventoryStatus(statusSelect ? statusSelect.value : "All");
  loadRecentActivities(5);
  
  showToast("Dashboard refreshed successfully!", "success");
}

function refreshActivities() {
  loadRecentActivities(10);
  showToast("Activities refreshed!", "info");
}

function viewAllActivities() {
  // Redirect to audit logs page
  window.location.href = "log.html";
}

// =========================
// AUTO-REFRESH SETUP
// =========================
function startAutoRefresh(intervalSeconds = 30) {
  if (refreshInterval) clearInterval(refreshInterval);
  refreshInterval = setInterval(() => {
    refreshDashboard();
  }, intervalSeconds * 1000);
}

function stopAutoRefresh() {
  if (refreshInterval) {
    clearInterval(refreshInterval);
    refreshInterval = null;
  }
}

// =========================
// INITIALIZATION
// =========================
function initDashboard() {
  // Load initial data
  refreshDashboard();
  
  // Start auto-refresh every 30 seconds
  startAutoRefresh(30);
  
  // Add refresh button listener
  if (refreshBtn) {
    refreshBtn.addEventListener("click", refreshDashboard);
  }
  
  // Show welcome message
  setTimeout(() => {
    const itemCount = inventory.length;
    showToast(`📊 Dashboard ready! ${itemCount} items in inventory`, "info");
  }, 500);
  
  // Handle page visibility (stop auto-refresh when tab is hidden)
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      stopAutoRefresh();
    } else {
      startAutoRefresh(30);
      refreshDashboard();
    }
  });
}

// Start the dashboard
initDashboard();