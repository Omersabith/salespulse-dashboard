import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/* ---------------- LOGIN ---------------- */

const loginForm = document.getElementById("loginForm");
const loginContainer = document.getElementById("login-container");
const dashboard = document.getElementById("dashboard-container");
const errorMsg = document.getElementById("auth-error");

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.getElementById("username").value;
  const password = document.getElementById("password").value;

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    errorMsg.classList.remove("hidden");
    return;
  }

  loginContainer.classList.add("hidden");
  dashboard.classList.remove("hidden");

  loadDashboard();
});

async function checkSession() {
  const { data } = await supabase.auth.getSession();

  if (data.session) {
    loginContainer.classList.add("hidden");
    dashboard.classList.remove("hidden");
    loadDashboard();
  }
}

checkSession();

document.getElementById("logoutBtn").addEventListener("click", async () => {
  await supabase.auth.signOut();
  location.reload();
});

/* ---------------- FETCH DATA ---------------- */

async function loadDashboard() {

  const { data, error } = await supabase
    .from("salespulse_payload")
    .select("content")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (error) {
    console.error("DATA LOAD ERROR:", error);
    return;
  }

  if (!data || !data.content) {
    console.error("NO CONTENT FOUND");
    return;
  }

  const payload = data.content;

  const kpi = payload.kpi || {};
  const categoryData = payload.category_performance || [];
  const channelData = payload.channel_performance || [];
  const execData = payload.executive_performance || [];
  const rawData = payload.raw_data || [];

  console.log("FULL PAYLOAD:", payload);
  console.log("RAW DATA COUNT:", rawData.length);

  window.__RAW_DATA__ = rawData;

  populateFilters(rawData);
  renderAll(kpi, categoryData, channelData, execData, rawData);
}

/* ---------------- FILTERING ---------------- */

function populateFilters(data) {

  const channelSelect = document.getElementById("filterChannel");
  const partSelect = document.getElementById("filterPart");

  channelSelect.innerHTML = '<option value="">All Channels</option>';
  partSelect.innerHTML = '<option value="">All Parts</option>';

  const channels = [...new Set(data.map(d => d["CHANNEL"]))].sort();
  const parts = [...new Set(data.map(d => d["Part Number"]))].sort();

  channels.forEach(c => {
    const opt = document.createElement("option");
    opt.value = c;
    opt.textContent = c;
    channelSelect.appendChild(opt);
  });

  parts.forEach(p => {
    const opt = document.createElement("option");
    opt.value = p;
    opt.textContent = p;
    partSelect.appendChild(opt);
  });

  channelSelect.onchange = applyFilters;
  partSelect.onchange = applyFilters;
  document.getElementById("filterFrom").onchange = applyFilters;
  document.getElementById("filterTo").onchange = applyFilters;
  document.getElementById("resetFilters").onclick = resetFilters;
}

function applyFilters() {

  let data = window.__RAW_DATA__;

  const channel = document.getElementById("filterChannel").value;
  const part = document.getElementById("filterPart").value;
  const from = document.getElementById("filterFrom").value;
  const to = document.getElementById("filterTo").value;

  if (channel) {
    data = data.filter(d => d["CHANNEL"] === channel);
  }

  if (part) {
    data = data.filter(d => d["Part Number"] === part);
  }

  if (from) {
    data = data.filter(d => d["Date"] >= from);
  }

  if (to) {
    data = data.filter(d => d["Date"] <= to);
  }

  recalculateDashboard(data);
}

function resetFilters() {
  document.getElementById("filterChannel").value = "";
  document.getElementById("filterPart").value = "";
  document.getElementById("filterFrom").value = "";
  document.getElementById("filterTo").value = "";
  applyFilters();
}

/* ---------------- RECALCULATE FROM RAW ---------------- */

function recalculateDashboard(data) {

  const totalSales = data.reduce((sum, r) => sum + r["Amount"], 0);
  const totalQty = data.reduce((sum, r) => sum + r["Qty"], 0);

  document.getElementById("totalSales").textContent = totalSales.toFixed(2);
  document.getElementById("totalQty").textContent = totalQty;

  renderTable("table-raw", data);
}

/* ---------------- INITIAL RENDER ---------------- */

function renderAll(kpi, cat, chan, exec, raw) {

  document.getElementById("mtdSales").textContent = kpi.mtd_sales ?? 0;
  document.getElementById("totalSales").textContent = kpi.total_sales ?? 0;
  document.getElementById("totalQty").textContent = kpi.total_qty ?? 0;
  document.getElementById("growth").textContent = (kpi.growth_pct ?? 0) + "%";
  document.getElementById("bestChannel").textContent = kpi.best_channel ?? "-";
  document.getElementById("topCategory").textContent = kpi.top_category ?? "-";

  renderTable("table-cat", cat);
  renderTable("table-chan", chan);
  renderTable("table-exec", exec);
  renderTable("table-raw", raw);
}

/* ---------------- GENERIC TABLE ---------------- */

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
    th.textContent = h;
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