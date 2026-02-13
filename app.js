import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let categoryChart;
let channelChart;

/* LOGIN */

const loginForm = document.getElementById("loginForm");
const loginContainer = document.getElementById("login-container");
const dashboard = document.getElementById("dashboard-container");
const errorMsg = document.getElementById("auth-error");

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.getElementById("username").value;
  const password = document.getElementById("password").value;

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    errorMsg.classList.remove("hidden");
    return;
  }

  loginContainer.classList.add("hidden");
  dashboard.classList.remove("hidden");

  loadDashboard();
});

/* SESSION */

async function checkSession() {
  const { data } = await supabase.auth.getSession();
  if (data.session) {
    loginContainer.classList.add("hidden");
    dashboard.classList.remove("hidden");
    loadDashboard();
  }
}
checkSession();

/* LOGOUT */

document.getElementById("logoutBtn").addEventListener("click", async () => {
  await supabase.auth.signOut();
  location.reload();
});

/* LOAD DATA */

async function loadDashboard() {
  const { data, error } = await supabase
    .from("salespulse_payload")
    .select("content")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (error) {
    console.error(error);
    return;
  }

  const payload = data.content || {};
  const rawData = payload.raw_data || [];

  window.__RAW_DATA__ = rawData;

  populateFilters(rawData);
  renderTable("table-raw", rawData);
  updateKPI(rawData);
  buildCharts(rawData);

  /* SEARCH */
  document.getElementById("tableSearch").oninput = function () {
    const value = this.value.toLowerCase();
    const rows = document.querySelectorAll("#table-raw tbody tr");
    rows.forEach(row => {
      row.style.display = row.textContent.toLowerCase().includes(value) ? "" : "none";
    });
  };

  /* APPLY BUTTON */
  document.getElementById("applyFilters").addEventListener("click", applyFilters);

  /* RESET BUTTON */
  document.getElementById("resetFilters").addEventListener("click", () => {
    document.getElementById("filterChannel").value = "ALL";
    document.getElementById("filterPart").value = "ALL";
    document.getElementById("filterStart").value = "";
    document.getElementById("filterEnd").value = "";

    renderTable("table-raw", rawData);
    updateKPI(rawData);
    buildCharts(rawData);
  });
}

/* TABLE RENDER */

function renderTable(tableId, data) {
  const table = document.getElementById(tableId);
  if (!table) return;

  const thead = table.querySelector("thead");
  const tbody = table.querySelector("tbody");

  thead.innerHTML = "";
  tbody.innerHTML = "";

  if (!data.length) return;

  const headers = Object.keys(data[0]);

  const headRow = document.createElement("tr");
  headers.forEach(h => {
    const th = document.createElement("th");
    th.textContent = h.toUpperCase();
    headRow.appendChild(th);
  });
  thead.appendChild(headRow);

  data.forEach(row => {
    const tr = document.createElement("tr");
    headers.forEach(h => {
      const td = document.createElement("td");
      td.textContent = row[h];
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
}

/* FILTER DROPDOWNS */

function populateFilters(data) {
  const channelSelect = document.getElementById("filterChannel");
  const partSelect = document.getElementById("filterPart");

  const channels = [...new Set(data.map(d => d.channel))].sort();
  const parts = [...new Set(data.map(d => d.part_number))].sort();

  channelSelect.innerHTML = '<option value="ALL">All Channels</option>';
  partSelect.innerHTML = '<option value="ALL">All Parts</option>';

  channels.forEach(c => {
    channelSelect.innerHTML += `<option value="${c}">${c}</option>`;
  });

  parts.forEach(p => {
    partSelect.innerHTML += `<option value="${p}">${p}</option>`;
  });
}

/* APPLY FILTERS */

function applyFilters() {
  const data = window.__RAW_DATA__;

  const channel = document.getElementById("filterChannel").value;
  const part = document.getElementById("filterPart").value;
  const start = document.getElementById("filterStart").value;
  const end = document.getElementById("filterEnd").value;

  let filtered = data;

  if (channel !== "ALL") filtered = filtered.filter(d => d.channel === channel);
  if (part !== "ALL") filtered = filtered.filter(d => d.part_number === part);
  if (start) filtered = filtered.filter(d => d.date >= start);
  if (end) filtered = filtered.filter(d => d.date <= end);

  renderTable("table-raw", filtered);
  updateKPI(filtered);
  buildCharts(filtered);
}

/* KPI */

function updateKPI(data) {
  const totalSales = data.reduce((sum, d) => sum + Number(d.amount || 0), 0);
  const totalQty = data.reduce((sum, d) => sum + Number(d.qty || 0), 0);

  document.getElementById("totalSales").textContent = totalSales.toFixed(2);
  document.getElementById("totalQty").textContent = totalQty;
  document.getElementById("mtdSales").textContent = totalSales.toFixed(2);
}

/* CHARTS */

function buildCharts(data) {
  const categoryMap = {};
  const channelMap = {};

  data.forEach(d => {
    categoryMap[d.category] = (categoryMap[d.category] || 0) + Number(d.amount || 0);
    channelMap[d.channel] = (channelMap[d.channel] || 0) + Number(d.amount || 0);
  });

  const categoryLabels = Object.keys(categoryMap);
  const categoryValues = Object.values(categoryMap);

  const channelLabels = Object.keys(channelMap);
  const channelValues = Object.values(channelMap);

  if (categoryChart) categoryChart.destroy();
  if (channelChart) channelChart.destroy();

  categoryChart = new Chart(document.getElementById("categoryChart"), {
    type: "bar",
    data: {
      labels: categoryLabels,
      datasets: [{ label: "Sales", data: categoryValues }]
    }
  });

  channelChart = new Chart(document.getElementById("channelChart"), {
    type: "bar",
    data: {
      labels: channelLabels,
      datasets: [{ label: "Sales", data: channelValues }]
    }
  });
}