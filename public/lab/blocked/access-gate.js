// The access gate: request access, wait a real six minutes, get a code.
//
// Nothing is sent or stored anywhere: the email exists to make the ritual
// real, and that is exactly what the note under the field says. The revealed
// code is a gate code, NOT the map key; students still have to come to Mindi
// with it (or she hands it out at the end, her existing safety net).
//
// Reload mid-wait resumes the timer from sessionStorage rather than
// restarting, so an accidental refresh does not fake extra patience.

const WAIT_MS = 15 * 1000; // Testing value: 15 seconds. Restore to 6 * 60 * 1000 for prod.
const STORE_KEY = "homeward-access-request";
const GATE_CODE = "WHISKER-7-MEOW"; // placeholder; Mindi can change this line

(function () {
    const gate = document.getElementById("access-gate");
    if (!gate) return;

    const emailInput = document.getElementById("gate-email");
    const submit = document.getElementById("gate-submit");
    const status = document.getElementById("gate-status");
    const timeEl = document.getElementById("gate-time");
    const bar = document.getElementById("gate-bar");
    const count = document.getElementById("gate-count");
    const done = document.getElementById("gate-done");
    const codeEl = document.getElementById("gate-code");

    // Close handling is delegated on document and guarded, so it keeps working
    // even if this file is served from a stale cache or loads before/after the
    // modal markup exists.
    function closeModal() {
        const m = document.getElementById("access-modal");
        if (!m) return;
        m.hidden = true;
        document.body.classList.remove("no-scroll");
    }

    document.addEventListener("click", (e) => {
        const t = e.target;
        if (!t || !t.closest) return;
        if (t.closest(".modal-close") || t.classList.contains("modal-overlay")) {
            closeModal();
        }
    });

    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") closeModal();
    });

    let timer = null;

    function fmt(ms) {
        const total = Math.max(0, Math.ceil(ms / 1000));
        const m = Math.floor(total / 60);
        const s = total % 60;
        return m + ":" + String(s).padStart(2, "0");
    }

    function start(requestedAt) {
        gate.querySelector('.gate-intro').hidden = true;
        gate.querySelector('.gate-row').hidden = true;
        gate.querySelector('.gate-note').hidden = true;
        status.hidden = false;
        timeEl.textContent = new Date(requestedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

        const tick = () => {
            const elapsed = Date.now() - requestedAt;
            const remaining = WAIT_MS - elapsed;
            bar.style.width = Math.min(100, (elapsed / WAIT_MS) * 100) + "%";
            if (remaining <= 0) {
                clearInterval(timer);
                count.textContent = "";
                done.hidden = false;
                codeEl.textContent = GATE_CODE;
            } else {
                count.textContent = "code arrives in " + fmt(remaining);
            }
        };
        tick();
        timer = setInterval(tick, 1000);
    }

    submit.addEventListener("click", () => {
        const value = emailInput.value.trim();
        if (!value || !value.includes("@")) {
            emailInput.focus();
            return;
        }
        const requestedAt = Date.now();
        try { sessionStorage.setItem(STORE_KEY, String(requestedAt)); } catch (e) {}
        start(requestedAt);
    });

    emailInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") submit.click();
    });

    let prior = null;
    try { prior = sessionStorage.getItem(STORE_KEY); } catch (e) {}
    if (prior) {
        const requestedAt = Number(prior);
        if (Number.isFinite(requestedAt) && Date.now() - requestedAt < WAIT_MS) {
            start(requestedAt);
        }
    }
})();
