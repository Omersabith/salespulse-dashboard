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

/* ---------------- SESSION CHECK ---------------- */

async function checkSession() {
  const { data } = await supabase.auth.getSession();

  if (data.session) {
    loginContainer.classList.add("hidden");
    dashboard.classList.remove("hidden");
    loadDashboard();
  }
}

checkSession();

/* ---------------- LOGOUT ---------------- */

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

  const payload = data.content || {};

  const kpi = payload.kpi || {};
  const categoryData = payload.category_performance || [];
  const channelData = payload.channel_performance || [];
  const execData = payload.executive_performance || [];
  const rawData = payload.raw_data || [];
// STORE RAW DATA GLOBALLY
window.__RAW_DATA__ = rawData;

// POPULATE FILTER DROPDOWNS
populateFilters(rawData);

  /* ---------------- KPI RENDER ---------------- */

  document.getElementById("mtdSales").textContent = kpi.mtd_sales ?? 0;
  document.getElementById("totalSales").textContent = kpi.total_sales ?? 0;
  document.getElementById("totalQty").textContent = kpi.total_qty ?? 0;
  document.getElementById("growth").textContent =
    (kpi.growth_pct ?? 0) + "%";
  document.getElementById("bestChannel").textContent =
    kpi.best_channel ?? "-";
  document.getElementById("topCategory").textContent =
    kpi.top_category ?? "-";

  /* ---------------- TABLE RENDER ---------------- */

  renderTable("table-cat", categoryData);
  renderTable("table-chan", channelData);
  renderTable("table-exec", execData);
  renderTable("table-raw", rawData);

  /* ---------------- RAW TABLE SEARCH ---------------- */

  const searchInput = document.getElementById("tableSearch");

  if (searchInput) {
    searchInput.oninput = function () {
      const value = this.value.toLowerCase();
      const rows = document.querySelectorAll("#table-raw tbody tr");

      rows.forEach((row) => {
        row.style.display = row.textContent.toLowerCase().includes(value)
          ? ""
          : "none";
      });
    };
  }
}

/* ---------------- GENERIC TABLE RENDER FUNCTION ---------------- */

function renderTable(tableId, data) {
  const table = document.getElementById(tableId);
  if (!table) return;

  const thead = table.querySelector("thead");
  const tbody = table.querySelector("tbody");

  thead.innerHTML = "";
  tbody.innerHTML = "";

  if (!data || data.length === 0) return;

  const headers = Object.keys(data[0]);

  // HEADER
  const headRow = document.createElement("tr");
  headers.forEach((h) => {
    const th = document.createElement("th");
    th.textContent = h.replaceAll("_", " ").toUpperCase();
    headRow.appendChild(th);
  });
  thead.appendChild(headRow);

  // BODY
  data.forEach((row) => {
    const tr = document.createElement("tr");

    headers.forEach((h) => {
      const td = document.createElement("td");
      td.textContent = row[h];
      tr.appendChild(td);
    });

    tbody.appendChild(tr);
  });
}
// 🔽 FILTER POPULATION
function populateFilters(data) {
  const channelSelect = document.getElementById("filterChannel");
  const partSelect = document.getElementById("filterPart");

  // CLEAR OLD OPTIONS (important when reloading)
  channelSelect.innerHTML = '<option value="ALL">All Channels</option>';
  partSelect.innerHTML = '<option value="ALL">All Parts</option>';

  // GET UNIQUE VALUES
  const channels = [...new Set(data.map(d => d.channel).filter(Boolean))];
  const parts = [...new Set(data.map(d => d.part_number).filter(Boolean))];

  channels.sort();
  parts.sort();

  // ADD CHANNEL OPTIONS
  channels.forEach(ch => {
    const opt = document.createElement("option");
    opt.value = ch;
    opt.textContent = ch;
    channelSelect.appendChild(opt);
  });

  // ADD PART OPTIONS
  parts.forEach(p => {
    const opt = document.createElement("option");
    opt.value = p;
    opt.textContent = p;
    partSelect.appendChild(opt);
  });
}