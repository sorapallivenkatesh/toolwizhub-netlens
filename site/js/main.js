/* main.js — splash (once per tab session), matching the ToolWizHub convention. */
(function () {
  const splash = document.getElementById("splash");
  if (!splash) return;
  try {
    if (sessionStorage.getItem("netlens:splashed")) { splash.style.display = "none"; return; }
    sessionStorage.setItem("netlens:splashed", "1");
  } catch (e) {}

  const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const hide = () => splash.classList.add("is-hiding");
  splash.addEventListener("click", hide);
  setTimeout(hide, reduce ? 200 : 1900);
})();

/* theme toggle (persists in localStorage 'netlens:theme') */
(function () {
  const btn = document.getElementById("theme");
  if (!btn) return;
  const sync = () => { btn.textContent = document.documentElement.dataset.theme === "light" ? "☀" : "☾"; };
  sync();
  btn.addEventListener("click", () => {
    const next = document.documentElement.dataset.theme === "light" ? "dark" : "light";
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem("netlens:theme", next); } catch (e) {}
    sync();
  });
})();
