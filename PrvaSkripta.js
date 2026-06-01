// ─────────────────────────────────────────────────────────────────────────────
// PrvaSkripta.js
//  NOVO: cekajIUbaciSkriptu() – polling na readyState umjesto fiksnog timeouta
// ─────────────────────────────────────────────────────────────────────────────

let RedniBroj = prompt("Upiši redni broj tužbe");
let URLovi = [];
let openedWindows = [];
let pristignuliPodaci = [];
let PunaTablica = '';
let arrayProzora = [];
let arrayTablica = [];
let messageListenerAdded = false;
let savedImePrezime = '';

const scriptUrl =
    "https://raw.githubusercontent.com/LeoVrtaric/Reppo/main/script.js";

// ── Pomoćne funkcije ──────────────────────────────────────────────────────────

function UpdateajGumb() {
    const gumb = document.getElementById('finishedButton');
    const broj = document.querySelectorAll('.rowCheckbox:checked').length;
    gumb.textContent = gumb.textContent.replace(/\d+/, broj);
}

function fetchAndEvalScript(prozor) {
    fetch(scriptUrl)
        .then(r => r.text())
        .then(src => prozor.eval(src))
        .catch(err => console.error('Greška pri učitavanju skripte:', err));
}

// ── FIX: polling umjesto fiksnog timeouta ─────────────────────────────────────
// Provjera svakih 300 ms; injektira skriptu čim je DOM spreman i URL više
// nije 'about:blank'. Try/catch štiti od cross-origin/navigation grešaka.
function cekajIUbaciSkriptu(prozor) {
    const provjeri = () => {
        try {
            const spreman =
                prozor.document.readyState === 'complete' &&
                prozor.location.href !== 'about:blank';
            if (spreman) {
                fetchAndEvalScript(prozor);
            } else {
                setTimeout(provjeri, 300);
            }
        } catch (e) {
            // Prozor još navigira – pokušaj ponovo
            setTimeout(provjeri, 300);
        }
    };
    provjeri();
}

function LoadajJSip() {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.7.1/jszip.min.js';
    document.head.appendChild(script);
    script.onload = () => console.log('JSZip učitan');
}

function resetState() {
    if (messageListenerAdded) {
        window.removeEventListener('message', handleMessage);
        messageListenerAdded = false;
    }
    URLovi = [];
    openedWindows = [];
    pristignuliPodaci = [];
    PunaTablica = '';
    arrayProzora = [];
    arrayTablica = [];
    savedImePrezime = '';
}

// ── UI ────────────────────────────────────────────────────────────────────────

function NapraviKvacice() {
    document.querySelectorAll('.dataGridLinkRow').forEach(row => {
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'rowCheckbox';
        const firstCell = row.querySelector('td');
        if (firstCell) {
            firstCell
                .insertBefore(checkbox, firstCell.firstChild)
                .addEventListener('change', UpdateajGumb);
        }
        checkbox.addEventListener('click', e => e.stopPropagation());
    });

    const button = document.createElement('button');
    button.id = 'finishedButton';
    Object.assign(button.style, {
        display: 'inline-flex', alignItems: 'center',
        padding: '5px 10px', border: '1px solid #ccc',
        cursor: 'pointer', fontSize: '16px'
    });

    const tickIcon = document.createElement('span');
    tickIcon.innerHTML = '&#10003;';
    tickIcon.style.cssText = 'font-size:20px; color:gray';

    const buttonText = document.createElement('span');
    buttonText.innerText = 'Jesi li završio/la s odabirom? - 0';
    buttonText.style.marginLeft = '10px';

    button.append(tickIcon, buttonText);
    button.addEventListener('click', e => {
        e.stopPropagation();
        e.preventDefault();
        resetState();
        continueWithScript();
    });

    document.getElementById('ctl00_ContentPlaceHolder1_ReportsData1_btlConditions')
        .insertBefore(
            button,
            document.querySelector('#ctl00_ContentPlaceHolder1_ReportsData1_btlConditions > li')
        );
}

// ── Poruke iz child prozora ───────────────────────────────────────────────────

function handleMessage(event) {
    if (event.origin !== window.location.origin) {
        console.warn('Poruka s krivog ishodišta:', event.origin);
        return;
    }

    const pristignuliProzor = event.source;

    if (!savedImePrezime) {
        try {
            savedImePrezime = pristignuliProzor.document
                .getElementById(
                    'ctl00_ContentPlaceHolder1_apDetails_content_ucContactInfo_lblImePrezimePodatak'
                )
                .textContent.trim().replaceAll(' ', '_');
        } catch (e) {
            console.warn('Nije moguće dohvatiti ime i prezime:', e);
            savedImePrezime = 'Nepoznato';
        }
    }

    try {
        const kljuc = pristignuliProzor.document
            .getElementById('ctl00_ContentPlaceHolder1_apDetails_header_lblDetails')
            .textContent;
        arrayTablica.push(pristignuliProzor.sessionStorage.getItem(kljuc));
    } catch (e) {
        console.warn('Greška pri čitanju sessionStorage:', e);
        arrayTablica.push('');
    }

    pristignuliPodaci.push(event.data);
    arrayProzora.push(pristignuliProzor);
    pristignuliProzor.close();

    console.log(`Primljeni podaci: ${pristignuliPodaci.length} / ${openedWindows.length}`);

    if (pristignuliPodaci.length === openedWindows.length) {
        window.removeEventListener('message', handleMessage);
        messageListenerAdded = false;
        spojiSve(pristignuliPodaci);
    }
}

// ── Glavna logika ─────────────────────────────────────────────────────────────

async function continueWithScript() {
    document.querySelectorAll('.rowCheckbox:checked').forEach(ck => {
        const match = ck.closest('tr')
            .getAttribute('onclick')
            ?.match(/window\.open\(['"](.+?)['"]/);
        if (match) URLovi.push(match[1]);
    });

    if (URLovi.length === 0) {
        alert('Nisi odabrao/la niti jedan red!');
        return;
    }

    openedWindows = URLovi.map(url => window.open(url, '_blank'));

    // FIX: polling umjesto setTimeout
    openedWindows.forEach(prozor => cekajIUbaciSkriptu(prozor));

    window.addEventListener('message', handleMessage);
    messageListenerAdded = true;
}

async function spojiSve(blobovi) {
    const JSZip = window.JSZip;
    if (!JSZip) { console.error('JSZip nije učitan!'); return; }

    const ZadnjiZIP = new JSZip();
    const parentDir = ZadnjiZIP.folder(RedniBroj);

    for (let i = 0; i < blobovi.length; i++) {
        try {
            const zip = await JSZip.loadAsync(blobovi[i]);
            await Promise.all(
                Object.keys(zip.files).map(async (path) => {
                    const file = zip.files[path];
                    if (!file.dir) {
                        parentDir.file(path, await file.async('blob'));
                    } else {
                        parentDir.folder(path);
                    }
                })
            );
        } catch (e) {
            console.error(`Greška pri ZIP-u ${i + 1}:`, e);
        }
    }

    const imePrezime = savedImePrezime || 'Nepoznato';
    parentDir.file(`${RedniBroj} ${imePrezime}.xls`, spojiSveTablice());

    const merganiZip = await ZadnjiZIP.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(merganiZip);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${RedniBroj}_${imePrezime}.zip`;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function spojiSveTablice() {
    arrayTablica.forEach(tablica => {
        if (tablica) PunaTablica += tablica;
    });
    const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office"
        xmlns:x="urn:schemas-microsoft-com:office:excel">
        <head><meta charset="UTF-8"></head>
        <body>${PunaTablica}</body></html>`;
    return new Blob([html], { type: 'application/vnd.ms-excel' });
}

// ── Start ─────────────────────────────────────────────────────────────────────

LoadajJSip();
NapraviKvacice();
