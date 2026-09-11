// NDIS Contractor Support Coordinator Invoice System JavaScript
// Advanced Multi-Participant Batch Claiming & Master Statement Engine

let state = {
  provider: {
    name: "Richa Patel",
    business_name: "Richa Patel",
    account_name: "Richa Patel",
    abn: "88 475 952 165",
    address: "8/41 McMinn Street, Darwin City NT 0800",
    email_phone: "ripatel291202@gmail.com",
    bank_name: "Westpac Bank",
    bsb: "732-273",
    account_number: "502413"
  },
  customer: {
    name: "Top End Support Collective",
    attention: "Kerrie Toll",
    abn: "",
    address: "1 Palmerston cct",
    reference: "Fortnightly Subcontract Claim"
  },
  batch: {
    reference: "Fortnightly Claim (01 Sep - 14 Sep 2026)",
    claim_date: "07 Sep 2026",
    due_date: "21 Sep 2026"
  },
  rates: {
    source_rate: 45.28,
    subcontract_percent: 100,
    subcontract_rate: 45.28,
    source_rate_desc: "$45.28 / hr agreed rate"
  },
  active_tab: "master", // "master" or numeric index in state.participants
  participants: [
    {
      id: "",
      name: "",
      ndis_number: "",
      address: "",
      support_category: "Support Coordination",
      support_item: "07_002_0106_8_3",
      initials: "",
      invoice_number: "1",
      invoice_date: "07 Sep 2026",
      invoice_due: "21 Sep 2026",
      claim_type: "Standard",
      gst_treatment: "GST-free NDIS support",
      items: [
        {
          service_period: "12 Aug 2026",
          support_delivered: "Coordination of Supports - Level 2",
          support_item: "07_002_0106_8_3",
          minutes: 60,
          hours: 1.00,
          amount: 45.28
        }
      ]
    }
  ]
};

// Available participants list
let participantsList = [];

// Initialize on load
document.addEventListener("DOMContentLoaded", async () => {
  await loadSettings();
  await loadParticipants();
  if (participantsList.length > 0 && !state.participants[0].name) {
    const first = participantsList[0];
    state.participants[0].id = first.id;
    state.participants[0].name = first.name;
    state.participants[0].ndis_number = first.ndis_number || "";
    state.participants[0].address = first.address || "";
    state.participants[0].support_item = first.support_item || "07_002_0106_8_3";
    state.participants[0].initials = first.initials || "";
  }
  initFormValues();
  switchTab("master"); // Start on Master Final Bill for Owner
  setupEventListeners();
});

async function loadSettings() {
  try {
    const res = await fetch("/api/settings");
    if (res.ok) {
      const settings = await res.json();
      if (settings.provider) state.provider = { ...state.provider, ...settings.provider };
      if (settings.customer) state.customer = { ...state.customer, ...settings.customer };
      if (settings.hourly_rate) state.rates.subcontract_rate = parseFloat(settings.hourly_rate);
    }
  } catch (e) {
    console.error("Failed to load settings:", e);
  }
}

async function loadParticipants() {
  try {
    const res = await fetch("/api/participants");
    if (res.ok) {
      participantsList = await res.json();
      populateParticipantDropdown();
    }
  } catch (e) {
    console.error("Failed to load participants:", e);
  }
}

function populateParticipantDropdown() {
  const select = document.getElementById("sel-participant");
  if (!select) return;
  select.innerHTML = "";
  
  const currentP = getActiveParticipant();
  let hasMatch = false;

  if (participantsList.length === 0) {
    const emptyOpt = document.createElement("option");
    emptyOpt.value = "new";
    emptyOpt.textContent = "➕ No saved profiles (Type details to add)";
    emptyOpt.selected = true;
    select.appendChild(emptyOpt);
    return;
  }

  participantsList.forEach((p, idx) => {
    const opt = document.createElement("option");
    opt.value = idx;
    opt.textContent = `${p.name} (NDIS: ${p.ndis_number || 'N/A'})`;
    if (currentP && currentP.name && p.name.toLowerCase() === currentP.name.toLowerCase()) {
      opt.selected = true;
      hasMatch = true;
    }
    select.appendChild(opt);
  });

  const customOpt = document.createElement("option");
  customOpt.value = "new";
  customOpt.textContent = "➕ Add New Participant...";
  if (!hasMatch) {
    customOpt.selected = true;
  }
  select.appendChild(customOpt);
}

// Delete Selected Participant Profile from Saved List
async function deleteCurrentParticipant() {
  const select = document.getElementById("sel-participant");
  if (!select || select.value === "new") {
    alert("Please select a saved participant from the dropdown to delete.");
    return;
  }
  const idx = parseInt(select.value);
  if (isNaN(idx) || !participantsList[idx]) {
    alert("No valid saved participant selected.");
    return;
  }
  const pToDelete = participantsList[idx];
  if (!confirm(`Are you sure you want to permanently delete "${pToDelete.name}" from your saved participant profiles?`)) {
    return;
  }

  const pid = pToDelete.id;
  try {
    const res = await fetch(`/api/participants/${encodeURIComponent(pid)}`, {
      method: "DELETE"
    });
    if (res.ok) {
      const data = await res.json();
      participantsList = data.participants || [];
    } else {
      participantsList.splice(idx, 1);
      await fetch("/api/participants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(participantsList)
      });
    }
    populateParticipantDropdown();
    switchToNewParticipantMode();
    alert(`🗑️ "${pToDelete.name}" was successfully deleted from your saved profiles.`);
  } catch (err) {
    alert("Error deleting participant.");
  }
}

// Helpers for Participant Calculations
function getActiveParticipant() {
  if (state.active_tab === "master" || typeof state.active_tab !== "number") {
    return state.participants[0] || null;
  }
  return state.participants[state.active_tab] || state.participants[0] || null;
}

function getParticipantTotal(p) {
  if (!p || !p.items) return 0;
  return p.items.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
}

function getParticipantHours(p) {
  if (!p || !p.items) return 0;
  return p.items.reduce((sum, item) => sum + (parseFloat(item.hours) || 0), 0);
}

function getParticipantMinutes(p) {
  if (!p || !p.items) return 0;
  return p.items.reduce((sum, item) => sum + (parseFloat(item.minutes) || 0), 0);
}

function getBatchTotals() {
  let totalHours = 0;
  let grandTotal = 0;
  state.participants.forEach(p => {
    totalHours += getParticipantHours(p);
    grandTotal += getParticipantTotal(p);
  });
  return {
    totalHours: Math.round(totalHours * 100) / 100,
    grandTotal: Math.round(grandTotal * 100) / 100,
    count: state.participants.length
  };
}

// Render the Tab Ribbon at top of sidebar
function renderBatchRibbon() {
  const list = document.getElementById("batch-tabs-list");
  if (!list) return;
  list.innerHTML = "";

  const totals = getBatchTotals();
  const mobileBadge = document.getElementById("mobile-badge-total");
  if (mobileBadge) mobileBadge.textContent = `$${totals.grandTotal.toFixed(2)}`;

  // 1. Master Tab (Always first)
  const masterTab = document.createElement("button");
  masterTab.type = "button";
  masterTab.className = `batch-tab master-tab ${state.active_tab === "master" ? "active" : ""}`;
  masterTab.innerHTML = `
    <span>📑 Master Final Bill</span>
    <span class="tab-badge">$${totals.grandTotal.toFixed(2)}</span>
  `;
  masterTab.onclick = () => switchTab("master");
  list.appendChild(masterTab);

  // 2. Participant Tabs
  state.participants.forEach((p, idx) => {
    const pTot = getParticipantTotal(p);
    const tab = document.createElement("button");
    tab.type = "button";
    tab.className = `batch-tab ${state.active_tab === idx ? "active" : ""}`;
    
    const pName = p.name ? (p.name.length > 14 ? p.name.substring(0, 12) + "..." : p.name) : `Participant ${idx + 1}`;
    tab.innerHTML = `
      <span>👤 ${escapeHtml(pName)}</span>
      <span class="tab-badge">$${pTot.toFixed(2)}</span>
      ${state.participants.length > 1 ? `<span class="tab-close-btn" title="Remove Participant from this claim" onclick="event.stopPropagation(); removeParticipantFromBatch(${idx})">&times;</span>` : `<span class="tab-close-btn" title="Clear this participant" onclick="event.stopPropagation(); removeParticipantFromBatch(${idx})">&times;</span>`}
    `;
    tab.onclick = () => switchTab(idx);
    list.appendChild(tab);
  });
}

// Switch between Master Bill and Individual Participant Tabs
function switchTab(tabId) {
  state.active_tab = tabId;

  const masterPanel = document.getElementById("panel-master-controls");
  const partPanel = document.getElementById("panel-participant-controls");
  const masterSheet = document.getElementById("master-bill-sheet");
  const invoiceSheet = document.getElementById("invoice-sheet");

  if (tabId === "master") {
    if (masterPanel) masterPanel.style.display = "block";
    if (partPanel) partPanel.style.display = "none";
    if (masterSheet) masterSheet.style.display = "block";
    if (invoiceSheet) invoiceSheet.style.display = "none";

    renderMasterPreview();
    updateMasterSideStats();
  } else {
    if (masterPanel) masterPanel.style.display = "none";
    if (partPanel) partPanel.style.display = "block";
    if (masterSheet) masterSheet.style.display = "none";
    if (invoiceSheet) invoiceSheet.style.display = "block";

    initFormValuesForActiveParticipant();
    populateParticipantDropdown();
    renderLineItemsEditor();
    renderLivePreview();
  }

  renderBatchRibbon();
}

// Add a new participant to the batch claim
function addParticipantToBatch(preset = null) {
  const maxInv = state.participants.reduce((max, p) => {
    const n = parseInt(p.invoice_number) || 0;
    return n > max ? n : max;
  }, 0);
  const nextInv = String(maxInv + 1);

  if (!preset) {
    // Pick first saved participant not already in the batch
    const usedNames = new Set(state.participants.map(p => (p.name || '').toLowerCase()));
    const available = participantsList.find(p => !usedNames.has(p.name.toLowerCase()));
    if (available) {
      preset = { ...available };
    } else {
      preset = {
        name: `Participant ${state.participants.length + 1}`,
        ndis_number: "",
        address: "",
        support_item: "07_002_0106_8_3",
        support_category: "Support Coordination"
      };
    }
  }

  const newPart = {
    id: preset.id || preset.name.toLowerCase().replace(/[^a-z0-9]/g, "_"),
    name: preset.name,
    ndis_number: preset.ndis_number || "",
    address: preset.address || "",
    support_category: preset.support_category || "Support Coordination",
    support_item: preset.support_item || "07_002_0106_8_3",
    initials: preset.initials || (preset.name ? preset.name.split(" ").map(w => w[0]).join("").toUpperCase() : ""),
    invoice_number: nextInv,
    invoice_date: state.batch.claim_date || "07 Sep 2026",
    invoice_due: state.batch.due_date || "21 Sep 2026",
    claim_type: "Standard",
    gst_treatment: "GST-free NDIS support",
    items: [
      {
        service_period: state.batch.claim_date || "12 Aug 2026",
        support_delivered: "Coordination of Supports - Level 2",
        support_item: preset.support_item || "07_002_0106_8_3",
        minutes: 60,
        hours: 1.00,
        amount: Math.round(1.00 * state.rates.subcontract_rate * 100) / 100
      }
    ]
  };

  state.participants.push(newPart);
  switchTab(state.participants.length - 1);
}

// Remove participant from batch claim
function removeParticipantFromBatch(idx) {
  if (state.participants.length <= 1) {
    if (confirm("Clear this participant details to start fresh with a blank invoice?")) {
      switchToNewParticipantMode();
    }
    return;
  }
  const pName = state.participants[idx].name || `Participant ${idx + 1}`;
  if (confirm(`Remove "${pName}" from this claim?`)) {
    state.participants.splice(idx, 1);
    if (state.active_tab === idx) {
      switchTab("master");
    } else if (typeof state.active_tab === "number" && state.active_tab > idx) {
      state.active_tab--;
      switchTab(state.active_tab);
    } else {
      renderBatchRibbon();
      renderMasterPreview();
      updateMasterSideStats();
    }
  }
}

// Initialize form inputs
function initFormValues() {
  // Provider
  setVal("inp-provider-name", state.provider.name);
  setVal("inp-provider-abn", state.provider.abn);
  setVal("inp-provider-address", state.provider.address);
  setVal("inp-provider-email-phone", state.provider.email_phone);
  setVal("inp-bank-account-name", state.provider.account_name || state.provider.name);
  setVal("inp-bank-name", state.provider.bank_name);
  setVal("inp-bank-bsb", state.provider.bsb);
  setVal("inp-bank-account", state.provider.account_number);

  // Customer
  setVal("inp-customer-name", state.customer.name);
  setVal("inp-customer-attention", state.customer.attention);
  setVal("inp-customer-address", state.customer.address);
  setVal("inp-customer-ref", state.customer.reference);

  // Batch details
  setVal("inp-batch-ref", state.batch.reference);
  setVal("inp-batch-date", state.batch.claim_date);
  setVal("inp-batch-due", state.batch.due_date);

  // Rate
  setVal("inp-subcontract-rate", state.rates.subcontract_rate);
  updateRates();
}

function initFormValuesForActiveParticipant() {
  const p = getActiveParticipant();
  if (!p) return;

  setVal("inp-part-name", p.name);
  setVal("inp-part-ndis", p.ndis_number);
  setVal("inp-part-address", p.address || "");
  setVal("inp-part-item", p.support_item);

  setVal("inp-inv-number", p.invoice_number);
  setVal("inp-inv-date", p.invoice_date);
  setVal("inp-inv-due", p.invoice_due);

  const badge = document.getElementById("badge-part-mode");
  if (badge) {
    badge.className = "status-badge-blue";
    badge.textContent = `Invoice #${p.invoice_number}`;
  }
}

function setVal(id, val) {
  const el = document.getElementById(id);
  if (el && val !== undefined) el.value = val;
}

// Hourly Rate updates
function updateRates() {
  const subRate = parseFloat(document.getElementById("inp-subcontract-rate")?.value || 45.28);
  
  state.rates.source_rate = subRate;
  state.rates.subcontract_rate = subRate;
  state.rates.source_rate_desc = `$${subRate.toFixed(2)} / hr agreed rate`;

  const badge = document.getElementById("subcontract-rate-badge");
  if (badge) {
    badge.textContent = `$${subRate.toFixed(2)} / hr`;
  }

  // Recalculate all participant item amounts
  state.participants.forEach(p => {
    p.items.forEach(item => {
      item.amount = Math.round(item.hours * subRate * 100) / 100;
    });
  });

  if (state.active_tab === "master") {
    renderMasterPreview();
    updateMasterSideStats();
  } else {
    renderLineItemsEditor();
    renderLivePreview();
  }
  renderBatchRibbon();
}

function renderLineItemsEditor() {
  const container = document.getElementById("line-items-container");
  if (!container) return;
  container.innerHTML = "";

  const p = getActiveParticipant();
  if (!p) return;

  p.items.forEach((item, index) => {
    const row = document.createElement("div");
    row.className = "item-edit-row";
    row.id = `item-row-${index}`;
    row.innerHTML = `
      ${p.items.length > 1 ? `<button type="button" class="remove-item-btn" title="Remove Item" onclick="removeItem(${index})">&times;</button>` : ''}
      <div class="form-row">
        <div class="form-group">
          <label>Service Date</label>
          <input type="text" value="${escapeHtml(item.service_period)}" oninput="updateItemField(${index}, 'service_period', this.value)" placeholder="e.g. 12 Aug 2026">
        </div>
        <div class="form-group">
          <label>Support Item Code</label>
          <input type="text" value="${escapeHtml(item.support_item)}" oninput="updateItemField(${index}, 'support_item', this.value)" placeholder="07_002_0106_8_3">
        </div>
      </div>
      <div class="form-group">
        <label>Support Activity Delivered</label>
        <input type="text" value="${escapeHtml(item.support_delivered)}" oninput="updateItemField(${index}, 'support_delivered', this.value)" placeholder="Coordination of Supports - Level 2">
      </div>
      <div class="form-row-3">
        <div class="form-group">
          <label>Minutes</label>
          <input type="number" step="1" min="0" id="item-minutes-${index}" value="${item.minutes}" oninput="updateItemMinutes(${index}, this.value)" placeholder="60">
          <div class="minute-presets">
            <span style="font-size:10px; color:#64748b;">Quick:</span>
            <button type="button" class="minute-preset-btn" onclick="applyMinutePreset(${index}, 30)">30m</button>
            <button type="button" class="minute-preset-btn" onclick="applyMinutePreset(${index}, 45)">45m</button>
            <button type="button" class="minute-preset-btn" onclick="applyMinutePreset(${index}, 60)">60m</button>
            <button type="button" class="minute-preset-btn" onclick="applyMinutePreset(${index}, 90)">90m</button>
            <button type="button" class="minute-preset-btn" onclick="applyMinutePreset(${index}, 120)">120m</button>
          </div>
        </div>
        <div class="form-group">
          <label>Hours (Auto)</label>
          <input type="number" step="0.01" min="0" id="item-hours-${index}" value="${item.hours.toFixed(2)}" oninput="updateItemHours(${index}, this.value)">
        </div>
        <div class="form-group">
          <label>Amount ($)</label>
          <input type="text" id="item-amount-${index}" readonly style="background:#f1f5f9; font-weight:bold; color:#104e8b;" value="$${item.amount.toFixed(2)}">
        </div>
      </div>
    `;
    container.appendChild(row);
  });
}

function updateItemField(index, field, value) {
  const p = getActiveParticipant();
  if (p && p.items[index]) {
    p.items[index][field] = value;
    renderLivePreview();
  }
}

function updateItemMinutes(index, minVal) {
  const p = getActiveParticipant();
  if (!p || !p.items[index]) return;
  const mins = parseFloat(minVal) || 0;
  const hrs = Math.round((mins / 60) * 100) / 100;
  const amt = Math.round(hrs * state.rates.subcontract_rate * 100) / 100;
  
  p.items[index].minutes = mins;
  p.items[index].hours = hrs;
  p.items[index].amount = amt;

  const hrsEl = document.getElementById(`item-hours-${index}`);
  const amtEl = document.getElementById(`item-amount-${index}`);
  if (hrsEl) hrsEl.value = hrs.toFixed(2);
  if (amtEl) amtEl.value = `$${amt.toFixed(2)}`;

  renderLivePreview();
  renderMasterPreview();
  updateMasterSideStats();
  renderBatchRibbon();
}

function updateItemHours(index, hrsVal) {
  const p = getActiveParticipant();
  if (!p || !p.items[index]) return;
  const hrs = parseFloat(hrsVal) || 0;
  const mins = Math.round(hrs * 60);
  const amt = Math.round(hrs * state.rates.subcontract_rate * 100) / 100;

  p.items[index].hours = hrs;
  p.items[index].minutes = mins;
  p.items[index].amount = amt;

  const minsEl = document.getElementById(`item-minutes-${index}`);
  const amtEl = document.getElementById(`item-amount-${index}`);
  if (minsEl) minsEl.value = mins;
  if (amtEl) amtEl.value = `$${amt.toFixed(2)}`;

  renderLivePreview();
  renderMasterPreview();
  updateMasterSideStats();
  renderBatchRibbon();
}

function applyMinutePreset(index, mins) {
  const minsEl = document.getElementById(`item-minutes-${index}`);
  if (minsEl) minsEl.value = mins;
  updateItemMinutes(index, mins);
}

function addItem() {
  const p = getActiveParticipant();
  if (!p) return;
  const defaultDate = p.items.length > 0 ? p.items[p.items.length - 1].service_period : "12 Aug 2026";
  const defaultCode = p.support_item || "07_002_0106_8_3";
  p.items.push({
    service_period: defaultDate,
    support_delivered: "Coordination of Supports - Level 2",
    support_item: defaultCode,
    minutes: 60,
    hours: 1.00,
    amount: Math.round(1.00 * state.rates.subcontract_rate * 100) / 100
  });
  renderLineItemsEditor();
  renderLivePreview();
  renderMasterPreview();
  updateMasterSideStats();
  renderBatchRibbon();
}

function removeItem(index) {
  const p = getActiveParticipant();
  if (p && p.items.length > 1) {
    p.items.splice(index, 1);
    renderLineItemsEditor();
    renderLivePreview();
    renderMasterPreview();
    updateMasterSideStats();
    renderBatchRibbon();
  }
}

// Switch active participant to new custom mode
function switchToNewParticipantMode() {
  const p = getActiveParticipant();
  if (!p) return;

  p.id = "";
  p.name = "";
  p.ndis_number = "";
  p.address = "";
  p.support_item = "07_002_0106_8_3";
  
  const sel = document.getElementById("sel-participant");
  if (sel) sel.value = "new";

  setVal("inp-part-name", "");
  setVal("inp-part-ndis", "");
  setVal("inp-part-address", "");
  setVal("inp-part-item", "07_002_0106_8_3");

  const badge = document.getElementById("badge-part-mode");
  if (badge) {
    badge.className = "status-badge-green";
    badge.textContent = "✨ New Participant";
  }

  const nameInput = document.getElementById("inp-part-name");
  if (nameInput) nameInput.focus();

  renderLivePreview();
  renderBatchRibbon();
}

// Selecting a participant from dropdown for the active invoice
function onParticipantSelect(val) {
  const p = getActiveParticipant();
  if (!p) return;

  if (val === "new") {
    switchToNewParticipantMode();
    return;
  }
  const selected = participantsList[parseInt(val)];
  if (selected) {
    p.id = selected.id || selected.name.toLowerCase().replace(/[^a-z0-9]/g, "_");
    p.name = selected.name;
    p.ndis_number = selected.ndis_number || "";
    p.address = selected.address || "";
    p.support_item = selected.support_item || "07_002_0106_8_3";
    p.support_category = selected.support_category || "Support Coordination";
    p.initials = selected.initials || "";

    setVal("inp-part-name", p.name);
    setVal("inp-part-ndis", p.ndis_number);
    setVal("inp-part-address", p.address);
    setVal("inp-part-item", p.support_item);
    
    const badge = document.getElementById("badge-part-mode");
    if (badge) {
      badge.className = "status-badge-blue";
      badge.textContent = `Invoice #${p.invoice_number}`;
    }
    renderLivePreview();
    renderMasterPreview();
    renderBatchRibbon();
  }
}

// Step active invoice number
function stepInvoiceNumber(delta) {
  const p = getActiveParticipant();
  if (!p) return;
  let num = parseInt(p.invoice_number) || 1;
  num = Math.max(1, num + delta);
  p.invoice_number = String(num);
  setVal("inp-inv-number", p.invoice_number);
  renderLivePreview();
  renderMasterPreview();
  renderBatchRibbon();
}

// Event Listeners
function setupEventListeners() {
  // Batch header button
  document.getElementById("btn-batch-add-participant")?.addEventListener("click", () => addParticipantToBatch());

  // Master sidebar download
  document.getElementById("btn-side-download-master")?.addEventListener("click", downloadMasterExcel);

  // Top nav action buttons
  document.getElementById("btn-download-master-excel")?.addEventListener("click", downloadMasterExcel);
  document.getElementById("btn-download-excel")?.addEventListener("click", downloadActiveInvoice);
  document.getElementById("btn-print-pdf")?.addEventListener("click", () => window.print());

  // Batch input fields
  document.getElementById("inp-batch-ref")?.addEventListener("input", e => {
    state.batch.reference = e.target.value;
    renderMasterPreview();
  });
  document.getElementById("inp-batch-date")?.addEventListener("input", e => {
    state.batch.claim_date = e.target.value;
    renderMasterPreview();
  });
  document.getElementById("inp-batch-due")?.addEventListener("input", e => {
    state.batch.due_date = e.target.value;
    renderMasterPreview();
  });

  // Provider inputs
  document.getElementById("inp-provider-name")?.addEventListener("input", e => {
    state.provider.name = e.target.value;
    state.provider.business_name = e.target.value;
    renderLivePreview();
    renderMasterPreview();
  });
  document.getElementById("inp-provider-abn")?.addEventListener("input", e => {
    state.provider.abn = e.target.value;
    renderLivePreview();
    renderMasterPreview();
  });
  document.getElementById("inp-provider-address")?.addEventListener("input", e => {
    state.provider.address = e.target.value;
    renderLivePreview();
    renderMasterPreview();
  });
  document.getElementById("inp-provider-email-phone")?.addEventListener("input", e => {
    state.provider.email_phone = e.target.value;
    renderLivePreview();
    renderMasterPreview();
  });
  document.getElementById("inp-bank-account-name")?.addEventListener("input", e => {
    state.provider.account_name = e.target.value;
    renderLivePreview();
    renderMasterPreview();
  });
  document.getElementById("inp-bank-name")?.addEventListener("input", e => {
    state.provider.bank_name = e.target.value;
    renderLivePreview();
    renderMasterPreview();
  });
  document.getElementById("inp-bank-bsb")?.addEventListener("input", e => {
    state.provider.bsb = e.target.value;
    renderLivePreview();
    renderMasterPreview();
  });
  document.getElementById("inp-bank-account")?.addEventListener("input", e => {
    state.provider.account_number = e.target.value;
    renderLivePreview();
    renderMasterPreview();
  });

  // Customer inputs
  document.getElementById("inp-customer-name")?.addEventListener("input", e => {
    state.customer.name = e.target.value;
    renderLivePreview();
    renderMasterPreview();
  });
  document.getElementById("inp-customer-attention")?.addEventListener("input", e => {
    state.customer.attention = e.target.value;
    renderLivePreview();
    renderMasterPreview();
  });
  document.getElementById("inp-customer-address")?.addEventListener("input", e => {
    state.customer.address = e.target.value;
    renderLivePreview();
    renderMasterPreview();
  });
  document.getElementById("inp-customer-ref")?.addEventListener("input", e => {
    state.customer.reference = e.target.value;
    renderLivePreview();
    renderMasterPreview();
  });

  // Active Participant inputs
  document.getElementById("inp-part-name")?.addEventListener("input", e => {
    const p = getActiveParticipant();
    if (p) {
      p.name = e.target.value;
      renderLivePreview();
      renderMasterPreview();
      renderBatchRibbon();
    }
  });
  document.getElementById("inp-part-ndis")?.addEventListener("input", e => {
    const p = getActiveParticipant();
    if (p) {
      p.ndis_number = e.target.value;
      renderLivePreview();
      renderMasterPreview();
    }
  });
  document.getElementById("inp-part-address")?.addEventListener("input", e => {
    const p = getActiveParticipant();
    if (p) {
      p.address = e.target.value;
      renderLivePreview();
    }
  });
  document.getElementById("inp-part-item")?.addEventListener("input", e => {
    const p = getActiveParticipant();
    if (p) {
      p.support_item = e.target.value;
      renderLivePreview();
    }
  });

  // Invoice Number & Dates for active participant
  document.getElementById("inp-inv-number")?.addEventListener("input", e => {
    const p = getActiveParticipant();
    if (p) {
      p.invoice_number = e.target.value;
      renderLivePreview();
      renderMasterPreview();
      renderBatchRibbon();
    }
  });
  document.getElementById("inp-inv-date")?.addEventListener("input", e => {
    const p = getActiveParticipant();
    if (p) {
      p.invoice_date = e.target.value;
      renderLivePreview();
    }
  });
  document.getElementById("inp-inv-due")?.addEventListener("input", e => {
    const p = getActiveParticipant();
    if (p) {
      p.invoice_due = e.target.value;
      renderLivePreview();
    }
  });

  // Participant selector & actions
  document.getElementById("sel-participant")?.addEventListener("change", e => onParticipantSelect(e.target.value));
  document.getElementById("btn-new-participant")?.addEventListener("click", switchToNewParticipantMode);
  document.getElementById("btn-save-participant")?.addEventListener("click", saveCurrentParticipant);
  document.getElementById("btn-delete-participant")?.addEventListener("click", deleteCurrentParticipant);

  // Steppers
  document.getElementById("btn-inv-prev")?.addEventListener("click", () => stepInvoiceNumber(-1));
  document.getElementById("btn-inv-next")?.addEventListener("click", () => stepInvoiceNumber(1));

  // Rate inputs
  document.getElementById("inp-subcontract-rate")?.addEventListener("input", updateRates);

  // Save Settings as Default
  document.getElementById("btn-save-settings")?.addEventListener("click", () => saveCurrentSettings(true));

  // Add Item
  document.getElementById("btn-add-item")?.addEventListener("click", addItem);
}

// Update Master Sidebar Stats Widget & Participant Checklist
function updateMasterSideStats() {
  const totals = getBatchTotals();
  const sideTotal = document.getElementById("side-grand-total");
  const sideCount = document.getElementById("side-part-count");
  const sideHours = document.getElementById("side-hours-count");
  const mobileBadge = document.getElementById("mobile-badge-total");

  if (sideTotal) sideTotal.textContent = `$${totals.grandTotal.toFixed(2)}`;
  if (sideCount) sideCount.textContent = totals.count;
  if (sideHours) sideHours.textContent = `${totals.totalHours.toFixed(2)} hrs`;
  if (mobileBadge) mobileBadge.textContent = `$${totals.grandTotal.toFixed(2)}`;

  const checklist = document.getElementById("master-participant-checklist");
  if (checklist) {
    checklist.innerHTML = "";
    state.participants.forEach((p, idx) => {
      const pTot = getParticipantTotal(p);
      const pHours = getParticipantHours(p);
      const item = document.createElement("div");
      item.className = "master-part-item";
      item.innerHTML = `
        <span style="font-weight:600; color:#0f172a;">👤 ${escapeHtml(p.name || 'Participant ' + (idx + 1))}</span>
        <div style="display:flex; align-items:center; gap:8px;">
          <span style="color:#64748b; font-size:11px;">${pHours.toFixed(2)}h</span>
          <strong style="color:#104e8b;">$${pTot.toFixed(2)}</strong>
          <button type="button" class="btn btn-secondary btn-sm" style="padding:2px 6px; font-size:11px;" onclick="event.stopPropagation(); switchTab(${idx})">Edit</button>
        </div>
      `;
      item.onclick = () => switchTab(idx);
      checklist.appendChild(item);
    });
  }
}

// Render the Master Bill Sheet Preview for the Owner
function renderMasterPreview() {
  const p = state.provider;
  const c = state.customer;
  const b = state.batch;
  const r = state.rates;
  const totals = getBatchTotals();

  // Table 1: Provider & Customer
  const table1 = document.getElementById("master-preview-table-1");
  if (table1) {
    table1.innerHTML = `
      <tr>
        <th colspan="2" class="sec-hdr-blue">FROM / SERVICE PROVIDER</th>
        <th colspan="2" class="sec-hdr-blue">BILL TO / CLIENT</th>
      </tr>
      <tr>
        <td class="tbl-lbl">Provider</td>
        <td class="tbl-val"><strong>${escapeHtml(p.name)}</strong></td>
        <td class="tbl-lbl">Customer</td>
        <td class="tbl-val"><strong>${escapeHtml(c.name)}</strong></td>
      </tr>
      <tr>
        <td class="tbl-lbl">Business / trading name</td>
        <td class="tbl-val">${escapeHtml(p.business_name)}</td>
        <td class="tbl-lbl">Attention</td>
        <td class="tbl-val">${escapeHtml(c.attention)}</td>
      </tr>
      <tr>
        <td class="tbl-lbl">ABN</td>
        <td class="tbl-val"><code>${escapeHtml(p.abn)}</code></td>
        <td class="tbl-lbl">Customer ABN</td>
        <td class="tbl-val">${escapeHtml(c.abn || '')}</td>
      </tr>
      <tr>
        <td class="tbl-lbl">Address</td>
        <td class="tbl-val">${escapeHtml(p.address)}</td>
        <td class="tbl-lbl">Address</td>
        <td class="tbl-val">${escapeHtml(c.address)}</td>
      </tr>
      <tr>
        <td class="tbl-lbl">Email / phone</td>
        <td class="tbl-val">${escapeHtml(p.email_phone)}</td>
        <td class="tbl-lbl">Reference</td>
        <td class="tbl-val">${escapeHtml(b.reference)}</td>
      </tr>
    `;
  }

  // Table 2: Statement Details
  const table2 = document.getElementById("master-preview-table-2");
  if (table2) {
    table2.innerHTML = `
      <tr>
        <td class="tbl-lbl">Statement reference</td>
        <td class="tbl-val"><strong>${escapeHtml(b.reference)}</strong></td>
        <td class="tbl-lbl">Statement date</td>
        <td class="tbl-val">${escapeHtml(b.claim_date)}</td>
      </tr>
      <tr>
        <td class="tbl-lbl">Payment due date</td>
        <td class="tbl-val">${escapeHtml(b.due_date)}</td>
        <td class="tbl-lbl">Subcontract rate</td>
        <td class="tbl-val"><strong>$${r.subcontract_rate.toFixed(2)} / hr</strong></td>
      </tr>
      <tr>
        <td class="tbl-lbl">Participant invoices</td>
        <td class="tbl-val"><strong>${totals.count} participants</strong> included</td>
        <td class="tbl-lbl">Total billable hours</td>
        <td class="tbl-val"><strong>${totals.totalHours.toFixed(2)} hrs</strong></td>
      </tr>
    `;
  }

  // Table 3: Consolidated Participants Summary Body
  const itemsBody = document.getElementById("master-items-body");
  if (itemsBody) {
    itemsBody.innerHTML = "";
    state.participants.forEach((pt, idx) => {
      const pTot = getParticipantTotal(pt);
      const pHours = getParticipantHours(pt);
      const pMins = getParticipantMinutes(pt);
      const tr = document.createElement("tr");
      tr.style.cursor = "pointer";
      tr.title = "Click to view and edit this participant's individual claim";
      tr.onclick = () => switchTab(idx);
      tr.innerHTML = `
        <td style="text-align:center; font-weight:bold;">${idx + 1}</td>
        <td style="text-align:left; font-weight:600; color:#104e8b;">👤 ${escapeHtml(pt.name || 'Participant ' + (idx + 1))}</td>
        <td style="text-align:center;">${escapeHtml(pt.ndis_number || 'N/A')}</td>
        <td style="text-align:center;"><code>Inv #${escapeHtml(pt.invoice_number)}</code></td>
        <td style="text-align:center;">${pMins}m</td>
        <td style="text-align:right;">${pHours.toFixed(2)}</td>
        <td style="text-align:right; font-weight:bold; color:#107c41;">$${pTot.toFixed(2)}</td>
      `;
      itemsBody.appendChild(tr);
    });
  }

  // Totals
  const masterTotalHours = document.getElementById("master-total-hours");
  const masterSubtotal = document.getElementById("master-subtotal");
  const masterGst = document.getElementById("master-gst");
  const masterGrandTotal = document.getElementById("master-grand-total");

  if (masterTotalHours) masterTotalHours.textContent = `${totals.totalHours.toFixed(2)} hrs`;
  if (masterSubtotal) masterSubtotal.textContent = `$${totals.grandTotal.toFixed(2)}`;
  if (masterGst) masterGst.textContent = "$0.00";
  if (masterGrandTotal) masterGrandTotal.textContent = `$${totals.grandTotal.toFixed(2)}`;

  // Remittance & Payment Grid
  const paymentGrid = document.getElementById("master-payment-grid");
  if (paymentGrid) {
    paymentGrid.innerHTML = `
      <tr>
        <th colspan="2" class="sec-hdr-blue">DIRECT DEPOSIT REMITTANCE (ONE SINGLE TRANSFER)</th>
        <th colspan="2" class="sec-hdr-green">CONSOLIDATED BATCH CLAIM NOTE</th>
      </tr>
      <tr>
        <td class="tbl-lbl">Bank name</td>
        <td class="tbl-val"><strong>${escapeHtml(p.bank_name || 'Westpac Bank')}</strong></td>
        <td colspan="2" rowspan="5" class="payment-note-box">
          <strong>One Consolidated Payment for Owner:</strong><br>
          Please make a single direct electronic bank transfer of <strong>$${totals.grandTotal.toFixed(2)}</strong> to ${escapeHtml(p.name)} (${escapeHtml(p.bank_name)}) using the BSB and Account details shown on the left.<br><br>
          <em>Reference:</em> <strong>${escapeHtml(b.reference)}</strong><br>
          Detailed individual participant invoices and minutes breakdown are included in subsequent workbook tabs for your NDIS PRODA / PACE claiming records.
        </td>
      </tr>
      <tr>
        <td class="tbl-lbl">Account name</td>
        <td class="tbl-val"><strong>${escapeHtml(p.account_name || p.name || 'Richa Patel')}</strong></td>
      </tr>
      <tr>
        <td class="tbl-lbl">BSB</td>
        <td class="tbl-val"><code>${escapeHtml(p.bsb || '732-273')}</code></td>
      </tr>
      <tr>
        <td class="tbl-lbl">Account number</td>
        <td class="tbl-val"><code>${escapeHtml(p.account_number || '502413')}</code></td>
      </tr>
      <tr>
        <td class="tbl-lbl">Final Bill Total Due</td>
        <td class="tbl-val" style="font-size:14px; font-weight:800; color:#107c41;">$${totals.grandTotal.toFixed(2)}</td>
      </tr>
    `;
  }
}

// Render the Individual Participant Invoice Live Sheet Preview
function renderLivePreview() {
  const p = state.provider;
  const c = state.customer;
  const pt = getActiveParticipant();
  const r = state.rates;
  if (!pt) return;

  // Table 1: Provider & Customer
  const table1 = document.getElementById("preview-table-1");
  if (table1) {
    table1.innerHTML = `
      <tr>
        <th colspan="2" class="sec-hdr-blue">FROM / SERVICE PROVIDER</th>
        <th colspan="2" class="sec-hdr-blue">BILL TO</th>
      </tr>
      <tr>
        <td class="tbl-lbl">Provider</td>
        <td class="tbl-val">${escapeHtml(p.name)}</td>
        <td class="tbl-lbl">Customer</td>
        <td class="tbl-val">${escapeHtml(c.name)}</td>
      </tr>
      <tr>
        <td class="tbl-lbl">Business / trading name</td>
        <td class="tbl-val">${escapeHtml(p.business_name)}</td>
        <td class="tbl-lbl">Attention</td>
        <td class="tbl-val">${escapeHtml(c.attention)}</td>
      </tr>
      <tr>
        <td class="tbl-lbl">ABN</td>
        <td class="tbl-val">${escapeHtml(p.abn)}</td>
        <td class="tbl-lbl">Customer ABN</td>
        <td class="tbl-val">${escapeHtml(c.abn)}</td>
      </tr>
      <tr>
        <td class="tbl-lbl">Address</td>
        <td class="tbl-val">${escapeHtml(p.address)}</td>
        <td class="tbl-lbl">Address</td>
        <td class="tbl-val">${escapeHtml(c.address)}</td>
      </tr>
      <tr>
        <td class="tbl-lbl">Email / phone</td>
        <td class="tbl-val">${escapeHtml(p.email_phone)}</td>
        <td class="tbl-lbl">Reference</td>
        <td class="tbl-val">${escapeHtml(c.reference)}</td>
      </tr>
    `;
  }

  // Table 2: Invoice & Participant Details
  const table2 = document.getElementById("preview-table-2");
  if (table2) {
    table2.innerHTML = `
      <tr>
        <td class="tbl-lbl">Invoice number</td>
        <td class="tbl-val"><strong>${escapeHtml(pt.invoice_number)}</strong></td>
        <td class="tbl-lbl">Participant</td>
        <td class="tbl-val"><strong>${escapeHtml(pt.name)}</strong></td>
      </tr>
      <tr>
        <td class="tbl-lbl">Invoice date</td>
        <td class="tbl-val">${escapeHtml(pt.invoice_date)}</td>
        <td class="tbl-lbl">NDIS number</td>
        <td class="tbl-val">${escapeHtml(pt.ndis_number)}</td>
      </tr>
      <tr>
        <td class="tbl-lbl">Payment due</td>
        <td class="tbl-val">${escapeHtml(pt.invoice_due)}</td>
        <td class="tbl-lbl">Participant address</td>
        <td class="tbl-val">${escapeHtml(pt.address || '')}</td>
      </tr>
      <tr>
        <td class="tbl-lbl">Claim type</td>
        <td class="tbl-val">${escapeHtml(pt.claim_type || 'Standard')}</td>
        <td class="tbl-lbl">Support category</td>
        <td class="tbl-val">${escapeHtml(pt.support_category || 'Support Coordination')}</td>
      </tr>
      <tr>
        <td class="tbl-lbl">GST treatment</td>
        <td class="tbl-val">${escapeHtml(pt.gst_treatment || 'GST-free NDIS support')}</td>
        <td class="tbl-lbl">Support item</td>
        <td class="tbl-val"><code>${escapeHtml(pt.support_item)}</code></td>
      </tr>
    `;
  }

  // Line Items Table Body
  const itemsBody = document.getElementById("preview-items-body");
  let subtotal = 0;
  if (itemsBody) {
    itemsBody.innerHTML = "";
    pt.items.forEach(item => {
      subtotal += item.amount;
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td class="col-service-period">${escapeHtml(item.service_period)}</td>
        <td class="col-support-delivered">${escapeHtml(item.support_delivered)}</td>
        <td class="col-support-item">${escapeHtml(item.support_item)}</td>
        <td class="col-minutes">${item.minutes}</td>
        <td class="col-hours">${item.hours.toFixed(2)}</td>
        <td class="col-amount">$${item.amount.toFixed(2)}</td>
      `;
      itemsBody.appendChild(tr);
    });
  }

  // Totals
  const gst = 0.00;
  const total = subtotal + gst;
  const elSubtot = document.getElementById("preview-subtotal");
  const elGst = document.getElementById("preview-gst");
  const elTot = document.getElementById("preview-total");

  if (elSubtot) elSubtot.textContent = `$${subtotal.toFixed(2)}`;
  if (elGst) elGst.textContent = `$${gst.toFixed(2)}`;
  if (elTot) elTot.textContent = `$${total.toFixed(2)}`;

  // Rate and Payment Grid
  const paymentGrid = document.getElementById("preview-payment-grid");
  if (paymentGrid) {
    const remitTo = p.bank_name ? `Please remit to ${escapeHtml(p.bank_name)} using the account details shown.` : "Please remit using the account details shown.";
    const paymentNote = `Payment reference: ${escapeHtml(pt.invoice_number)}. Services are invoiced after delivery. ${remitTo} The hourly subcontract rate is $${r.subcontract_rate.toFixed(2)}/hr and remains below the 2026-27 national NDIS price limit for Support Coordination Level 2.`;
    
    paymentGrid.innerHTML = `
      <tr>
        <th colspan="2" class="sec-hdr-blue">RATE AND PAYMENT DETAILS</th>
        <th colspan="2" class="sec-hdr-green">PAYMENT NOTE</th>
      </tr>
      <tr>
        <td class="tbl-lbl">Subcontract rate (per hour)</td>
        <td class="tbl-val"><strong>$${r.subcontract_rate.toFixed(2)}</strong></td>
        <td colspan="2" rowspan="5" class="payment-note-box">${paymentNote}</td>
      </tr>
      <tr>
        <td class="tbl-lbl">Source rate</td>
        <td class="tbl-val">${escapeHtml(r.source_rate_desc)}</td>
      </tr>
      <tr>
        <td class="tbl-lbl">Account name</td>
        <td class="tbl-val">${escapeHtml(p.account_name || p.name || 'Richa Patel')}</td>
      </tr>
      <tr>
        <td class="tbl-lbl">BSB</td>
        <td class="tbl-val"><code>${escapeHtml(p.bsb || '')}</code></td>
      </tr>
      <tr>
        <td class="tbl-lbl">Account number</td>
        <td class="tbl-val"><code>${escapeHtml(p.account_number)}</code></td>
      </tr>
    `;
  }
}

// Download Consolidated Multi-Tab Master Excel (.xlsx)
async function downloadMasterExcel() {
  const btn = document.getElementById("btn-download-master-excel");
  const btnSide = document.getElementById("btn-side-download-master");
  const origText = btn ? btn.innerHTML : "";
  if (btn) { btn.innerHTML = "⏳ Generating Master Excel..."; btn.disabled = true; }
  if (btnSide) { btnSide.innerHTML = "⏳ Generating Master Excel..."; btnSide.disabled = true; }

  const payload = {
    is_batch: true,
    mode: "batch",
    claim_period: state.batch.reference,
    reference: state.customer.reference,
    provider: state.provider,
    customer: state.customer,
    rates: state.rates,
    participants: state.participants
  };

  try {
    const res = await fetch("/api/export-excel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!res.ok) throw new Error("Failed to export Master Excel");

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    
    const safePeriod = state.batch.reference.replace(/[^a-zA-Z0-9_-]/g, "_") || "Batch";
    a.download = `Final_Bill_Top_End_Support_Collective_${safePeriod}.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  } catch (err) {
    alert("Could not generate Master Excel. Please check the inputs.");
    console.error(err);
  } finally {
    if (btn) { btn.innerHTML = origText; btn.disabled = false; }
    if (btnSide) { btnSide.innerHTML = "📥 Download Consolidated Master Excel (.xlsx)"; btnSide.disabled = false; }
  }
}

// Download Single Active Invoice (.xlsx)
async function downloadActiveInvoice() {
  const pt = getActiveParticipant();
  if (!pt) {
    alert("No active participant selected.");
    return;
  }

  const btn = document.getElementById("btn-download-excel");
  const origText = btn ? btn.innerHTML : "";
  if (btn) { btn.innerHTML = "⏳ Exporting..."; btn.disabled = true; }

  const payload = {
    is_batch: false,
    mode: "single",
    provider: state.provider,
    customer: state.customer,
    participant: pt,
    rates: state.rates,
    items: pt.items
  };

  try {
    const res = await fetch("/api/export-excel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!res.ok) throw new Error("Failed to export Single Invoice");

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    
    const pName = pt.name.replace(/[^a-zA-Z0-9_-]/g, "_") || "Participant";
    a.download = `Invoice_${pt.invoice_number}_${pName}.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  } catch (err) {
    alert("Could not generate Invoice Excel. Please check the inputs.");
    console.error(err);
  } finally {
    if (btn) { btn.innerHTML = origText; btn.disabled = false; }
  }
}

// Save Current Settings as Default
async function saveCurrentSettings(showAlert = true) {
  const payload = {
    hourly_rate: state.rates.subcontract_rate,
    provider: state.provider,
    customer: state.customer
  };

  try {
    const res = await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (res.ok && showAlert) {
      alert("✅ Your contractor details, bank details, and rate have been saved as permanent defaults!");
    }
  } catch (err) {
    if (showAlert) alert("Error saving defaults.");
  }
}

// Save participant profile to database
async function saveCurrentParticipant() {
  const pt = getActiveParticipant();
  if (!pt) return;

  const pName = (document.getElementById("inp-part-name")?.value || pt.name || "").trim();
  if (!pName) {
    alert("Please enter a participant name.");
    document.getElementById("inp-part-name")?.focus();
    return;
  }
  const ndis = (document.getElementById("inp-part-ndis")?.value || pt.ndis_number || "").trim();
  const pAddress = (document.getElementById("inp-part-address")?.value || pt.address || "").trim();
  const itemCode = (document.getElementById("inp-part-item")?.value || pt.support_item || "07_002_0106_8_3").trim();
  const initials = pName.split(" ").map(w => w[0]).join("").toUpperCase();

  pt.name = pName;
  pt.ndis_number = ndis;
  pt.address = pAddress;
  pt.support_item = itemCode;
  pt.initials = initials;

  const existingIdx = participantsList.findIndex(p => p.name.toLowerCase() === pName.toLowerCase());
  const participantData = {
    id: existingIdx >= 0 ? participantsList[existingIdx].id : pName.toLowerCase().replace(/[^a-z0-9]/g, "_"),
    name: pName,
    ndis_number: ndis,
    address: pAddress,
    support_category: pt.support_category || "Support Coordination",
    support_item: itemCode,
    initials: initials
  };

  if (existingIdx >= 0) {
    participantsList[existingIdx] = participantData;
  } else {
    participantsList.push(participantData);
  }

  try {
    const res = await fetch("/api/participants", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(participantsList)
    });
    if (res.ok) {
      populateParticipantDropdown();
      const sel = document.getElementById("sel-participant");
      const foundIdx = participantsList.findIndex(p => p.name.toLowerCase() === pName.toLowerCase());
      if (sel && foundIdx >= 0) {
        sel.value = foundIdx;
      }
      const badge = document.getElementById("badge-part-mode");
      if (badge) {
        badge.className = "status-badge-blue";
        badge.textContent = `Invoice #${pt.invoice_number}`;
      }
      renderLivePreview();
      renderMasterPreview();
      renderBatchRibbon();
      alert(`✅ Participant "${pName}" saved successfully to your participant list!`);
    }
  } catch (err) {
    alert("Error saving participant.");
  }
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
