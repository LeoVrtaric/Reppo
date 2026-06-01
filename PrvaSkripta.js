// ─────────────────────────────────────────────────────────────────────────────
// PrvaSkripta.js – v5
//  1. Batch otvaranje prozora (po 3, razmak 1s) – manje popup blokiranja
//  2. Cancel gumb – zaustavi proces u bilo koje trenutku
//  3. Browser notifikacija kad ZIP bude gotov
//  4. Minimize/maximize panel
//  5. XLS separator s labelom između kontakata
//  6. Dedup URL-ova
//  7. Popravak race conditiona: URLovi.length umjesto openedWindows.length
// ─────────────────────────────────────────────────────────────────────────────

const scriptUrl   = "https://raw.githubusercontent.com/LeoVrtaric/Reppo/main/script.js";
const ERSTE_LOGO  = "https://media.licdn.com/dms/image/v2/C4D0BAQG9o5EwvCtcPg/company-logo_200_200/company-logo_200_200/0/1674811052929/erste_bank_croatia_logo?e=2147483647&v=beta&t=vWzh6iqFSrAlG_m9vDg38Ma-G_GPTS9OTewetD0GbPM";
const BATCH_SIZE  = 3;
const BATCH_DELAY = 1000; // ms između batcheva

let URLovi = [], openedWindows = [], pristignuliPodaci = [];
let respondedSet     = new Set();
let PunaTablica      = '', arrayProzora = [], arrayTablica = [], arrayLabels = [];
let messageListenerAdded = false, savedImePrezime = '';
let watchdogId       = null;
let allWindowsOpened = false;
let isCancelled      = false;
let logLines         = [];
const logStart       = new Date();

// ── CSS ───────────────────────────────────────────────────────────────────────

function injectStyles() {
    if (document.getElementById('reppo-styles')) return;
    const s = document.createElement('style');
    s.id = 'reppo-styles';
    s.textContent = `
      #reppo-toolbar {
        display: inline-flex; align-items: center; gap: 6px;
        padding: 6px 2px; font-family: 'Segoe UI', system-ui, sans-serif;
      }
      .reppo-btn {
        display: inline-flex; align-items: center; gap: 5px;
        padding: 6px 13px; border: none; border-radius: 6px;
        cursor: pointer; font-size: 12px; font-weight: 600;
        font-family: inherit; transition: all 0.15s; white-space: nowrap;
      }
      #reppo-start-btn {
        background: #2870ED; color: #fff;
        box-shadow: 0 1px 4px rgba(40,112,237,0.45); padding: 6px 14px;
      }
      #reppo-start-btn:hover:not(:disabled) {
        background: #1e5fd4; box-shadow: 0 2px 8px rgba(40,112,237,0.5);
        transform: translateY(-1px);
      }
      #reppo-start-btn:active:not(:disabled) { transform: translateY(0); }
      #reppo-start-btn:disabled { background: #6b7280; cursor: not-allowed; box-shadow: none; opacity: 0.7; }
      #reppo-start-btn.zero-selected { opacity: 0.55; }
      .reppo-sec { background: #f8fafc; color: #374151; border: 1px solid #d1d5db; }
      .reppo-sec:hover { background: #e5e7eb; border-color: #9ca3af; }
      #reppo-badge {
        background: rgba(255,255,255,0.18); border-radius: 999px; padding: 0 7px;
        font-size: 11px; font-weight: 700; font-family: 'Consolas', monospace;
        min-width: 20px; text-align: center;
      }
      .reppo-divider { width: 1px; height: 22px; background: #e5e7eb; margin: 0 2px; }
      .rowCheckbox { accent-color: #2870ED; cursor: pointer; margin-right: 4px; }

      /* ── Panel ── */
      #reppo-panel {
        position: fixed; bottom: 22px; right: 22px; width: 300px;
        background: #0f172a; color: #e2e8f0; border-radius: 12px;
        box-shadow: 0 20px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.06);
        font-family: 'Segoe UI', system-ui, sans-serif; font-size: 12px;
        z-index: 999999; overflow: hidden;
        animation: reppo-in 0.22s cubic-bezier(0.16,1,0.3,1);
      }
      @keyframes reppo-in {
        from { opacity: 0; transform: translateY(14px) scale(0.97); }
        to   { opacity: 1; transform: translateY(0) scale(1); }
      }
      #reppo-header {
        display: flex; align-items: center; justify-content: space-between;
        padding: 11px 14px;
        background: linear-gradient(135deg, #2870ED 0%, #1a52c4 100%);
        border-bottom: 1px solid rgba(255,255,255,0.08);
      }
      #reppo-header-left {
        display: flex; align-items: center; gap: 7px;
        font-weight: 700; font-size: 13px;
      }
      #reppo-header-icon {
        width: 20px; height: 20px; background: #fff; border-radius: 4px;
        display: flex; align-items: center; justify-content: center;
        font-size: 11px; padding: 2px; box-sizing: border-box;
      }
      #reppo-header-btns { display: flex; align-items: center; gap: 4px; }
      #reppo-min-btn, #reppo-close-btn {
        background: rgba(255,255,255,0.1); border: none; color: #fff;
        cursor: pointer; width: 22px; height: 22px; border-radius: 50%;
        font-size: 14px; display: flex; align-items: center; justify-content: center;
        transition: background 0.15s; padding: 0; line-height: 1;
      }
      #reppo-min-btn:hover, #reppo-close-btn:hover { background: rgba(255,255,255,0.25); }

      #reppo-body { padding: 12px 14px; }
      #reppo-status {
        font-size: 11px; color: #94a3b8; margin-bottom: 9px;
        min-height: 15px; display: flex; align-items: center; gap: 6px;
      }
      #reppo-track {
        background: #1e293b; border-radius: 999px; height: 5px;
        overflow: hidden; margin-bottom: 5px;
      }
      #reppo-fill {
        height: 100%; background: linear-gradient(90deg, #2870ED, #5a9aff);
        border-radius: 999px; width: 0%; transition: width 0.35s ease;
      }
      #reppo-fill.done  { background: linear-gradient(90deg, #0cb43f, #2ed65a); }
      #reppo-fill.error { background: #EB4C79; }
      #reppo-counter {
        text-align: right; font-size: 10px; color: #334155;
        font-family: 'Consolas', monospace; margin-bottom: 8px;
      }
      #reppo-cancel-btn {
        display: none; width: 100%; padding: 5px 0; margin-bottom: 8px;
        background: rgba(235,76,121,0.12); border: 1px solid #EB4C79;
        color: #EB4C79; border-radius: 5px; cursor: pointer;
        font-size: 11px; font-weight: 600; font-family: inherit;
        transition: background 0.15s;
      }
      #reppo-cancel-btn:hover { background: rgba(235,76,121,0.25); }
      #reppo-log {
        max-height: 86px; overflow-y: auto; border-top: 1px solid #1e293b;
        padding-top: 7px; scrollbar-width: thin; scrollbar-color: #1e293b transparent;
      }
      .rli {
        display: flex; align-items: flex-start; gap: 5px;
        padding: 1px 0; font-size: 11px; color: #475569; line-height: 1.5;
        font-family: 'Consolas', monospace;
      }
      .rli-ok   { color: #2ed65a; } .rli-warn { color: #FF6130; }
      .rli-err  { color: #EB4C79; } .rli-info { color: #5a9aff; }

      @keyframes reppo-spin { to { transform: rotate(360deg); } }
      .rspin {
        display: inline-block; width: 10px; height: 10px; flex-shrink: 0;
        border: 1.5px solid rgba(255,255,255,0.2); border-top-color: #fff;
        border-radius: 50%; animation: reppo-spin 0.7s linear infinite;
      }
    `;
    document.head.appendChild(s);
}

// ── Log ───────────────────────────────────────────────────────────────────────

function logZapis(msg, cls = '') {
    logLines.push(`[${new Date().toLocaleTimeString('hr-HR', {hour12:false})}] ${msg}`);
    const log = document.getElementById('reppo-log');
    if (!log) return;
    const item = document.createElement('div');
    item.className = `rli ${cls}`;
    item.textContent = msg;
    log.appendChild(item);
    log.scrollTop = log.scrollHeight;
}

function generirajLog(imePrezime) {
    const prazne   = logLines.filter(l => l.includes('prazna reppoza')).length;
    const greske   = logLines.filter(l => /GREŠKA|⛔|fatalna/i.test(l)).length;
    const uspjesno = pristignuliPodaci.length - prazne - greske;
    return [
        '═══════════════════════════════════════════',
        '              R E P P O   L O G            ',
        '═══════════════════════════════════════════',
        `Pokrenuto:    ${logStart.toLocaleString('hr-HR')}`,
        `Završeno:     ${new Date().toLocaleString('hr-HR')}`,
        `Redni broj:   ${RedniBroj}`,
        `Ime/Prezime:  ${imePrezime || 'N/A'}`,
        `Kontakata:    ${URLovi.length} odabrano`,
        '───────────────────────────────────────────',
        '',
        ...logLines,
        '',
        '───────────────────────────────────────────',
        'SAŽETAK',
        `  Uspješno:   ${uspjesno}`,
        `  Prazno:     ${prazne}`,
        `  Greška:     ${greske}`,
        '═══════════════════════════════════════════',
    ].join('\r\n');
}

// ── Panel helpers ─────────────────────────────────────────────────────────────

function pokaziPanel() {
    document.getElementById('reppo-panel')?.remove();
    const p = document.createElement('div');
    p.id = 'reppo-panel';
    p.innerHTML = `
      <div id="reppo-header">
        <div id="reppo-header-left">
          <div id="reppo-header-icon">
            <img src="${ERSTE_LOGO}" alt="Erste"
                 style="width:14px;height:14px;object-fit:contain;display:block;"
                 onerror="this.replaceWith('🗂')" />
          </div> Reppo
        </div>
        <div id="reppo-header-btns">
          <button type="button" id="reppo-min-btn" title="Minimiziraj">−</button>
          <button type="button" id="reppo-close-btn" title="Zatvori">×</button>
        </div>
      </div>
      <div id="reppo-body">
        <div id="reppo-status"><span class="rspin"></span> Pokretanje...</div>
        <div id="reppo-track"><div id="reppo-fill"></div></div>
        <div id="reppo-counter">0 / 0</div>
        <button type="button" id="reppo-cancel-btn">✕ Zaustavi</button>
        <div id="reppo-log"></div>
      </div>
    `;
    document.body.appendChild(p);

    document.getElementById('reppo-close-btn').addEventListener('click', e => {
        e.stopPropagation();
        document.getElementById('reppo-panel').remove();
    });

    document.getElementById('reppo-min-btn').addEventListener('click', e => {
        e.stopPropagation();
        const body = document.getElementById('reppo-body');
        const btn  = document.getElementById('reppo-min-btn');
        const mini = body.style.display === 'none';
        body.style.display = mini ? '' : 'none';
        btn.textContent    = mini ? '−' : '+';
        btn.title          = mini ? 'Minimiziraj' : 'Maksimaliziraj';
    });

    document.getElementById('reppo-cancel-btn').addEventListener('click', e => {
        e.stopPropagation(); e.preventDefault();
        isCancelled = true;
        openedWindows.forEach(w => { try { if (w && !w.closed) w.close(); } catch(e){} });
        resetState();
        pokaziPanel();
        setStatus('⛔ Zaustavljeno');
        setProgress(0, 1, 'error');
        setGumb('idle');
    });
}

function setCancelBtn(visible) {
    const btn = document.getElementById('reppo-cancel-btn');
    if (btn) btn.style.display = visible ? 'block' : 'none';
}

function setStatus(txt, spinner = false) {
    const el = document.getElementById('reppo-status');
    if (!el) return;
    el.innerHTML = spinner ? `<span class="rspin"></span> ${txt}` : txt;
}

function setProgress(done, total, cls = '') {
    const fill = document.getElementById('reppo-fill');
    const ctr  = document.getElementById('reppo-counter');
    if (fill) { fill.style.width = total > 0 ? `${Math.round(done/total*100)}%` : '0%'; fill.className = cls; }
    if (ctr)  ctr.textContent = `${done} / ${total}`;
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

// ── Notifikacije ──────────────────────────────────────────────────────────────

function requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission().catch(() => {});
    }
}

function posaljiNotifikaciju(title, body) {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    try {
        new Notification(title, { body, icon: ERSTE_LOGO });
    } catch (e) { /* tiho ignoriraj */ }
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
    PunaTablica = ''; arrayProzora = []; arrayTablica = []; arrayLabels = [];
    savedImePrezime = ''; logLines = [];
    allWindowsOpened = false; isCancelled = false;
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
        cb.addEventListener('click', e => { e.stopPropagation(); e.stopImmediatePropagation(); });
    });

    const toolbar = document.createElement('div');
    toolbar.id = 'reppo-toolbar';
    toolbar.innerHTML = `
      <button type="button" class="reppo-btn reppo-sec" id="reppo-all-btn">☑ Sve</button>
      <button type="button" class="reppo-btn reppo-sec" id="reppo-none-btn">☐ Ništa</button>
      <div class="reppo-divider"></div>
      <button type="button" class="reppo-btn zero-selected" id="reppo-start-btn">
        ▶ <span id="reppo-btn-text">Pokreni</span>
        <span id="reppo-badge">0</span>
      </button>
    `;

    // FIX: <li> wrapper jer je btlConditions <ul>
    const li = document.createElement('li');
    li.style.cssText = 'list-style:none;padding:0;margin:0;';
    li.appendChild(toolbar);
    document.getElementById('ctl00_ContentPlaceHolder1_ReportsData1_btlConditions')
        .insertBefore(li, document.querySelector('#ctl00_ContentPlaceHolder1_ReportsData1_btlConditions > li'));

    document.getElementById('reppo-all-btn').addEventListener('click', e => {
        e.stopPropagation(); e.stopImmediatePropagation(); e.preventDefault();
        document.querySelectorAll('.rowCheckbox').forEach(c => c.checked = true);
        UpdateajGumb();
    });
    document.getElementById('reppo-none-btn').addEventListener('click', e => {
        e.stopPropagation(); e.stopImmediatePropagation(); e.preventDefault();
        document.querySelectorAll('.rowCheckbox').forEach(c => c.checked = false);
        UpdateajGumb();
    });
    document.getElementById('reppo-start-btn').addEventListener('click', e => {
        e.stopPropagation(); e.stopImmediatePropagation(); e.preventDefault();
        resetState();
        continueWithScript();
    });
}

// ── Injektiranje ──────────────────────────────────────────────────────────────

function fetchAndEvalScript(prozor) {
    fetch(scriptUrl)
        .then(r => r.text())
        .then(src => {
            const s = prozor.document.createElement('script');
            s.textContent = src;
            prozor.document.head.appendChild(s);
        })
        .catch(err => logZapis('⛔ Greška skripte: ' + err.message, 'rli-err'));
}

function cekajIUbaciSkriptu(prozor) {
    let injected = false;
    const inject = () => {
        if (injected || prozor.closed) return;
        injected = true; fetchAndEvalScript(prozor);
    };
    const provjeri = () => {
        if (injected || prozor.closed || isCancelled) return;
        try {
            const state = prozor.document.readyState, url = prozor.location.href;
            if ((state === 'interactive' || state === 'complete') && url !== 'about:blank') inject();
            else setTimeout(provjeri, 300);
        } catch (e) { setTimeout(provjeri, 300); }
    };
    provjeri();
    setTimeout(() => {
        if (!injected && !prozor.closed && !isCancelled) {
            logZapis('⚠ Timeout – prisilno injektiranje', 'rli-warn'); inject();
        }
    }, 20000);
}

// ── Message handler ───────────────────────────────────────────────────────────

function handleMessage(event) {
    if (event.origin !== window.location.origin || isCancelled) return;

    const prozor = event.source;
    respondedSet.add(prozor);

    if (!savedImePrezime) {
        try {
            savedImePrezime = prozor.document
                .getElementById('ctl00_ContentPlaceHolder1_apDetails_content_ucContactInfo_lblImePrezimePodatak')
                .textContent.trim().replaceAll(' ', '_');
        } catch (e) { savedImePrezime = 'Nepoznato'; }
    }

    let label = `Kontakt #${pristignuliPodaci.length + 1}`;
    try {
        label = prozor.document
            .getElementById('ctl00_ContentPlaceHolder1_apDetails_header_lblDetails').textContent.trim();
        arrayTablica.push(prozor.sessionStorage.getItem(label));
    } catch (e) { arrayTablica.push(''); }

    arrayLabels.push(label);
    pristignuliPodaci.push(event.data);
    arrayProzora.push(prozor);
    prozor.close();

    const done = pristignuliPodaci.length, total = URLovi.length; // FIX: URLovi.length, ne openedWindows
    setProgress(done, total);
    setStatus(`Obrađujem kontakte...  ${done}/${total}`, done < total);

    if (done === total) {
        clearInterval(watchdogId); watchdogId = null;
        window.removeEventListener('message', handleMessage); messageListenerAdded = false;
        setCancelBtn(false);
        setStatus('Spajam datoteke...', true);
        spojiSve(pristignuliPodaci);
    }
}

// ── Glavna logika ─────────────────────────────────────────────────────────────

async function continueWithScript() {
    // Zatraži dozvolu za notifikacije (ne-blokira)
    requestNotificationPermission();

    document.querySelectorAll('.rowCheckbox:checked').forEach(ck => {
        const m = ck.closest('tr').getAttribute('onclick')?.match(/window\.open\(['"](.+?)['"]/);
        if (m) URLovi.push(m[1]);
    });

    // FIX: dedup – ukloni duplikate ako je isti kontakt označen dvaput
    URLovi = [...new Set(URLovi)];

    if (URLovi.length === 0) { alert('Nisi odabrao/la niti jedan red!'); return; }

    pokaziPanel();
    setCancelBtn(true);
    setGumb('processing');
    setProgress(0, URLovi.length);
    logZapis(`→ Pokretanje | ${URLovi.length} kontakata | RedniBroj: ${RedniBroj}`, 'rli-info');

    // Listener MORA biti aktivan PRIJE otvaranja prvog prozora
    window.addEventListener('message', handleMessage); messageListenerAdded = true;

    // FIX: batch otvaranje – max BATCH_SIZE prozora odjednom
    for (let i = 0; i < URLovi.length; i += BATCH_SIZE) {
        if (isCancelled) return;
        const batch = URLovi.slice(i, i + BATCH_SIZE);
        const batchNum = Math.floor(i / BATCH_SIZE) + 1;
        const totalBatches = Math.ceil(URLovi.length / BATCH_SIZE);

        if (totalBatches > 1) {
            setStatus(`Otvaranje batch ${batchNum}/${totalBatches}...`, true);
            logZapis(`↗ Batch ${batchNum}/${totalBatches} (${batch.length} prozora)`, 'rli-info');
        } else {
            setStatus(`Otvaranje ${URLovi.length} prozora...`, true);
        }

        for (const url of batch) {
            if (isCancelled) return;
            const w = window.open(url, '_blank');
            if (!w) {
                setStatus('⛔ Popupi blokirani!'); setProgress(0, 1, 'error');
                logZapis('⛔ Popupi blokirani – dozvoli popupe za ovu stranicu', 'rli-err');
                setGumb('idle'); setCancelBtn(false); resetState(); return;
            }
            openedWindows.push(w);
            cekajIUbaciSkriptu(w);
        }

        if (i + BATCH_SIZE < URLovi.length) {
            await new Promise(r => setTimeout(r, BATCH_DELAY));
        }
    }

    allWindowsOpened = true;

    // Watchdog – reagira na ručno zatvorene prozore
    watchdogId = setInterval(() => {
        if (!allWindowsOpened || isCancelled) return;
        const pending = openedWindows.filter(w => !respondedSet.has(w));
        if (pending.length === 0) { clearInterval(watchdogId); watchdogId = null; return; }
        if (pending.every(w => w.closed)) {
            clearInterval(watchdogId); watchdogId = null;
            window.removeEventListener('message', handleMessage); messageListenerAdded = false;
            setCancelBtn(false);
            logZapis(`⚠ ${pending.length} prozora zatvoreno bez odgovora`, 'rli-warn');
            if (pristignuliPodaci.length > 0) { setStatus('Spajam dostupne podatke...', true); spojiSve(pristignuliPodaci); }
            else { setStatus('❌ Nema podataka'); setProgress(0, 1, 'error'); setGumb('idle'); }
        }
    }, 1500);
}

async function spojiSve(blobovi) {
    const JSZip = window.JSZip;
    if (!JSZip) { logZapis('⛔ JSZip nije učitan!', 'rli-err'); return; }

    const ZadnjiZIP = new JSZip();
    const parentDir = ZadnjiZIP.folder(RedniBroj);
    let ukupnoDatoteka = 0;

    for (let i = 0; i < blobovi.length; i++) {
        const label = arrayLabels[i] || `Kontakt #${i + 1}`;
        try {
            const zip     = await JSZip.loadAsync(blobovi[i]);
            const allKeys = Object.keys(zip.files);
            const files   = allKeys.filter(p => !zip.files[p].dir);
            const isPrazna = allKeys.some(k => k.includes('Prazna reppoza'));
            const isGreska = allKeys.some(k => k.includes('GreskaUReppozi') || k.startsWith('Greška-'));

            if (isGreska) {
                logZapis(`⚠ ${label} – GREŠKA u reppozi`, 'rli-warn');
            } else if (isPrazna || files.length === 0) {
                logZapis(`◦ ${label} – prazna reppoza`, 'rli-info');
            } else {
                logZapis(`✔ ${label} – ${files.length} dat.`, 'rli-ok');
                files.forEach(f => logZapis(`    ↳ ${f.split('/').pop()}`, 'rli-info'));
                ukupnoDatoteka += files.length;
            }

            await Promise.all(allKeys.map(async path => {
                const f = zip.files[path];
                if (!f.dir) parentDir.file(path, await f.async('blob'));
                else parentDir.folder(path);
            }));
        } catch (e) {
            logZapis(`⛔ ${label} – ZIP greška: ${e.message}`, 'rli-err');
        }
    }

    const imePrezime = savedImePrezime || 'Nepoznato';
    logZapis(`↓ Ukupno datoteka: ${ukupnoDatoteka}`, 'rli-info');

    parentDir.file(`${RedniBroj} ${imePrezime}.xls`, spojiSveTablice());
    parentDir.file('log.txt', generirajLog(imePrezime));

    const blob = await ZadnjiZIP.generateAsync({ type: 'blob' });
    const url  = URL.createObjectURL(blob);
    const a    = Object.assign(document.body.appendChild(document.createElement('a')), {
        href: url, download: `${RedniBroj}_${imePrezime}.zip`, style: 'display:none'
    });
    a.click(); a.remove(); URL.revokeObjectURL(url);

    setStatus('✅ Preuzimanje pokrenuto!');
    setProgress(blobovi.length, URLovi.length, 'done');
    setCancelBtn(false);
    logZapis(`✅ ZIP: ${RedniBroj}_${imePrezime}.zip`, 'rli-ok');
    setGumb('done');

    // Notifikacija ako je korisnik u drugom tabu
    posaljiNotifikaciju(
        `Reppo ✅ – ${RedniBroj}`,
        `${imePrezime} | ${blobovi.length} kontakata, ${ukupnoDatoteka} datoteka`
    );
}

function spojiSveTablice() {
    arrayTablica.forEach((t, i) => {
        if (!t) return;
        const label = arrayLabels[i] || '';
        // FIX: separator s labelom između kontakata u XLS-u
        const sep = `<tr><td colspan="99" style="background:#2870ED;color:#ffffff;` +
                    `font-weight:bold;padding:4px 8px;font-family:Arial,sans-serif;` +
                    `font-size:10pt;border:none;">${label}</td></tr>`;
        PunaTablica += sep + t;
    });
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
