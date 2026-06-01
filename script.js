// ─────────────────────────────────────────────────────────────────────────────
// script.js – v3
//  FIX: waitForElementToAppear ima timeout + fallback (šalje prazan ZIP)
//       Guard za praznu tablicu u popuniDodatne()
//       try/catch oko cijelog SkiniPodatke – garantira odgovor roditeljskom prozoru
// ─────────────────────────────────────────────────────────────────────────────

let URLovi = [];

function okreniStringiSplitaj(string) {
    return string.split('').reverse().join('')
        .split(/\\/)[0].split('').reverse().join('');
}

function DodajJSZip() {
    return new Promise(resolve => {
        if (window.JSZip) { resolve(); return; }
        const s = document.createElement('script');
        s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.7.1/jszip.min.js';
        s.onload = resolve;
        s.onerror = () => console.error('JSZip učitavanje neuspješno');
        document.head.appendChild(s);
    });
}

function waitForIframe(id, timeout = 15000) {
    return new Promise((resolve, reject) => {
        const t0 = Date.now();
        const check = () => {
            try {
                const iframe = document.getElementById(id);
                if (iframe) {
                    const doc = iframe.contentDocument || iframe.contentWindow?.document;
                    if (doc && doc.readyState === 'complete' && doc.body) { resolve(iframe); return; }
                }
                if (Date.now() - t0 > timeout) { reject(new Error(`Iframe '${id}' timeout`)); return; }
                setTimeout(check, 200);
            } catch (e) {
                if (Date.now() - t0 > timeout) { reject(e); return; }
                setTimeout(check, 200);
            }
        };
        check();
    });
}

// ── Tablica ───────────────────────────────────────────────────────────────────

async function TablicaExport() {
    return new Promise(resolve => {
        let allRows = [], flag = 0, sirina, DodPod = [];
        const TABLICA = '#ctl00_ContentPlaceHolder1_apJournal_content_ucJournalEntry_grdContactJournal';
        const OPIS_ID = 'ctl00_ContentPlaceHolder1_apDetails_content_ucContactInfo_txtOpis_ctl02_ctl02';

        if (document.querySelector('.paging')) {
            sirina = document.querySelector(`${TABLICA} > tbody > tr.paging > td > table > tbody > tr`)
                .querySelectorAll('td').length;
        } else { sirina = 1; flag = 1; }

        function DuplicirajStupceIRetke(prefiks, sufiks, opisIframe) {
            prefiks.forEach(n => {
                const k = document.querySelector(`${TABLICA} > tbody > tr.header > th:nth-child(4)`).cloneNode(true);
                k.textContent = n;
                document.querySelector(`${TABLICA} > tbody > tr.header`).appendChild(k);
            });
            sufiks.forEach(v => {
                const k = document.querySelector(`${TABLICA} > tbody > tr:nth-child(2) > td:nth-child(4)`).cloneNode(true);
                k.textContent = v;
                document.querySelector(`${TABLICA} > tbody > tr:nth-child(2)`).appendChild(k);
            });
            PopuniRedove(sufiks, opisIframe);
        }

        function PopuniRedove(sufiks, opisIframe) {
            document.querySelectorAll(`${TABLICA} > tbody > tr:nth-child(2) > td`)
                .forEach((td, i) => { if (i >= 4) td.textContent = sufiks[i - 4]; });
            DodajOpisILink(opisIframe);
        }

        function DodajOpisILink(opisIframe) {
            const tbody = `${TABLICA} > tbody`;

            const zaglavlje = document.querySelector(`${tbody} > tr.header > th:nth-child(4)`).cloneNode(true);
            zaglavlje.textContent = 'Prvi Opis';
            document.querySelector(`${tbody} > tr.header`).appendChild(zaglavlje);

            const opCelija = document.querySelector(`${tbody} > tr:nth-child(2) > td:nth-child(4)`).cloneNode(true);
            opCelija.textContent = opisIframe.contentDocument.querySelector('body').textContent;
            document.querySelector(`${tbody} > tr:nth-child(2)`).appendChild(opCelija);

            const tbodyEl = document.querySelector(tbody);
            const noviRed = document.querySelector(`${tbody} > tr:nth-child(2)`).cloneNode(false);
            tbodyEl.insertBefore(noviRed, tbodyEl.firstElementChild);

            const td = document.createElement('td');
            const a  = document.createElement('a');
            a.href = window.location.href; a.textContent = window.location.href;
            td.appendChild(a); noviRed.appendChild(td);
        }

        // FIX: guard za praznu tablicu
        async function popuniDodatne() {
            const prviRedak = document.querySelector(`${TABLICA} > tbody > tr:nth-child(2)`);
            if (!prviRedak) { console.warn('Journal je prazan'); return; }

            const get     = id => document.getElementById(id);
            const spojeno = id => get(id).textContent + get(id).nextElementSibling.textContent;

            const opisIframe = await waitForIframe(OPIS_ID);

            DodPod.push(get('ctl00_ContentPlaceHolder1_apDetails_header_lblDetails').textContent);
            DodPod.push(spojeno('ctl00_ContentPlaceHolder1_apDetails_content_ucContactInfo_lblVrstaKontakta'));
            DodPod.push(spojeno('ctl00_ContentPlaceHolder1_apDetails_content_ucContactInfo_lblOib'));
            DodPod.push(spojeno('ctl00_ContentPlaceHolder1_apDetails_content_ucContactInfo_lblImePrezime'));
            DodPod.push(spojeno('ctl00_ContentPlaceHolder1_apDetails_content_ucContactInfo_lblVrijemeKontakta'));
            DodPod.push(opisIframe.contentDocument.querySelector('body').textContent);

            const Prefiks = [], Sufiks = [];
            for (let i = 0; i < DodPod.length - 1; i++) {
                Prefiks.push(DodPod[i].split(':')[0]);
                Sufiks.push(DodPod[i].split(':')[1]);
            }
            DuplicirajStupceIRetke(Prefiks, Sufiks, opisIframe);
        }

        function UhvatiSveNaStranici() {
            const str = flag !== 1
                ? document.querySelector('.paging tbody > tr > td > span').textContent : '1';
            document.getElementById('ctl00_ContentPlaceHolder1_apJournal_content_ucJournalEntry_grdContactJournal')
                .querySelectorAll(str == '1' ? '.row,.altrow,.header' : '.row,.altrow')
                .forEach(row => allRows.push(row.outerHTML.replace(/\n+/g, '')));
        }

        function idiNaSljedecu() {
            if (flag == 1) return false;
            const span = document.querySelector('.paging tbody tr td span');
            if (!span || span.textContent.trim() == sirina) return false;
            const next = span.parentNode.nextElementSibling?.querySelector('a');
            if (next) { next.click(); return true; } return false;
        }

        function waitForTableUpdate() {
            return new Promise(res => {
                const obs = new MutationObserver((m, o) => {
                    if (m.some(x => x.addedNodes.length > 0)) { o.disconnect(); res(); }
                });
                obs.observe(document.querySelector(`${TABLICA} > tbody`), { childList: true });
                setTimeout(() => { obs.disconnect(); res(); }, 5000);
            });
        }

        async function UhvatiSve() {
            UhvatiSveNaStranici();
            if (idiNaSljedecu()) { await waitForTableUpdate(); await UhvatiSve(); }
            else {
                const kljuc = document.querySelector('#ctl00_ContentPlaceHolder1_apDetails_header_lblDetails').textContent;
                sessionStorage.setItem(kljuc, `<table>${allRows.join('')}</table>`.replace(/(\n|\t|<br\s*\/?>)/g, ''));
                resolve();
            }
        }

        async function init() {
            await popuniDodatne();
            await UhvatiSve();
        }
        init().catch(err => { console.error('Init greška:', err); resolve(); });
    });
}

// ── Start ─────────────────────────────────────────────────────────────────────

(async () => {
    await DodajJSZip();
    await TablicaExport();
    SkiniPodatke();
})();

// ── Preuzimanje privitaka ─────────────────────────────────────────────────────

function SkiniPodatke() {
    const targetOrigin = window.opener?.location?.origin || '*';

    // FIX: svaka greška šalje prazan zip – roditelj nikad ne ostaje bez odgovora
    async function sendError(label) {
        const zip = new JSZip();
        zip.folder(label);
        window.opener?.postMessage(await zip.generateAsync({ type: 'blob' }), targetOrigin);
    }

    function provjeriZareze(urlovi) {
        return !urlovi.some(u => okreniStringiSplitaj(u).match(/%2c/i));
    }

    // FIX: timeout 10 s + fallback na prazan ZIP
    function waitForElementToAppear(callback, timeout = 10000) {
        const obs = new MutationObserver((_, o) => {
            const el = document.getElementById(
                'ctl00_ContentPlaceHolder1_apAppendFile_content_ucFileUpload_grdFileDocument');
            if (el) { o.disconnect(); callback(el); }
        });
        obs.observe(document.body, { childList: true, subtree: true });
        setTimeout(() => {
            obs.disconnect();
            console.warn('Privici nisu pronađeni – šaljem prazan ZIP');
            callback(null); // null → fetchFilesAndCombine([])
        }, timeout);
    }

    waitForElementToAppear(async polje => {
        if (polje) polje.querySelectorAll('td > a').forEach(a => URLovi.push(a.href));
        try { await fetchFilesAndCombine(URLovi); }
        catch (e) { console.error('fetchFilesAndCombine:', e); await sendError('Greška-' + Date.now()); }
    });

    document.getElementById('ctl00_ContentPlaceHolder1_apAppendFile_header').click();

    async function fetchFilesAndCombine(urls) {
        const brojKontakta = document.getElementById(
            'ctl00_ContentPlaceHolder1_apDetails_header_lblDetails'
        ).textContent.match(/\d+/g)[0];

        if (urls.length === 0) {
            return sendError(`${brojKontakta}-Prazna reppoza`);
        }
        if (!provjeriZareze(urls)) {
            alert('Greška u reppozi, treba slati mail!');
            return sendError(`GreskaUReppozi-${brojKontakta}`);
        }

        const imenaDatoteka = urls.map(okreniStringiSplitaj);
        const zip = new JSZip();
        const dir = zip.folder(brojKontakta);
        for (let i = 0; i < urls.length; i++) {
            const r = await fetch(urls[i]);
            if (!r.ok) throw new Error(`HTTP ${r.status} za ${urls[i]}`);
            dir.file(imenaDatoteka[i], await r.blob());
        }
        window.opener.postMessage(await zip.generateAsync({ type: 'blob' }), targetOrigin);
    }
}
