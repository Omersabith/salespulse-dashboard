// ===============================
// 🔗 SUPABASE CONFIG
// ===============================
const SUPABASE_URL = "https://iyxpvbvpampykfjffgol.supabase.co";
const SUPABASE_KEY = "sb_publishable_Q9IcqOv5IU9boMcm5fnG_w_je4xqV46";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ===============================
// 📦 GLOBAL DATA STORE
// ===============================
let MASTER_DATA = [];
let FILTERED_DATA = [];

// ===============================
// 🚀 LOAD DASHBOARD
// ===============================
async function loadDashboard() {
  const { data, error } = await supabaseClient
    .from("sales_payload")
    .select("payload")
    .single();

  if (error) {
    console.error("❌ Supabase load error:", error);
    return;
  }

  const payload = data.payload;

  // KPI
  renderKPIs(payload.kpi);

  // MASTER DATA
  MASTER_DATA = payload.raw_data;
  FILTERED_DATA = [...MASTER_DATA];

  // STORE RAW FOR DEBUG
  window.__RAW_DATA__ = MASTER_DATA;

  // POPULATE FILTERS
  populateFilters(payload.filters);

  // RENDER TABLE
  renderTable(FILTERED_DATA);
}

// ===============================
// 📊 KPI RENDER
// ===============================
function renderKPIs(kpi) {
  document.getElementById("kpiSales").innerText =
    kpi.total_sales.toLocaleString();

  document.getElementById("kpiQty").innerText =
    kpi.total_qty.toLocaleString();

  document.getElementById("kpiMTD").innerText =
    kpi.mtd_sales.toLocaleString();

  document.getElementById("kpiGrowth").innerText =
    kpi.growth_pct.toFixed(2) + "%";

  document.getElementById("kpiCategory").innerText =
    kpi.top_category;

  document.getElementById("kpiChannel").innerText =
    kpi.best_channel;
}

// ===============================
// 🔽 POPULATE FILTER DROPDOWNS
// ===============================
function populateFilters(filters) {
  const channelSelect = document.getElementById("filterChannel");
  const partSelect = document.getElementById("filterPart");

  channelSelect.innerHTML = '<option value="">All Channels</option>';
  partSelect.innerHTML = '<option value="">All Parts</option>';

  filters.channels.forEach(ch => {
    const opt = document.createElement("option");
    opt.value = ch;
    opt.textContent = ch;
    channelSelect.appendChild(opt);
  });

  // Part numbers come from raw data
  const partNumbers = [...new Set(MASTER_DATA.map(d => d["Part Number"]))];

  partNumbers.sort().forEach(p => {
    const opt = document.createElement("option");
    opt.value = p;
    opt.textContent = p;
    partSelect.appendChild(opt);
  });
}

// ===============================
// 🔍 APPLY FILTERS
// ===============================
function applyFilters() {
  const channel = document.getElementById("filterChannel").value;
  const part = document.getElementById("filterPart").value;
  const dateFrom = document.getElementById("dateFrom").value;
  const dateTo = document.getElementById("dateTo").value;

  FILTERED_DATA = MASTER_DATA.filter(row => {
    const rowDate = row.Date;

    return (
      (!channel || row.CHANNEL === channel) &&
      (!part || row["Part Number"] === part) &&
      (!dateFrom || rowDate >= dateFrom) &&
      (!dateTo || rowDate <= dateTo)
    );
  });

  renderTable(FILTERED_DATA);
}

// ===============================
// 📋 TABLE RENDER
// ===============================
function renderTable(data) {
  const tbody = document.getElementById("salesTableBody");
  tbody.innerHTML = "";

  if (!data || data.length === 0) {
    tbody.innerHTML = "<tr><td colspan='8'>No data</td></tr>";
    return;
  }

  data.forEach(row => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${row.Date || ""}</td>
      <td>${row["Part Number"] || ""}</td>
      <td>${row.Category || ""}</td>
      <td>${row["Sub Category"] || ""}</td>
      <td>${row.CHANNEL || ""}</td>
      <td>${row["Sales Executive"] || ""}</td>
      <td>${Number(row.Qty || 0).toLocaleString()}</td>
      <td>${Number(row.Amount || 0).toLocaleString()}</td>
    `;

    tbody.appendChild(tr);
  });
}

// ===============================
// 🔘 EVENT LISTENERS
// ===============================
document.getElementById("filterChannel").addEventListener("change", applyFilters);
document.getElementById("filterPart").addEventListener("change", applyFilters);
document.getElementById("dateFrom").addEventListener("change", applyFilters);
document.getElementById("dateTo").addEventListener("change", applyFilters);

// ===============================
// ▶️ INIT
// ===============================
loadDashboard();