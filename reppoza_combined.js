if (window.opener) {

    // ========================================================
    // CHILD PROZOR - script.js logika
    // ========================================================

    let URLovi = [];

    function okreniStringiSplitaj(string) {
        let obrnuto = string.split("").reverse().join("");
        let prviDio = obrnuto.split(/\\/)[0];
        let noviString = prviDio.split("").reverse().join("");
        return noviString;
    }

    function DodajJSZip() {
        const script = document.createElement("script");
        script.src = "https://cdnjs.cloudflare.com/ajax/libs/jszip/3.7.1/jszip.min.js";
        document.head.appendChild(script);
        script.onload = function () { console.log("JSZip loaded successfully"); };
    }
    DodajJSZip();

    async function TablicaExport() {
        return new Promise((resolve) => {
            let allRows = [];
            let flag = 0;
            let sirina;
            if (document.querySelector('.paging')) {
                sirina = document.querySelector('#ctl00_ContentPlaceHolder1_apJournal_content_ucJournalEntry_grdContactJournal > tbody > tr.paging > td > table > tbody > tr').querySelectorAll('td').length;
            } else {
                sirina = 1;
                flag = 1;
            }
            let Finalni = [];
            let DodPod = [];

            function DuplicirajStupceIRetke(prefiks, sufiks) {
                for (let i = 0; i < prefiks.length; i++) {
                    const kopija = document.querySelector('#ctl00_ContentPlaceHolder1_apJournal_content_ucJournalEntry_grdContactJournal > tbody > tr.header > th:nth-child(4)').cloneNode(true);
                    const kopija2 = document.querySelector('#ctl00_ContentPlaceHolder1_apJournal_content_ucJournalEntry_grdContactJournal > tbody > tr.header').appendChild(kopija);
                    kopija2.textContent = prefiks[i];
                }
                for (let i = 0; i < sufiks.length; i++) {
                    const kopija = document.querySelector('#ctl00_ContentPlaceHolder1_apJournal_content_ucJournalEntry_grdContactJournal > tbody > tr:nth-child(2) > td:nth-child(4)').cloneNode(true);
                    const kopija2 = document.querySelector('#ctl00_ContentPlaceHolder1_apJournal_content_ucJournalEntry_grdContactJournal > tbody > tr:nth-child(2)').appendChild(kopija);
                    kopija2.textContent = sufiks[i];
                }
                PopuniRedove(sufiks);
            }

            function PopuniRedove(sufiks) {
                const red = document.querySelectorAll('#ctl00_ContentPlaceHolder1_apJournal_content_ucJournalEntry_grdContactJournal > tbody > tr:nth-child(2) > td');
                for (let i = 4; i < red.length; i++) {
                    red[i].textContent = sufiks[i - 4];
                }
                DodajOpisILink();
            }

            function popuniDodatne() {
                let Prefiks = [];
                let Sufiks = [];
                DodPod.push(document.getElementById('ctl00_ContentPlaceHolder1_apDetails_header_lblDetails').textContent);
                let VrKontSkup = document.getElementById('ctl00_ContentPlaceHolder1_apDetails_content_ucContactInfo_lblVrstaKontakta').textContent.concat(document.getElementById('ctl00_ContentPlaceHolder1_apDetails_content_ucContactInfo_lblVrstaKontakta').nextElementSibling.textContent);
                DodPod.push(VrKontSkup);
                VrKontSkup = document.getElementById('ctl00_ContentPlaceHolder1_apDetails_content_ucContactInfo_lblOib').textContent.concat(document.getElementById('ctl00_ContentPlaceHolder1_apDetails_content_ucContactInfo_lblOib').nextElementSibling.textContent);
                DodPod.push(VrKontSkup);
                VrKontSkup = document.getElementById('ctl00_ContentPlaceHolder1_apDetails_content_ucContactInfo_lblImePrezime').textContent.concat(document.getElementById('ctl00_ContentPlaceHolder1_apDetails_content_ucContactInfo_lblImePrezime').nextElementSibling.textContent);
                DodPod.push(VrKontSkup);
                VrKontSkup = document.getElementById('ctl00_ContentPlaceHolder1_apDetails_content_ucContactInfo_lblVrijemeKontakta').textContent.concat(document.getElementById('ctl00_ContentPlaceHolder1_apDetails_content_ucContactInfo_lblVrijemeKontakta').nextElementSibling.textContent);
                DodPod.push(VrKontSkup);
                VrKontSkup = document.getElementById('ctl00_ContentPlaceHolder1_apDetails_content_ucContactInfo_txtOpis_ctl02_ctl02').contentDocument.querySelector('body').textContent;
                DodPod.push(VrKontSkup);
                for (let i = 0; i < DodPod.length - 1; i++) {
                    Prefiks.push(DodPod[i].split(':')[0]);
                    Sufiks.push(DodPod[i].split(':')[1]);
                }
                DuplicirajStupceIRetke(Prefiks, Sufiks);
            }

            function StrukturirajTablicu() { popuniDodatne(); }

            function DodajOpisILink() {
                const kopija = document.querySelector('#ctl00_ContentPlaceHolder1_apJournal_content_ucJournalEntry_grdContactJournal > tbody > tr.header > th:nth-child(4)').cloneNode(true);
                const kopija2 = document.querySelector('#ctl00_ContentPlaceHolder1_apJournal_content_ucJournalEntry_grdContactJournal > tbody > tr.header').appendChild(kopija);
                kopija2.textContent = "Prvi Opis";
                const kopija3 = document.querySelector('#ctl00_ContentPlaceHolder1_apJournal_content_ucJournalEntry_grdContactJournal > tbody > tr:nth-child(2) > td:nth-child(4)').cloneNode(true);
                const kopija4 = document.querySelector('#ctl00_ContentPlaceHolder1_apJournal_content_ucJournalEntry_grdContactJournal > tbody > tr:nth-child(2)').appendChild(kopija3);
                kopija4.textContent = document.getElementById('ctl00_ContentPlaceHolder1_apDetails_content_ucContactInfo_txtOpis_ctl02_ctl02').contentDocument.querySelector('body').textContent;
                const kopija5 = document.querySelector('#ctl00_ContentPlaceHolder1_apJournal_content_ucJournalEntry_grdContactJournal > tbody > tr:nth-child(2)').cloneNode();
                const prvoDijete = document.querySelector('#ctl00_ContentPlaceHolder1_apJournal_content_ucJournalEntry_grdContactJournal > tbody').firstElementChild;
                const novo = prvoDijete.parentNode.insertBefore(kopija5, prvoDijete);
                let anchor = document.createElement('a');
                anchor.href = window.location.href;
                while (novo.firstChild) { anchor.appendChild(novo.firstChild); }
                novo.appendChild(anchor);
                novo.querySelector('a').textContent = window.location.href;
            }

            function UhvatiSveNaStranici() {
                let trenutnaStr;
                if (flag !== 1) {
                    trenutnaStr = document.querySelector('.paging').querySelector('tbody > tr > td > span').textContent;
                } else {
                    trenutnaStr = '1';
                }
                if (trenutnaStr == '1') {
                    const rows = document.getElementById('ctl00_ContentPlaceHolder1_apJournal_content_ucJournalEntry_grdContactJournal').querySelectorAll('.row, .altrow, .header');
                    Array.from(rows).forEach(row => { allRows.push(row.outerHTML); });
                } else {
                    const rows = document.getElementById('ctl00_ContentPlaceHolder1_apJournal_content_ucJournalEntry_grdContactJournal').querySelectorAll('.row, .altrow');
                    Array.from(rows).forEach(row => { allRows.push(row.outerHTML.replace(/\n+/g, '')); });
                }
            }

            function generateHTMLTable() { return `<table>${allRows.join('')}</table>`; }

            function idiNaSljedecu() {
                if (flag == 1) return false;
                const currentPageSpan = document.querySelector('.paging tbody tr td span');
                const currentPageNumber = currentPageSpan.textContent.trim();
                if (currentPageNumber == sirina) return false;
                const nextPageLink = currentPageSpan.parentNode.nextElementSibling?.querySelector('a');
                if (nextPageLink) { nextPageLink.click(); return true; }
                else { return false; }
            }

            function waitForTableToUpdate() {
                return new Promise((resolve) => {
                    const tableBody = document.querySelector('#ctl00_ContentPlaceHolder1_apJournal_content_ucJournalEntry_grdContactJournal > tbody');
                    const observer = new MutationObserver((mutations, obs) => {
                        const newRowsAdded = mutations.some(mutation => mutation.addedNodes.length > 0);
                        if (newRowsAdded) { obs.disconnect(); resolve(); }
                    });
                    observer.observe(tableBody, { childList: true, subtree: false });
                    setTimeout(() => { observer.disconnect(); resolve(); }, 5000);
                });
            }

            async function UhvatiSve() {
                if (flag == 1) {
                    UhvatiSveNaStranici();
                    const tsvString = generateHTMLTable();
                    Finalni = tsvString.replace(/[\t\n]/g, '');
                    const kljuc = document.querySelector('#ctl00_ContentPlaceHolder1_apDetails_header_lblDetails').textContent;
                    sessionStorage.setItem(kljuc, Finalni);
                    resolve();
                } else {
                    UhvatiSveNaStranici();
                    const hasNextPage = idiNaSljedecu();
                    if (hasNextPage) {
                        await waitForTableToUpdate();
                        await UhvatiSve();
                    } else {
                        const tsvString = generateHTMLTable();
                        Finalni = tsvString.replace(/(\n|\t|<br\s*\/?>)/g, '');
                        const kljuc = document.querySelector('#ctl00_ContentPlaceHolder1_apDetails_header_lblDetails').textContent;
                        sessionStorage.setItem(kljuc, Finalni);
                        resolve();
                    }
                }
            }

            // Polling - čeka da svi elementi budu u DOMu prije pokretanja
            function waitForElements(callback) {
                const provjeri = setInterval(() => {
                    const el1 = document.getElementById('ctl00_ContentPlaceHolder1_apDetails_header_lblDetails');
                    const el2 = document.getElementById('ctl00_ContentPlaceHolder1_apDetails_content_ucContactInfo_lblVrstaKontakta');
                    if (el1 && el2) {
                        clearInterval(provjeri);
                        callback();
                    }
                }, 300);
            }

            waitForElements(() => {
                StrukturirajTablicu();
                UhvatiSve();
            });
        });
    }

    (async () => {
        await TablicaExport();
        SkiniPodatke();
    })();

    function SkiniPodatke() {
        function provjeriZareze(urlovi, mjesec) {
            let flag = 0;
            urlovi.forEach((link) => {
                const temp = okreniStringiSplitaj(link);
                if (temp.match(/\%2c/)) { flag = 1; }
            });
            if (flag === 1) return 0;
            else return 1;
        }

        function waitForElementToAppear(callback) {
            const observer = new MutationObserver((mutationsList, observer) => {
                const polje = document.getElementById("ctl00_ContentPlaceHolder1_apAppendFile_content_ucFileUpload_grdFileDocument");
                if (polje) {
                    observer.disconnect();
                    console.log("Target element detected, proceeding with callback.");
                    if (callback) { callback(polje); }
                }
            });
            const parentElement = document.body;
            if (parentElement) {
                observer.observe(parentElement, { childList: true, subtree: true });
            } else {
                console.error("Parent element not found for mutation observation.");
            }
        }

        waitForElementToAppear((polje) => {
            const polje2 = polje.querySelectorAll("td > a");
            polje2.forEach((url) => { URLovi.push(url.href); });
            fetchFilesAndCombine(URLovi);
        });

        document.getElementById("ctl00_ContentPlaceHolder1_apAppendFile_header").click();

        async function fetchFilesAndCombine(urls) {
            if (urls.length === 0) {
                let brojKontakta = document.getElementById("ctl00_ContentPlaceHolder1_apDetails_header_lblDetails").textContent.match(/\d+/g)[0];
                const zip = new JSZip();
                zip.folder(brojKontakta + "-Prazna reppoza");
                const zipBlob = await zip.generateAsync({ type: "blob" });
                window.opener.postMessage(zipBlob, "https://reppozaebc.sitshr.net:2376/");
            } else {
                let brojKontakta = document.getElementById("ctl00_ContentPlaceHolder1_apDetails_header_lblDetails").textContent.match(/\d+/g)[0];
                let imenaDatoteka = [];
                let mjesec = document.getElementById("ctl00_ContentPlaceHolder1_apDetails_content_ucContactInfo_lblVrijemeKontaktaPodatak").textContent.match(/(?<=\.\d*)\d+(?=\.)/)[0];
                mjesec = mjesec.concat("\\\\");
                if (provjeriZareze(urls, mjesec) === 1) {
                    urls.forEach((jedanUrl) => { imenaDatoteka.push(okreniStringiSplitaj(jedanUrl)); });
                    try {
                        const zip = new JSZip();
                        const parentDir = zip.folder(brojKontakta);
                        for (let i = 0; i < urls.length; i++) {
                            const response = await fetch(urls[i]);
                            if (!response.ok) { throw new Error(`Failed to fetch file`); }
                            const blob = await response.blob();
                            parentDir.file(imenaDatoteka[i], blob);
                        }
                        const zipBlob = await zip.generateAsync({ type: "blob" });
                        window.opener.postMessage(zipBlob, "https://reppozaebc.sitshr.net:2376/");
                    } catch (error) {
                        console.error("Error fetching files:", error);
                    }
                } else {
                    const zip = new JSZip();
                    let brojKontakta2 = document.getElementById("ctl00_ContentPlaceHolder1_apDetails_header_lblDetails").textContent.match(/\d+/g)[0];
                    zip.folder("GreskaUReppozi-" + brojKontakta2);
                    const zipBlob = await zip.generateAsync({ type: "blob" });
                    window.opener.postMessage(zipBlob, "https://reppozaebc.sitshr.net:2376/");
                    alert("Greska u reppozi, treba slati mail!");
                }
            }
        }
    }

} else {

    // ========================================================
    // PARENT PROZOR - glavna logika
    // ========================================================

    const scriptUrl = "https://raw.githubusercontent.com/LeoVrtaric/Reppo/main/reppoza_combined.js";

    let RedniBroj = prompt("Upiši redni broj tužbe");
    let URLovi = [];
    let openedWindows = [];
    let pristignuliPodaci = [];
    let PunaTablica = '';
    let arrayProzora = [];
    let arrayTablica = [];
    let clickCount = 0;

    function UpdateajGumb() {
        const gumb = document.getElementById('finishedButton');
        const kvacice = document.querySelectorAll('.rowCheckbox:checked').length;
        gumb.textContent = gumb.textContent.replace(/\d+/, kvacice);
    }

    function fetchAndEvalScript(prozor) {
        fetch(scriptUrl)
            .then(response => response.text())
            .then(scriptContent => { prozor.eval(scriptContent); })
            .catch(error => console.error('Error fetching or executing the script:', error));
    }

    function LoadajJSip() {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.7.1/jszip.min.js';
        document.head.appendChild(script);
        script.onload = function () { console.log('JSZip loaded successfully'); };
    }

    function NapraviKvacice() {
        const rows = document.querySelectorAll('.dataGridLinkRow');
        rows.forEach(row => {
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.className = 'rowCheckbox';
            const firstCell = row.querySelector('td');
            if (firstCell) {
                const gumbovi = firstCell.insertBefore(checkbox, firstCell.firstChild);
                gumbovi.addEventListener('change', () => { UpdateajGumb(); });
            }
            checkbox.addEventListener('click', (event) => { event.stopPropagation(); });
        });

        const button = document.createElement('button');
        button.id = 'finishedButton';
        button.style.display = 'inline-flex';
        button.style.alignItems = 'center';
        button.style.padding = '5px 10px';
        button.style.border = '1px solid #ccc';
        button.style.cursor = 'pointer';
        button.style.fontSize = '16px';

        const tickIcon = document.createElement('span');
        tickIcon.innerHTML = '&#10003;';
        tickIcon.style.fontSize = '20px';
        tickIcon.style.color = 'gray';

        const buttonText = document.createElement('span');
        buttonText.innerText = 'Jesi li završio/la s odabirom? - 0';
        buttonText.style.marginLeft = '10px';

        button.appendChild(tickIcon);
        button.appendChild(buttonText);
        button.addEventListener('click', (event) => {
            clickCount++;
            event.stopPropagation();
            event.preventDefault();
            if (clickCount > 1) { URLovi = []; }
            continueWithScript();
        });

        document.getElementById('ctl00_ContentPlaceHolder1_ReportsData1_btlConditions')
            .insertBefore(button, document.querySelector('#ctl00_ContentPlaceHolder1_ReportsData1_btlConditions > li'));
    }

    async function continueWithScript() {
        const kvacice = document.querySelectorAll('.rowCheckbox');
        let poklikani = [];
        kvacice.forEach(jes => { if (jes && jes.checked) { poklikani.push(jes); } });
        poklikani.forEach(url => {
            URLovi.push(url.closest('tr').getAttribute('onclick').match(/window\.open\(['"](.+?)['"]/)[1]);
        });
        openedWindows = URLovi.map(url => window.open(url, '_blank'));

        openedWindows.forEach(prozor => {
            const provjeri = setInterval(() => {
                try {
                    const kljucniElement = prozor.document.getElementById(
                        'ctl00_ContentPlaceHolder1_apDetails_content_ucContactInfo_lblVrstaKontakta'
                    );
                    if (prozor.document.readyState === 'complete' && kljucniElement) {
                        clearInterval(provjeri);
                        fetchAndEvalScript(prozor);
                        prozor.console.log("Loadano");
                    }
                } catch (e) {}
            }, 300);
        });

        window.addEventListener('message', (event) => {
            if (event.origin !== window.location.origin) {
                console.error('Poruka s krivog ishodista', event.origin);
                return;
            }
            pristignuliPodaci.push(event.data);
            const pristignuliProzor = event.source;
            const kljuc2 = pristignuliProzor.document.getElementById('ctl00_ContentPlaceHolder1_apDetails_header_lblDetails').textContent;
            arrayTablica.push(pristignuliProzor.sessionStorage.getItem(kljuc2));
            arrayProzora.push(pristignuliProzor);
            pristignuliProzor.close();
            console.log("Dosao podatak");
            if (pristignuliPodaci.length === openedWindows.length) {
                spojiSve(pristignuliPodaci);
            }
        });
    }

    async function spojiSve(blobovi) {
        const JSZip = window.JSZip;
        const ZadnjiZIP = new JSZip();
        const parentDir = ZadnjiZIP.folder(RedniBroj);
        for (let i = 0; i < blobovi.length; i++) {
            const zipBlob = blobovi[i];
            try {
                const zip = await JSZip.loadAsync(zipBlob);
                const filePromises = Object.keys(zip.files).map(async (relativePath) => {
                    const file = zip.files[relativePath];
                    if (!file.dir) {
                        const fileData = await file.async('blob');
                        parentDir.file(relativePath, fileData);
                    } else {
                        parentDir.folder(relativePath);
                    }
                });
                await Promise.all(filePromises);
            } catch (error) {
                console.error(`Error loading ZIP blob ${i + 1}:`, error);
            }
        }
        const Tablica = spojiSveTablice();
        const ImePrezime = openedWindows[0].document.getElementById('ctl00_ContentPlaceHolder1_apDetails_content_ucContactInfo_lblImePrezimePodatak').textContent.replace(' ', '_');
        parentDir.file(RedniBroj + " " + ImePrezime + ".xls", Tablica);
        const merganiZip = await ZadnjiZIP.generateAsync({ type: 'blob' });
        const url = URL.createObjectURL(merganiZip);
        const a = document.createElement('a');
        a.href = url;
        a.download = ImePrezime;
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    function spojiSveTablice() {
        let blob;
        arrayTablica.forEach(prozor => {
            PunaTablica = PunaTablica.concat(prozor);
            let html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="UTF-8"></head><body>` + PunaTablica + `</body></html>`;
            blob = new Blob([html], { type: "application/vnd.ms-excel" });
        });
        return blob;
    }

    LoadajJSip();
    NapraviKvacice();
}
