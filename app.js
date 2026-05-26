const STORAGE_KEY = "subscriptions.v1";
const CURRENCY_KEY = "subscriptions.currency";

const CURRENCY_SYMBOLS = {
  USD: "$", EUR: "€", GBP: "£", JPY: "¥",
  AUD: "A$", CAD: "C$", INR: "₹",
};

let state = {
  subs: load(),
  currency: localStorage.getItem(CURRENCY_KEY) || "USD",
};

const $ = (id) => document.getElementById(id);
const form = $("subForm");

function load() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.subs));
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function monthlyCost(sub) {
  const amt = Number(sub.amount) || 0;
  switch (sub.cycle) {
    case "yearly": return amt / 12;
    case "weekly": return amt * 52 / 12;
    case "quarterly": return amt / 3;
    case "monthly":
    default: return amt;
  }
}

function fmt(n) {
  const sym = CURRENCY_SYMBOLS[state.currency] || "";
  return `${sym}${n.toFixed(2)}`;
}

function daysUntil(dateStr) {
  if (!dateStr) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(dateStr);
  d.setHours(0, 0, 0, 0);
  return Math.round((d - today) / 86400000);
}

function advanceDate(dateStr, cycle) {
  const d = new Date(dateStr);
  switch (cycle) {
    case "yearly": d.setFullYear(d.getFullYear() + 1); break;
    case "weekly": d.setDate(d.getDate() + 7); break;
    case "quarterly": d.setMonth(d.getMonth() + 3); break;
    case "monthly":
    default: d.setMonth(d.getMonth() + 1); break;
  }
  return d.toISOString().slice(0, 10);
}

function rollForwardOverdue() {
  let changed = false;
  for (const sub of state.subs) {
    if (!sub.nextDate) continue;
    while (daysUntil(sub.nextDate) < 0) {
      sub.nextDate = advanceDate(sub.nextDate, sub.cycle);
      changed = true;
    }
  }
  if (changed) save();
}

function render() {
  renderSummary();
  renderList();
  renderBreakdown();
  renderCategoryFilter();
}

function renderSummary() {
  const monthly = state.subs.reduce((s, x) => s + monthlyCost(x), 0);
  $("totalMonthly").textContent = fmt(monthly);
  $("totalYearly").textContent = fmt(monthly * 12);
  $("totalCount").textContent = state.subs.length;

  const upcoming = state.subs.reduce((s, x) => {
    const d = daysUntil(x.nextDate);
    if (d !== null && d >= 0 && d <= 30) return s + Number(x.amount || 0);
    return s;
  }, 0);
  $("totalUpcoming").textContent = fmt(upcoming);
}

function renderList() {
  const list = $("subList");
  const empty = $("emptyState");
  const search = $("search").value.trim().toLowerCase();
  const filterCat = $("filterCategory").value;
  const sortBy = $("sortBy").value;

  let items = [...state.subs];
  if (search) items = items.filter(s => s.name.toLowerCase().includes(search));
  if (filterCat) items = items.filter(s => s.category === filterCat);

  items.sort((a, b) => {
    switch (sortBy) {
      case "monthly-desc": return monthlyCost(b) - monthlyCost(a);
      case "monthly-asc": return monthlyCost(a) - monthlyCost(b);
      case "next": {
        const da = daysUntil(a.nextDate); const db = daysUntil(b.nextDate);
        if (da === null) return 1;
        if (db === null) return -1;
        return da - db;
      }
      case "name":
      default: return a.name.localeCompare(b.name);
    }
  });

  list.innerHTML = "";
  empty.classList.toggle("hidden", items.length > 0);

  for (const sub of items) {
    const li = document.createElement("li");
    li.className = "sub-item";

    const main = document.createElement("div");
    main.className = "sub-main";
    const name = document.createElement("span");
    name.className = "sub-name";
    name.textContent = sub.name;
    const meta = document.createElement("span");
    meta.className = "sub-meta";

    const parts = [sub.category, sub.cycle];
    if (sub.nextDate) {
      const d = daysUntil(sub.nextDate);
      let dateLabel = `next: ${sub.nextDate}`;
      if (d === 0) dateLabel += " (today)";
      else if (d > 0) dateLabel += ` (in ${d}d)`;
      parts.push(dateLabel);
    }
    meta.textContent = parts.join(" • ");
    main.append(name, meta);

    const amt = document.createElement("div");
    amt.className = "sub-amount";
    const price = document.createElement("div");
    price.className = "sub-price";
    price.textContent = `${fmt(Number(sub.amount))} / ${sub.cycle.replace("ly", "")}`;
    const mo = document.createElement("div");
    mo.className = "sub-monthly";
    mo.textContent = sub.cycle === "monthly" ? "" : `${fmt(monthlyCost(sub))} /mo`;
    amt.append(price, mo);

    const actions = document.createElement("div");
    actions.className = "sub-actions";
    const edit = document.createElement("button");
    edit.className = "secondary";
    edit.textContent = "Edit";
    edit.onclick = () => beginEdit(sub.id);
    const del = document.createElement("button");
    del.className = "danger";
    del.textContent = "Delete";
    del.onclick = () => removeSub(sub.id);
    actions.append(edit, del);

    li.append(main, amt, actions);
    list.appendChild(li);
  }
}

function renderBreakdown() {
  const container = $("categoryBreakdown");
  const totals = {};
  for (const sub of state.subs) {
    totals[sub.category] = (totals[sub.category] || 0) + monthlyCost(sub);
  }
  const entries = Object.entries(totals).sort((a, b) => b[1] - a[1]);
  const max = entries.length ? entries[0][1] : 1;

  container.innerHTML = "";
  if (!entries.length) {
    const empty = document.createElement("div");
    empty.className = "empty";
    empty.textContent = "No data yet.";
    container.appendChild(empty);
    return;
  }

  for (const [cat, val] of entries) {
    const row = document.createElement("div");
    row.className = "bar-row";
    const name = document.createElement("div");
    name.className = "bar-name";
    name.textContent = cat;
    const track = document.createElement("div");
    track.className = "bar-track";
    const fill = document.createElement("div");
    fill.className = "bar-fill";
    fill.style.width = `${Math.max(4, (val / max) * 100)}%`;
    track.appendChild(fill);
    const value = document.createElement("div");
    value.className = "bar-value";
    value.textContent = fmt(val);
    row.append(name, track, value);
    container.appendChild(row);
  }
}

function renderCategoryFilter() {
  const sel = $("filterCategory");
  const current = sel.value;
  const cats = [...new Set(state.subs.map(s => s.category))].sort();
  sel.innerHTML = '<option value="">All categories</option>' +
    cats.map(c => `<option value="${c}">${c}</option>`).join("");
  sel.value = current;
}

function beginEdit(id) {
  const sub = state.subs.find(s => s.id === id);
  if (!sub) return;
  $("editId").value = sub.id;
  $("name").value = sub.name;
  $("amount").value = sub.amount;
  $("cycle").value = sub.cycle;
  $("category").value = sub.category;
  $("nextDate").value = sub.nextDate || "";
  $("submitBtn").textContent = "Save";
  $("cancelBtn").classList.remove("hidden");
  $("formTitle").textContent = "Edit subscription";
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function resetForm() {
  form.reset();
  $("editId").value = "";
  $("submitBtn").textContent = "Add";
  $("cancelBtn").classList.add("hidden");
  $("formTitle").textContent = "Add subscription";
}

function removeSub(id) {
  const sub = state.subs.find(s => s.id === id);
  if (!sub) return;
  if (!confirm(`Delete "${sub.name}"?`)) return;
  state.subs = state.subs.filter(s => s.id !== id);
  save();
  render();
}

form.addEventListener("submit", (e) => {
  e.preventDefault();
  const payload = {
    name: $("name").value.trim(),
    amount: parseFloat($("amount").value),
    cycle: $("cycle").value,
    category: $("category").value,
    nextDate: $("nextDate").value || null,
  };
  if (!payload.name || isNaN(payload.amount)) return;

  const editId = $("editId").value;
  if (editId) {
    const sub = state.subs.find(s => s.id === editId);
    if (sub) Object.assign(sub, payload);
  } else {
    state.subs.push({ id: uid(), ...payload });
  }
  save();
  resetForm();
  render();
});

$("cancelBtn").addEventListener("click", resetForm);
$("search").addEventListener("input", renderList);
$("filterCategory").addEventListener("change", renderList);
$("sortBy").addEventListener("change", renderList);

$("currency").addEventListener("change", (e) => {
  state.currency = e.target.value;
  localStorage.setItem(CURRENCY_KEY, state.currency);
  render();
});

$("exportBtn").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(state.subs, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `subscriptions-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
});

$("importInput").addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      if (!Array.isArray(data)) throw new Error("Invalid file");
      const cleaned = data
        .filter(d => d && d.name && d.amount != null && d.cycle)
        .map(d => ({
          id: d.id || uid(),
          name: String(d.name),
          amount: Number(d.amount),
          cycle: d.cycle,
          category: d.category || "Other",
          nextDate: d.nextDate || null,
        }));
      if (!confirm(`Import ${cleaned.length} subscriptions? This will replace your current list.`)) return;
      state.subs = cleaned;
      save();
      render();
    } catch (err) {
      alert("Could not import file: " + err.message);
    }
  };
  reader.readAsText(file);
  e.target.value = "";
});

$("clearBtn").addEventListener("click", () => {
  if (!state.subs.length) return;
  if (!confirm("Delete ALL subscriptions? This cannot be undone.")) return;
  state.subs = [];
  save();
  render();
});

$("currency").value = state.currency;
rollForwardOverdue();
render();
