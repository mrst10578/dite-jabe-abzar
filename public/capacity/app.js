import { YEARS, GROUPS, compareLabels, normalizeUniversity, recordUniversity, universityNames, capacityTotals } from "./model.js";

const byId = (id) => document.getElementById(id);
const number = new Intl.NumberFormat("fa-IR");
const DISPLAY_YEARS = YEARS;
const picker = byId("group-picker"), explorer = byId("capacity-explorer");
const majorSelect = byId("capacity-major"), universitiesField = byId("capacity-universities");
const options = byId("university-options"), search = byId("university-search");
const results = byId("capacity-results"), message = byId("capacity-message"), retry = byId("capacity-retry");
let catalog = null, group = null, major = null, records = null, universities = [], request = 0, controller = null, retryAction = null;
const selected = new Set(), cache = new Map();

function element(tag, text, className) {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className) node.className = className;
  return node;
}
function status(text, action = null) { message.textContent = text; retryAction = action; retry.hidden = !action; }
retry.addEventListener("click", () => retryAction?.());

async function json(url, signal) {
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

function resetMajor() {
  request += 1; controller?.abort(); controller = null;
  major = null; records = null; universities = []; selected.clear();
  results.hidden = true; search.value = ""; options.replaceChildren(); universitiesField.disabled = true;
  byId("selected-count").textContent = "";
  byId("universities-empty").hidden = false; byId("universities-empty").textContent = "اول رشته را انتخاب کن.";
  byId("capacity-coverage").hidden = true;
  byId("capacity-details").open = false; byId("capacity-detail-rows").replaceChildren();
  status("");
}

async function enterGroup(id) {
  resetMajor(); const token = request;
  status("در حال آماده‌کردن فهرست رشته‌ها…");
  picker.setAttribute("aria-busy", "true");
  picker.querySelectorAll("button").forEach((button) => { button.disabled = true; });
  try {
    if (!catalog) {
      const loaded = await json("/capacity/data/catalog.json");
      if (loaded.schemaVersion !== 1 || !/^[a-f0-9]{16}$/.test(loaded.snapshotId) || !/^[a-f0-9]{40}$/.test(loaded.source?.commit) || !loaded.groups?.every((item) => GROUPS.some((known) => known.id === item.id) && Array.isArray(item.majors))) throw new Error("Invalid catalog");
      catalog = loaded;
    }
    if (token !== request) return;
    group = catalog.groups.find((item) => item.id === id);
    if (!group) throw new Error("Missing group");
    majorSelect.replaceChildren(new Option("انتخاب رشته…", ""), ...group.majors.map((item) => new Option(item.label, item.id)));
    byId("capacity-group-label").textContent = group.label;
    picker.hidden = true; explorer.hidden = false; majorSelect.focus(); status("");
    byId("snapshot-details").hidden = false;
    const date = new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(catalog.source.commitDate));
    byId("snapshot-description").textContent = `نسخهٔ داده‌ها تا ${date}؛ شامل ${number.format(catalog.rows)} ردیف ظرفیت در سال‌های ۱۴۰۱ تا ۱۴۰۵. دادهٔ ۱۴۰۵ فعلاً گروه‌های تجربی و ریاضی را پوشش می‌دهد؛ گروه انسانی هنوز در حال تکمیل است.`;
    byId("snapshot-source").href = `https://github.com/mrst10578/Entekhab-Reshte/tree/${catalog.source.commit}/data/capacity`;
  } catch {
    if (token === request) status("دریافت فهرست رشته‌ها انجام نشد. اتصال اینترنت را بررسی کن و دوباره تلاش کن.", () => enterGroup(id));
  } finally {
    picker.removeAttribute("aria-busy");
    picker.querySelectorAll("button").forEach((button) => { button.disabled = false; });
  }
}
picker.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-group]");
  if (button) enterGroup(button.dataset.group);
});
byId("change-group").addEventListener("click", () => {
  resetMajor(); group = null; explorer.hidden = true; picker.hidden = false;
  picker.querySelector("button").focus();
});

function filterUniversities() {
  const query = normalizeUniversity(search.value, { major: major?.label });
  let visible = 0;
  for (const label of options.children) {
    label.hidden = !normalizeUniversity(label.textContent, { major: major?.label }).includes(query);
    if (!label.hidden) visible += 1;
  }
  byId("universities-empty").hidden = visible > 0;
  byId("universities-empty").textContent = "دانشگاهی با این نام در فهرست این رشته پیدا نشد.";
}
search.addEventListener("input", filterUniversities);

function universityOptions() {
  options.replaceChildren(...universities.map((university) => {
    const label = element("label"), input = element("input");
    input.type = "checkbox"; input.value = university; input.checked = selected.has(university);
    label.append(input, document.createTextNode(university)); return label;
  }));
  universitiesField.disabled = false;
  filterUniversities();
}
options.addEventListener("change", (event) => {
  if (event.target.type !== "checkbox") return;
  if (event.target.checked) selected.add(event.target.value); else selected.delete(event.target.value);
  render();
});
byId("select-all").addEventListener("click", () => {
  for (const label of options.children) if (!label.hidden) { const input = label.querySelector("input"); input.checked = true; selected.add(input.value); }
  render();
});
byId("clear-universities").addEventListener("click", () => {
  selected.clear(); options.querySelectorAll("input").forEach((input) => { input.checked = false; }); render();
});

async function loadMajor() {
  const current = major, token = ++request;
  controller?.abort(); controller = new AbortController(); records = null; results.hidden = true;
  status("در حال دریافت ظرفیت‌های این رشته…"); explorer.setAttribute("aria-busy", "true");
  try {
    let shard = cache.get(current.id);
    if (!shard) {
      shard = await json(`/capacity/data/${current.path}?snapshot=${catalog.snapshotId}`, controller.signal);
      if (shard.snapshotId !== catalog.snapshotId || shard.id !== current.id || shard.group !== group.id || shard.major !== current.label || !Array.isArray(shard.records) || !shard.records.every((row) => row.major === current.label && YEARS.includes(row.year) && Number.isSafeInteger(row.capacity) && row.capacity >= 0 && current.universities.includes(row.university))) throw new Error("Invalid capacity snapshot");
      cache.set(current.id, shard);
    }
    if (token !== request || major !== current) return;
    records = shard.records; universities = universityNames(records.map((row) => recordUniversity(row)), { major: current.label });
    universityOptions(); status(""); render();
  } catch (error) {
    if (token !== request || error.name === "AbortError") return;
    byId("universities-empty").textContent = "فهرست دانشگاه‌ها دریافت نشد.";
    status("دریافت داده‌ها انجام نشد. اتصال اینترنت را بررسی کن و دوباره تلاش کن.", loadMajor);
  } finally { if (token === request) explorer.removeAttribute("aria-busy"); }
}

majorSelect.addEventListener("change", () => {
  const id = majorSelect.value;
  resetMajor(); explorer.removeAttribute("aria-busy");
  major = group.majors.find((item) => item.id === id) ?? null;
  if (!major) return;
  byId("universities-empty").textContent = "در حال آماده‌کردن فهرست دانشگاه‌ها…";
  if (group.id === "experimental" && ["شیمی محض", "شیمی کاربردی"].includes(major.label)) {
    byId("capacity-coverage").hidden = false;
    byId("capacity-coverage").textContent = "دادهٔ شیمی در گروه تجربیِ این نسخه فقط دوره‌های روزانهٔ استان تهران را پوشش می‌دهد.";
  }
  loadMajor();
});

function valuesRow(university, values, total = false) {
  const row = element("tr"), heading = element("th", university);
  heading.scope = "row"; row.append(heading);
  for (const year of DISPLAY_YEARS) {
    const value = values[year] ?? null;
    const pending = year === 1405 && group?.id === "humanities";
    const cell = element("td", pending ? "به‌زودی" : value === null ? "ثبت نشده" : number.format(value), pending ? "soon" : value === null ? "missing" : "");
    if (pending) cell.title = "دادهٔ ۱۴۰۵ این گروه هنوز اضافه نشده است.";
    else if (value === null) cell.title = "برای این ترکیب دادهٔ ظرفیت ثبت نشده است.";
    row.append(cell);
  }
  if (total) row.dataset.total = "true";
  return row;
}

function renderDetails() {
  if (!byId("capacity-details").open || !records) return;
  const chosen = records.filter((row) => selected.has(recordUniversity(row))).sort((a, b) => b.year - a.year || compareLabels(recordUniversity(a), recordUniversity(b)) || compareLabels(a.program_type || "", b.program_type || ""));
  byId("capacity-detail-rows").replaceChildren(...chosen.map((record) => {
    const row = element("tr");
    const university = recordUniversity(record) + (record.campus ? ` · ${normalizeUniversity(record.campus)}` : "");
    const conditions = element("td", record.admission_conditions || record.admission_category || "—");
    if (record.notes) conditions.append(element("small", record.notes));
    const source = element("td", `${record.source_id} · صفحه ${record.source_page || "نامشخص"}`);
    if (record.base_source_id && record.base_source_id !== record.source_id) source.append(element("small", `منبع اولیه: ${record.base_source_id} · صفحه ${record.base_source_page || "نامشخص"}`));
    row.append(...[number.format(record.year).replaceAll("٬", ""), university, record.program_type || "در جدول ذکر نشده", record.gender || "در جدول ذکر نشده", record.intake || "در جدول ذکر نشده", number.format(record.capacity)].map((value) => element("td", value)), conditions, source);
    return row;
  }));
}
byId("capacity-details").addEventListener("toggle", renderDetails);

function render() {
  byId("selected-count").textContent = selected.size ? `${number.format(selected.size)} دانشگاه انتخاب شد` : "";
  if (!records || !selected.size) {
    results.hidden = true;
    if (records) status("یک یا چند دانشگاه را انتخاب کن.");
    return;
  }
  status("");
  const rows = capacityTotals(records, [...selected], { major: major.label }, DISPLAY_YEARS);
  byId("capacity-results-title").textContent = `ظرفیت پذیرش ${major.label}`;
  byId("capacity-table").querySelector("tbody").replaceChildren(...rows.map((row) => valuesRow(row.university, row.years)));
  const totals = Object.fromEntries(DISPLAY_YEARS.map((year) => {
    const known = rows.map((row) => row.years[year]).filter((value) => value !== null);
    return [year, known.length ? known.reduce((sum, value) => sum + value, 0) : null];
  }));
  byId("capacity-table").querySelector("tfoot").replaceChildren(valuesRow("جمع ظرفیت‌های ثبت‌شده", totals, true));
  results.hidden = false; renderDetails();
}
