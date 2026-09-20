// Show a labeled placeholder for any photo that hasn't been added yet.
document.querySelectorAll(".photo img").forEach(function (img) {
  function markMissing() { img.parentElement.classList.add("missing"); }
  if (img.complete && img.naturalWidth === 0) markMissing();
  img.addEventListener("error", markMissing);
});

var year = document.getElementById("year");
if (year) year.textContent = new Date().getFullYear();

// Fade content in as it scrolls into view.
if ("IntersectionObserver" in window) {
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
    });
  }, { threshold: 0.12 });
  document.querySelectorAll(".chapter, .card, .feature, .also, .tile, .stat, .glance__lead, .questions li").forEach(function (el) {
    el.classList.add("reveal");
    io.observe(el);
  });
}

// Full-screen menu (hamburger).
(function () {
  var toggle = document.querySelector(".nav__toggle");
  var menu = document.getElementById("menu");
  if (!toggle || !menu) return;

  function setOpen(open) {
    document.body.classList.toggle("menu-open", open);
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  }
  toggle.addEventListener("click", function () {
    setOpen(!document.body.classList.contains("menu-open"));
  });
  menu.addEventListener("click", function (e) {
    if (e.target.closest("a")) setOpen(false);
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && document.body.classList.contains("menu-open")) {
      setOpen(false);
      toggle.focus();
    }
  });
})();
