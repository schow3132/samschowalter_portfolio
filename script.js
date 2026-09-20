// Show a labeled placeholder for any photo that hasn't been added yet.
document.querySelectorAll(".photo img").forEach(function (img) {
  function markMissing() { img.parentElement.classList.add("missing"); }
  if (img.complete && img.naturalWidth === 0) markMissing();
  img.addEventListener("error", markMissing);
});

var year = document.getElementById("year");
if (year) year.textContent = new Date().getFullYear();

// Scroll animations: photos get a purple "swipe" reveal, text fades up in sequence.
// The "js" class is only added when animation can actually run, so nothing is ever left hidden.
var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
if ("IntersectionObserver" in window && !reduceMotion) {
  document.documentElement.classList.add("js");

  // A fully clipped image is never downloaded while it's lazy, which made the wipe run over an
  // empty frame. Load photos up front so each one is ready before its wipe starts.
  document.querySelectorAll(".photo img").forEach(function (img) { img.loading = "eager"; });

  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (!e.isIntersecting) return;
      var el = e.target;
      io.unobserve(el);
      var img = el.classList.contains("photo") && el.querySelector("img");
      if (img && img.decode) {
        // Wait until the photo is downloaded and decoded so the wipe is smooth (never a pop-in).
        // The timeout guarantees a photo is never left hidden if something goes wrong.
        var done = false;
        var show = function () { if (!done) { done = true; el.classList.add("in"); } };
        img.decode().then(show, show);
        setTimeout(show, 3000);
      } else {
        el.classList.add("in");
      }
    });
  }, { threshold: 0.15, rootMargin: "0px 0px -8% 0px" });

  // Photos: swipe reveal
  document.querySelectorAll(".photo").forEach(function (el) { io.observe(el); });

  // Text and cards: fade up, staggered by position within their group
  var targets = document.querySelectorAll(
    ".chapter__text > *, .feature__text > *, .also > div > *, .compare__note, .video, " +
    ".card, .tile, .stat, .glance__lead, .questions li"
  );
  targets.forEach(function (el) {
    var idx = Array.prototype.indexOf.call(el.parentNode.children, el);
    el.style.transitionDelay = Math.min(idx, 5) * 75 + "ms";
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
