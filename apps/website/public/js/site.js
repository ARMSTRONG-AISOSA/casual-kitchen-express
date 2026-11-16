// Casual Kitchen Express website (design.md 8). Plain JavaScript, no packages.
// The menu button on small screens, the theme switch, and the latest release on the App page.
(function () {
  "use strict";

  // Menu button (small screens).
  var nav = document.getElementById("siteNav");
  var btn = document.getElementById("menuBtn");
  if (nav && btn) {
    btn.addEventListener("click", function () {
      var open = nav.classList.toggle("open");
      btn.setAttribute("aria-expanded", open ? "true" : "false");
    });
  }

  // Theme: follow the device, light, or dark. The choice stays in this browser only.
  var themeBtn = document.getElementById("themeBtn");
  var order = ["auto", "light", "dark"];
  var labels = { auto: "follow device", light: "light", dark: "dark" };
  var current = "auto";
  try {
    current = localStorage.getItem("cke-site-theme") || "auto";
  } catch (e) {}
  if (order.indexOf(current) < 0) current = "auto";
  function apply(mode) {
    if (mode === "auto") document.documentElement.removeAttribute("data-theme");
    else document.documentElement.setAttribute("data-theme", mode);
    if (themeBtn) themeBtn.textContent = "Theme: " + labels[mode];
  }
  apply(current);
  if (themeBtn) {
    themeBtn.addEventListener("click", function () {
      current = order[(order.indexOf(current) + 1) % order.length];
      apply(current);
      try {
        localStorage.setItem("cke-site-theme", current);
      } catch (e) {}
    });
  }

  // The latest release (App page, WEB-07). Without this, the button still opens the release page.
  var box = document.querySelector("[data-release-box]");
  if (!box || !window.fetch) return;
  var REPO = "ARMSTRONG-AISOSA/casual-kitchen-express";
  function set(name, text) {
    var el = box.querySelector('[data-release="' + name + '"]');
    if (el) el.textContent = text;
  }
  fetch("https://api.github.com/repos/" + REPO + "/releases/latest", {
    headers: { Accept: "application/vnd.github+json" },
  })
    .then(function (r) {
      if (r.status === 404) {
        set("version", "First release coming soon");
        return null;
      }
      return r.ok ? r.json() : null;
    })
    .then(function (rel) {
      if (!rel) return;
      var apks = (rel.assets || []).filter(function (a) {
        return /\.apk$/i.test(a.name);
      });
      // The customer app is the one visitors want.
      var apk =
        apks.filter(function (a) {
          return /customer/i.test(a.name);
        })[0] || apks[0];
      var date = rel.published_at ? new Date(rel.published_at) : null;
      set(
        "version",
        (rel.tag_name || rel.name || "Latest") +
          (date
            ? ", " +
              date.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
            : ""),
      );
      if (!apk) return;
      set("size", (apk.size / 1048576).toFixed(1) + " MB");
      if (apk.digest) set("checksum", apk.digest.replace(/^sha256:/, "SHA-256 "));
      // A direct download saves a tap; the release page stays one link away.
      document.querySelectorAll("[data-download]").forEach(function (a) {
        a.href = apk.browser_download_url;
      });
      var note = box.querySelector("[data-release-note]");
      if (note) note.hidden = false;
    })
    .catch(function () {});
})();
