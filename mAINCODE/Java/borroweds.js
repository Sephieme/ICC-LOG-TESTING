// ======================
// COMPLETE BORROWED.JS WITH AUTO CODE 39 BARCODE SCANNING
// ======================

// ==========================
// GLOBAL VARIABLES
// ==========================
let currentPage = 1;
const rowsPerPage = 10;
let items = JSON.parse(localStorage.getItem("items")) || [];
let borrowed = JSON.parse(localStorage.getItem("borrowed")) || [];
let currentReturnId = null;
let selectedBorrowIds = new Set();
let cameraStream = null;
let isScanning = false;
let barcodeDetector = null;
let lastScannedBarcode = null;
let lastScanTimestamp = 0;

// DOM Elements
const $ = id => document.getElementById(id);
const borrowTB = $("borrowTB");
const borrowItemSelect = $("borrowItem");
const searchBorrow = $("searchBorrow");
const selectAllBorrowed = $("selectAllBorrowed");

// ==========================
// HELPER FUNCTIONS
// ==========================
const showToast = (message, type = "success") => {
    let toast = document.querySelector(".borrow-toast");
    if (!toast) {
        toast = document.createElement("div");
        toast.className = "borrow-toast";
        document.body.appendChild(toast);
    }
    toast.className = `borrow-toast ${type}`;
    toast.textContent = message;
    toast.style.display = "block";
    setTimeout(() => { toast.style.display = "none"; }, 3000);
};

const formatDate = (date) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString();
};

const escapeHtml = (str) => {
    if (!str) return "";
    return str.replace(/[&<>]/g, m => m === '&' ? '&amp;' : m === '<' ? '&lt;' : '&gt;');
};

const isOverdue = (returnDate) => {
    if (!returnDate) return false;
    const today = new Date().toISOString().split("T")[0];
    return returnDate < today;
};

// ==========================
// AUDIT LOG FUNCTION
// ==========================
function addAuditLog({ user, action, itemCode, itemName, details }) {
    let logs = JSON.parse(localStorage.getItem("auditLogs")) || [];
    logs.unshift({
        id: Date.now(),
        date: new Date().toLocaleString(),
        timestamp: new Date().toISOString(),
        user: user || "System",
        action: action,
        itemCode: itemCode || "-",
        itemName: itemName || "-",
        description: action,
        details: details
    });
    localStorage.setItem("auditLogs", JSON.stringify(logs));
}

// ==========================
// SAVE DATA
// ==========================
const saveData = () => {
    localStorage.setItem("items", JSON.stringify(items));
    localStorage.setItem("borrowed", JSON.stringify(borrowed));
};

// ==========================
// PROCESS RETURN (UNIFIED)
// ==========================
function processReturn(borrowData, returnQty, condition, returnedBy, remarks, isBulk = false) {
    const item = items.find(i => i.id === borrowData.itemId);
    if (!item) { showToast("Original item not found", "error"); return false; }
    
    if (condition === "Good") {
        item.quantity += returnQty;
        item.status = item.quantity > 0 ? "Available" : "Out-of-Stock";
        if (!isBulk) showToast(`✓ ${returnQty}x ${item.name} returned`, "success");
    } else if (condition === "Damaged") {
        item.status = "Damage";
        if (!isBulk) showToast(`⚠️ ${item.name} marked as damaged`, "warning");
    } else if (condition === "Lost") {
        item.status = "Lost";
        if (!isBulk) showToast(`⚠️ ${item.name} marked as lost`, "warning");
    }
    
    borrowData.qty -= returnQty;
    
    let returned = JSON.parse(localStorage.getItem("returned")) || [];
    returned.push({
        id: Date.now(), code: borrowData.code, itemName: borrowData.itemName,
        borrower: borrowData.borrower, department: borrowData.department,
        returnQty, condition, remarks: remarks || "No remarks", returnedBy,
        borrowDate: borrowData.borrowDate, returnDate: new Date().toISOString().split("T")[0],
        timestamp: new Date().toISOString(), bulkReturn: isBulk
    });
    localStorage.setItem("returned", JSON.stringify(returned));
    
    addAuditLog({
        user: returnedBy, action: isBulk ? "Bulk Return" : "Return",
        itemCode: borrowData.code, itemName: borrowData.itemName,
        details: `Returned ${returnQty}x | Condition: ${condition} | Remarks: ${remarks || "None"}`
    });
    
    return true;
}

// ==========================
// LOAD INVENTORY OPTIONS
// ==========================
function loadInventoryOptions() {
    if (!borrowItemSelect) return;
    const availableItems = items.filter(i => i.quantity > 0);
    borrowItemSelect.innerHTML = `<option value="">Choose Item</option>` +
        availableItems.map(i => `<option value="${i.id}" data-max-qty="${i.quantity}">${i.code} - ${i.name} (${i.quantity} available)</option>`).join("");
}

// ==========================
// BORROW ITEM (MANUAL)
// ==========================
function borrowItem() {
    const itemId = parseInt(borrowItemSelect.value);
    const borrower = $("borrower")?.value.trim();
    const department = $("department")?.value.trim();
    const qty = parseInt($("borrowQty")?.value);
    const borrowDate = $("borrowDate")?.value;
    const returnDate = $("returnDate")?.value;
    const purpose = $("purpose")?.value.trim();
    
    if (!itemId) { showToast("Please select an item", "error"); return; }
    if (!borrower) { showToast("Borrower name is required", "error"); return; }
    if (!department) { showToast("Department is required", "error"); return; }
    if (!qty || qty <= 0) { showToast("Please enter a valid quantity", "error"); return; }
    if (!borrowDate) { showToast("Please select borrow date", "error"); return; }
    if (!returnDate) { showToast("Please select expected return date", "error"); return; }
    if (new Date(returnDate) < new Date(borrowDate)) { showToast("Return date cannot be before borrow date", "error"); return; }
    
    const item = items.find(i => i.id === itemId);
    if (!item) { showToast("Item not found", "error"); return; }
    if (qty > item.quantity) { showToast(`Only ${item.quantity} item(s) available`, "error"); return; }
    
    item.quantity -= qty;
    item.status = item.quantity === 0 ? "Out-of-Stock" : "Borrowed";
    
    borrowed.push({
        id: Date.now(), code: item.code, itemId: item.id, itemName: item.name,
        borrower, department, qty, borrowDate, returnDate, purpose,
        status: "Borrowed", borrowedBy: borrower, timestamp: new Date().toISOString()
    });
    
    saveData();
    addAuditLog({ user: borrower, action: "Borrow", itemCode: item.code, itemName: item.name, details: `Borrowed ${qty}x ${item.name}` });
    
    $("borrower").value = ""; $("department").value = ""; $("borrowQty").value = "1"; $("purpose").value = "";
    borrowItemSelect.value = "";
    $("borrowDate").value = new Date().toISOString().split("T")[0];
    const defaultReturn = new Date(); defaultReturn.setDate(defaultReturn.getDate() + 7);
    $("returnDate").value = defaultReturn.toISOString().split("T")[0];
    
    loadInventoryOptions();
    renderBorrowed();
    updateBorrowStats();
    showToast(`✓ Successfully borrowed ${qty}x "${item.name}"`, "success");
    closeBorrowModal();
}

// ==========================
// AUTO BORROW FROM BARCODE (NO CONFIRMATION)
// ==========================
async function autoBorrowFromBarcode(barcodeValue) {
    const now = Date.now();

if (
    barcodeValue === lastScannedBarcode &&
    now - lastScanTimestamp < 3000
) {
    console.log("Duplicate scan prevented");
    return false;
}

lastScannedBarcode = barcodeValue;
lastScanTimestamp = now;

    const normalizedBarcode = normalizeCode39(barcodeValue);
    
    if (!isValidCode39(normalizedBarcode)) {
        showToast(`Invalid Code 39 format: "${normalizedBarcode}"`, "error");
        return false;
    }
    
    // Find item by barcode
    let item = items.find(i => i.barcode === normalizedBarcode);
    
    if (!item) {
        // Fallback: search by item code
        item = items.find(i => i.code === normalizedBarcode);
    }
    
    if (!item) {
        showToast(`Item not found for barcode: ${normalizedBarcode}`, "error");
        return false;
    }
    
    if (item.quantity <= 0) {
        showToast(`${item.name} is out of stock`, "error");
        return false;
    }
    
    // Prepare borrow data
    const borrower = "Barcode Scanner";
    const department = "Quick Borrow";
    const qty = 1;
    const borrowDate = new Date().toISOString().split("T")[0];
    const returnDate = new Date();
    returnDate.setDate(returnDate.getDate() + 7);
    const purpose = `Auto-borrowed via Code 39 barcode: ${normalizedBarcode}`;
    
    // Update item quantity
    item.quantity -= qty;
    item.status = item.quantity === 0 ? "Out-of-Stock" : "Borrowed";
    
    // Add to borrowed records
    borrowed.push({
        id: Date.now(),
        code: item.code,
        itemId: item.id,
        itemName: item.name,
        borrower: borrower,
        department: department,
        qty: qty,
        borrowDate: borrowDate,
        returnDate: returnDate.toISOString().split("T")[0],
        purpose: purpose,
        status: "Borrowed",
        borrowedBy: borrower,
        barcodeScanned: normalizedBarcode,
        timestamp: new Date().toISOString()
    });
    
    // Save data
    saveData();
    
    // Add audit log
    addAuditLog({
        user: borrower,
        action: "Auto Borrow (Barcode)",
        itemCode: item.code,
        itemName: item.name,
        details: `Auto-borrowed ${qty}x ${item.name} via Code 39 barcode: ${normalizedBarcode}`
    });
    
    // Refresh UI
    loadInventoryOptions();
    renderBorrowed();
    updateBorrowStats();
    
    showToast(`✓ Auto-borrowed: ${item.name} (${item.code})`, "success");
    
    // Close modal if open
    closeBorrowModal();
    
    return true;
}

// ==========================
// UPDATE STATISTICS
// ==========================
function updateBorrowStats() {
    const totalBorrowed = borrowed.length;
    const totalQuantity = borrowed.reduce((sum, item) => sum + item.qty, 0);
    const overdueCount = borrowed.filter(item => isOverdue(item.returnDate)).length;
    
    let statsContainer = $("borrow-stats");
    if (statsContainer) {
        statsContainer.innerHTML = `
            <div class="stats-grid">
                <div class="stat-card-mini"><span class="stat-icon">📋</span><div><strong>${totalBorrowed}</strong><small>Active Borrows</small></div></div>
                <div class="stat-card-mini"><span class="stat-icon">🔢</span><div><strong>${totalQuantity}</strong><small>Total Items</small></div></div>
                <div class="stat-card-mini"><span class="stat-icon">⚠️</span><div><strong>${overdueCount}</strong><small>Overdue</small></div></div>
                <div class="stat-card-mini"><span class="stat-icon">👥</span><div><strong>${borrowed.length}</strong><small>Borrowers</small></div></div>
            </div>
        `;
    }
}

// ==========================
// RENDER BORROWED TABLE
// ==========================
function renderBorrowed() {
    if (!borrowTB) return;
    const searchTerm = searchBorrow?.value.toLowerCase() || "";
    let filtered = borrowed.filter(x =>
        x.itemName?.toLowerCase().includes(searchTerm) ||
        x.borrower?.toLowerCase().includes(searchTerm) ||
        x.code?.toLowerCase().includes(searchTerm)
    );
    filtered = filtered.map(item => ({ ...item, isOverdue: isOverdue(item.returnDate) && item.status === "Borrowed" }));
    
    const totalPages = Math.ceil(filtered.length / rowsPerPage) || 1;
    if (currentPage > totalPages) currentPage = totalPages;
    const pageItems = filtered.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);
    
    if (pageItems.length === 0) {
        borrowTB.innerHTML = `<tr><td colspan="10" style="text-align:center; padding: 60px;"><div class="empty-state"><span>📭</span><p>No borrowed items found</p></div></td></tr>`;
    } else {
        borrowTB.innerHTML = pageItems.map(x => `
            <tr class="borrow-row ${x.isOverdue ? 'overdue-row' : ''}" onclick="toggleRowCheckbox(${x.id})">
                <td data-label="Select" onclick="event.stopPropagation()"><input type="checkbox" class="borrow-checkbox" id="chk_${x.id}" value="${x.id}" ${selectedBorrowIds.has(x.id) ? 'checked' : ''} onchange="updateBorrowSelectionFromCheckbox(${x.id}, this.checked)"></td>
                <td data-label="Code"><code>${escapeHtml(x.code)}</code></td>
                <td data-label="Item"><strong>${escapeHtml(x.itemName)}</strong></td>
                <td data-label="Borrower">${escapeHtml(x.borrower)}</td>
                <td data-label="Department">${escapeHtml(x.department)}</td>
                <td data-label="Qty">${x.qty}</td>
                <td data-label="Borrowed">${formatDate(x.borrowDate)}</td>
                <td data-label="Return" class="${x.isOverdue ? 'overdue-date' : ''}">${formatDate(x.returnDate)}${x.isOverdue ? '<span class="overdue-badge">⚠️ Overdue!</span>' : ''}</td>
                <td data-label="Status"><span class="status-badge borrowed">📤 ${x.status}</span></td>
                <td data-label="Action" onclick="event.stopPropagation()"><button class="return-btn" onclick="openReturnModal(${x.id})">🔄 Return</button></td>
            </tr>`).join('');
    }
    
    let pagination = $("pagination");
    if (pagination) {
        pagination.innerHTML = `
            <div class="pagination-controls">
                <button onclick="goToPage(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''}>◀ Previous</button>
                <span class="pagination-info">Page ${currentPage} of ${totalPages}</span>
                <button onclick="goToPage(${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''}>Next ▶</button>
            </div>
            <div class="pagination-stats">Showing ${((currentPage - 1) * rowsPerPage) + 1} - ${Math.min(currentPage * rowsPerPage, filtered.length)} of ${filtered.length} borrows</div>
        `;
    }
    updateSelectAllState();
    updateBulkReturnButton();
}

function goToPage(page) { if (page < 1) return; currentPage = page; renderBorrowed(); }

// ==========================
// BULK RETURN UI FUNCTIONS
// ==========================
function toggleRowCheckbox(id) {
    const checkbox = $(`chk_${id}`);
    if (checkbox) {
        checkbox.checked = !checkbox.checked;
        if (checkbox.checked) selectedBorrowIds.add(id);
        else selectedBorrowIds.delete(id);
        updateSelectAllState();
        updateBulkReturnButton();
    }
}

function updateBorrowSelectionFromCheckbox(id, isChecked) {
    if (isChecked) selectedBorrowIds.add(id);
    else selectedBorrowIds.delete(id);
    updateSelectAllState();
    updateBulkReturnButton();
}

function updateSelectAllState() {
    if (!selectAllBorrowed) return;
    const checkboxes = document.querySelectorAll('.borrow-checkbox');
    if (checkboxes.length === 0) { selectAllBorrowed.checked = false; return; }
    selectAllBorrowed.checked = Array.from(checkboxes).every(cb => cb.checked);
}

function toggleSelectAll() {
    if (!selectAllBorrowed) return;
    const isChecked = selectAllBorrowed.checked;
    document.querySelectorAll('.borrow-checkbox').forEach(cb => {
        cb.checked = isChecked;
        const id = parseInt(cb.value);
        if (isChecked) selectedBorrowIds.add(id);
        else selectedBorrowIds.delete(id);
    });
    updateBulkReturnButton();
}

function updateBulkReturnButton() {
    let bulkBtn = document.querySelector(".bulk-return-btn");
    const count = selectedBorrowIds.size;
    if (count > 0) {
        if (!bulkBtn) {
            const container = document.querySelector(".table-actions");
            if (container) {
                bulkBtn = document.createElement("button");
                bulkBtn.className = "bulk-return-btn";
                bulkBtn.onclick = openBulkReturnModal;
                container.prepend(bulkBtn);
            }
        }
        if (bulkBtn) bulkBtn.innerHTML = `📦 Bulk Return (${count})`;
    } else if (bulkBtn) bulkBtn.remove();
}

// ==========================
// SINGLE RETURN MODAL
// ==========================
function openReturnModal(id) {
    const data = borrowed.find(x => x.id === id);
    if (!data) { showToast("Record not found", "error"); return; }
    currentReturnId = id;
    $("r_code").value = data.code;
    $("r_name").value = data.itemName;
    $("r_borrower").value = data.borrower;
    $("r_department").value = data.department;
    $("r_borrowQty").value = data.qty;
    $("r_returnQty").value = data.qty;
    $("r_borrowDate").value = formatDate(data.borrowDate);
    $("r_returnDate").value = formatDate(data.returnDate);
    $("r_condition").value = "";
    $("r_returnedBy").value = "";
    $("r_remarks").value = "";
    $("returnModal").style.display = "flex";
}

function closeReturnModal() { $("returnModal").style.display = "none"; currentReturnId = null; }

function confirmSingleReturn() {
    const data = borrowed.find(x => x.id === currentReturnId);
    if (!data) { showToast("Record not found", "error"); return; }
    const qty = parseInt($("r_returnQty").value);
    const condition = $("r_condition").value;
    const returnedBy = $("r_returnedBy").value.trim();
    const remarks = $("r_remarks").value.trim();
    
    if (!qty || qty <= 0) { showToast("Invalid quantity", "error"); return; }
    if (qty > data.qty) { showToast(`Max return is ${data.qty}`, "error"); return; }
    if (!condition) { showToast("Select condition", "error"); return; }
    if (!returnedBy) { showToast("Enter returned by name", "error"); return; }
    
    if (processReturn(data, qty, condition, returnedBy, remarks, false)) {
        if (data.qty <= 0) borrowed = borrowed.filter(x => x.id !== currentReturnId);
        saveData();
        closeReturnModal();
        loadInventoryOptions();
        renderBorrowed();
        updateBorrowStats();
        showToast("✓ Return successful", "success");
    }
}

// ==========================
// BULK RETURN MODAL
// ==========================
function openBulkReturnModal() {
    if (selectedBorrowIds.size === 0) { showToast("No items selected", "warning"); return; }
    const selected = borrowed.filter(b => selectedBorrowIds.has(b.id));
    const totalQty = selected.reduce((s, i) => s + i.qty, 0);
    
    $("bulkSummary").innerHTML = `
        <div class="summary-item"><span>📋 Items:</span><strong>${selectedBorrowIds.size}</strong></div>
        <div class="summary-item"><span>🔢 Total Qty:</span><strong>${totalQty}</strong></div>
        <div class="summary-item"><span>👥 Borrowers:</span><strong>${selected.length}</strong></div>
    `;
    $("bulkItemsList").innerHTML = `
        <label>Selected Items:</label><ul>
        ${selected.map(i => `<li><strong>${escapeHtml(i.code)}</strong> - ${escapeHtml(i.itemName)} (x${i.qty})<br><small>Borrower: ${escapeHtml(i.borrower)}</small></li>`).join('')}
        </ul>
    `;
    $("bulk_condition").value = "";
    $("bulk_returnedBy").value = "";
    $("bulk_remarks").value = "";
    $("bulkReturnModal").style.display = "flex";
}

function closeBulkReturnModal() { $("bulkReturnModal").style.display = "none"; }

function confirmBulkReturn() {
    const condition = $("bulk_condition").value;
    const returnedBy = $("bulk_returnedBy").value.trim();
    const remarks = $("bulk_remarks").value.trim();
    const selected = borrowed.filter(b => selectedBorrowIds.has(b.id));
    
    if (!condition) { showToast("Select condition", "error"); return; }
    if (!returnedBy) { showToast("Enter your name", "error"); return; }
    
    let success = 0;
    selected.forEach(data => {
        if (processReturn(data, data.qty, condition, returnedBy, remarks, true)) {
            if (data.qty <= 0) borrowed = borrowed.filter(b => b.id !== data.id);
            success++;
        }
    });
    
    selectedBorrowIds.clear();
    saveData();
    closeBulkReturnModal();
    loadInventoryOptions();
    renderBorrowed();
    updateBorrowStats();
    showToast(`✓ Bulk return: ${success} items returned`, "success");
}

// ==========================
// CODE 39 BARCODE SCANNING FUNCTIONS
// ==========================

// Initialize Barcode Detector
async function initBarcodeDetector() {
    if ('BarcodeDetector' in window) {
        try {
            barcodeDetector = new BarcodeDetector({ formats: ['code_39'] });
            console.log('Barcode Detector initialized for Code 39');
            return true;
        } catch (e) {
            console.log('BarcodeDetector not fully supported:', e);
            return false;
        }
    }
    return false;
}

// Validate Code 39 barcode format
function isValidCode39(barcode) {
    if (!barcode || typeof barcode !== 'string') return false;
    const code39Pattern = /^[A-Z0-9\-. $/+%]{1,30}$/;
    return code39Pattern.test(barcode.trim());
}

// Normalize Code 39 barcode
function normalizeCode39(barcode) {

    if (!barcode) return "";

    let cleaned = barcode
        .trim()
        .toUpperCase()
        .replace(/\s+/g, '');

    if (cleaned.startsWith('*') && cleaned.endsWith('*')) {
        cleaned = cleaned.slice(1, -1);
    }

    return cleaned;
}

// Setup barcode upload - AUTO BORROW
function setupBarcodeUpload() {
    const barcodeInput = $("barcodeInput");

    if (!barcodeInput) return;

    barcodeInput.addEventListener("change", async function (e) {
        const file = e.target.files[0];

        if (!file) return;

        showToast("🔍 Reading barcode image...", "info");

        const reader = new FileReader();

        reader.onload = function (event) {

            Quagga.decodeSingle({
                src: event.target.result,

                numOfWorkers: 0,

                inputStream: {
                    size: 1200
                },

                locator: {
                    patchSize: "large",
                    halfSample: false
                },

                decoder: {
                    readers: [
                        "code_39_reader",
                        "code_128_reader"
                    ]
                },

                locate: true

            }, async function (result) {

                if (result && result.codeResult) {

                    let barcodeValue = result.codeResult.code;

                    console.log("Detected barcode:", barcodeValue);

                    barcodeValue = normalizeCode39(barcodeValue);

                    showToast(`✅ Barcode Detected: ${barcodeValue}`, "success");

                    // AUTO BORROW
                    await autoBorrowFromBarcode(barcodeValue);

                } else {

                    showToast("❌ No barcode detected in image", "error");

                }

                barcodeInput.value = "";

            });

        };

        reader.readAsDataURL(file);
    });
}
// Capture and scan from camera
async function captureAndScan() {
    const video = $("video");
    const canvas = $("canvas");
    
    if (!video || !canvas) return;
    
    showToast("📸 Capturing and scanning...", "info");
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0);
    
    canvas.toBlob(async (blob) => {
        const img = new Image();
        img.src = URL.createObjectURL(blob);
        img.onload = async () => {
            if (barcodeDetector) {
                try {
                    const barcodes = await barcodeDetector.detect(img);
                    if (barcodes && barcodes.length > 0) {
                        const barcodeValue = barcodes[0].rawValue;
                        await autoBorrowFromBarcode(barcodeValue);
                        stopCamera();
                    } else {
                        showToast("No barcode detected", "warning");
                    }
                } catch (err) {
                    showToast("Error scanning: " + err.message, "error");
                }
            } else {
                showToast("Please use manual entry", "warning");
            }
            URL.revokeObjectURL(img.src);
        };
    }, 'image/jpeg');
}

// Continuous camera scanning
async function scanBarcodeContinuous() {
    if (!isScanning) return;
    
    const video = $("video");
    if (!video || video.readyState !== video.HAVE_ENOUGH_DATA) {
        requestAnimationFrame(scanBarcodeContinuous);
        return;
    }
    
    if (barcodeDetector) {
        try {
            const barcodes = await barcodeDetector.detect(video);
            if (barcodes && barcodes.length > 0) {
                const barcodeValue = barcodes[0].rawValue;
                if (window.lastScanTime && Date.now() - window.lastScanTime < 3000) {
                    requestAnimationFrame(scanBarcodeContinuous);
                    return;
                }
                window.lastScanTime = Date.now();
                console.log("Continuous scan detected:", barcodeValue);
                stopCamera();
                await autoBorrowFromBarcode(barcodeValue);
                return;
            }
        } catch (err) {
            // Continue scanning
        }
    }
    
    requestAnimationFrame(scanBarcodeContinuous);
}

// Start camera
async function startCamera() {
    const hasDetector = await initBarcodeDetector();
    
    if (!hasDetector) {
        showToast("Barcode detection not supported. Please upload an image instead.", "warning");
        return;
    }
    
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: "environment" } 
        });
        const video = $("video");
        if (video) {
            video.srcObject = stream;
            video.play();
            cameraStream = stream;
            isScanning = true;
            showToast("📷 Camera started. Point at a Code 39 barcode.", "info");
            scanBarcodeContinuous();
        }
    } catch (err) {
        showToast("Camera access denied", "error");
    }
}

// Stop camera
function stopCamera() {
    isScanning = false;
    if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
        cameraStream = null;
    }
    const video = $("video");
    if (video) {
        video.srcObject = null;
    }
}

// Manual barcode entry
function manualBarcodeLookup() {
    const manualInput = $("manualBarcode");
    if (!manualInput) return;
    
    const barcodeValue = manualInput.value.trim();
    if (!barcodeValue) {
        showToast("Please enter a barcode value", "warning");
        return;
    }
    
    autoBorrowFromBarcode(barcodeValue);
    manualInput.value = "";
}

// Update inventory with barcode fields
function updateInventoryForBarcode() {
    let updated = false;
    items.forEach(item => {
        if (!item.barcode) {
            item.barcode = normalizeCode39(item.code);
            updated = true;
        }
    });
    if (updated) {
        saveData();
        console.log('Updated inventory with barcode fields');
    }
}

// ==========================
// MODAL FUNCTIONS
// ==========================
function openBorrowModal() {
    $("borrowModal").style.display = "flex";
    $("borrowDate").value = new Date().toISOString().split("T")[0];
    const defaultReturn = new Date(); defaultReturn.setDate(defaultReturn.getDate() + 7);
    $("returnDate").value = defaultReturn.toISOString().split("T")[0];
}

function closeBorrowModal() { 
    $("borrowModal").style.display = "none"; 
    stopCamera();
}

// ==========================
// EXPORT FUNCTION
// ==========================
function exportBorrowedPDF() {
    if (borrowed.length === 0) { showToast("No data to export", "warning"); return; }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF("landscape");
    doc.setFontSize(16); doc.text("Borrowed Items Report", 14, 15);
    doc.setFontSize(10); doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 22);
    doc.autoTable({
        startY: 30,
        head: [["Code", "Item", "Borrower", "Department", "Qty", "Borrow Date", "Return Date", "Status", "Purpose"]],
        body: borrowed.map(i => [i.code, i.itemName, i.borrower, i.department, i.qty, formatDate(i.borrowDate), formatDate(i.returnDate), i.status, i.purpose || "-"]),
        headStyles: { fillColor: [111, 107, 179] }
    });
    doc.save(`Borrowed_Report_${new Date().toISOString().split("T")[0]}.pdf`);
    showToast("✓ PDF exported", "success");
}

// ==========================
// EVENT LISTENERS
// ==========================
if (searchBorrow) searchBorrow.addEventListener("input", () => { currentPage = 1; renderBorrowed(); });
if (borrowItemSelect) borrowItemSelect.addEventListener("change", function() {
    const max = this.options[this.selectedIndex]?.dataset?.maxQty || 0;
    if ($("borrowQty")) { $("borrowQty").max = max; if (parseInt($("borrowQty").value) > max) $("borrowQty").value = max; }
});
if (selectAllBorrowed) selectAllBorrowed.addEventListener("change", toggleSelectAll);
window.addEventListener("click", e => {
    if (e.target === $("borrowModal")) closeBorrowModal();
    if (e.target === $("returnModal")) closeReturnModal();
    if (e.target === $("bulkReturnModal")) closeBulkReturnModal();
});
document.addEventListener("keydown", e => { if (e.key === "Escape") { closeBorrowModal(); closeReturnModal(); closeBulkReturnModal(); stopCamera(); } });

// ==========================
// INITIALIZATION
// ==========================
async function init() {
    await initBarcodeDetector();
    setupBarcodeUpload();
    updateInventoryForBarcode();
    loadInventoryOptions();
    renderBorrowed();
    updateBorrowStats();
    const overdue = borrowed.filter(i => isOverdue(i.returnDate)).length;
    if (overdue > 0) setTimeout(() => showToast(`⚠️ ${overdue} item(s) overdue!`, "warning"), 500);
}

init();