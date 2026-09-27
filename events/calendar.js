let selectedDate = null; // "YYYY-MM-DD" or null
let eventDates = new Set();
let calYear, calMonth; // view state, month is 0-based

const MONTH_NAMES = [...Array(12)].map((_, i) => `Tháng ${i + 1}`);

function isoDate(d) {
  return (
    d.getFullYear() +
    "-" +
    String(d.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(d.getDate()).padStart(2, "0")
  );
}

// Cells for a month grid, Monday-first; null = leading blank.
function monthCells(year, month) {
  const leading = (new Date(year, month, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < leading; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++)
    cells.push(isoDate(new Date(year, month, d)));
  return cells;
}

// Every YYYY-MM-DD an event spans, inclusive. ISO strings compare correctly.
function featureDates(fromDate, toDate) {
  const out = [];
  if (!fromDate || !toDate || fromDate.length < 10 || toDate.length < 10)
    return out;
  const d = new Date(fromDate.slice(0, 10) + "T00:00:00");
  const end = toDate.slice(0, 10);
  for (;;) {
    const iso = isoDate(d);
    out.push(iso);
    if (iso >= end) break;
    d.setDate(d.getDate() + 1);
  }
  return out;
}

function eventDatesFromFeatures(features) {
  return new Set(
    features.flatMap((f) =>
      featureDates(f.properties.from_date, f.properties.to_date)
    )
  );
}

function setCalendarEvents(features) {
  eventDates = eventDatesFromFeatures(features);
}

function todayISO() {
  const t = new Date();
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
}

function renderCalendar() {
  document.getElementById("cal-title").textContent =
    MONTH_NAMES[calMonth] + " " + calYear;
  const daysEl = document.getElementById("cal-days");
  daysEl.innerHTML = "";
  for (const cell of monthCells(calYear, calMonth)) {
    if (!cell) {
      daysEl.appendChild(document.createElement("span"));
      continue;
    }
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = Number(cell.slice(8));
    if (eventDates.has(cell)) btn.classList.add("has-events");
    if (cell === todayISO()) btn.classList.add("today");
    if (cell === selectedDate) btn.classList.add("selected");
    btn.addEventListener("click", () => pickDate(cell));
    daysEl.appendChild(btn);
  }
}

function openCalendar() {
  const base = selectedDate ? new Date(selectedDate + "T00:00:00") : new Date();
  calYear = base.getFullYear();
  calMonth = base.getMonth();
  renderCalendar();
  document.getElementById("calendar-popover").hidden = false;
  document
    .getElementById("calendar-icon")
    .setAttribute("aria-expanded", "true");
}

function closeCalendar() {
  document.getElementById("calendar-popover").hidden = true;
  document
    .getElementById("calendar-icon")
    .setAttribute("aria-expanded", "false");
}

function toggleCalendar() {
  document.getElementById("calendar-popover").hidden
    ? openCalendar()
    : closeCalendar();
}

function shiftMonth(delta) {
  calMonth += delta;
  if (calMonth < 0) {
    calMonth = 11;
    calYear--;
  } else if (calMonth > 11) {
    calMonth = 0;
    calYear++;
  }
  renderCalendar();
}

function pickDate(iso) {
  selectedDate = iso;
  closeCalendar();
  if (popup.isOpen()) popup.remove();
  filterByDate(iso);
}

// Called by the map's reset button.
function clearCalendar() {
  selectedDate = null;
  closeCalendar();
}

if (typeof document !== "undefined") {
  document
    .getElementById("calendar-icon")
    .addEventListener("click", toggleCalendar);
  document
    .getElementById("cal-prev")
    .addEventListener("click", () => shiftMonth(-1));
  document
    .getElementById("cal-next")
    .addEventListener("click", () => shiftMonth(1));
  document.addEventListener("click", (e) => {
    if (!document.getElementById("calendar-wrapper").contains(e.target))
      closeCalendar();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeCalendar();
  });
}

// Expose pure logic for test-calendar.js
if (typeof module !== "undefined") {
  module.exports = {
    isoDate,
    monthCells,
    featureDates,
    eventDatesFromFeatures,
  };
}
