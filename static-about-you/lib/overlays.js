function preventDefault(e) {
  e.preventDefault();
}

function preventScrollKeys(e) {
  const keys = [
    "ArrowUp", "ArrowDown",
    "PageUp", "PageDown",
    "Space", " ",
    "Home", "End"
  ];
  if (keys.includes(e.key)) {
    e.preventDefault();
  }
}

function disableBodyScroll() {
  document.body.classList.add("no-scroll");
  window.addEventListener("keydown", preventScrollKeys, true);
  window.addEventListener("wheel", preventDefault, { passive: false });
  window.addEventListener("touchmove", preventDefault, { passive: false });
}

function enableBodyScroll() {
  document.body.classList.remove("no-scroll");
  window.removeEventListener("keydown", preventScrollKeys, true);
  window.removeEventListener("wheel", preventDefault);
  window.removeEventListener("touchmove", preventDefault);
}

function scrollToTop() {
  return new Promise((resolve) => {
    window.scrollTo({ top: 0, behavior: "smooth" });

    let lastPosition = -1;
    const check = () => {
      const current = window.scrollY || document.documentElement.scrollTop;
      if (current === 0 || current === lastPosition) {
        resolve();
      } else {
        lastPosition = current;
        requestAnimationFrame(check);
      }
    };
    check();
  });
}

export function initOverlay({
  overlayId = "iframeOverlay",
  iframeId = "iframeContent",
  openBtnId = "openBlog",
  closeBtnId = "closeOverlay",
  blogSrc = "views/blog.html"
} = {}) {
  const overlay = document.getElementById(overlayId);
  const iframe = document.getElementById(iframeId);
  const openBlogBtn = document.getElementById(openBtnId);
  const closeOverlayBtn = document.getElementById(closeBtnId);

  if (overlay && iframe && openBlogBtn && closeOverlayBtn) {
    openBlogBtn.addEventListener("click", async () => {
      await scrollToTop();
      iframe.src = blogSrc;
      overlay.classList.add("active");
      disableBodyScroll();
    });

    closeOverlayBtn.addEventListener("click", () => {
      overlay.classList.remove("active");
      iframe.src = "";
      enableBodyScroll();
    });
  }

  document.querySelectorAll(".social-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (btn !== openBlogBtn) {
        alert("Opening " + btn.title);
      }
    });
  });
}
