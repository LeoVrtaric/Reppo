// ─────────────────────────────────────────────────────────────────────────────
// PrvaSkripta.js – v3
//  UX: toolbar (Sve/Ništa/Pokreni + badge), floating progress panel, log
//  FIX: popup blocker check, watchdog za zatvorene prozore,
//       eval() → script tag, respondedSet za praćenje prozora
// ─────────────────────────────────────────────────────────────────────────────

const scriptUrl = "https://raw.githubusercontent.com/LeoVrtaric/Reppo/main/script.js";

let URLovi = [], openedWindows = [], pristignuliPodaci = [];
let respondedSet  = new Set();
let PunaTablica   = '', arrayProzora = [], arrayTablica = [];
let messageListenerAdded = false, savedImePrezime = '';
let watchdogId    = null;

// ── CSS ───────────────────────────────────────────────────────────────────────

function injectStyles() {
    if (document.getElementById('reppo-styles')) return;
    const s = document.createElement('style');
    s.id = 'reppo-styles';
    s.textContent = `
      /* ── Toolbar ─────────────────────────────────────── */
      #reppo-toolbar {
        display: inline-flex; align-items: center; gap: 6px;
        padding: 6px 2px; font-family: 'Segoe UI', system-ui, sans-serif;
      }
      .reppo-btn {
        display: inline-flex; align-items: center; gap: 5px;
        padding: 6px 13px; border: none; border-radius: 6px;
        cursor: pointer; font-size: 12px; font-weight: 600;
        font-family: inherit; transition: all 0.15s; white-space: nowrap;
        letter-spacing: 0.2px;
      }
      #reppo-start-btn {
        background: #1d4ed8; color: #fff;
        box-shadow: 0 1px 4px rgba(29,78,216,0.45);
        padding: 6px 14px;
      }
      #reppo-start-btn:hover:not(:disabled) {
        background: #1e40af; box-shadow: 0 2px 8px rgba(29,78,216,0.5);
        transform: translateY(-1px);
      }
      #reppo-start-btn:active:not(:disabled) { transform: translateY(0); }
      #reppo-start-btn:disabled { background: #6b7280; cursor: not-allowed; box-shadow: none; opacity: 0.7; }
      #reppo-start-btn.zero-selected { opacity: 0.55; }
      .reppo-sec {
        background: #f8fafc; color: #374151;
        border: 1px solid #d1d5db;
      }
      .reppo-sec:hover { background: #e5e7eb; border-color: #9ca3af; }
      #reppo-badge {
        background: rgba(255,255,255,0.18);
        border-radius: 999px; padding: 0 7px;
        font-size: 11px; font-weight: 700; font-family: 'Consolas', monospace;
        min-width: 20px; text-align: center; letter-spacing: 0;
      }
      .reppo-divider {
        width: 1px; height: 22px;
        background: #e5e7eb; margin: 0 2px;
      }
      .rowCheckbox { accent-color: #1d4ed8; cursor: pointer; margin-right: 4px; }

      /* ── Floating Panel ──────────────────────────────── */
      #reppo-panel {
        position: fixed; bottom: 22px; right: 22px; width: 300px;
        background: #0f172a; color: #e2e8f0;
        border-radius: 12px;
        box-shadow: 0 20px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.06);
        font-family: 'Segoe UI', system-ui, sans-serif;
        font-size: 12px; z-index: 999999; overflow: hidden;
        animation: reppo-in 0.22s cubic-bezier(0.16,1,0.3,1);
      }
      @keyframes reppo-in {
        from { opacity: 0; transform: translateY(14px) scale(0.97); }
        to   { opacity: 1; transform: translateY(0)   scale(1);    }
      }
      #reppo-header {
        display: flex; align-items: center; justify-content: space-between;
        padding: 11px 14px;
        background: linear-gradient(135deg, #1d4ed8 0%, #1e3a8a 100%);
        border-bottom: 1px solid rgba(255,255,255,0.08);
      }
      #reppo-header-left {
        display: flex; align-items: center; gap: 7px;
        font-weight: 700; font-size: 13px; letter-spacing: 0.3px;
      }
      #reppo-header-icon {
        width: 20px; height: 20px; background: rgba(255,255,255,0.15);
        border-radius: 5px; display: flex; align-items: center; justify-content: center;
        font-size: 11px;
      }
      #reppo-close-btn {
        background: rgba(255,255,255,0.1); border: none; color: #fff;
        cursor: pointer; width: 22px; height: 22px; border-radius: 50%;
        font-size: 13px; display: flex; align-items: center; justify-content: center;
        transition: background 0.15s; padding: 0;
      }
      #reppo-close-btn:hover { background: rgba(255,255,255,0.25); }

      #reppo-body { padding: 12px 14px; }

      #reppo-status {
        font-size: 11px; color: #94a3b8; margin-bottom: 9px;
        min-height: 15px; display: flex; align-items: center; gap: 6px;
      }
      #reppo-track {
        background: #1e293b; border-radius: 999px;
        height: 5px; overflow: hidden; margin-bottom: 5px;
        border: 1px solid rgba(255,255,255,0.04);
      }
      #reppo-fill {
        height: 100%;
        background: linear-gradient(90deg, #2563eb, #60a5fa);
        border-radius: 999px; width: 0%;
        transition: width 0.35s ease;
      }
      #reppo-fill.done  { background: linear-gradient(90deg, #059669, #34d399); }
      #reppo-fill.error { background: #dc2626; }
      #reppo-counter {
        text-align: right; font-size: 10px; color: #334155;
        font-family: 'Consolas', monospace; margin-bottom: 9px;
      }
      #reppo-log {
        max-height: 86px; overflow-y: auto;
        border-top: 1px solid #1e293b;
        padding-top: 7px;
        scrollbar-width: thin; scrollbar-color: #1e293b transparent;
      }
      .rli {
        display: flex; align-items: flex-start; gap: 5px;
        padding: 1px 0; font-size: 11px; color: #475569; line-height: 1.5;
        font-family: 'Consolas', monospace;
      }
      .rli-ok   { color: #34d399; }
      .rli-warn { color: #fbbf24; }
      .rli-err  { color: #f87171; }
      .rli-info { color: #60a5fa; }

      @keyframes reppo-spin { to { transform: rotate(360deg); } }
      .rspin {
        display: inline-block; width: 10px; height: 10px; flex-shrink: 0;
        border: 1.5px solid rgba(255,255,255,0.2); border-top-color: #fff;
        border-radius: 50%; animation: reppo-spin 0.7s linear infinite;
      }
    `;
    document.head.appendChild(s);
}

// ── Panel helpers ─────────────────────────────────────────────────────────────

function pokaziPanel() {
    document.getElementById('reppo-panel')?.remove();
    const p = document.createElement('div');
    p.id = 'reppo-panel';
    p.innerHTML = `
      <div id="reppo-header">
        <div id="reppo-header-left">
          <div id="reppo-header-icon">🗂</div> Reppo
        </div>
        <button id="reppo-close-btn" onclick="this.closest('#reppo-panel').remove()">×</button>
      </div>
      <div id="reppo-body">
        <div id="reppo-status"><span class="rspin"></span> Pokretanje...</div>
        <div id="reppo-track"><div id="reppo-fill"></div></div>
        <div id="reppo-counter">0 / 0</div>
        <div id="reppo-log"></div>
      </div>
    `;
    document.body.appendChild(p);
}

function setStatus(txt, spinner = false) {
    const el = document.getElementById('reppo-status');
    if (!el) return;
    el.innerHTML = spinner
        ? `<span class="rspin"></span> ${txt}`
        : txt;
}

function setProgress(done, total, cls = '') {
    const fill = document.getElementById('reppo-fill');
    const ctr  = document.getElementById('reppo-counter');
    if (fill) { fill.style.width = total > 0 ? `${Math.round(done / total * 100)}%` : '0%'; fill.className = cls; }
    if (ctr)  ctr.textContent = `${done} / ${total}`;
}

function addLog(msg, cls = '') {
    const log = document.getElementById('reppo-log');
    if (!log) return;
    const item = document.createElement('div');
    item.className = `rli ${cls}`;
    item.textContent = msg;
    log.appendChild(item);
    log.scrollTop = log.scrollHeight;
}

function setGumb(stanje) {
    const btn  = document.getElementById('reppo-start-btn');
    const span = document.getElementById('reppo-btn-text');
    if (!btn) return;
    if (stanje === 'processing') {
        btn.disabled = true;
        if (!btn.querySelector('.rspin')) btn.insertAdjacentHTML('afterbegin', '<span class="rspin"></span>');
        if (span) span.textContent = 'Obrađujem...';
    } else {
        btn.disabled = false;
        btn.querySelector('.rspin')?.remove();
        if (span) span.textContent = stanje === 'done' ? 'Pokreni ponovo' : 'Pokreni';
    }
}

// ── State ─────────────────────────────────────────────────────────────────────

function LoadajJSip() {
    if (window.JSZip) return;
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.7.1/jszip.min.js';
    document.head.appendChild(s);
}

function resetState() {
    if (messageListenerAdded) { window.removeEventListener('message', handleMessage); messageListenerAdded = false; }
    if (watchdogId) { clearInterval(watchdogId); watchdogId = null; }
    URLovi = []; openedWindows = []; pristignuliPodaci = []; respondedSet = new Set();
    PunaTablica = ''; arrayProzora = []; arrayTablica = []; savedImePrezime = '';
}

function UpdateajGumb() {
    const n     = document.querySelectorAll('.rowCheckbox:checked').length;
    const badge = document.getElementById('reppo-badge');
    const btn   = document.getElementById('reppo-start-btn');
    if (badge) badge.textContent = n;
    if (btn)   btn.classList.toggle('zero-selected', n === 0);
}

// ── UI ────────────────────────────────────────────────────────────────────────

function NapraviKvacice() {
    document.querySelectorAll('.dataGridLinkRow').forEach(row => {
        const cb = document.createElement('input');
        cb.type = 'checkbox'; cb.className = 'rowCheckbox';
        const cell = row.querySelector('td');
        if (cell) cell.insertBefore(cb, cell.firstChild).addEventListener('change', UpdateajGumb);
        cb.addEventListener('click', e => e.stopPropagation());
    });

    const toolbar = document.createElement('div');
    toolbar.id = 'reppo-toolbar';
    toolbar.innerHTML = `
      <button class="reppo-btn reppo-sec" id="reppo-all-btn">☑ Sve</button>
      <button class="reppo-btn reppo-sec" id="reppo-none-btn">☐ Ništa</button>
      <div class="reppo-divider"></div>
      <button class="reppo-btn zero-selected" id="reppo-start-btn">
        ▶ <span id="reppo-btn-text">Pokreni</span>
        <span id="reppo-badge">0</span>
      </button>
    `;

    document.getElementById('ctl00_ContentPlaceHolder1_ReportsData1_btlConditions')
        .insertBefore(toolbar, document.querySelector('#ctl00_ContentPlaceHolder1_ReportsData1_btlConditions > li'));

    document.getElementById('reppo-all-btn').addEventListener('click', () => {
        document.querySelectorAll('.rowCheckbox').forEach(c => c.checked = true); UpdateajGumb();
    });
    document.getElementById('reppo-none-btn').addEventListener('click', () => {
        document.querySelectorAll('.rowCheckbox').forEach(c => c.checked = false); UpdateajGumb();
    });
    document.getElementById('reppo-start-btn').addEventListener('click', e => {
        e.stopPropagation(); e.preventDefault(); resetState(); continueWithScript();
    });
}

// ── Injektiranje skripte ──────────────────────────────────────────────────────

// FIX: script tag umjesto eval()
function fetchAndEvalScript(prozor) {
    fetch(scriptUrl)
        .then(r => r.text())
        .then(src => {
            const s = prozor.document.createElement('script');
            s.textContent = src;
            prozor.document.head.appendChild(s);
        })
        .catch(err => { console.error('Greška skripte:', err); addLog('⚠ Greška učitavanja skripte', 'rli-err'); });
}

// FIX: polling + prozor.closed check
function cekajIUbaciSkriptu(prozor) {
    const provjeri = () => {
        if (prozor.closed) { addLog('⚠ Prozor zatvoren prije injektiranja', 'rli-warn'); return; }
        try {
            if (prozor.document.readyState === 'complete' && prozor.location.href !== 'about:blank') {
                fetchAndEvalScript(prozor);
            } else { setTimeout(provjeri, 300); }
        } catch (e) { setTimeout(provjeri, 300); }
    };
    provjeri();
}

// ── Message handler ───────────────────────────────────────────────────────────

function handleMessage(event) {
    if (event.origin !== window.location.origin) return;

    const prozor = event.source;
    respondedSet.add(prozor);

    if (!savedImePrezime) {
        try {
            savedImePrezime = prozor.document
                .getElementById('ctl00_ContentPlaceHolder1_apDetails_content_ucContactInfo_lblImePrezimePodatak')
                .textContent.trim().replaceAll(' ', '_');
        } catch (e) { savedImePrezime = 'Nepoznato'; }
    }

    let label = '';
    try {
        const kljuc = prozor.document
            .getElementById('ctl00_ContentPlaceHolder1_apDetails_header_lblDetails').textContent;
        label = kljuc;
        arrayTablica.push(prozor.sessionStorage.getItem(kljuc));
    } catch (e) { arrayTablica.push(''); }

    pristignuliPodaci.push(event.data);
    arrayProzora.push(prozor);
    prozor.close();

    const done = pristignuliPodaci.length, total = openedWindows.length;
    addLog(`✔ ${label || `Kontakt #${done}`}`, 'rli-ok');
    setProgress(done, total);
    setStatus(`Obrađujem kontakte...  ${done}/${total}`, done < total);

    if (done === total) {
        clearInterval(watchdogId); watchdogId = null;
        window.removeEventListener('message', handleMessage); messageListenerAdded = false;
        setStatus('Spajam datoteke...', true);
        spojiSve(pristignuliPodaci);
    }
}

// ── Glavna logika ─────────────────────────────────────────────────────────────

async function continueWithScript() {
    document.querySelectorAll('.rowCheckbox:checked').forEach(ck => {
        const m = ck.closest('tr').getAttribute('onclick')?.match(/window\.open\(['"](.+?)['"]/);
        if (m) URLovi.push(m[1]);
    });

    if (URLovi.length === 0) { alert('Nisi odabrao/la niti jedan red!'); return; }

    pokaziPanel();
    setGumb('processing');
    setStatus(`Otvaranje ${URLovi.length} prozora...`, true);
    addLog(`→ Odabrano ${URLovi.length} kontakata`, 'rli-info');

    openedWindows = URLovi.map(url => window.open(url, '_blank'));

    // FIX: provjera blokiranih popupa
    if (openedWindows.some(w => !w)) {
        setStatus('⛔ Popupi blokirani!'); setProgress(0, 1, 'error');
        addLog('Dozvoli popupe za ovu stranicu i pokušaj ponovo', 'rli-err');
        setGumb('idle'); resetState(); return;
    }

    setProgress(0, openedWindows.length);
    openedWindows.forEach(p => cekajIUbaciSkriptu(p));
    window.addEventListener('message', handleMessage); messageListenerAdded = true;

    // FIX: watchdog – reagira na ručno zatvorene prozore
    watchdogId = setInterval(() => {
        const pending = openedWindows.filter(w => !respondedSet.has(w));
        if (pending.length === 0) { clearInterval(watchdogId); watchdogId = null; return; }
        if (pending.every(w => w.closed)) {
            clearInterval(watchdogId); watchdogId = null;
            window.removeEventListener('message', handleMessage); messageListenerAdded = false;
            addLog(`⚠ ${pending.length} prozora zatvoreno bez odgovora`, 'rli-warn');
            if (pristignuliPodaci.length > 0) { setStatus('Spajam dostupne podatke...', true); spojiSve(pristignuliPodaci); }
            else { setStatus('❌ Nema podataka za obradu'); setProgress(0, 1, 'error'); setGumb('idle'); }
        }
    }, 1500);
}

async function spojiSve(blobovi) {
    const JSZip = window.JSZip;
    if (!JSZip) { console.error('JSZip nije učitan!'); return; }

    const ZadnjiZIP = new JSZip();
    const parentDir = ZadnjiZIP.folder(RedniBroj);

    for (let i = 0; i < blobovi.length; i++) {
        try {
            const zip = await JSZip.loadAsync(blobovi[i]);
            await Promise.all(Object.keys(zip.files).map(async path => {
                const f = zip.files[path];
                parentDir[f.dir ? 'folder' : 'file'](path, f.dir ? undefined : await f.async('blob'));
            }));
        } catch (e) { console.error(`ZIP ${i + 1}:`, e); addLog(`⚠ Greška pri ZIP-u ${i + 1}`, 'rli-warn'); }
    }

    const imePrezime = savedImePrezime || 'Nepoznato';
    parentDir.file(`${RedniBroj} ${imePrezime}.xls`, spojiSveTablice());

    const blob = await ZadnjiZIP.generateAsync({ type: 'blob' });
    const url  = URL.createObjectURL(blob);
    const a    = Object.assign(document.body.appendChild(document.createElement('a')), {
        href: url, download: `${RedniBroj}_${imePrezime}.zip`, style: 'display:none'
    });
    a.click(); a.remove(); URL.revokeObjectURL(url);

    setStatus(`✅ Preuzimanje pokrenuto!`);
    setProgress(pristignuliPodaci.length, openedWindows.length, 'done');
    addLog(`↓ ${RedniBroj}_${imePrezime}.zip`, 'rli-info');
    setGumb('done');
}

function spojiSveTablice() {
    arrayTablica.forEach(t => { if (t) PunaTablica += t; });
    return new Blob([
        `<html xmlns:o="urn:schemas-microsoft-com:office:office"
               xmlns:x="urn:schemas-microsoft-com:office:excel">
         <head><meta charset="UTF-8"></head>
         <body>${PunaTablica}</body></html>`
    ], { type: 'application/vnd.ms-excel' });
}

// ── Start ─────────────────────────────────────────────────────────────────────

const RedniBroj = prompt("Upiši redni broj tužbe") || 'nepoznato';
injectStyles();
LoadajJSip();
NapraviKvacice();
