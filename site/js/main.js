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
