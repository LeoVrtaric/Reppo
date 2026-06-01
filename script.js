// ─────────────────────────────────────────────────────────────────────────────
// script.js
//  NOVO: waitForIframe() – čeka da se iframe (rich text editor) stvarno učita
//        popuniDodatne()  – postala async; awaita iframe prije čitanja sadržaja
//        init()           – async wrapper koji sekvencijalno poziva popuniDodatne
//                           pa UhvatiSve (prije su se pozivali bez redoslijeda)
// ─────────────────────────────────────────────────────────────────────────────

let URLovi = [];

function okreniStringiSplitaj(string) {
    return string.split("").reverse().join("")
        .split(/\\/)[0]
        .split("").reverse().join("");
}

function DodajJSZip() {
    return new Promise((resolve) => {
        if (window.JSZip) { resolve(); return; }
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.7.1/jszip.min.js';
        script.onload = resolve;
        script.onerror = () => console.error('JSZip učitavanje neuspješno');
        document.head.appendChild(script);
    });
}

// ── FIX: čekanje na iframe ────────────────────────────────────────────────────
// Polling svakih 200 ms dok iframe ne postoji u DOM-u, contentDocument ne bude
// complete i body ne bude dostupan. Timeout od 15 s štiti od beskonačnog čekanja.
function waitForIframe(id, timeout = 15000) {
    return new Promise((resolve, reject) => {
        const pocetak = Date.now();
        const provjeri = () => {
            try {
                const iframe = document.getElementById(id);
                if (iframe) {
                    const doc = iframe.contentDocument || iframe.contentWindow?.document;
                    if (doc && doc.readyState === 'complete' && doc.body) {
                        resolve(iframe);
                        return;
                    }
                }
                if (Date.now() - pocetak > timeout) {
                    reject(new Error(`Iframe '${id}' nije učitan u ${timeout} ms`));
                    return;
                }
                setTimeout(provjeri, 200);
            } catch (e) {
                if (Date.now() - pocetak > timeout) { reject(e); return; }
                setTimeout(provjeri, 200);
            }
        };
        provjeri();
    });
}

// ── Tablica ───────────────────────────────────────────────────────────────────

async function TablicaExport() {
    return new Promise((resolve) => {
        let allRows = [];
        let flag = 0;
        let sirina;
        let DodPod = [];

        const TABLICA = '#ctl00_ContentPlaceHolder1_apJournal_content_ucJournalEntry_grdContactJournal';
        const OPIS_ID = 'ctl00_ContentPlaceHolder1_apDetails_content_ucContactInfo_txtOpis_ctl02_ctl02';

        if (document.querySelector('.paging')) {
            sirina = document.querySelector(
                `${TABLICA} > tbody > tr.paging > td > table > tbody > tr`
            ).querySelectorAll('td').length;
        } else {
            sirina = 1;
            flag = 1;
        }

        // ── Gradnja stupaca ───────────────────────────────────────────────────

        function DuplicirajStupceIRetke(prefiks, sufiks, opisIframe) {
            prefiks.forEach(naslov => {
                const novaKolona = document.querySelector(`${TABLICA} > tbody > tr.header > th:nth-child(4)`).cloneNode(true);
                novaKolona.textContent = naslov;
                document.querySelector(`${TABLICA} > tbody > tr.header`).appendChild(novaKolona);
            });
            sufiks.forEach(vrijednost => {
                const novaCelija = document.querySelector(`${TABLICA} > tbody > tr:nth-child(2) > td:nth-child(4)`).cloneNode(true);
                novaCelija.textContent = vrijednost;
                document.querySelector(`${TABLICA} > tbody > tr:nth-child(2)`).appendChild(novaCelija);
            });
            PopuniRedove(sufiks, opisIframe);
        }

        function PopuniRedove(sufiks, opisIframe) {
            const celije = document.querySelectorAll(`${TABLICA} > tbody > tr:nth-child(2) > td`);
            for (let i = 4; i < celije.length; i++) {
                celije[i].textContent = sufiks[i - 4];
            }
            DodajOpisILink(opisIframe);
        }

        // FIX: prima opisIframe kao parametar – nema ponovnog asinkronog pristupa
        function DodajOpisILink(opisIframe) {
            const tbody = `${TABLICA} > tbody`;

            // Stupac "Prvi Opis" u zaglavlju
            const novaKolona = document.querySelector(`${tbody} > tr.header > th:nth-child(4)`).cloneNode(true);
            novaKolona.textContent = "Prvi Opis";
            document.querySelector(`${tbody} > tr.header`).appendChild(novaKolona);

            // Opis u prvom retku podataka
            const novaCelija = document.querySelector(`${tbody} > tr:nth-child(2) > td:nth-child(4)`).cloneNode(true);
            novaCelija.textContent = opisIframe.contentDocument.querySelector('body').textContent;
            document.querySelector(`${tbody} > tr:nth-child(2)`).appendChild(novaCelija);

            // Redak s URL-om na vrhu tablice
            const tablicaTbody = document.querySelector(tbody);
            const noviRed = document.querySelector(`${tbody} > tr:nth-child(2)`).cloneNode(false);
            tablicaTbody.insertBefore(noviRed, tablicaTbody.firstElementChild);

            const td = document.createElement('td');
            const anchor = document.createElement('a');
            anchor.href = window.location.href;
            anchor.textContent = window.location.href;
            td.appendChild(anchor);
            noviRed.appendChild(td);
        }

        // FIX: async – čeka iframe prije čitanja contentDocument
        async function popuniDodatne() {
            const get = id => document.getElementById(id);
            const spojeno = id => get(id).textContent + get(id).nextElementSibling.textContent;

            // Čekamo iframe opisnog polja (rich text editor učitava se asinkrono!)
            const opisIframe = await waitForIframe(OPIS_ID);

            DodPod.push(get('ctl00_ContentPlaceHolder1_apDetails_header_lblDetails').textContent);
            DodPod.push(spojeno('ctl00_ContentPlaceHolder1_apDetails_content_ucContactInfo_lblVrstaKontakta'));
            DodPod.push(spojeno('ctl00_ContentPlaceHolder1_apDetails_content_ucContactInfo_lblOib'));
            DodPod.push(spojeno('ctl00_ContentPlaceHolder1_apDetails_content_ucContactInfo_lblImePrezime'));
            DodPod.push(spojeno('ctl00_ContentPlaceHolder1_apDetails_content_ucContactInfo_lblVrijemeKontakta'));
            // Opis (zadnji) – ne ulazi u Prefiks/Sufiks loop, rješava ga DodajOpisILink
            DodPod.push(opisIframe.contentDocument.querySelector('body').textContent);

            const Prefiks = [];
            const Sufiks = [];
            for (let i = 0; i < DodPod.length - 1; i++) {
                Prefiks.push(DodPod[i].split(':')[0]);
                Sufiks.push(DodPod[i].split(':')[1]);
            }
            // Proslijeđujemo opisIframe dalje da ne trebamo ponovo asinkrono čekati
            DuplicirajStupceIRetke(Prefiks, Sufiks, opisIframe);
        }

        // ── Paginacija i skupljanje podataka ──────────────────────────────────

        function UhvatiSveNaStranici() {
            const trenutnaStr = flag !== 1
                ? document.querySelector('.paging tbody > tr > td > span').textContent
                : '1';

            const selector = trenutnaStr == '1'
                ? '.row, .altrow, .header'
                : '.row, .altrow';

            document.getElementById('ctl00_ContentPlaceHolder1_apJournal_content_ucJournalEntry_grdContactJournal')
                .querySelectorAll(selector)
                .forEach(row => allRows.push(row.outerHTML.replace(/\n+/g, '')));
        }

        function generateHTMLTable() {
            return `<table>${allRows.join('')}</table>`;
        }

        function idiNaSljedecu() {
            if (flag == 1) return false;
            const span = document.querySelector('.paging tbody tr td span');
            if (!span) return false;
            if (span.textContent.trim() == sirina) return false;
            const nextLink = span.parentNode.nextElementSibling?.querySelector('a');
            if (nextLink) { nextLink.click(); return true; }
            return false;
        }

        function waitForTableToUpdate() {
            return new Promise((res) => {
                const tbody = document.querySelector(`${TABLICA} > tbody`);
                const observer = new MutationObserver((mutations, obs) => {
                    if (mutations.some(m => m.addedNodes.length > 0)) {
                        obs.disconnect(); res();
                    }
                });
                observer.observe(tbody, { childList: true, subtree: false });
                setTimeout(() => { observer.disconnect(); res(); }, 5000);
            });
        }

        async function UhvatiSve() {
            UhvatiSveNaStranici();
            const hasNext = idiNaSljedecu();
            if (hasNext) {
                await waitForTableToUpdate();
                await UhvatiSve();
            } else {
                const Finalni = generateHTMLTable().replace(/(\n|\t|<br\s*\/?>)/g, '');
                const kljuc = document.querySelector('#ctl00_ContentPlaceHolder1_apDetails_header_lblDetails').textContent;
                sessionStorage.setItem(kljuc, Finalni);
                resolve();
            }
        }

        // FIX: async init osigurava da popuniDodatne završi PRIJE UhvatiSve
        async function init() {
            await popuniDodatne();
            await UhvatiSve();
        }
        init().catch(err => console.error('Greška u inicijalizaciji:', err));
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

    function provjeriZareze(urlovi) {
        return !urlovi.some(link => okreniStringiSplitaj(link).match(/%2c/i));
    }

    function waitForElementToAppear(callback) {
        const observer = new MutationObserver((_, obs) => {
            const polje = document.getElementById(
                'ctl00_ContentPlaceHolder1_apAppendFile_content_ucFileUpload_grdFileDocument'
            );
            if (polje) { obs.disconnect(); callback(polje); }
        });
        observer.observe(document.body, { childList: true, subtree: true });
    }

    waitForElementToAppear((polje) => {
        polje.querySelectorAll('td > a').forEach(a => URLovi.push(a.href));
        fetchFilesAndCombine(URLovi);
    });

    document.getElementById('ctl00_ContentPlaceHolder1_apAppendFile_header').click();

    async function fetchFilesAndCombine(urls) {
        const brojKontakta = document.getElementById(
            'ctl00_ContentPlaceHolder1_apDetails_header_lblDetails'
        ).textContent.match(/\d+/g)[0];

        const targetOrigin = window.opener.location.origin;

        if (urls.length === 0) {
            const zip = new JSZip();
            zip.folder(`${brojKontakta}-Prazna reppoza`);
            window.opener.postMessage(await zip.generateAsync({ type: 'blob' }), targetOrigin);
            return;
        }

        if (!provjeriZareze(urls)) {
            alert('Greška u reppozi, treba slati mail!');
            const zip = new JSZip();
            zip.folder(`GreskaUReppozi-${brojKontakta}`);
            window.opener.postMessage(await zip.generateAsync({ type: 'blob' }), targetOrigin);
            return;
        }

        const imenaDatoteka = urls.map(okreniStringiSplitaj);
        try {
            const zip = new JSZip();
            const parentDir = zip.folder(brojKontakta);
            for (let i = 0; i < urls.length; i++) {
                const response = await fetch(urls[i]);
                if (!response.ok) throw new Error(`HTTP ${response.status} za ${urls[i]}`);
                parentDir.file(imenaDatoteka[i], await response.blob());
            }
            window.opener.postMessage(await zip.generateAsync({ type: 'blob' }), targetOrigin);
        } catch (error) {
            console.error('Greška pri dohvaćanju datoteka:', error);
        }
    }
}
