import { evaluate, formatResult } from "./engine.js";

const STORAGE_KEY = "red-dwarf-calculator-v1";
const defaults = {
  expression: "",
  answer: 0,
  memory: 0,
  angle: "DEG",
  history: [],
  settings: { precision: 10, feedback: true, reducedMotion: false }
};

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return {
      ...structuredClone(defaults),
      ...saved,
      settings: { ...defaults.settings, ...saved?.settings },
      history: Array.isArray(saved?.history) ? saved.history.slice(0, 30) : []
    };
  } catch { return structuredClone(defaults); }
}

let state = loadState();
let justCalculated = false;
let deferredInstall;

const expression = document.querySelector("#expression");
const result = document.querySelector("#result");
const status = document.querySelector("#expressionStatus");
const memoryIndicator = document.querySelector("#memoryIndicator");
const historyList = document.querySelector("#historyList");
const historyEmpty = document.querySelector("#historyEmpty");
const toast = document.querySelector("#toast");
const installButton = document.querySelector("#installButton");
const settingsDialog = document.querySelector("#settingsDialog");
const helpDialog = document.querySelector("#helpDialog");
const precisionSetting = document.querySelector("#precisionSetting");
const feedbackSetting = document.querySelector("#feedbackSetting");
const motionSetting = document.querySelector("#motionSetting");

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function prettify(value) {
  return String(value).replaceAll("*", "×").replaceAll("/", "÷").replaceAll("-", "−");
}

function preview() {
  if (!state.expression) return "0";
  try { return formatResult(evaluate(state.expression, state.angle), state.settings.precision); }
  catch { return "—"; }
}

function render() {
  expression.textContent = state.expression || "0";
  result.textContent = justCalculated ? formatResult(state.answer, state.settings.precision) : preview();
  memoryIndicator.textContent = state.memory === 0 ? "MEMORY EMPTY" : `MEM ${formatResult(state.memory, state.settings.precision)}`;
  document.querySelectorAll("[data-angle]").forEach(button => {
    button.classList.toggle("active", button.dataset.angle === state.angle);
    button.setAttribute("aria-pressed", String(button.dataset.angle === state.angle));
  });
  document.documentElement.classList.toggle("reduce-motion", state.settings.reducedMotion);
  renderHistory();
  save();
}

function renderHistory() {
  historyList.replaceChildren();
  historyEmpty.hidden = state.history.length > 0;
  state.history.forEach((entry, index) => {
    const item = document.createElement("button");
    item.type = "button";
    item.className = "history-item";
    item.innerHTML = `<span>${escapeHtml(entry.expression)}</span><strong>${escapeHtml(entry.result)}</strong><small>${escapeHtml(entry.mode)} · ${escapeHtml(entry.time)}</small>`;
    item.addEventListener("click", () => {
      state.expression = entry.raw;
      state.answer = entry.value;
      justCalculated = true;
      status.textContent = `RECALLED // ${String(index + 1).padStart(2, "0")}`;
      render();
    });
    historyList.append(item);
  });
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"]/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[character]);
}

function insert(value) {
  if (justCalculated && /^[\d.(πe]|sin|cos|tan|sqrt|ln|log|asin|acos|atan/.test(value)) state.expression = "";
  justCalculated = false;
  state.expression += value;
  status.textContent = "COMPUTING";
  feedback();
  render();
}

function calculate() {
  if (!state.expression) return;
  try {
    const value = evaluate(state.expression, state.angle);
    const formatted = formatResult(value, state.settings.precision);
    state.answer = value;
    state.history.unshift({
      raw: state.expression,
      expression: prettify(state.expression),
      value,
      result: formatted,
      mode: state.angle,
      time: new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit" }).format(new Date())
    });
    state.history = state.history.slice(0, 30);
    justCalculated = true;
    status.textContent = "SOLUTION LOCKED";
    feedback(true);
    render();
  } catch (error) {
    status.textContent = "INPUT ERROR";
    showToast(error.message, true);
    result.textContent = "ERROR";
    feedback(false, true);
  }
}

function currentValue() {
  try { return state.expression ? evaluate(state.expression, state.angle) : state.answer; }
  catch { return state.answer; }
}

function performAction(action) {
  switch (action) {
    case "clear":
      state.expression = "";
      justCalculated = false;
      status.textContent = "READY";
      break;
    case "backspace":
      state.expression = state.expression.slice(0, -1);
      justCalculated = false;
      status.textContent = state.expression ? "COMPUTING" : "READY";
      break;
    case "calculate": calculate(); return;
    case "sign":
      state.expression = state.expression ? `-(${state.expression})` : "-";
      justCalculated = false;
      break;
    case "answer": insert(formatResult(state.answer, 14)); return;
    case "memory-clear":
      state.memory = 0;
      showToast("Memory cleared");
      break;
    case "memory-recall": insert(formatResult(state.memory, 14)); return;
    case "memory-add":
      state.memory += currentValue();
      showToast("Value added to memory");
      break;
    case "memory-subtract":
      state.memory -= currentValue();
      showToast("Value subtracted from memory");
      break;
    default: return;
  }
  feedback();
  render();
}

function feedback(success = false, error = false) {
  if (!state.settings.feedback) return;
  if (navigator.vibrate) navigator.vibrate(error ? [25, 30, 25] : success ? 20 : 8);
  try {
    const audio = new AudioContext();
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = error ? 120 : success ? 560 : 310;
    gain.gain.setValueAtTime(0.018, audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + 0.035);
    oscillator.connect(gain).connect(audio.destination);
    oscillator.start();
    oscillator.stop(audio.currentTime + 0.04);
  } catch { /* Audio feedback is optional. */ }
}

let toastTimer;
function showToast(message, error = false) {
  clearTimeout(toastTimer);
  toast.textContent = message;
  toast.classList.toggle("error", error);
  toast.classList.add("visible");
  toastTimer = setTimeout(() => toast.classList.remove("visible"), 2600);
}

document.querySelectorAll("[data-insert]").forEach(button => button.addEventListener("click", () => insert(button.dataset.insert)));
document.querySelectorAll("[data-action]").forEach(button => button.addEventListener("click", () => performAction(button.dataset.action)));
document.querySelectorAll("[data-angle]").forEach(button => button.addEventListener("click", () => {
  state.angle = button.dataset.angle;
  status.textContent = `${state.angle} MODE`;
  render();
}));

document.querySelector("#clearHistory").addEventListener("click", () => {
  state.history = [];
  render();
  showToast("Flight recorder cleared");
});
document.querySelector("#settingsButton").addEventListener("click", () => {
  precisionSetting.value = String(state.settings.precision);
  feedbackSetting.checked = state.settings.feedback;
  motionSetting.checked = state.settings.reducedMotion;
  settingsDialog.showModal();
});
document.querySelector("#helpButton").addEventListener("click", () => helpDialog.showModal());
settingsDialog.addEventListener("close", () => {
  if (settingsDialog.returnValue !== "save") return;
  state.settings = {
    precision: Number(precisionSetting.value),
    feedback: feedbackSetting.checked,
    reducedMotion: motionSetting.checked
  };
  status.textContent = "CONFIG UPDATED";
  render();
  showToast("Configuration saved");
});

document.addEventListener("keydown", event => {
  if (document.querySelector("dialog[open]")) return;
  const keyMap = { "*": "×", "/": "÷", "-": "−", p: "π" };
  if (/^[\d.+()%!]$/.test(event.key) || event.key in keyMap) {
    event.preventDefault();
    insert(keyMap[event.key] || event.key);
  } else if (event.key === "Enter" || event.key === "=") {
    event.preventDefault(); calculate();
  } else if (event.key === "Backspace" || event.key === "Delete") {
    event.preventDefault(); performAction("backspace");
  } else if (event.key === "Escape") {
    event.preventDefault(); performAction("clear");
  }
});

window.addEventListener("beforeinstallprompt", event => {
  event.preventDefault();
  deferredInstall = event;
  installButton.hidden = false;
});
installButton.addEventListener("click", async () => {
  if (!deferredInstall) return;
  deferredInstall.prompt();
  const choice = await deferredInstall.userChoice;
  if (choice.outcome === "accepted") showToast("Red Dwarf installed");
  deferredInstall = undefined;
  installButton.hidden = true;
});
window.addEventListener("appinstalled", () => { installButton.hidden = true; });

function updateClock() {
  document.querySelector("#telemetryClock").textContent = new Date().toLocaleTimeString([], { hour12: false });
}
updateClock();
setInterval(updateClock, 1000);

if ("serviceWorker" in navigator) window.addEventListener("load", () => navigator.serviceWorker.register("./sw.js"));
render();
