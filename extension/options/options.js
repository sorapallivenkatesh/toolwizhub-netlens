/* options.js — manage the allowlist (stored in chrome.storage.local). */
import { etld1 } from "../core/etld.js";

const KEY = "netlens:allowlist";
const listEl = document.getElementById("list");
const input = document.getElementById("domain");
const addBtn = document.getElementById("add");
const errEl = document.getElementById("err");
let allow = [];

const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };
const save = () => chrome.storage.local.set({ [KEY]: allow }).catch(() => {});

function render() {
  listEl.replaceChildren();
  if (!allow.length) { listEl.append(el("li", "empty", "No domains allowlisted yet.")); return; }
  for (const d of allow) {
    const li = el("li", "item");
    li.append(el("span", "item__d", d));
    const rm = el("button", "rm", "Remove");
    rm.addEventListener("click", () => { allow = allow.filter((x) => x !== d); save(); render(); });
    li.append(rm);
    listEl.append(li);
  }
}

function add() {
  errEl.textContent = "";
  let v = input.value.trim().toLowerCase();
  if (!v) return;
  try { if (v.includes("/")) v = new URL(v.includes("://") ? v : "http://" + v).hostname; } catch {}
  const d = etld1(v);
  if (!d || !d.includes(".")) { errEl.textContent = "Enter a valid domain (e.g. example.com)."; return; }
  if (!allow.includes(d)) allow.push(d);
  allow.sort();
  save(); input.value = ""; render();
}

addBtn.addEventListener("click", add);
input.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); add(); } });

chrome.storage.local.get(KEY).then((s) => { allow = s[KEY] || []; render(); }).catch(() => render());
