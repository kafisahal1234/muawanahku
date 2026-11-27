// Tarik-untuk-segarkan (pull to refresh) seperti aplikasi bank: di posisi paling atas, layar ditarik ke bawah,
// muncul putaran di area hijau atas, lalu layar dimuat ulang tanpa keluar dari halaman yang sedang dibuka.
// Juga: lapisan hijau padat di area status bar (elemen asli, bukan ::before) agar iPhone tidak memberi efek blur di atas.
const AMBANG = 70, TAHAN = 56, MAKS = 120;

export function pasangTarik(segarkan) {
  try {
    if (!("ontouchstart" in window)) return;
    const atas = document.createElement("div"); atas.className = "atas-solid"; atas.setAttribute("aria-hidden", "true");
    const ind = document.createElement("div"); ind.className = "ptr"; ind.setAttribute("aria-hidden", "true");
    ind.innerHTML = `<span class="ptr-ic"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 3a9 9 0 1 1-8.5 6"/></svg></span>`;
    document.body.appendChild(atas); document.body.appendChild(ind);
    const ic = ind.firstChild;
    let y0 = null, x0 = 0, tarik = 0, aktif = false, sibuk = false, scr = null;

    const boleh = t => {
      if (sibuk || window.scrollY > 0 || document.documentElement.classList.contains("pad-on")) return false;
      if (!t || !t.closest || t.closest("input,textarea,select,[contenteditable],.pad-box,.modal,.sheet,.lb,.chat-bar,.chat-dock")) return false;
      // jangan bentrok dengan daftar yang bisa digulir sendiri
      for (let e = t; e && e !== document.body; e = e.parentElement) { if (e.scrollTop > 0) return false; }
      // lembar/jendela yang sedang terbuka di atas layar
      if (document.querySelector(".modal,.sheet,.lb,.overlay,.splash")) return false;
      return true;
    };
    const atur = (p, halus) => {
      tarik = p;
      scr = scr || document.querySelector(".scr");
      const tr = halus ? "transform .28s cubic-bezier(.2,.8,.2,1)" : "none";
      if (scr) { scr.style.transition = tr; scr.style.transform = p ? `translateY(${p}px)` : ""; }
      ind.style.transition = halus ? "height .28s cubic-bezier(.2,.8,.2,1)" : "none";
      ind.style.height = p + "px";
      const r = Math.min(1, p / AMBANG);
      ic.style.opacity = String(r); ic.style.transform = `scale(${0.6 + 0.4 * r}) rotate(${p * 4}deg)`;
      ind.classList.toggle("siap", p >= AMBANG);
    };
    const lepas = () => { atur(0, true); setTimeout(() => { if (!tarik && scr) { scr.style.transition = ""; scr.style.transform = ""; } scr = null; ind.classList.remove("putar"); }, 300); };

    document.addEventListener("touchstart", e => {
      if (e.touches.length !== 1 || !boleh(e.target)) { y0 = null; return; }
      y0 = e.touches[0].clientY; x0 = e.touches[0].clientX; aktif = false; scr = null;
    }, { passive: true });
    document.addEventListener("touchmove", e => {
      if (y0 == null || sibuk) return;
      const dy = e.touches[0].clientY - y0, dx = e.touches[0].clientX - x0;
      if (!aktif) {
        if (dy < 6) { if (dy < -4 || Math.abs(dx) > 10) y0 = null; return; }
        if (Math.abs(dx) > dy || window.scrollY > 0) { y0 = null; return; }
        aktif = true;
      }
      if (e.cancelable) e.preventDefault();
      atur(Math.min(MAKS, (dy - 6) * 0.5), false);
    }, { passive: false });
    const akhir = async () => {
      if (y0 == null) return; y0 = null;
      if (!aktif) return; aktif = false;
      if (tarik < AMBANG) { lepas(); return; }
      sibuk = true; atur(TAHAN, true); ind.classList.add("putar");
      try { if (navigator.vibrate) navigator.vibrate(8); } catch (e) { }
      const mulai = Date.now();
      try { await segarkan(); } catch (e) { }
      const sisa = 700 - (Date.now() - mulai); if (sisa > 0) await new Promise(r => setTimeout(r, sisa));
      sibuk = false; scr = null; lepas();
    };
    document.addEventListener("touchend", akhir, { passive: true });
    document.addEventListener("touchcancel", akhir, { passive: true });
  } catch (e) { }
}
