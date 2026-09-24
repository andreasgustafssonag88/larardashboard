const $ = (selector) => document.querySelector(selector);
const DAYS = ["Måndag", "Tisdag", "Onsdag", "Torsdag", "Fredag"];
const MONTHS = ["januari", "februari", "mars", "april", "maj", "juni", "juli", "augusti", "september", "oktober", "november", "december"];

const load = (key, fallback) => {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
};
const save = (key, value) => localStorage.setItem(key, JSON.stringify(value));

let events = load("teacher-events", []);
let notes = load("teacher-notes", [
  { id: 1, title: "Inför nästa vecka", text: "Kopiera mattehäftena och planera laborationen." },
  { id: 2, title: "Kom ihåg", text: "Skicka veckobrevet senast torsdag eftermiddag." },
]);
let scheduleObjectUrl = "";
let week = startWeek(new Date());

function startWeek(date) {
  const result = new Date(date);
  result.setDate(result.getDate() - ((result.getDay() + 6) % 7));
  result.setHours(12, 0, 0, 0);
  return result;
}

function dateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function weekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const start = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - start) / 86400000) + 1) / 7);
}

function escapeHtml(value) {
  const element = document.createElement("div");
  element.textContent = String(value ?? "");
  return element.innerHTML;
}

function openImageDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("larardashboard-db", 1);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains("images")) {
        database.createObjectStore("images");
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function saveScheduleImage(blob) {
  const database = await openImageDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction("images", "readwrite");
    transaction.objectStore("images").put(blob, "schedule");
    transaction.oncomplete = () => { database.close(); resolve(); };
    transaction.onerror = () => { database.close(); reject(transaction.error); };
  });
}

async function getScheduleImage() {
  const database = await openImageDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction("images", "readonly");
    const request = transaction.objectStore("images").get("schedule");
    request.onsuccess = () => { database.close(); resolve(request.result || null); };
    request.onerror = () => { database.close(); reject(request.error); };
  });
}

async function deleteScheduleImage() {
  const database = await openImageDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction("images", "readwrite");
    transaction.objectStore("images").delete("schedule");
    transaction.oncomplete = () => { database.close(); resolve(); };
    transaction.onerror = () => { database.close(); reject(transaction.error); };
  });
}

async function compressImage(file) {
  if (!file || !file.type.startsWith("image/")) throw new Error("Ogiltig bildfil");
  const bitmap = await createImageBitmap(file);
  const maxWidth = 1800;
  const maxHeight = 1400;
  const scale = Math.min(1, maxWidth / bitmap.width, maxHeight / bitmap.height);
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { alpha: false });
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close?.();
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("Komprimeringen misslyckades")), "image/jpeg", 0.82);
  });
}

function showScheduleBlob(blob) {
  if (scheduleObjectUrl) URL.revokeObjectURL(scheduleObjectUrl);
  scheduleObjectUrl = blob ? URL.createObjectURL(blob) : "";
  const empty = $("#empty");
  const preview = $("#preview");
  const image = $("#image");
  if (blob) {
    image.src = scheduleObjectUrl;
    empty.hidden = true;
    preview.hidden = false;
  } else {
    image.removeAttribute("src");
    preview.hidden = true;
    empty.hidden = false;
  }
}

async function handleImage(file) {
  try {
    const blob = await compressImage(file);
    await saveScheduleImage(blob);
    showScheduleBlob(blob);
  } catch (error) {
    console.error(error);
    alert("Bilden kunde inte läggas till. Prova en JPG- eller PNG-bild.");
  }
}

async function initializeScheduleImage() {
  try {
    const blob = await getScheduleImage();
    showScheduleBlob(blob);
  } catch (error) {
    console.error("Kunde inte läsa schemabilden", error);
    showScheduleBlob(null);
  }
}

function renderClock() {
  const now = new Date();
  $("#clock").textContent = new Intl.DateTimeFormat("sv-SE", { hour: "2-digit", minute: "2-digit" }).format(now);
  $("#date").textContent = new Intl.DateTimeFormat("sv-SE", { weekday: "long", day: "numeric", month: "long" }).format(now);
}

function workingDays() {
  return Array.from({ length: 5 }, (_, index) => {
    const date = new Date(week);
    date.setDate(date.getDate() + index);
    return date;
  });
}

function renderWeek() {
  const days = workingDays();
  const today = new Date();
  $("#week").textContent = `Vecka ${weekNumber(week)}`;
  $("#range").textContent = `${days[0].getDate()} ${MONTHS[days[0].getMonth()]} till ${days[4].getDate()} ${MONTHS[days[4].getMonth()]}`;
  $("#days").innerHTML = days.map((date, index) => {
    const key = dateKey(date);
    const items = events.filter((item) => item.date === key).sort((a, b) => (a.time || "").localeCompare(b.time || ""));
    const content = items.length
      ? items.map((item) => `<div class="event"><time>${escapeHtml(item.time || "Heldag")}</time><span>${escapeHtml(item.title)}</span><button data-delete-event="${item.id}">×</button></div>`).join("")
      : `<button class="empty" data-add-event="${key}">Ingen händelse ＋</button>`;
    return `<div class="day ${date.toDateString() === today.toDateString() ? "today" : ""}"><button class="dayhead" data-add-event="${key}"><span>${DAYS[index].slice(0, 3)}</span><strong>${date.getDate()}</strong></button><div class="eventarea">${content}</div></div>`;
  }).join("");
}

function renderNotes() {
  $("#notes").innerHTML = notes.map((note) => `<article class="note"><div><b>${escapeHtml(note.title)}</b><button data-delete-note="${note.id}">×</button></div><p>${escapeHtml(note.text)}</p></article>`).join("");
}

[$("#file"), $("#file2")].forEach((input) => input?.addEventListener("change", async (event) => {
  const file = event.target.files?.[0];
  await handleImage(file);
  event.target.value = "";
}));

$("#remove").addEventListener("click", async () => {
  await deleteScheduleImage();
  showScheduleBlob(null);
});
$("#prev").onclick = () => { week.setDate(week.getDate() - 7); renderWeek(); };
$("#next").onclick = () => { week.setDate(week.getDate() + 7); renderWeek(); };
$("#today").onclick = () => { week = startWeek(new Date()); renderWeek(); };
$("#newNote").onclick = () => $("#noteDialog").showModal();

document.addEventListener("click", (event) => {
  const add = event.target.closest("[data-add-event]");
  if (add) { $("#eventDate").value = add.dataset.addEvent; $("#eventDialog").showModal(); }
  const deleteEvent = event.target.closest("[data-delete-event]");
  if (deleteEvent) { events = events.filter((item) => String(item.id) !== deleteEvent.dataset.deleteEvent); save("teacher-events", events); renderWeek(); }
  const deleteNote = event.target.closest("[data-delete-note]");
  if (deleteNote) { notes = notes.filter((item) => String(item.id) !== deleteNote.dataset.deleteNote); save("teacher-notes", notes); renderNotes(); }
  if (event.target.matches("[data-close]")) event.target.closest("dialog").close();
});

$("#eventForm").onsubmit = (event) => {
  event.preventDefault();
  const form = new FormData(event.target);
  events.push({ id: Date.now(), date: form.get("date"), time: form.get("time"), title: form.get("title") });
  save("teacher-events", events);
  event.target.reset();
  $("#eventDialog").close();
  renderWeek();
};

$("#noteForm").onsubmit = (event) => {
  event.preventDefault();
  const form = new FormData(event.target);
  notes.unshift({ id: Date.now(), title: form.get("title"), text: form.get("text") });
  save("teacher-notes", notes);
  event.target.reset();
  $("#noteDialog").close();
  renderNotes();
};

if ("serviceWorker" in navigator) {
  window.addEventListener("load", async () => {
    try {
      const registration = await navigator.serviceWorker.register("sw.js");
      await registration.update();
    } catch (error) {
      console.error("Service worker kunde inte uppdateras", error);
    }
  });
}

renderClock();
setInterval(renderClock, 1000);
initializeScheduleImage();
renderWeek();
renderNotes();
