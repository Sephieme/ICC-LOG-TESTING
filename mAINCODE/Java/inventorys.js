// =========================
// ENHANCED INVENTORY.JS
// =========================

// =========================
// STORAGE + INITIAL SETUP
// =========================
let selectedIds = new Set();
let lastNumber = JSON.parse(localStorage.getItem("lastNumber"));
if (lastNumber === null || lastNumber < 1) {
  lastNumber = 0;
}

let items = JSON.parse(localStorage.getItem("items")) || [];
let id = items.length ? Math.max(...items.map(i => i.id)) + 1 : 1;
let filtered = [];
let page = 1;
let rows = 15;
let editId = null;

// =========================
// DOM ELEMENTS
// =========================
const tb = document.getElementById("tb");
const search = document.getElementById("search");
const statusF = document.getElementById("statusF");
const catF = document.getElementById("catF");
const sortEl = document.getElementById("sort");
const pg = document.getElementById("pg");
const selectAll = document.getElementById("selectAll");
const m_img = document.getElementById("m_img");
const previewImg = document.getElementById("previewImg");
const modal = document.getElementById("modal");
const modalTitle = document.getElementById("modalTitle");

let tempImage = "";

// =========================
// HELPER FUNCTIONS
// =========================
const showToast = (message, type = "success") => {
  let toast = document.querySelector(".inventory-toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.className = "inventory-toast";
    document.body.appendChild(toast);
    
    const style = document.createElement("style");
    style.textContent = `
      .inventory-toast {
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
      .inventory-toast.success { background: #28a745; }
      .inventory-toast.error { background: #dc3545; }
      .inventory-toast.warning { background: #ffc107; color: #333; }
      .inventory-toast.info { background: #17a2b8; }
      @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
    `;
    document.head.appendChild(style);
  }
  
  toast.className = `inventory-toast ${type}`;
  toast.textContent = message;
  toast.style.display = "block";
  
  setTimeout(() => {
    toast.style.display = "none";
  }, 3000);
};

const formatDate = (date) => {
  if (!date) return "-";
  return new Date(date).toLocaleDateString();
};

const truncateText = (text, maxLength = 20) => {
  if (!text) return "-";
  return text.length > maxLength ? text.substring(0, maxLength) + "..." : text;
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

// =========================
// AUDIT LOGS
// =========================
function addAuditLog({
  user = "Admin",
  itemCode = "-",
  itemName = "-",
  action = "-",
  description = "-",
  details = "-"
}) {
  let logs = JSON.parse(localStorage.getItem("auditLogs")) || [];
  logs.unshift({
    id: Date.now(),
    date: new Date().toLocaleString(),
    user,
    itemCode,
    itemName,
    action,
    description,
    details
  });
  localStorage.setItem("auditLogs", JSON.stringify(logs));
}

// =========================
// STORAGE SAVE
// =========================
function saveStorage() {
  localStorage.setItem("items", JSON.stringify(items));
  localStorage.setItem("lastNumber", JSON.stringify(lastNumber));
  updateInventoryStats();
}

// =========================
// INVENTORY STATISTICS
// =========================
function updateInventoryStats() {
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalValue = items.length;
  const lowStock = items.filter(item => item.quantity > 0 && item.quantity <= 5).length;
  const outOfStock = items.filter(item => item.quantity === 0).length;
  const available = items.filter(item => item.status === "Available").length;
  const borrowed = items.filter(item => item.status === "Borrowed").length;
  const damaged = items.filter(item => item.status === "Damage").length;
  
  const stats = {
    totalItems: totalValue,
    totalQuantity: totalItems,
    lowStock,
    outOfStock,
    available,
    borrowed,
    damaged,
    timestamp: new Date().toISOString()
  };
  
  localStorage.setItem("inventoryStats", JSON.stringify(stats));
  
  // Update stats display if element exists
  const statsElement = document.getElementById("inventoryStats");
  if (statsElement) {
    statsElement.innerHTML = `
      <div class="stats-grid">
        <div class="stat-card"><span>📦 Total Items:</span> <strong>${totalValue}</strong></div>
        <div class="stat-card"><span>🔢 Total Quantity:</span> <strong>${totalItems}</strong></div>
        <div class="stat-card"><span>⚠️ Low Stock:</span> <strong>${lowStock}</strong></div>
        <div class="stat-card"><span>❌ Out of Stock:</span> <strong>${outOfStock}</strong></div>
        <div class="stat-card"><span>✅ Available:</span> <strong>${available}</strong></div>
        <div class="stat-card"><span>📤 Borrowed:</span> <strong>${borrowed}</strong></div>
      </div>
    `;
  }
}

// =========================
// IMAGE HANDLING
// =========================
m_img.addEventListener("change", function() {
  const file = this.files[0];
  if (!file) return;
  
  // Validate file size (max 2MB)
  if (file.size > 2 * 1024 * 1024) {
    showToast("Image size must be less than 2MB", "error");
    this.value = "";
    return;
  }
  
  // Validate file type
  if (!file.type.startsWith("image/")) {
    showToast("Please select a valid image file", "error");
    this.value = "";
    return;
  }
  
  const reader = new FileReader();
  reader.onload = function(e) {
    tempImage = e.target.result;
    previewImg.src = tempImage;
    previewImg.style.display = "block";
  };
  reader.readAsDataURL(file);
});

// =========================
// RENDER FUNCTION (ENHANCED)
// =========================
function render() {
  let s = search.value.trim().toLowerCase();
  let sf = statusF.value;
  let cf = catF.value;
  let sort = sortEl.value;
  
  // FILTER
  filtered = items.filter(x => {
    let matchSearch = !s ||
      x.name.toLowerCase().includes(s) ||
      x.code.toLowerCase().includes(s) ||
      x.brand.toLowerCase().includes(s) ||
      x.location.toLowerCase().includes(s);
    
    let matchStatus = !sf || x.status === sf;
    let matchCategory = !cf || x.category === cf;
    
    return matchSearch && matchStatus && matchCategory;
  });
  
  // SORT
  if (sort) {
    let [field, dir] = sort.split("-");
    let factor = dir === "asc" ? 1 : -1;
    
    filtered.sort((a, b) => {
      if (field === "name") {
        return a.name.localeCompare(b.name) * factor;
      }
      if (field === "date") {
        return (new Date(a.date) - new Date(b.date)) * factor;
      }
      if (field === "qty") {
        return (a.quantity - b.quantity) * factor;
      }
      return 0;
    });
  }
  
  // PAGINATION
  let totalPages = Math.ceil(filtered.length / rows) || 1;
  if (page > totalPages) page = totalPages;
  
  let start = (page - 1) * rows;
  let data = filtered.slice(start, start + rows);
  
  // RENDER TABLE
  if (!data.length) {
    tb.innerHTML = `<tr><td colspan="12" style="text-align:center;padding:40px;">
      📭 No items found ${s ? `matching "${s}"` : ""}
    </td></tr>`;
  } else {
    tb.innerHTML = data.map(x => `
      <tr class="item-row ${x.quantity <= 5 && x.quantity > 0 ? 'low-stock-row' : ''}" 
          data-id="${x.id}" 
          onclick="toggleRowCheck(${x.id})" 
          onmouseenter="showTooltip(event, ${x.id})" 
          onmousemove="moveTooltip(event)" 
          onmouseleave="hideTooltip()">
        <td><input type="checkbox" class="rowCheck" value="${x.id}" ${selectedIds.has(x.id) ? "checked" : ""}></td>
        <td data-label="Code:">${escapeHtml(x.code)}</td>
        <td data-label="Name:">${escapeHtml(x.name)}</td>
        <td data-label="Category:">${escapeHtml(x.category)}</td>
        <td data-label="Brand:">${escapeHtml(x.brand)}</td>
        <td data-label="Quantity:" class="${x.quantity <= 5 ? 'low-stock-qty' : ''}">${x.quantity}</td>
        <td data-label="Status:">
          <span class="status ${getStatusClass(x.status)}">
            ${x.status}
          </span>
        </td>
        <td data-label="Location:">${escapeHtml(x.location)}</td>
        <td data-label="Date:">${formatDate(x.date)}</td>
        <td data-label="Remarks:" class="remarks-cell" title="${escapeHtml(x.remarks || '-')}">
          ${truncateText(x.remarks, 15)}
        </td>
        <td data-label="Added By:">${escapeHtml(x.addedBy || "Unknown")}</td>
        <td data-label="Actions:">
          <button onclick="edit(${x.id})" class="edit-btn">✏️ Edit</button>
          <button onclick="del(${x.id})" class="delete-btn">🗑️ Delete</button>
        </td>
      </tr>
    `).join('');
  }
  
  pg.innerText = `Page ${page} of ${totalPages}`;
  const totalItemsSpan = document.getElementById("totalItems");
  if (totalItemsSpan) {
    totalItemsSpan.innerHTML = `<strong>📊 Total Items: ${filtered.length}</strong> | 📄 Showing ${data.length} of ${filtered.length}`;
  }
  
  attachCheckboxEvents();
  updateSelectAllState();
}

function getStatusClass(status) {
  switch(status) {
    case "Available": return "av";
    case "Borrowed": return "bo";
    case "Damage": return "dm";
    case "Out-of-Stock": return "os";
    case "Lost": return "lo";
    default: return "";
  }
}

// =========================
// CHECKBOX EVENTS
// =========================
function attachCheckboxEvents() {
  document.querySelectorAll(".rowCheck").forEach(cb => {
    cb.removeEventListener("change", handleCheckboxChange);
    cb.addEventListener("change", handleCheckboxChange);
  });
}

function handleCheckboxChange(e) {
  e.stopPropagation();
  let itemId = Number(this.value);
  if (this.checked) {
    selectedIds.add(itemId);
  } else {
    selectedIds.delete(itemId);
  }
  updateSelectAllState();
}

function updateSelectAllState() {
  if (!filtered.length) {
    selectAll.checked = false;
    return;
  }
  let allSelected = filtered.every(item => selectedIds.has(item.id));
  selectAll.checked = allSelected;
}

selectAll.addEventListener("change", function() {
  if (this.checked) {
    filtered.forEach(item => selectedIds.add(item.id));
  } else {
    filtered.forEach(item => selectedIds.delete(item.id));
  }
  render();
});

// =========================
// MODAL FUNCTIONS
// =========================
function openModal(editData = null) {
  modal.style.display = "flex";
  
  // Reset form
  document.querySelectorAll(".modal-box input, .modal-box select").forEach(el => {
    if (el.type !== "file") {
      el.value = "";
    }
  });
  
  if (editData) {
    modalTitle.innerText = "✏️ Edit Item";
    m_name.value = editData.name;
    m_cat.value = editData.category;
    m_brand.value = editData.brand;
    m_addedBy.value = editData.addedBy || "";
    m_qty.value = editData.quantity;
    m_status.value = editData.quantity === 0 ? "Out-of-Stock" : editData.status;
    m_loc.value = editData.location;
    m_remark.value = editData.remarks || "";
    m_date.value = editData.date;
    
    if (editData.image) {
      tempImage = editData.image;
      previewImg.src = tempImage;
      previewImg.style.display = "block";
    } else {
      previewImg.style.display = "none";
      tempImage = "";
    }
  } else {
    modalTitle.innerText = "➕ Add New Item";
    m_date.value = new Date().toISOString().split("T")[0];
    previewImg.style.display = "none";
    tempImage = "";
  }
  
  m_img.value = "";
}

function closeModal() {
  modal.style.display = "none";
  editId = null;
  tempImage = "";
  previewImg.style.display = "none";
  previewImg.src = "";
}

// =========================
// SAVE ITEM (ENHANCED)
// =========================
function saveItem() {
  const name = m_name.value.trim();
  const qty = Number(m_qty.value);
  const addedBy = m_addedBy.value.trim();
  const remarks = m_remark.value.trim();
  const category = m_cat.value;
  const brand = m_brand.value.trim();
  const location = m_loc.value.trim();
  const date = m_date.value;
  const status = m_status.value;
  
  // VALIDATION
  if (!name) {
    showToast("Item name is required", "error");
    m_name.focus();
    return;
  }
  if (name.length > 40) {
    showToast("Item name must be 40 characters or less", "error");
    return;
  }
  if (!brand) {
    showToast("Brand is required", "error");
    m_brand.focus();
    return;
  }
  if (brand.length > 40) {
    showToast("Brand must be 40 characters or less", "error");
    return;
  }
  if (!addedBy) {
    showToast("Added By is required", "error");
    m_addedBy.focus();
    return;
  }
  if (addedBy.length > 40) {
    showToast("Added By must be 40 characters or less", "error");
    return;
  }
  if (remarks.length > 40) {
    showToast("Remarks must be 40 characters or less", "error");
    return;
  }
  if (isNaN(qty) || qty < 0) {
    showToast("Quantity must be a valid positive number", "error");
    m_qty.focus();
    return;
  }
  if (!location) {
    showToast("Location is required", "error");
    m_loc.focus();
    return;
  }
  if (!date) {
    showToast("Date is required", "error");
    return;
  }
  
  // Determine status based on quantity
  let finalStatus = status;
  if (qty === 0) {
    finalStatus = "Out-of-Stock";
  } else if (qty > 0 && status === "Out-of-Stock") {
    finalStatus = "Available";
  }
  
  const itemData = {
    name,
    category,
    brand,
    quantity: qty,
    status: finalStatus,
    location,
    remarks: remarks || "-",
    addedBy,
    date,
    image: tempImage
  };
  
  // Confirm before saving
  if (!confirm(`Save ${editId ? 'changes to' : 'new item'} "${name}"?`)) {
    return;
  }
  
  if (editId) {
    // EDIT EXISTING ITEM
    const itemIndex = items.findIndex(i => i.id === editId);
    if (itemIndex !== -1) {
      const oldItem = items[itemIndex];
      Object.assign(items[itemIndex], itemData);
      
      addAuditLog({
        user: addedBy,
        itemCode: items[itemIndex].code,
        itemName: name,
        action: "Edit",
        description: "Edited inventory item",
        details: `Quantity changed from ${oldItem.quantity} to ${qty} | Status: ${finalStatus}`
      });
      
      showToast(`✓ "${name}" updated successfully`, "success");
    }
  } else {
    // ADD NEW ITEM
    lastNumber++;
    const newItem = {
      id: id++,
      code: "ICC-" + String(lastNumber).padStart(4, "0"),
      ...itemData
    };
    items.push(newItem);
    
    addAuditLog({
      user: addedBy,
      itemCode: newItem.code,
      itemName: name,
      action: "Add",
      description: "Added new inventory item",
      details: `Quantity: ${qty} | Category: ${category} | Location: ${location}`
    });
    
    showToast(`✓ "${name}" added successfully! Code: ${newItem.code}`, "success");
  }
  
  saveStorage();
  closeModal();
  render();
  loadInventoryStatsDisplay();
}

// =========================
// DELETE FUNCTIONS
// =========================
function del(itemId) {
  const item = items.find(x => x.id === itemId);
  if (!item) return;
  
  if (!confirm(`⚠️ Delete "${item.name}" (${item.code})?\nThis action cannot be undone!`)) {
    return;
  }
  
  addAuditLog({
    user: item.addedBy || "Admin",
    itemCode: item.code,
    itemName: item.name,
    action: "Delete",
    description: "Deleted inventory item",
    details: `Removed from inventory | Quantity: ${item.quantity}`
  });
  
  items = items.filter(x => x.id !== itemId);
  selectedIds.delete(itemId);
  saveStorage();
  render();
  showToast(`✓ "${item.name}" deleted successfully`, "success");
}

function bulkDelete() {
  if (!selectedIds.size) {
    showToast("No items selected for deletion", "warning");
    return;
  }
  
  const selectedItems = items.filter(x => selectedIds.has(x.id));
  const itemNames = selectedItems.map(x => x.name).join(", ");
  
  if (!confirm(`⚠️⚠️⚠️ DELETE ${selectedIds.size} ITEMS?\n\n${itemNames}\n\nThis action cannot be undone!`)) {
    return;
  }
  
  // Audit log for each deleted item
  selectedItems.forEach(item => {
    addAuditLog({
      user: item.addedBy || "Admin",
      itemCode: item.code,
      itemName: item.name,
      action: "Bulk Delete",
      description: "Deleted via bulk delete",
      details: `Removed from inventory | Quantity: ${item.quantity}`
    });
  });
  
  items = items.filter(x => !selectedIds.has(x.id));
  selectedIds.clear();
  saveStorage();
  render();
  showToast(`✓ ${selectedIds.size} items deleted successfully`, "success");
}

// =========================
// EDIT FUNCTION
// =========================
function edit(itemId) {
  const item = items.find(i => i.id === itemId);
  if (!item) {
    showToast("Item not found", "error");
    return;
  }
  editId = itemId;
  openModal(item);
}

// =========================
// PAGINATION
// =========================
function next() {
  let totalPages = Math.ceil(filtered.length / rows) || 1;
  if (page < totalPages) {
    page++;
    render();
  } else {
    showToast("You're on the last page", "info");
  }
}

function prev() {
  if (page > 1) {
    page--;
    render();
  } else {
    showToast("You're on the first page", "info");
  }
}

// =========================
// EXPORT FUNCTIONS
// =========================
function exportPDF() {
  if (items.length === 0) {
    showToast("No items to export", "warning");
    return;
  }
  
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF("landscape");
  
  // Header
  doc.setFontSize(18);
  doc.text("Inventory Report", 14, 15);
  doc.setFontSize(10);
  doc.text("Industrial Controls Corporation", 14, 22);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 29);
  
  // Table data
  const headers = [["Code", "Name", "Category", "Brand", "Qty", "Status", "Location", "Date", "Remarks", "Added By"]];
  const data = items.map(i => [
    i.code, i.name, i.category, i.brand, i.quantity, i.status, 
    i.location, formatDate(i.date), i.remarks || "-", i.addedBy || "Unknown"
  ]);
  
  doc.autoTable({
    head: headers,
    body: data,
    startY: 35,
    theme: "grid",
    styles: { fontSize: 8, cellPadding: 3, valign: "middle" },
    headStyles: { fillColor: [111, 107, 179], textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [245, 245, 245] },
    margin: { left: 10, right: 10 }
  });
  
  const filename = `Inventory_Report_${new Date().toISOString().split("T")[0]}.pdf`;
  doc.save(filename);
  showToast(`✓ Report exported as "${filename}"`, "success");
}

// Add export button listener
const exportBtn = document.querySelector(".export");
if (exportBtn) {
  exportBtn.addEventListener("click", exportPDF);
}

// =========================
// TOOLTIP FUNCTIONS
// =========================
const tooltip = document.getElementById("tooltip");

function showTooltip(event, id) {
  const item = items.find(i => i.id === id);
  if (!item || !tooltip) return;
  
  tooltip.style.display = "block";
  tooltip.innerHTML = `
    <div class="tooltip-content">
      <div class="tooltip-left">
        <div class="tooltip-title">${escapeHtml(item.name)}</div>
        <div class="tooltip-grid">
          <div><b>Code:</b> ${escapeHtml(item.code)}</div>
          <div><b>Category:</b> ${escapeHtml(item.category)}</div>
          <div><b>Brand:</b> ${escapeHtml(item.brand)}</div>
          <div><b>Quantity:</b> ${item.quantity}</div>
          <div><b>Status:</b> ${item.status}</div>
          <div><b>Remarks:</b> ${escapeHtml(item.remarks || "-")}</div>
          <div><b>Location:</b> ${escapeHtml(item.location)}</div>
          <div><b>Date:</b> ${formatDate(item.date)}</div>
          <div><b>Added by:</b> ${escapeHtml(item.addedBy || "Unknown")}</div>
        </div>
      </div>
      <div class="tooltip-right">
        <img src="${item.image || 'https://via.placeholder.com/120x120?text=No+Image'}" alt="${escapeHtml(item.name)}">
      </div>
    </div>
  `;
}

function moveTooltip(event) {
  if (!tooltip || tooltip.style.display !== "block") return;
  
  const tooltipRect = tooltip.getBoundingClientRect();
  const padding = 15;
  let x = event.pageX + padding;
  let y = event.pageY + padding;
  
  if (x + tooltipRect.width > window.innerWidth) {
    x = event.pageX - tooltipRect.width - padding;
  }
  if (y + tooltipRect.height > window.innerHeight) {
    y = event.pageY - tooltipRect.height - padding;
  }
  if (x < 0) x = padding;
  if (y < 0) y = padding;
  
  tooltip.style.left = x + "px";
  tooltip.style.top = y + "px";
}

function hideTooltip() {
  if (tooltip) tooltip.style.display = "none";
}

function toggleRowCheck(id) {
  const cb = document.querySelector(`.rowCheck[value="${id}"]`);
  if (!cb) return;
  cb.checked = !cb.checked;
  if (cb.checked) {
    selectedIds.add(id);
  } else {
    selectedIds.delete(id);
  }
  updateSelectAllState();
}

// =========================
// FILTER & SORT EVENTS
// =========================
[search, statusF, catF, sortEl].forEach(el => {
  if (el) {
    el.addEventListener("input", () => {
      page = 1;
      render();
    });
    el.addEventListener("change", () => {
      page = 1;
      render();
    });
  }
});

// =========================
// MODAL CLOSE HANDLERS
// =========================
window.addEventListener("click", function(e) {
  if (e.target === modal) {
    closeModal();
  }
});

document.addEventListener("keydown", function(e) {
  if (e.key === "Escape") {
    closeModal();
  }
});

// =========================
// LOAD STATS DISPLAY
// =========================
function loadInventoryStatsDisplay() {
  updateInventoryStats();
}

// =========================
// SAMPLE DATA INITIALIZATION
// =========================


// =========================
// INITIALIZATION
// =========================
function init() {
  initSampleData();
  render();
  loadInventoryStatsDisplay();
  
  // Set default date if empty
  if (!m_date.value) {
    m_date.value = new Date().toISOString().split("T")[0];
  }
  
  // Show welcome message
  setTimeout(() => {
    const itemCount = items.length;
    showToast(`📦 Welcome! ${itemCount} item(s) in inventory`, "info");
  }, 500);
}

// Start the application
init();