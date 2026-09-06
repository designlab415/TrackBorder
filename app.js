/**
 * RC Track Builder (1:50) & 3D-STL-Konfigurator
 * Autor: Andreas Stürmer (DesignLab)
 *
 * WICHTIGER HINWEIS ZUR GEOMETRIE:
 * Die Schwalbenschwanz-Verbindung ist als über die volle Höhe konstante
 * "Puzzle-Zunge" umgesetzt (kein echter, dreidimensional hinterschnittener
 * Schwalbenschwanz). Das reicht, um Segmente seitlich gegen Verrutschen zu
 * sichern, verhindert aber kein Abheben nach oben. Maße (DOVETAIL-Konstanten)
 * sind Startwerte - unbedingt an einem kurzen Teststück (2-3 Segmente)
 * die Toleranz (DOVETAIL.clearance) für den eigenen Drucker anpassen.
 */

// --- 1. GLOBALE KONFIGURATION & VARIABLEN ---
// Streckenbilder im Ordner ./assets/tracks/.
// Neue Assets HIER eintragen. Das Schema ist immer:
// Hersteller_Streckenname_Laenge-Breite.webp   (Laenge/Breite in cm)
// Beispiel: "ideallinie_circuit-de-drift-challenges_270-150.webp"
const TRACK_FILES = [
    // Klassische Dr!ft-Rennstrecken
    "ideallinie_circuit-de-drift-challenges_270-150.webp",
    "ideallinie_tölkeschleife_400-200.webp",
    "ideallinie_eilenriede-ring_400-240.webp",
    "ideallinie_the-lost-raceplace_270-150.webp",
    "ideallinie_motodrom-schmalbergen_400-150.webp",
    "ideallinie_twin-straights-raceway_400-300.webp",
    "ideallinie_prinzenpark-motorsportzentrum_600-325.webp",

    // The Scalables – Sophienring Hauptverläufe der 200-cm-Variante
    "ideallinie_sophienring-3m_300-200.webp",
    "ideallinie_sophienring-4m_400-200.webp",
    "ideallinie_sophienring-5m_500-200.webp",

    // Rallycross / Special Tracks
    "ideallinie_the-grid_275-145.webp",
    "ideallinie_heidberg-arena_400-240.webp",
    "ideallinie_nußberg-rx_400-180.webp",
    "ideallinie_rosenheim-circuit_350-180.webp",
    "ideallinie_rautheim-rx_300-150.webp",
    "ideallinie_schwarzer-berg-rx_400-250.webp",
    "ideallinie_champions-battle_325-205.webp",

    // Micro-Tracks – 1:43 Dr!ft
    "micro-tracks_circuit-tt-system_270-150.webp",
    "micro-tracks_spa-wtt_270-150.webp",
    "micro-tracks_rx-groß-dölln-gt_270-150.webp",
    "micro-tracks_spa-dtt_270-150.webp",
    "micro-tracks_wuhlheide-arena_270-150.webp",
    "micro-tracks_wuhlheide-on-eis_270-150.webp",
    "micro-tracks_niskanperä-course_270-150.webp",
    "micro-tracks_niskanperä-course_320-180.webp",
    "micro-tracks_spa-raceway-wet_270-150.webp",
    "micro-tracks_spa-raceway-wet_315-175.webp",
    "micro-tracks_spa-raceway-dry_270-150.webp",
    "micro-tracks_spa-raceway-dry_315-175.webp",
    "micro-tracks_hamburg-docks_270-150.webp",
    "micro-tracks_tokio-dr!ft_270-150.webp",
    "micro-tracks_rx-groß-dölln_270-150.webp",
    "micro-tracks_rx-groß-dölln_315-175.webp",
    "micro-tracks_diepholz-ring_240-210.webp",
    "micro-tracks_diepholz-ring_300-260.webp",
    "micro-tracks_groß-dölln-rot_180-100.webp",
    "micro-tracks_groß-dölln-rot_210-120.webp",
    "micro-tracks_groß-dölln-blau_180-100.webp",
    "micro-tracks_groß-dölln-blau_210-120.webp",
    "micro-tracks_groß-dölln-grün_180-100.webp",
    "micro-tracks_groß-dölln-grün_210-120.webp",
    "micro-tracks_barnim-ring_400-240.webp",
    "micro-tracks_barnim-ring_500-300.webp",
    "micro-tracks_big-hamburg-docks_400-200.webp",
    "micro-tracks_big-hamburg-docks_500-250.webp",
    "micro-tracks_spreewald-park_400-200.webp",
    "micro-tracks_spreewald-park_500-250.webp"
];

// Offizielle/ermittelte Bildquellen. Lokale .webp-Dateien haben IMMER Vorrang.
// Die URLs werden zusaetzlich vom beiliegenden Download-Skript verwendet.
// Fuer Strecken, bei denen die Website derzeit keine eindeutige Gesamtansicht als
// direktes Medien-Asset offenlegt, ist bewusst KEIN unpassendes Detailfoto als
// Hintergrund hinterlegt. Dort muss die freigegebene Gesamtansicht einmal manuell
// unter dem oben angegebenen Dateinamen nach assets/tracks/ gelegt werden.
const TRACK_REMOTE_FALLBACKS = {
    "ideallinie_circuit-de-drift-challenges_270-150.webp": "https://die-ideallinie.de/wp-content/uploads/2020/06/overview_circuit_twin.jpg",
    "ideallinie_tölkeschleife_400-200.webp": "https://die-ideallinie.de/wp-content/uploads/2022/04/die-ideallinie_Toelkeschleife_Gesamtansicht.jpg",
    "ideallinie_eilenriede-ring_400-240.webp": "https://die-ideallinie.de/wp-content/uploads/2024/10/00_die-ideallinie_eilenriede_vollformat_reshade.jpg",
    "ideallinie_the-lost-raceplace_270-150.webp": "https://die-ideallinie.de/wp-content/uploads/2026/06/die-ideallinie_DRFT_Sturmkind_lost-raceplace-Gesamtansicht_Gras.webp",
    "ideallinie_motodrom-schmalbergen_400-150.webp": "https://die-ideallinie.de/wp-content/uploads/2022/01/02_Motodrom_Schmalbergen.jpg",
    "ideallinie_twin-straights-raceway_400-300.webp": "https://die-ideallinie.de/wp-content/uploads/2023/05/00_twin-straights-raceway_Luftaufnahme_400-cm-x-300-cm.jpg",
    "ideallinie_prinzenpark-motorsportzentrum_600-325.webp": "https://die-ideallinie.de/wp-content/uploads/2022/04/die-ideallinie_Prinzenpark_Gesamtansicht.jpg",

    "ideallinie_sophienring-3m_300-200.webp": "https://die-ideallinie.de/wp-content/uploads/2024/11/13_Sophienring_Hauptverlauf_3m-x-2m-600x400.jpg",
    "ideallinie_sophienring-4m_400-200.webp": "https://die-ideallinie.de/wp-content/uploads/2024/11/12_Sophienring_Hauptverlauf_4m-x-2m-600x400.jpg",
    "ideallinie_sophienring-5m_500-200.webp": "https://die-ideallinie.de/wp-content/uploads/2024/11/11_Sophienring_Hauptverlauf_5m-x-2m-600x400.jpg",

    "ideallinie_nußberg-rx_400-180.webp": "https://die-ideallinie.de/wp-content/uploads/2023/01/NussbergRX_rallycross_Gesamtansicht.jpg",
    "ideallinie_rosenheim-circuit_350-180.webp": "https://die-ideallinie.de/wp-content/uploads/2021/09/rosenheim-circuit_die-ideallinie_Gesamtansicht.jpg",
    "ideallinie_rautheim-rx_300-150.webp": "https://die-ideallinie.de/wp-content/uploads/2023/10/00_rautheim-rx_Videovorschau.jpg",
    "ideallinie_schwarzer-berg-rx_400-250.webp": "https://die-ideallinie.de/wp-content/uploads/2023/10/00_Schwarzer-Berg-Rallycross_Videovorschau.jpg"
};

// Druckbett-Limit (mm). EFFECTIVE_MAX ist der Sicherheitsabstand darunter.
// Druckbett-Maße (mm) - vom Nutzer im Tab "Bauteil" festgelegt (Pflichtangabe vor dem
// Generieren). Ersetzen die früher feste 250x250mm-Annahme, damit unterschiedliche Drucker
// unterstützt werden. Defaults hier nur für die Anzeige, bevor der Nutzer etwas eingibt.
let bedWidthMM = 250;
let bedLengthMM = 250;
const SEGMENT_MARGIN_MM = 8;

// Segmente dürfen höchstens so lang sein, dass sie garantiert auf eine Druckplatte passen -
// dafür wird die KLEINERE der beiden Plattenmaße herangezogen (unabhängig von der Ausrichtung
// eines Teils auf der Platte).
function getEffectiveSegmentLength() {
    return Math.max(Math.min(bedWidthMM, bedLengthMM) - SEGMENT_MARGIN_MM, 20);
}
const RESAMPLE_STEP_MM = 2; // Auflösung der Mittellinie für glattere Kurven

// Profile je Element-Typ (Höhe/Breite in mm, Farbe für die 3D-Vorschau) - Standardwerte,
// über die Eingabefelder in der Seitenleiste überschreibbar.
// Curb-Höhe bewusst SEHR niedrig (an der CAD-Vorlage orientiert, dort nur ~1,5mm) - sonst
// bleiben RC-Fahrzeuge mit niedriger Bodenfreiheit am Curb hängen.
const ELEMENT_PROFILES = {
    bande: { height: 20, thickness: 13, color: 0xb8b8b8, label: "Bande" },
    curb:  { height: 1.2, thickness: 20, color: 0xf0f0f0, label: "Curb" }
};

// Bande-Optik: gestufte, sich nach oben verjüngende Form wie eine Beton-Leitwand (NORDBETON-
// Style) statt eines einfachen rechteckigen Blocks. Jede Stufe trägt ihre eigene Zunge/Nut
// (siehe buildSegmentOutline) - dadurch ist die Steckverbindung wie gewünscht durchgängig.
// Bande-Optik: gestufte, sich nach oben verjüngende Form wie eine Beton-Leitwand (NORDBETON-
// Style) statt eines einfachen rechteckigen Blocks. Profil aus der vom Nutzer bereitgestellten
// Referenzdatei (Bande-gerade.3MF) abgelesen: bei 13mm Breite / 20mm Höhe hat sie einen 3mm
// senkrechten Fuß (volle Breite), dann eine Schräge bis 13,77mm Höhe (Halbbreite 6,5mm -> 3,0mm),
// dann einen senkrechten Schaft bis zur 20mm-Oberkante. h = Höhenanteil (0..1), w = Halbbreiten-
// Anteil (bezogen auf die halbe Gesamtbreite). Jede Stufe trägt ihre eigene Zunge/Nut (siehe
// buildSegmentOutline) - dadurch ist die Steckverbindung durchgängig.
const BANDE_STYLE = {
    profileKeyframes: [
        { h: 0.00, w: 1.0000 },
        { h: 0.15, w: 1.0000 },  // Fuß endet (3mm von 20mm)
        { h: 0.6885, w: 0.4615 }, // Schräge endet (13,77mm von 20mm)
        { h: 1.00, w: 0.4615 }   // Schaft bis Oberkante
    ],
    slopeSubSteps: 5 // in wie viele Treppenstufen die Schräge unterteilt wird (mehr = glatter)
};

// Wandelt die Profil-Keyframes in eine Liste konkreter Stufen { hFrom, hTo, w } um. Abschnitte
// ohne Breitenänderung (Fuß, Schaft) bleiben EINE Stufe; die Schräge wird in slopeSubSteps kleine
// Treppenstufen unterteilt, die den linearen Übergang annähern (mehr Stufen = glatterer Verlauf).
function getBandeLayers() {
    const kf = BANDE_STYLE.profileKeyframes;
    const layers = [];
    for (let i = 0; i < kf.length - 1; i++) {
        const a = kf[i], b = kf[i + 1];
        if (Math.abs(a.w - b.w) < 1e-6) {
            layers.push({ hFrom: a.h, hTo: b.h, w: a.w });
        } else {
            const n = BANDE_STYLE.slopeSubSteps;
            for (let s = 0; s < n; s++) {
                const t0 = s / n, t1 = (s + 1) / n;
                layers.push({
                    hFrom: a.h + (b.h - a.h) * t0,
                    hTo: a.h + (b.h - a.h) * t1,
                    w: a.w + (b.w - a.w) * t0
                });
            }
        }
    }
    return layers;
}

// Schwalbenschwanz / Puzzle-Zunge (mm)
const DOVETAIL = {
    flareAngleDeg: 60,     // Flankenwinkel der Zunge, gemessen von der Breitenachse (quer zur
                            // Länge) - Vorgabe des Nutzers. Bleibt bei jeder Bauteilgröße exakt
                            // gleich (Winkel sind skalierungsunabhängig) - die Länge der Zunge
                            // ergibt sich daraus automatisch aus der (mitskalierenden) Breite.
    marginRatio: 1 / 3,    // Anteil der GESAMTBREITE, der links+rechts als Restwand stehen bleibt
                            // (zusammen) - die restlichen 2/3 sind die Zunge an ihrer breitesten
                            // Stelle. Skaliert dadurch automatisch mit der Bauteilbreite (schmale
                            // Bande -> kleine Zunge, breiter Curb -> kräftige Zunge), statt eines
                            // festen mm-Werts.
    tabBaseRatio: 0.5,     // Breite der Zungenbasis relativ zur Spitzenbreite (0.5 = Basis ist
                            // halb so breit wie die Spitze) - zusammen mit dem Winkel bestimmt das
                            // die Zungenlänge.
    clearance: 0.2,         // Durchgängiger, ÜBERALL entlang der Zungenkontur gleich großer Spalt
                            // (mm) zwischen Zunge und Nut - auch an den schrägen Flanken, nicht
                            // nur bei Breite/Tiefe einzeln (siehe computeNotchGeometry).
    minWallMM: 1.0,         // Mindest-Restwandstärke außen um die Nut - bei zu dünnen Bauteilen
                             // (schmale Bande, flacher Curb) wird die Zunge automatisch verkleinert
                             // oder (wenn selbst das nicht reicht) ganz weggelassen, um Bruch zu vermeiden.
    notchHeightMM: 5,       // Feste Z-Höhe (Bauteilhöhe), bis zu der die NUT geschnitten wird -
                             // unabhängig von der Gesamthöhe des Bauteils. Bei Curb (Gesamthöhe
                             // meist < 5mm) deckt das automatisch die komplette Höhe ab; bei der
                             // deutlich höheren Bande begrenzt das den Schwalbenschwanz bewusst
                             // auf den unteren Bereich, statt durch die volle Höhe zu gehen.
    tabHeightMM: 4           // Feste Z-Höhe des außen angesetzten ZAPFENS (Gegenstück zur Nut) -
                             // bewusst etwas niedriger als notchHeightMM, damit der Zapfen mit
                             // Spiel in der Nut sitzt.
};

let bgImage = null;
let currentPresetFilename = "";

// 2D Canvas & Kontext
let canvas2D, ctx2D;

// Zoom & Pan Zustand
let zoomLevel = 1;
let panX = 0;
let panY = 0;
let isPanning = false;
let startPanX = 0;
let startPanY = 0;

// Skizzen-Daten (mehrere unzusammenhängende Pfade).
// WICHTIG: Punkte werden FRAKTIONAL relativ zum Bild gespeichert ({fx, fy} in 0..1),
// nicht in Canvas-Pixeln. So bleiben sie bei Resize/Zoom/Pan korrekt zum Bild ausgerichtet
// und lassen sich direkt in reale mm umrechnen (fx * Streckenlänge_mm).
// Jeder fertige Strang ist ein Objekt { points: [...], outerSign: 1|-1 } - outerSign legt fest,
// auf welcher Seite der Zeichenrichtung die Außenseite liegt. Beim Curb ist das die hohe Außenkante;
// bei der Bande legt outerSign fest, auf welcher Seite der Skizzenlinie das komplette Bauteil steht.
let paths = [];
let currentPath = [];
let pendingOuterSign = 1; // gilt für den nächsten Strang, der abgeschlossen wird
let insertPointMode = false; // Alternative zu Rechtsklick (v.a. für Touch/Mobilgeräte)

// Punkt-Auswahl/Verschieben: { point: {fx,fy}-Objektreferenz, containerType: 'current'|'path', pathIndex }
let selectedPointRef = null;
let draggingPointRef = null;
let suppressNextClick = false; // verhindert einen neuen Punkt direkt nach einem Pfeil-Klick

// Bildschirmpositionen der Außenseiten-Pfeile (für Klick-zum-Umschalten), pro redraw neu befüllt
let outerSideArrowTips = {};
let pendingArrowTip = null;

// Messwerkzeug (zwei Punkte direkt auf der Streckenansicht)
let measureMode = false;
let measurementStart = null;
let measurementEnd = null;

// Nach dem Generieren wird die reale Bauteilbreite direkt auf der Streckenansicht eingeblendet.
let generatedPreview = null;

// 3D-Szene
let scene, camera, renderer, controls, trackGroup, trackPreviewGroup, trackSurfaceGroup;
let generatedSegments = []; // Metadaten + Meshes der zuletzt generierten Teile
let viewportMode = '2d';
let trackLengthMM = 2700;
let trackWidthMM = 1500;

// --- 2. INITIALISIERUNG BEIM SEITENSTART ---
document.addEventListener('DOMContentLoaded', () => {
    init2DCanvas();
    init3DScene();
    initPresets();
    setupEventListeners();
    setupTabs();
    setupMobileNav();
    setupTouchEvents();
    updateSketchStatus();
    updateDeleteButtonState();
    updateOuterSideToggleLabel();
    updateElementDimsVisibility();
    setViewportMode('2d');
    updateMeasureStatus();
    tryRestoreAutosave();
});

// --- 3. STRECKEN-AUSWAHL: HERSTELLER -> STRECKE ---
function parseTrackFilename(filename) {
    const cleanName = filename.replace(/\.[^/.]+$/, '');
    const parts = cleanName.split('_');
    if (parts.length < 3) return null;

    const manufacturerKey = parts[0];
    const sizeToken = parts[parts.length - 1];
    const trackToken = parts.slice(1, -1).join('_');
    const sizeParts = sizeToken.split('-');
    if (sizeParts.length !== 2) return null;

    const lengthCM = parseFloat(sizeParts[0].replace(',', '.'));
    const widthCM = parseFloat(sizeParts[1].replace(',', '.'));
    if (!Number.isFinite(lengthCM) || !Number.isFinite(widthCM)) return null;

    return {
        filename,
        manufacturerKey,
        manufacturerLabel: prettyManufacturerLabel(manufacturerKey),
        trackKey: trackToken,
        trackLabel: prettyTrackLabel(trackToken),
        lengthCM,
        widthCM
    };
}

const MANUFACTURER_LABELS = {
    "ideallinie": "Ideallinie",
    "micro-tracks": "Micro-Tracks"
};

function prettyManufacturerLabel(value) {
    return MANUFACTURER_LABELS[value] || prettyTrackLabel(value);
}

function prettyTrackLabel(value) {
    return String(value || '')
        .replace(/[-_]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .replace(/(^|\s)([a-zäöü])/g, (_, a, b) => a + b.toUpperCase());
}

function getTrackCatalog() {
    return TRACK_FILES
        .map(parseTrackFilename)
        .filter(Boolean)
        .sort((a, b) =>
            a.manufacturerLabel.localeCompare(b.manufacturerLabel, 'de') ||
            a.trackLabel.localeCompare(b.trackLabel, 'de')
        );
}

function populateTrackSelect(manufacturerKey, selectedFilename = '') {
    const select = document.getElementById('presetSelect');
    if (!select) return;

    select.innerHTML = '';
    if (!manufacturerKey) {
        select.innerHTML = '<option value="">-- zuerst Hersteller auswählen --</option>';
        select.disabled = true;
        return;
    }

    const tracks = getTrackCatalog().filter(t => t.manufacturerKey === manufacturerKey);
    select.disabled = tracks.length === 0;
    select.innerHTML = '<option value="">-- Strecke auswählen --</option>';

    tracks.forEach(track => {
        const option = document.createElement('option');
        option.value = track.filename;
        option.textContent = `${track.trackLabel} (${track.lengthCM.toLocaleString('de-DE')} × ${track.widthCM.toLocaleString('de-DE')} cm)`;
        select.appendChild(option);
    });

    if (selectedFilename && tracks.some(t => t.filename === selectedFilename)) {
        select.value = selectedFilename;
    }
}

function initPresets() {
    const manufacturerSelect = document.getElementById('manufacturerSelect');
    const presetSelect = document.getElementById('presetSelect');
    if (!manufacturerSelect || !presetSelect) return;

    const catalog = getTrackCatalog();
    const manufacturers = [];
    const seen = new Set();
    catalog.forEach(track => {
        if (!seen.has(track.manufacturerKey)) {
            seen.add(track.manufacturerKey);
            manufacturers.push({ key: track.manufacturerKey, label: track.manufacturerLabel });
        }
    });

    manufacturerSelect.innerHTML = '<option value="">-- Hersteller auswählen --</option>';
    manufacturers.forEach(m => {
        const option = document.createElement('option');
        option.value = m.key;
        option.textContent = m.label;
        manufacturerSelect.appendChild(option);
    });

    populateTrackSelect('');
}

function selectPresetInUI(filename) {
    const info = parseTrackFilename(filename);
    const manufacturerSelect = document.getElementById('manufacturerSelect');
    if (!info || !manufacturerSelect) return false;

    manufacturerSelect.value = info.manufacturerKey;
    populateTrackSelect(info.manufacturerKey, filename);
    return true;
}

// --- 4. BILD LADEN & MAßE AUTOMATISCH SETZEN ---
function loadPresetImage(filename) {
    if (!filename) {
        currentPresetFilename = '';
        bgImage = null;
        generatedPreview = null;
        measurementStart = null;
        measurementEnd = null;
        resetZoomAndPan();
        redraw2DCanvas();
        updateTrackPreviewSurface();
        return;
    }

    currentPresetFilename = filename;
    const info = parseTrackFilename(filename);

    if (info) {
        const inputLength = document.getElementById('trackLength');
        const inputWidth = document.getElementById('trackWidth');
        if (inputLength) inputLength.value = info.lengthCM;
        if (inputWidth) inputWidth.value = info.widthCM;
    }

    const img = new Image();
    img.onload = () => {
        bgImage = img;
        resetZoomAndPan();
        redraw2DCanvas();
        updateTrackPreviewSurface();
        autosave();
    };

    let triedRemoteFallback = false;
    img.onerror = () => {
        const fallback = TRACK_REMOTE_FALLBACKS[filename];
        if (!triedRemoteFallback && fallback) {
            triedRemoteFallback = true;
            console.warn('Lokales Streckenbild fehlt; lade offizielle Online-Quelle:', fallback);
            img.src = fallback;
            return;
        }
        bgImage = null;
        redraw2DCanvas();
        updateTrackPreviewSurface();
        console.error('Bild konnte nicht geladen werden: ' + filename);
        alert('Streckenbild konnte weder lokal noch aus der hinterlegten offiziellen Quelle geladen werden: ' + filename);
    };

    img.src = './assets/tracks/' + filename;
}

function resetZoomAndPan() {
    zoomLevel = 1;
    panX = 0;
    panY = 0;
}

// --- 5. 2D CANVAS INITIALISIERUNG & RENDERING ---
function init2DCanvas() {
    canvas2D = document.getElementById('sketchCanvas');
    if (!canvas2D) return;

    ctx2D = canvas2D.getContext('2d');
    resizeCanvasToDisplaySize();
    redraw2DCanvas();
}

function resizeCanvasToDisplaySize() {
    if (!canvas2D) return;
    const parent = canvas2D.parentElement;
    if (parent) {
        canvas2D.width = parent.clientWidth;
        canvas2D.height = parent.clientHeight || 500;
    }
}

// Liefert die aktuellen Zeichen-Parameter des Hintergrundbildes (vor Zoom/Pan-Transform).
// Zentral ausgelagert, damit Zeichnen UND Koordinatenumrechnung IMMER dieselben Werte nutzen.
function getImageDrawParams() {
    if (!bgImage || !canvas2D) return null;
    const hRatio = canvas2D.width / bgImage.width;
    const vRatio = canvas2D.height / bgImage.height;
    const ratio = Math.min(hRatio, vRatio) * 0.9;
    const shiftX = (canvas2D.width - bgImage.width * ratio) / 2;
    const shiftY = (canvas2D.height - bgImage.height * ratio) / 2;
    return { ratio, shiftX, shiftY };
}

// Canvas-Koordinaten (nach Zoom/Pan-Invertierung) -> fraktionale Bild-Koordinaten (0..1)
function canvasPosToFraction(pos) {
    const dp = getImageDrawParams();
    if (!dp) return null;
    return {
        fx: (pos.x - dp.shiftX) / (bgImage.width * dp.ratio),
        fy: (pos.y - dp.shiftY) / (bgImage.height * dp.ratio)
    };
}

// Fraktionale Bild-Koordinaten -> Canvas-Koordinaten (vor Zoom/Pan-Transform)
function fractionToCanvasPos(frac) {
    const dp = getImageDrawParams();
    if (!dp) return { x: 0, y: 0 };
    return {
        x: dp.shiftX + frac.fx * bgImage.width * dp.ratio,
        y: dp.shiftY + frac.fy * bgImage.height * dp.ratio
    };
}


function getLiveTrackDimsMM() {
    const l = parseFloat((document.getElementById('trackLength')?.value || '').toString().replace(',', '.'));
    const w = parseFloat((document.getElementById('trackWidth')?.value || '').toString().replace(',', '.'));
    return { lengthMM: Number.isFinite(l) && l > 0 ? l * 10 : trackLengthMM,
             widthMM: Number.isFinite(w) && w > 0 ? w * 10 : trackWidthMM };
}

function drawMeasurementOverlay() {
    if (!measurementStart || !bgImage) return;
    const a = fractionToCanvasPos(measurementStart);
    const b = measurementEnd ? fractionToCanvasPos(measurementEnd) : null;
    ctx2D.save();
    ctx2D.lineWidth = 2.5 / zoomLevel;
    ctx2D.strokeStyle = '#ffe44d';
    ctx2D.fillStyle = '#ffe44d';
    ctx2D.beginPath();
    ctx2D.arc(a.x, a.y, 5 / zoomLevel, 0, Math.PI * 2);
    ctx2D.fill();
    if (b) {
        ctx2D.beginPath();
        ctx2D.moveTo(a.x, a.y);
        ctx2D.lineTo(b.x, b.y);
        ctx2D.stroke();
        ctx2D.beginPath();
        ctx2D.arc(b.x, b.y, 5 / zoomLevel, 0, Math.PI * 2);
        ctx2D.fill();

        const dims = getLiveTrackDimsMM();
        const dx = (measurementEnd.fx - measurementStart.fx) * dims.lengthMM;
        const dy = (measurementEnd.fy - measurementStart.fy) * dims.widthMM;
        const mm = Math.hypot(dx, dy);
        const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
        const label = `${mm.toFixed(1)} mm`;
        ctx2D.font = `bold ${13 / zoomLevel}px sans-serif`;
        const tw = ctx2D.measureText(label).width;
        const px = 6 / zoomLevel, py = 4 / zoomLevel;
        ctx2D.fillStyle = 'rgba(0,0,0,0.78)';
        ctx2D.fillRect(mx - tw/2 - px, my - (13/zoomLevel)/2 - py, tw + 2*px, 13/zoomLevel + 2*py);
        ctx2D.fillStyle = '#ffe44d';
        ctx2D.textAlign = 'center';
        ctx2D.textBaseline = 'middle';
        ctx2D.fillText(label, mx, my);
    }
    ctx2D.restore();
}

function buildPreviewPolygon(pointsFrac, outerSign, thicknessMM) {
    if (!pointsFrac || pointsFrac.length < 2) return [];
    const dims = getLiveTrackDimsMM();
    if (!(dims.lengthMM > 0) || !(dims.widthMM > 0)) return [];

    const mmPoints = pointsFrac.map(p => ({ x: p.fx * dims.lengthMM, y: p.fy * dims.widthMM }));
    const smoothed = smoothCenterline(mmPoints);
    const dense = resamplePolyline(smoothed, RESAMPLE_STEP_MM);
    if (dense.length < 2) return [];

    const side = outerSign >= 0 ? 1 : -1;
    const offsetA = Math.min(0, side * thicknessMM);
    const offsetB = Math.max(0, side * thicknessMM);

    let outline = [];
    try {
        outline = buildSegmentOutline(dense, offsetA, offsetB, false, false, true, true, null);
    } catch (err) {
        console.warn('Vorschau-Polygon konnte nicht präzise berechnet werden', err);
        outline = [];
    }
    return outline.map(p => fractionToCanvasPos({ fx: p.x / dims.lengthMM, fy: p.y / dims.widthMM }));
}

function buildGeneratedPreviewData(type, thicknessMM) {
    return {
        type,
        thicknessMM,
        paths: paths.map(p => ({ points: p.points.map(q => ({ fx: q.fx, fy: q.fy })), outerSign: p.outerSign >= 0 ? 1 : -1 })),
        polygons: paths.map(p => buildPreviewPolygon(p.points, p.outerSign >= 0 ? 1 : -1, thicknessMM))
    };
}

function drawGeneratedPreviewOverlay() {
    if (!generatedPreview || !bgImage) return;
    ctx2D.save();
    const isCurb = generatedPreview.type === 'curb';
    ctx2D.fillStyle = isCurb ? 'rgba(245, 245, 245, 0.52)' : 'rgba(110, 120, 135, 0.58)';
    ctx2D.strokeStyle = isCurb ? 'rgba(255, 80, 60, 0.95)' : 'rgba(225, 235, 245, 0.95)';
    ctx2D.lineWidth = 1.5 / zoomLevel;

    const polys = Array.isArray(generatedPreview.polygons) && generatedPreview.polygons.length
        ? generatedPreview.polygons
        : generatedPreview.paths.map(path => buildPreviewPolygon(path.points, path.outerSign, generatedPreview.thicknessMM));

    polys.forEach(poly => {
        if (!poly || poly.length < 3) return;
        ctx2D.beginPath();
        ctx2D.moveTo(poly[0].x, poly[0].y);
        for (let i = 1; i < poly.length; i++) ctx2D.lineTo(poly[i].x, poly[i].y);
        ctx2D.closePath();
        ctx2D.fill();
        ctx2D.stroke();
    });
    ctx2D.restore();
}

function updateMeasureStatus() {
    const btn = document.getElementById('measureModeBtn');
    const status = document.getElementById('measureStatus');
    if (btn) {
        btn.textContent = `📏 Messen: ${measureMode ? 'An' : 'Aus'}`;
        btn.classList.toggle('measure-active', measureMode);
    }
    if (!status) return;
    if (!measureMode) status.textContent = 'Messfunktion aus. Aktivieren und zwei Punkte auf der Strecke wählen.';
    else if (!measurementStart) status.textContent = 'Ersten Messpunkt wählen.';
    else if (!measurementEnd) status.textContent = 'Zweiten Messpunkt wählen.';
    else {
        const dims = getLiveTrackDimsMM();
        const dx=(measurementEnd.fx-measurementStart.fx)*dims.lengthMM;
        const dy=(measurementEnd.fy-measurementStart.fy)*dims.widthMM;
        status.textContent = `Gemessen: ${Math.hypot(dx,dy).toFixed(1)} mm. Für eine neue Messung wieder den ersten Punkt wählen.`;
    }
}

function redraw2DCanvas() {
    if (!ctx2D || !canvas2D) return;

    ctx2D.save();
    ctx2D.setTransform(1, 0, 0, 1, 0, 0);
    ctx2D.clearRect(0, 0, canvas2D.width, canvas2D.height);
    // Derselbe Grauverlauf wie im 3D-Fenster (siehe createGradientBackground), damit beide
    // Ansichten optisch zusammenpassen statt nur die 3D-Vorschau einen Verlauf zu haben.
    const bgGrad = ctx2D.createLinearGradient(0, 0, 0, canvas2D.height);
    bgGrad.addColorStop(0, '#6b6e75');
    bgGrad.addColorStop(0.5, '#45474d');
    bgGrad.addColorStop(1, '#232428');
    ctx2D.fillStyle = bgGrad;
    ctx2D.fillRect(0, 0, canvas2D.width, canvas2D.height);
    ctx2D.restore();

    ctx2D.save();
    ctx2D.translate(panX, panY);
    ctx2D.scale(zoomLevel, zoomLevel);

    if (bgImage) {
        const dp = getImageDrawParams();
        ctx2D.drawImage(
            bgImage,
            0, 0, bgImage.width, bgImage.height,
            dp.shiftX, dp.shiftY, bgImage.width * dp.ratio, bgImage.height * dp.ratio
        );

        ctx2D.strokeStyle = 'rgba(0, 168, 255, 0.4)';
        ctx2D.lineWidth = 1 / zoomLevel;
        ctx2D.strokeRect(dp.shiftX, dp.shiftY, bgImage.width * dp.ratio, bgImage.height * dp.ratio);

        drawGeneratedPreviewOverlay();
        paths.forEach(path => drawPath(path.points, false));
        if (currentPath.length > 0) drawPath(currentPath, true);
        drawMeasurementOverlay();

        outerSideArrowTips = {};
        pendingArrowTip = null;
        paths.forEach((path, idx) => drawOuterSideArrow(path.points, path.outerSign, idx));
        if (currentPath.length >= 2) drawOuterSideArrow(currentPath, pendingOuterSign, null);

        if (selectedPointRef) {
            const cp = fractionToCanvasPos(selectedPointRef.point);
            ctx2D.beginPath();
            ctx2D.arc(cp.x, cp.y, 8.5 / zoomLevel, 0, Math.PI * 2);
            ctx2D.strokeStyle = '#ffee00';
            ctx2D.lineWidth = 2 / zoomLevel;
            ctx2D.stroke();
        }
    } else {
        ctx2D.fillStyle = 'rgba(255,255,255,0.55)';
        ctx2D.font = '14px sans-serif';
        ctx2D.textAlign = 'center';
        ctx2D.fillText('Bitte wähle eine Strecken-Vorlage aus', canvas2D.width / 2, canvas2D.height / 2);
    }

    ctx2D.restore();
    updateFinishPathPopup();
    updatePointDeletePopup();
}

function drawPath(pathPointsFrac, isCurrent) {
    if (pathPointsFrac.length === 0 || !bgImage) return;

    const pts = pathPointsFrac.map(fractionToCanvasPos);

    ctx2D.beginPath();
    ctx2D.strokeStyle = isCurrent ? '#ff9900' : '#00ffcc';
    ctx2D.lineWidth = 3 / zoomLevel;
    ctx2D.lineCap = 'round';
    ctx2D.lineJoin = 'round';

    ctx2D.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) ctx2D.lineTo(pts[i].x, pts[i].y);
    ctx2D.stroke();

    pts.forEach((pt, i) => {
        const isStart = i === 0;
        const isEnd = i === pts.length - 1 && pts.length > 1;

        let color = isCurrent ? '#ffffff' : '#00ffcc';
        let radius = 4 / zoomLevel;

        if (isStart) {
            color = '#33ff66'; // Start = grün
            radius = 5.5 / zoomLevel;
        } else if (isEnd) {
            color = isCurrent ? '#ffcc00' : '#ff4444'; // aktuelles Ende = gelb, abgeschlossenes Ende = rot
            radius = 5.5 / zoomLevel;
        }

        ctx2D.beginPath();
        ctx2D.arc(pt.x, pt.y, radius, 0, Math.PI * 2);
        ctx2D.fillStyle = color;
        ctx2D.fill();
    });
}

// Zeichnet einen kleinen Pfeil ("außen") senkrecht zur Strangrichtung, der zeigt, auf welcher
// Seite die hohe Curb-Außenkante liegt (Curb flacht zur GEGENÜBERLIEGENDEN Seite hin ab, damit
// das Fahrzeug dort auffahren kann). Merkt sich die Pfeilspitzen-Position für Klick-zum-Umschalten.
function drawOuterSideArrow(pointsFrac, outerSign, pathIndex) {
    if (!bgImage || pointsFrac.length < 2) return;

    const pts = pointsFrac.map(fractionToCanvasPos);
    const midIdx = Math.floor(pts.length / 2);
    const a = pts[Math.max(0, midIdx - 1)];
    const b = pts[Math.min(pts.length - 1, midIdx + 1)];
    const dx = b.x - a.x, dy = b.y - a.y;
    const len = Math.hypot(dx, dy) || 1;
    const tangent = { x: dx / len, y: dy / len };
    const normal = { x: -tangent.y, y: tangent.x };
    const sign = outerSign >= 0 ? 1 : -1;

    const base = pts[midIdx];
    const arrowLen = 50 / zoomLevel;
    const tipX = base.x + normal.x * arrowLen * sign;
    const tipY = base.y + normal.y * arrowLen * sign;

    ctx2D.save();

    // Weißer Kontur-Rand für Kontrast auf jedem Untergrund (hell/dunkel)
    ctx2D.strokeStyle = '#ffffff';
    ctx2D.lineWidth = 6.5 / zoomLevel;
    ctx2D.lineCap = 'round';
    ctx2D.beginPath();
    ctx2D.moveTo(base.x, base.y);
    ctx2D.lineTo(tipX, tipY);
    ctx2D.stroke();

    // Orange Schaftlinie darüber
    ctx2D.strokeStyle = '#ff9900';
    ctx2D.lineWidth = 4 / zoomLevel;
    ctx2D.beginPath();
    ctx2D.moveTo(base.x, base.y);
    ctx2D.lineTo(tipX, tipY);
    ctx2D.stroke();

    // Basis-Kreis (markiert klar, an welchem Strang der Pfeil hängt)
    ctx2D.beginPath();
    ctx2D.arc(base.x, base.y, 5 / zoomLevel, 0, Math.PI * 2);
    ctx2D.fillStyle = '#ff9900';
    ctx2D.strokeStyle = '#ffffff';
    ctx2D.lineWidth = 2 / zoomLevel;
    ctx2D.fill();
    ctx2D.stroke();

    // Große Pfeilspitze
    const headLen = 16 / zoomLevel;
    const angle = Math.atan2(tipY - base.y, tipX - base.x);
    ctx2D.beginPath();
    ctx2D.moveTo(tipX, tipY);
    ctx2D.lineTo(tipX - headLen * Math.cos(angle - Math.PI / 6), tipY - headLen * Math.sin(angle - Math.PI / 6));
    ctx2D.lineTo(tipX - headLen * Math.cos(angle + Math.PI / 6), tipY - headLen * Math.sin(angle + Math.PI / 6));
    ctx2D.closePath();
    ctx2D.fillStyle = '#ff9900';
    ctx2D.fill();
    ctx2D.strokeStyle = '#ffffff';
    ctx2D.lineWidth = 1.5 / zoomLevel;
    ctx2D.stroke();

    // Beschriftung mit dunklem Hintergrund-Chip für Lesbarkeit
    const labelX = tipX + normal.x * sign * (14 / zoomLevel);
    const labelY = tipY + normal.y * sign * (14 / zoomLevel);
    ctx2D.font = `bold ${13 / zoomLevel}px sans-serif`;
    ctx2D.textAlign = 'center';
    ctx2D.textBaseline = 'middle';
    const label = 'AUSSEN';
    const textWidth = ctx2D.measureText(label).width;
    const padX = 5 / zoomLevel, padY = 3 / zoomLevel;
    ctx2D.fillStyle = 'rgba(0,0,0,0.72)';
    ctx2D.fillRect(labelX - textWidth / 2 - padX, labelY - (13 / zoomLevel) / 2 - padY, textWidth + padX * 2, (13 / zoomLevel) + padY * 2);
    ctx2D.fillStyle = '#ffb84d';
    ctx2D.fillText(label, labelX, labelY);

    ctx2D.restore();

    if (pathIndex !== null) {
        outerSideArrowTips[pathIndex] = { x: tipX, y: tipY };
    } else {
        pendingArrowTip = { x: tipX, y: tipY };
    }
}

// Sucht einen Außenseiten-Pfeil in der Nähe von pos (Klick zum Umschalten). Gibt den
// Pfad-Index zurück, oder 'pending' für den Vorschau-Pfeil des aktuellen Strangs.
function findArrowNear(pos) {
    const thresh = 16 / zoomLevel;
    for (const idxStr of Object.keys(outerSideArrowTips)) {
        const tip = outerSideArrowTips[idxStr];
        if (Math.hypot(tip.x - pos.x, tip.y - pos.y) < thresh) return parseInt(idxStr, 10);
    }
    if (pendingArrowTip && Math.hypot(pendingArrowTip.x - pos.x, pendingArrowTip.y - pos.y) < thresh) return 'pending';
    return null;
}

function updateOuterSideToggleLabel() {
    const btn = document.getElementById('toggleOuterSideBtn');
    if (btn) btn.textContent = `Außenseite umkehren ⇄ (aktuell: ${pendingOuterSign >= 0 ? 'A' : 'B'})`;
}

function updateElementDimsVisibility() {
    const curbRow = document.getElementById('curbDimsRow');
    const bandeRow = document.getElementById('bandeDimsRow');
    const select = document.getElementById('elementType');
    if (!select) return;
    const isCurb = select.value === 'curb';
    if (curbRow) curbRow.style.display = isCurb ? 'flex' : 'none';
    if (bandeRow) bandeRow.style.display = isCurb ? 'none' : 'flex';
}

function updateSketchStatus() {
    const el = document.getElementById('sketchStatus');
    if (!el) return;
    if (currentPath.length === 0) {
        el.textContent = `Fertige Stränge: ${paths.length}. Klick auf die Skizze startet einen neuen Strang.`;
    } else {
        el.textContent = `Fertige Stränge: ${paths.length}. Aktueller Strang: ${currentPath.length} Punkt(e) - Doppelklick/Enter/Häkchen zum Abschließen.`;
    }
}

// Sucht den nächstgelegenen Skizzenpunkt (fertige Stränge + aktueller Strang) in der Nähe
// von pos (Canvas-Koordinaten vor Zoom/Pan). Threshold skaliert mit dem Zoom, damit der
// Trefferbereich visuell immer gleich groß bleibt.
function findPointNear(pos) {
    const thresh = 9 / zoomLevel;
    let closest = null;
    let closestDist = thresh;

    paths.forEach((path, pathIndex) => {
        path.points.forEach(point => {
            const cp = fractionToCanvasPos(point);
            const d = Math.hypot(cp.x - pos.x, cp.y - pos.y);
            if (d < closestDist) {
                closestDist = d;
                closest = { point, containerType: 'path', pathIndex };
            }
        });
    });

    currentPath.forEach(point => {
        const cp = fractionToCanvasPos(point);
        const d = Math.hypot(cp.x - pos.x, cp.y - pos.y);
        if (d < closestDist) {
            closestDist = d;
            closest = { point, containerType: 'current', pathIndex: null };
        }
    });

    return closest;
}

function updateDeleteButtonState() {
    const btn = document.getElementById('deleteSelectedPointBtn');
    if (btn) btn.disabled = !selectedPointRef;
}

function pointToSegmentDistance(p, a, b) {
    const abx = b.x - a.x, aby = b.y - a.y;
    const lenSq = abx * abx + aby * aby;
    if (lenSq < 1e-9) return Math.hypot(p.x - a.x, p.y - a.y);
    let t = ((p.x - a.x) * abx + (p.y - a.y) * aby) / lenSq;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(p.x - (a.x + t * abx), p.y - (a.y + t * aby));
}

// Sucht die nächstgelegene Strang-LINIE (nicht Punkt) in der Nähe von pos, damit per
// Rechtsklick ein neuer Punkt mitten in einen bestehenden Strang eingefügt werden kann.
function findInsertionTarget(pos) {
    const thresh = 10 / zoomLevel;
    let best = null;
    let bestDist = thresh;

    function checkArray(arr, containerType, pathIndex) {
        for (let i = 0; i < arr.length - 1; i++) {
            const a = fractionToCanvasPos(arr[i]);
            const b = fractionToCanvasPos(arr[i + 1]);
            const d = pointToSegmentDistance(pos, a, b);
            if (d < bestDist) {
                bestDist = d;
                best = { containerType, pathIndex, insertIndex: i + 1 };
            }
        }
    }

    paths.forEach((path, idx) => checkArray(path.points, 'path', idx));
    checkArray(currentPath, 'current', null);

    return best;
}

function deleteSelectedPoint() {
    if (!selectedPointRef) return;
    const { point, containerType, pathIndex } = selectedPointRef;

    if (containerType === 'current') {
        const idx = currentPath.indexOf(point);
        if (idx !== -1) currentPath.splice(idx, 1);
    } else {
        const arr = paths[pathIndex] ? paths[pathIndex].points : null;
        if (arr) {
            const idx = arr.indexOf(point);
            if (idx !== -1) arr.splice(idx, 1);
            if (arr.length < 2) paths.splice(pathIndex, 1); // zu kurz -> ganzen Strang entfernen
        }
    }

    selectedPointRef = null;
    draggingPointRef = null;
    redraw2DCanvas();
    updateSketchStatus();
    updateDeleteButtonState();
    autosave();
}

// Positioniert das schwebende "Strang abschließen"-Popup neben dem letzten gesetzten Punkt.
function updateFinishPathPopup() {
    const popup = document.getElementById('pathFinishPopup');
    if (!popup) return;

    if (!bgImage || currentPath.length === 0) {
        popup.style.display = 'none';
        return;
    }

    const last = currentPath[currentPath.length - 1];
    const cp = fractionToCanvasPos(last);
    const screenX = cp.x * zoomLevel + panX;
    const screenY = cp.y * zoomLevel + panY;

    popup.style.left = (screenX + 12) + 'px';
    popup.style.top = (screenY - 16) + 'px';
    popup.style.display = 'flex';
}

// Positioniert das schwebende rote "Punkt löschen"-Popup neben dem gerade ausgewählten Punkt.
function updatePointDeletePopup() {
    const popup = document.getElementById('pointDeletePopup');
    if (!popup) return;

    if (!bgImage || !selectedPointRef) {
        popup.style.display = 'none';
        return;
    }

    const cp = fractionToCanvasPos(selectedPointRef.point);
    const screenX = cp.x * zoomLevel + panX;
    const screenY = cp.y * zoomLevel + panY;

    popup.style.left = (screenX + 12) + 'px';
    popup.style.top = (screenY + 14) + 'px';
    popup.style.display = 'flex';
}

function getTransformedMousePos(e) {
    const rect = canvas2D.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    return {
        x: (mouseX - panX) / zoomLevel,
        y: (mouseY - panY) / zoomLevel
    };
}

// --- 6. EVENT LISTENERS (ZOOM, PAN, SKIZZIEREN, 3D, EXPORT, PROJEKT) ---
// --- TABS (Sidebar) & MOBILE BOTTOM NAV ---
const WORKFLOW_VIEW_BY_TAB = {
    sketch: '2d',
    part: 'track3d',
    export: 'layout3d'
};
const WORKFLOW_TAB_BY_VIEW = {
    '2d': 'sketch',
    track3d: 'part',
    layout3d: 'export'
};
const WORKFLOW_HINTS = {
    sketch: '1 · Strecke wählen und Verlauf zeichnen',
    part: '2 · Maße festlegen, generieren und direkt auf der Strecke prüfen',
    export: '3 · Druckbett kontrollieren und Dateien exportieren'
};

function activateWorkflowTab(tabName, syncViewport = true) {
    const tab = WORKFLOW_VIEW_BY_TAB[tabName] ? tabName : 'sketch';
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.toggle('active', p.dataset.panel === tab));
    const hint = document.getElementById('workflowHint');
    if (hint) hint.textContent = WORKFLOW_HINTS[tab];
    if (syncViewport) setViewportMode(WORKFLOW_VIEW_BY_TAB[tab], false);
}

function setupTabs() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => activateWorkflowTab(btn.dataset.tab, true));
    });
}

function setMobileSection(section) {
    const allowed = ['draw', 'model', 'preview', 'export'];
    const next = allowed.includes(section) ? section : 'draw';
    document.body.classList.remove('mview-draw', 'mview-model', 'mview-preview', 'mview-export');
    document.body.classList.add('mview-' + next);
    document.querySelectorAll('.mnav-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.mobileSection === next);
    });

    if (next === 'draw') {
        activateWorkflowTab('sketch', false);
        setViewportMode('2d', false);
        setTimeout(() => { resizeCanvasToDisplaySize(); redraw2DCanvas(); }, 30);
    } else if (next === 'model') {
        activateWorkflowTab('part', false);
    } else if (next === 'preview') {
        activateWorkflowTab('part', false);
        setViewportMode('track3d', false);
        setTimeout(() => { resizeThreeRendererToContainer(); fitCameraToScene('track'); }, 30);
    } else if (next === 'export') {
        activateWorkflowTab('export', false);
    }
}

function setMobileSidebarOpen(open) {
    const isOpen = !!open;
    document.body.classList.toggle('mobile-sidebar-open', isOpen);
    const toggle = document.getElementById('mobileSidebarToggle');
    if (toggle) {
        toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
        toggle.classList.toggle('active-menu', isOpen);
    }
    const backdrop = document.getElementById('mobileSidebarBackdrop');
    if (backdrop) backdrop.setAttribute('aria-hidden', isOpen ? 'false' : 'true');
}

function toggleMobileSidebar() {
    setMobileSidebarOpen(!document.body.classList.contains('mobile-sidebar-open'));
}

function setupMobileNav() {
    document.querySelectorAll('.mnav-btn[data-mobile-section]').forEach(btn => {
        btn.addEventListener('click', () => {
            setMobileSidebarOpen(false);
            setMobileSection(btn.dataset.mobileSection);
        });
    });

    const sidebarToggle = document.getElementById('mobileSidebarToggle');
    if (sidebarToggle) sidebarToggle.addEventListener('click', toggleMobileSidebar);
    const sidebarClose = document.getElementById('mobileSidebarClose');
    if (sidebarClose) sidebarClose.addEventListener('click', () => setMobileSidebarOpen(false));
    const backdrop = document.getElementById('mobileSidebarBackdrop');
    if (backdrop) backdrop.addEventListener('click', () => setMobileSidebarOpen(false));

    // Im mobilen Drawer darf ein Klick auf einen Workflow-Reiter direkt die passende
    // Ansicht aktivieren und schließt anschließend den Drawer wieder.
    document.querySelectorAll('#tabBar .tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            if (window.matchMedia('(max-width: 900px)').matches) {
                setMobileSidebarOpen(false);
                const mobileSection = btn.dataset.tab === 'sketch' ? 'draw' : btn.dataset.tab === 'part' ? 'model' : 'export';
                setMobileSection(mobileSection);
            }
        });
    });

    const mobileSaveBtn = document.getElementById('mobileSaveBtn');
    if (mobileSaveBtn) mobileSaveBtn.addEventListener('click', saveProject);
    setMobileSidebarOpen(false);
    setMobileSection('draw');
}

function resizeThreeRendererToContainer() {
    const container = document.getElementById('threeContainer');
    if (!container || !renderer || !camera) return;
    const w = container.clientWidth || 1;
    const h = container.clientHeight || 1;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
}

function setViewportMode(mode, syncTab = true) {
    viewportMode = ['track3d', 'layout3d'].includes(mode) ? mode : '2d';
    const is3D = viewportMode !== '2d';
    const isTrack3D = viewportMode === 'track3d';
    const isLayout3D = viewportMode === 'layout3d';
    const viewport = document.getElementById('viewport2D');
    const btn2d = document.getElementById('viewMode2DBtn');
    const btn3d = document.getElementById('viewMode3DBtn');
    const btnLayout = document.getElementById('viewModeLayoutBtn');

    if (viewport) {
        viewport.classList.toggle('mode-3d', is3D);
        viewport.classList.toggle('mode-2d', !is3D);
        viewport.classList.toggle('mode-track3d', isTrack3D);
        viewport.classList.toggle('mode-layout3d', isLayout3D);
    }
    if (btn2d) btn2d.classList.toggle('active', viewportMode === '2d');
    if (btn3d) btn3d.classList.toggle('active', isTrack3D);
    if (btnLayout) btnLayout.classList.toggle('active', isLayout3D);

    if (syncTab) activateWorkflowTab(WORKFLOW_TAB_BY_VIEW[viewportMode], false);

    if (trackSurfaceGroup) trackSurfaceGroup.visible = isTrack3D;
    if (trackPreviewGroup) trackPreviewGroup.visible = isTrack3D;
    if (trackGroup) trackGroup.visible = isLayout3D;
    if (bedGroup) bedGroup.visible = isLayout3D;

    if (is3D) {
        if (isTrack3D) updateTrackPreviewSurface();
        setTimeout(() => {
            resizeThreeRendererToContainer();
            fitCameraToScene(isLayout3D ? 'layout' : 'track');
        }, 30);
    } else {
        setTimeout(() => {
            resizeCanvasToDisplaySize();
            redraw2DCanvas();
        }, 30);
    }
}

// Zoomt zentriert auf die Canvas-Mitte (für die +/- Buttons, v.a. auf Touch-Geräten ohne Mausrad).
function zoomBy(factor) {
    if (!canvas2D) return;
    const cx = canvas2D.width / 2, cy = canvas2D.height / 2;
    let newZoom = Math.min(Math.max(0.5, zoomLevel * factor), 10);
    panX = cx - (cx - panX) * (newZoom / zoomLevel);
    panY = cy - (cy - panY) * (newZoom / zoomLevel);
    zoomLevel = newZoom;
    redraw2DCanvas();
}

function setupEventListeners() {
    const manufacturerSelect = document.getElementById('manufacturerSelect');
    const presetSelect = document.getElementById('presetSelect');

    if (manufacturerSelect) {
        manufacturerSelect.addEventListener('change', (e) => {
            populateTrackSelect(e.target.value);
            currentPresetFilename = '';
            bgImage = null;
            resetZoomAndPan();
            redraw2DCanvas();
            autosave();
        });
    }

    if (presetSelect) {
        presetSelect.addEventListener('change', (e) => loadPresetImage(e.target.value));
    }

    const elementTypeSelect = document.getElementById('elementType');
    if (elementTypeSelect) {
        elementTypeSelect.addEventListener('change', updateElementDimsVisibility);
    }

    const clearBtn = document.getElementById('clearPoints');
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            paths = [];
            currentPath = [];
            generatedPreview = null;
            clearGeneratedMeshes();
            generatedSegments = [];
            updatePartsList();
            measurementStart = null;
            measurementEnd = null;
            selectedPointRef = null;
            draggingPointRef = null;
            redraw2DCanvas();
            updateSketchStatus();
            updateDeleteButtonState();
            autosave();
        });
    }

    const finishPathBtn = document.getElementById('finishPathBtn');
    if (finishPathBtn) {
        finishPathBtn.addEventListener('click', () => finishCurrentPath());
    }

    const toggleOuterBtn = document.getElementById('toggleOuterSideBtn');
    if (toggleOuterBtn) {
        toggleOuterBtn.addEventListener('click', () => {
            pendingOuterSign *= -1;
            updateOuterSideToggleLabel();
            redraw2DCanvas();
        });
    }

    const deleteBtn = document.getElementById('deleteSelectedPointBtn');
    if (deleteBtn) deleteBtn.addEventListener('click', deleteSelectedPoint);

    const finishPopupPlus = document.getElementById('newStrandPopupBtn');
    if (finishPopupPlus) {
        finishPopupPlus.addEventListener('click', (e) => {
            e.stopPropagation();
            finishCurrentPath();
        });
    }

    const deletePopupBtn = document.getElementById('deletePointPopupBtn');
    if (deletePopupBtn) {
        deletePopupBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            deleteSelectedPoint();
        });
    }

    const zoomInBtn = document.getElementById('zoomInBtn');
    if (zoomInBtn) zoomInBtn.addEventListener('click', () => zoomBy(1.25));
    const zoomOutBtn = document.getElementById('zoomOutBtn');
    if (zoomOutBtn) zoomOutBtn.addEventListener('click', () => zoomBy(0.8));

    const insertModeBtn = document.getElementById('insertPointModeBtn');
    if (insertModeBtn) {
        insertModeBtn.addEventListener('click', () => {
            insertPointMode = !insertPointMode;
            insertModeBtn.textContent = `📍 Punkt-Einfügen-Modus: ${insertPointMode ? 'An' : 'Aus'}`;
            insertModeBtn.classList.toggle('active-toggle', insertPointMode);
        });
    }

    const measureBtn = document.getElementById('measureModeBtn');
    if (measureBtn) {
        measureBtn.addEventListener('click', () => {
            measureMode = !measureMode;
            if (!measureMode) { measurementStart = null; measurementEnd = null; }
            updateMeasureStatus();
            redraw2DCanvas();
        });
    }

    const viewMode2DBtn = document.getElementById('viewMode2DBtn');
    if (viewMode2DBtn) viewMode2DBtn.addEventListener('click', () => setViewportMode('2d'));
    const viewMode3DBtn = document.getElementById('viewMode3DBtn');
    if (viewMode3DBtn) viewMode3DBtn.addEventListener('click', () => setViewportMode('track3d'));
    const viewModeLayoutBtn = document.getElementById('viewModeLayoutBtn');
    if (viewModeLayoutBtn) viewModeLayoutBtn.addEventListener('click', () => setViewportMode('layout3d'));

    ['trackLength', 'trackWidth'].forEach(id => {
        const input = document.getElementById(id);
        if (!input) return;
        input.addEventListener('input', () => {
            redraw2DCanvas();
            updateTrackPreviewSurface();
            if (viewportMode !== '2d') fitCameraToScene(viewportMode === 'layout3d' ? 'layout' : 'track');
        });
    });

    const generateBtn = document.getElementById('generate3d');
    if (generateBtn) generateBtn.addEventListener('click', generate3DModel);

    const exportBtn = document.getElementById('exportStl');
    if (exportBtn) exportBtn.addEventListener('click', exportAllSTL);

    const export3mfBtn = document.getElementById('export3mf');
    if (export3mfBtn) export3mfBtn.addEventListener('click', exportColored3MF);

    const saveBtn = document.getElementById('saveFileBtn');
    if (saveBtn) saveBtn.addEventListener('click', saveProject);
    const saveQuickBtn = document.getElementById('saveQuickBtn');
    if (saveQuickBtn) saveQuickBtn.addEventListener('click', saveProject);

    const loadBtn = document.getElementById('loadFileBtn');
    const fileInput = document.getElementById('projectFileInput');
    if (loadBtn && fileInput) {
        loadBtn.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', (e) => {
            if (e.target.files && e.target.files[0]) {
                loadProjectFromFile(e.target.files[0]);
            }
            fileInput.value = '';
        });
    }

    // --- CANVAS MAUS-EVENTS ---
    canvas2D.addEventListener('contextmenu', e => e.preventDefault());

    canvas2D.addEventListener('wheel', (e) => {
        e.preventDefault();
        const zoomFactor = 1.1;
        const rect = canvas2D.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        let newZoom = e.deltaY < 0 ? zoomLevel * zoomFactor : zoomLevel / zoomFactor;
        newZoom = Math.min(Math.max(0.5, newZoom), 10);

        panX = mouseX - (mouseX - panX) * (newZoom / zoomLevel);
        panY = mouseY - (mouseY - panY) * (newZoom / zoomLevel);
        zoomLevel = newZoom;

        redraw2DCanvas();
    }, { passive: false });

    // mousedown erkennt drei Fälle: Verschieben der Ansicht (Rechtsklick/Shift), Treffer auf
    // einen bestehenden Punkt (Auswahl + möglicher Drag-Start), oder Leerklick (Auswahl aufheben,
    // das eigentliche Hinzufügen des neuen Punktes passiert dann im 'click'-Handler unten).
    canvas2D.addEventListener('mousedown', (e) => {
        if (e.button === 2) {
            if (bgImage) {
                const pos = getTransformedMousePos(e);
                const target = findInsertionTarget(pos);
                if (target) {
                    const frac = canvasPosToFraction(pos);
                    const arr = target.containerType === 'current' ? currentPath : paths[target.pathIndex].points;
                    arr.splice(target.insertIndex, 0, frac);
                    redraw2DCanvas();
                    updateSketchStatus();
                    autosave();
                    return; // Punkt eingefügt - kein Verschieben starten
                }
            }
            isPanning = true;
            startPanX = e.clientX - panX;
            startPanY = e.clientY - panY;
            return;
        }
        if (e.shiftKey) {
            isPanning = true;
            startPanX = e.clientX - panX;
            startPanY = e.clientY - panY;
            return;
        }

        if (e.button === 0 && bgImage) {
            if (measureMode) return;
            const pos = getTransformedMousePos(e);

            const arrowHit = findArrowNear(pos);
            if (arrowHit !== null) {
                if (arrowHit === 'pending') {
                    pendingOuterSign *= -1;
                    updateOuterSideToggleLabel();
                } else {
                    paths[arrowHit].outerSign *= -1;
                    autosave();
                }
                suppressNextClick = true;
                redraw2DCanvas();
                return;
            }

            const hit = findPointNear(pos);
            selectedPointRef = hit;
            draggingPointRef = hit;
            redraw2DCanvas();
            updateDeleteButtonState();
        }
    });

    canvas2D.addEventListener('click', (e) => {
        if (suppressNextClick) { suppressNextClick = false; return; }
        if (e.shiftKey) return; // war ein Verschieben, kein Punkt
        if (!bgImage) {
            alert('Bitte zuerst eine Strecken-Vorlage auswählen.');
            return;
        }
        if (measureMode) {
            const pos = getTransformedMousePos(e);
            const frac = canvasPosToFraction(pos);
            if (!measurementStart || measurementEnd) {
                measurementStart = frac;
                measurementEnd = null;
            } else {
                measurementEnd = frac;
            }
            updateMeasureStatus();
            redraw2DCanvas();
            return;
        }
        if (selectedPointRef) return; // Klick hat einen bestehenden Punkt getroffen/verschoben - keinen neuen setzen
        // e.detail >= 2 bedeutet: dieser Klick ist Teil eines Doppelklicks, der gleich
        // finishCurrentPath() auslöst - hier keinen zusätzlichen Punkt mehr setzen.
        if (e.detail && e.detail >= 2) return;

        const pos = getTransformedMousePos(e);

        // Punkt-Einfügen-Modus: Alternative zu Rechtsklick (v.a. am Smartphone nützlich, wo es
        // keinen Rechtsklick gibt) - Klick/Tap auf eine Linie fügt dort einen Punkt ein.
        if (insertPointMode) {
            const target = findInsertionTarget(pos);
            if (target) {
                const frac = canvasPosToFraction(pos);
                const arr = target.containerType === 'current' ? currentPath : paths[target.pathIndex].points;
                arr.splice(target.insertIndex, 0, frac);
                redraw2DCanvas();
                updateSketchStatus();
                autosave();
                return;
            }
        }

        const frac = canvasPosToFraction(pos);
        currentPath.push(frac);
        redraw2DCanvas();
        updateSketchStatus();
    });

    window.addEventListener('mousemove', (e) => {
        if (isPanning) {
            panX = e.clientX - startPanX;
            panY = e.clientY - startPanY;
            redraw2DCanvas();
            return;
        }
        if (draggingPointRef) {
            const pos = getTransformedMousePos(e);
            const frac = canvasPosToFraction(pos);
            if (frac) {
                draggingPointRef.point.fx = frac.fx;
                draggingPointRef.point.fy = frac.fy;
                redraw2DCanvas();
            }
        }
    });

    window.addEventListener('mouseup', (e) => {
        if (e.button === 2 || isPanning) isPanning = false;
        if (draggingPointRef) {
            draggingPointRef = null;
            autosave();
        }
    });

    canvas2D.addEventListener('dblclick', (e) => {
        e.preventDefault();
        finishCurrentPath();
    });

    window.addEventListener('keydown', (e) => {
        // Nicht auslösen, wenn der Fokus in einem Eingabefeld liegt
        const tag = (document.activeElement && document.activeElement.tagName) || '';
        if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;

        if (e.key === 'Enter') {
            finishCurrentPath();
        } else if (e.key === 'Escape') {
            currentPath = [];
            selectedPointRef = null;
            draggingPointRef = null;
            redraw2DCanvas();
            updateSketchStatus();
            updateDeleteButtonState();
        } else if ((e.key === 'Delete' || e.key === 'Backspace') && selectedPointRef) {
            e.preventDefault();
            deleteSelectedPoint();
        }
    });

    window.addEventListener('resize', () => {
        resizeCanvasToDisplaySize();
        redraw2DCanvas();
    });
}

// --- TOUCH-GESTEN (Mobilgeräte) ---
// Bewusst als EIGENE, ZUSÄTZLICHE Event-Ebene umgesetzt (nicht in die bestehenden Maus-Handler
// eingebaut), damit das erprobte Desktop-Verhalten unverändert bleibt. Wiederverwendet dieselben
// Zustands-Variablen/Funktionen (paths, currentPath, findPointNear, canvasPosToFraction, ...).
// Gesten: Ein Finger antippen = Punkt setzen/auswählen (bzw. Linie treffen im Einfüge-Modus).
// Ein Finger auf einen Punkt + ziehen = Punkt verschieben. Ein Finger auf leere Fläche + ziehen =
// Ansicht verschieben. Zwei Finger = Pinch-Zoom.
let touchState = { mode: null, startX: 0, startY: 0, moved: false, draggingPoint: null,
    panStartX: 0, panStartY: 0, pinchStartDist: 0, pinchStartZoom: 1, pinchMidX: 0, pinchMidY: 0,
    arrowHit: null };

function getTouchCanvasPos(touch) {
    const rect = canvas2D.getBoundingClientRect();
    return { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
}

function setupTouchEvents() {
    if (!canvas2D) return;

    canvas2D.addEventListener('touchstart', (e) => {
        if (e.touches.length === 2) {
            e.preventDefault();
            const p1 = getTouchCanvasPos(e.touches[0]);
            const p2 = getTouchCanvasPos(e.touches[1]);
            touchState.mode = 'pinch';
            touchState.pinchStartDist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
            touchState.pinchStartZoom = zoomLevel;
            touchState.pinchMidX = (p1.x + p2.x) / 2;
            touchState.pinchMidY = (p1.y + p2.y) / 2;
            return;
        }
        if (e.touches.length !== 1) return;

        const raw = getTouchCanvasPos(e.touches[0]);
        touchState.startX = raw.x;
        touchState.startY = raw.y;
        touchState.moved = false;

        if (!bgImage) { touchState.mode = null; return; }
        if (measureMode) { touchState.mode = 'measure'; return; }

        const pos = { x: (raw.x - panX) / zoomLevel, y: (raw.y - panY) / zoomLevel };

        const arrowHit = findArrowNear(pos);
        if (arrowHit !== null) {
            touchState.mode = 'arrow-hit';
            touchState.arrowHit = arrowHit;
            return;
        }

        const hit = findPointNear(pos);
        if (hit) {
            touchState.mode = 'point-drag';
            touchState.draggingPoint = hit;
            selectedPointRef = hit;
            redraw2DCanvas();
            updateDeleteButtonState();
        } else {
            // Sofort abwählen (analog zum mousedown-Verhalten am PC) - ob daraus ein Tap (neuer
            // Punkt) oder ein Pan wird, entscheidet sich erst bei touchmove/touchend.
            selectedPointRef = null;
            draggingPointRef = null;
            updateDeleteButtonState();
            touchState.mode = 'pending';
        }
    }, { passive: false });

    canvas2D.addEventListener('touchmove', (e) => {
        if (touchState.mode === 'pinch' && e.touches.length === 2) {
            e.preventDefault();
            const p1 = getTouchCanvasPos(e.touches[0]);
            const p2 = getTouchCanvasPos(e.touches[1]);
            const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
            if (touchState.pinchStartDist > 10) {
                const newZoom = Math.min(Math.max(0.5, touchState.pinchStartZoom * (dist / touchState.pinchStartDist)), 10);
                const mx = touchState.pinchMidX, my = touchState.pinchMidY;
                panX = mx - (mx - panX) * (newZoom / zoomLevel);
                panY = my - (my - panY) * (newZoom / zoomLevel);
                zoomLevel = newZoom;
                redraw2DCanvas();
            }
            return;
        }
        if (e.touches.length !== 1) return;

        const raw = getTouchCanvasPos(e.touches[0]);
        const dx = raw.x - touchState.startX, dy = raw.y - touchState.startY;
        if (Math.hypot(dx, dy) > 6) touchState.moved = true;

        if (touchState.mode === 'point-drag' && touchState.draggingPoint) {
            e.preventDefault();
            const pos = { x: (raw.x - panX) / zoomLevel, y: (raw.y - panY) / zoomLevel };
            const frac = canvasPosToFraction(pos);
            if (frac) {
                touchState.draggingPoint.point.fx = frac.fx;
                touchState.draggingPoint.point.fy = frac.fy;
                redraw2DCanvas();
            }
        } else if ((touchState.mode === 'pending' || touchState.mode === 'pan') && touchState.moved) {
            e.preventDefault();
            if (touchState.mode === 'pending') {
                touchState.mode = 'pan';
                touchState.panStartX = panX;
                touchState.panStartY = panY;
            }
            panX = touchState.panStartX + (raw.x - touchState.startX);
            panY = touchState.panStartY + (raw.y - touchState.startY);
            redraw2DCanvas();
        }
    }, { passive: false });

    canvas2D.addEventListener('touchend', () => {
        if (touchState.mode === 'measure' && !touchState.moved && bgImage) {
            const pos = { x: (touchState.startX - panX) / zoomLevel, y: (touchState.startY - panY) / zoomLevel };
            const frac = canvasPosToFraction(pos);
            if (!measurementStart || measurementEnd) { measurementStart = frac; measurementEnd = null; }
            else measurementEnd = frac;
            updateMeasureStatus();
            redraw2DCanvas();
        } else if (touchState.mode === 'point-drag') {
            if (touchState.moved) autosave();
        } else if (touchState.mode === 'arrow-hit' && !touchState.moved) {
            if (touchState.arrowHit === 'pending') {
                pendingOuterSign *= -1;
                updateOuterSideToggleLabel();
            } else {
                paths[touchState.arrowHit].outerSign *= -1;
                autosave();
            }
            redraw2DCanvas();
        } else if (touchState.mode === 'pending' && !touchState.moved && bgImage) {
            // Tap auf leere Fläche / eine Linie
            const pos = { x: (touchState.startX - panX) / zoomLevel, y: (touchState.startY - panY) / zoomLevel };

            if (insertPointMode) {
                const target = findInsertionTarget(pos);
                if (target) {
                    const frac = canvasPosToFraction(pos);
                    const arr = target.containerType === 'current' ? currentPath : paths[target.pathIndex].points;
                    arr.splice(target.insertIndex, 0, frac);
                    redraw2DCanvas();
                    updateSketchStatus();
                    autosave();
                    touchState.mode = null;
                    return;
                }
            }

            const frac = canvasPosToFraction(pos);
            currentPath.push(frac);
            redraw2DCanvas();
            updateSketchStatus();
        }
        touchState.mode = null;
        touchState.draggingPoint = null;
    });
}

function finishCurrentPath() {
    if (currentPath.length > 1) {
        paths.push({ points: [...currentPath], outerSign: pendingOuterSign });
        autosave();
    }
    currentPath = [];
    redraw2DCanvas();
    updateSketchStatus();
}

// --- 7. GEOMETRIE-HILFSFUNKTIONEN (mm-Ebene) ---
function dist(a, b) { return Math.hypot(b.x - a.x, b.y - a.y); }

function polylineLength(pts) {
    let len = 0;
    for (let i = 1; i < pts.length; i++) len += dist(pts[i - 1], pts[i]);
    return len;
}

function offsetPoint(p, dir, amount) {
    return { x: p.x + dir.x * amount, y: p.y + dir.y * amount };
}

// Schneidet aus einer Punktreihe den Abschnitt zwischen zwei Bogenlängen [dStart, dEnd] heraus
// (0 <= dStart <= dEnd <= Gesamtlänge von points), inklusive exakt interpolierter Randpunkte an
// den beiden Schnittstellen (falls diese nicht ohnehin genau auf einen vorhandenen Punkt fallen).
// Wird für die Neigungs-Rampe an den Curb-Segmentenden gebraucht (buildCurbRampMeshes), um dort
// unabhängig von der Rot/Weiß-Streifen-Einteilung feine Längs-Scheiben herauszuschneiden.
function sliceByArcLength(points, dStart, dEnd) {
    if (points.length < 2 || dEnd - dStart < 1e-6) return [];
    const result = [];
    let acc = 0;
    for (let i = 1; i < points.length; i++) {
        const p0 = points[i - 1], p1 = points[i];
        const segLen = dist(p0, p1);
        if (segLen < 1e-9) continue;
        const segStartD = acc;
        const segEndD = acc + segLen;

        if (result.length === 0) {
            if (segStartD >= dStart - 1e-6) {
                result.push(p0);
            } else if (segEndD > dStart) {
                const t = (dStart - segStartD) / segLen;
                result.push({ x: p0.x + (p1.x - p0.x) * t, y: p0.y + (p1.y - p0.y) * t });
            }
        }

        if (result.length > 0) {
            if (segEndD <= dEnd + 1e-6) {
                result.push(p1);
            } else {
                const t = (dEnd - segStartD) / segLen;
                result.push({ x: p0.x + (p1.x - p0.x) * t, y: p0.y + (p1.y - p0.y) * t });
                break;
            }
        }

        acc = segEndD;
        if (acc >= dEnd - 1e-6) break;
    }
    return result;
}

// Erzeugt eine halbrunde Kappe zwischen zwei Kantenpunkten (fromOffset -> toOffset, quer zur
// Strangrichtung), die nach außen (outwardDir) wölbt - für abgerundete Curb-Enden statt eines
// geraden Abschlusses. Reihenfolge fromOffset->toOffset bestimmt die Umlaufrichtung des Polygons
// und MUSS erhalten bleiben (deshalb kein abs() auf die Differenz).
function pushRoundedCap(outline, center, outwardDir, normal, fromOffset, toOffset, segments) {
    const mid = (fromOffset + toOffset) / 2;
    const radius = (toOffset - fromOffset) / 2; // Vorzeichen behält die gewünschte Richtung bei
    if (Math.abs(radius) < 0.05) { outline.push(offsetPoint(center, normal, fromOffset)); return; }
    for (let i = 0; i <= segments; i++) {
        const angle = Math.PI * (1 - i / segments); // pi -> 0
        const widthOffset = mid + Math.cos(angle) * radius;
        const bulge = Math.sin(angle) * Math.abs(radius);
        outline.push(offsetPoint(offsetPoint(center, normal, widthOffset), outwardDir, bulge));
    }
}

// Verdichtet eine Polylinie auf gleichmäßige Abstände (stepMM), für glattere Kurven
// und damit die 250mm-Schnitte an sinnvollen, regelmäßigen Stellen liegen.
function resamplePolyline(points, stepMM) {
    const cleaned = points.filter((p, i) => i === 0 || dist(p, points[i - 1]) > 1e-6);
    if (cleaned.length < 2) return cleaned;

    const result = [cleaned[0]];
    let carry = 0;

    for (let i = 1; i < cleaned.length; i++) {
        const p0 = cleaned[i - 1], p1 = cleaned[i];
        const segLen = dist(p0, p1);
        if (segLen < 1e-6) continue;
        const dir = { x: (p1.x - p0.x) / segLen, y: (p1.y - p0.y) / segLen };
        let pos = 0;
        while (carry + (segLen - pos) >= stepMM) {
            const need = stepMM - carry;
            pos += need;
            result.push({ x: p0.x + dir.x * pos, y: p0.y + dir.y * pos });
            carry = 0;
        }
        carry += (segLen - pos);
    }

    const last = cleaned[cleaned.length - 1];
    if (dist(result[result.length - 1], last) > 1e-3) result.push(last);
    return result;
}

// Glättet die grob geklickte Mittellinie zu einer weichen Kurve (Catmull-Rom-Spline),
// damit die Bande/Curb nicht wie ein Polygonzug mit harten Knicken wirkt, sondern
// wie aus einem Guss den Kurven folgt. Die skizzierten Punkte werden dabei als
// Kontrollpunkte behandelt, die Kurve verläuft weiterhin durch jeden von ihnen.
function smoothCenterline(mmPoints) {
    if (mmPoints.length < 3) return mmPoints;
    const controlPoints = mmPoints.map(p => new THREE.Vector3(p.x, p.y, 0));
    const curve = new THREE.CatmullRomCurve3(controlPoints, false, 'catmullrom', 0.5);
    const approxLength = polylineLength(mmPoints);
    const numPoints = Math.max(Math.round(approxLength / 1.5), mmPoints.length * 8, 40);
    return curve.getPoints(numPoints).map(p => ({ x: p.x, y: p.y }));
}

// Teilt eine (verdichtete) Mittellinie in Stücke <= EFFECTIVE_MAX_LENGTH_MM.
function splitPathIntoSegments(pathPointsFrac) {
    const mmPoints = pathPointsFrac.map(p => ({ x: p.fx * trackLengthMM, y: (1 - p.fy) * trackWidthMM }));
    const smoothed = smoothCenterline(mmPoints);
    const dense = resamplePolyline(smoothed, RESAMPLE_STEP_MM);
    if (dense.length < 2) return [];

    const chunks = [];
    let currentChunk = [dense[0]];
    let currentLen = 0;

    for (let i = 1; i < dense.length; i++) {
        const segLen = dist(dense[i - 1], dense[i]);
        if (currentLen + segLen > getEffectiveSegmentLength() && currentChunk.length > 1) {
            chunks.push(currentChunk);
            currentChunk = [dense[i - 1]]; // nahtloser Übergang: Startpunkt = letzter Endpunkt
            currentLen = 0;
        }
        currentChunk.push(dense[i]);
        currentLen += segLen;
    }
    if (currentChunk.length > 1) chunks.push(currentChunk);
    return chunks;
}

// Berechnet Zapfen-Maße (Basis-/Spitzenhalbbreite) für eine gegebene Querschnitts-Halbbreite,
// unter Einhaltung der Mindestwandstärke (DOVETAIL.minWallMM). Skaliert proportional mit der
// Bauteilbreite (1/3 Rand gesamt, 2/3 Zunge an der Spitze) - possible=false, wenn selbst eine
// minimale Zunge nicht ohne Bruchgefahr reinpasst.
// Berechnet Zapfen-Maße (Basis-/Spitzenhalbbreite UND Länge) für eine gegebene Querschnitts-
// Halbbreite. Die Länge wird aus dem festen Flankenwinkel (DOVETAIL.flareAngleDeg) und der
// (Basis-/Spitzenbreiten-)Differenz abgeleitet, NICHT fest vorgegeben - dadurch bleibt der
// Winkel bei jeder Bauteilgröße exakt 60°, während alle Längenmaße mit der Bauteilbreite
// mitskalieren. possible=false, wenn selbst eine minimale Zunge nicht ohne Bruchgefahr reinpasst.
function computeTabSize(halfWidth) {
    const clearance = DOVETAIL.clearance;
    // WICHTIG: Der Winkel wird von der BREITENACHSE (quer zur Längsrichtung) aus gemessen, nicht
    // von der Längsachse - genau wie in der Nutzer-Zeichnung. Bei 60° bedeutet das: tabLength =
    // Δ(Halbbreite) * tan(60°) [nicht geteilt!]. Mit den Beispielwerten der Zeichnung (Δ=4mm,
    // Länge=6mm bei 20mm Bauteilbreite) passt das: atan(6/4) ≈ 56°, nah an 60° (Rest ist übliche
    // Mess-Ungenauigkeit aus einem Foto).
    const tanAngle = Math.tan(DOVETAIL.flareAngleDeg * Math.PI / 180);

    let tabTipHalf = halfWidth * (1 - DOVETAIL.marginRatio);
    let tabHalf = tabTipHalf * DOVETAIL.tabBaseRatio;
    let tabLength = (tabTipHalf - tabHalf) * tanAngle;

    // Mindestwandstärke sicherstellen (Bruchgefahr bei zu dünnem Restmaterial) - wenn die
    // proportionale Zunge das verletzen würde, werden Basis/Spitze/Länge GEMEINSAM im gleichen
    // Verhältnis verkleinert, damit der Flankenwinkel dabei exakt 60° bleibt.
    const maxAllowedTipHalf = halfWidth - DOVETAIL.minWallMM - clearance;
    if (maxAllowedTipHalf < 0.6) return { possible: false, tabHalf: 0, tabTipHalf: 0, tabLength: 0 };
    if (tabTipHalf > maxAllowedTipHalf) {
        const scale = maxAllowedTipHalf / tabTipHalf;
        tabTipHalf = maxAllowedTipHalf;
        tabHalf *= scale;
        tabLength *= scale;
    }
    if (tabHalf < 0.3) { tabHalf = 0.3; tabLength = (tabTipHalf - tabHalf) * tanAngle; }

    return { possible: true, tabHalf, tabTipHalf, tabLength };
}

// Berechnet die Eckpunkte der NUT (Öffnungsbreite, Grundbreite, Tiefe) mit einem WIRKLICH
// gleichmäßigen senkrechten Abstand (clearance) zur Zungen-Kontur entlang der GESAMTEN Flanke -
// nicht nur Breite und Tiefe getrennt aufaddiert (das ergäbe an der schrägen Flanke einen
// ungleichmäßigen, meist zu kleinen Spalt). Echter Polygon-Versatz mit Gehrungs-Ecke am
// Taschengrund. Arbeitet in einer (Länge=l, Breite=w)-Ebene, eine Seite (+w); die andere Seite
// wird beim Aufruf gespiegelt.
function computeNotchGeometry(tabHalf, tabTipHalf, tabLength, clearance) {
    const A = { l: 0, w: tabHalf };            // Zungenbasis, an der Oberfläche
    const B = { l: tabLength, w: tabTipHalf };  // Zungenspitze, tief im Material

    const rawDir = { l: B.l - A.l, w: B.w - A.w };
    const len = Math.hypot(rawDir.l, rawDir.w) || 1;
    const dir = { l: rawDir.l / len, w: rawDir.w / len };
    // Normale, die nach AUSSEN zeigt (weg von der Zungenmitte, d.h. Nut wird größer/breiter)
    const normal = { l: -dir.w, w: dir.l };

    const A_off = { l: A.l + normal.l * clearance, w: A.w + normal.w * clearance };
    const bottomL = tabLength + clearance;

    // Schnittpunkt der versetzten Flanke mit der (ebenfalls versetzten) Bodenlinie l=bottomL
    // bzw. mit der Oberfläche l=0 -> korrekte Gehrungs-Ecken der vergrößerten Tasche.
    const tBottom = (bottomL - A_off.l) / dir.l;
    const bottomW = A_off.w + tBottom * dir.w;
    const tMouth = (0 - A_off.l) / dir.l;
    const mouthW = A_off.w + tMouth * dir.w;

    return { mouthHalf: mouthW, bottomHalf: bottomW, depth: bottomL };
}

// Baut die 2D-Umriss-Punkte (mm) eines Segments inkl. Zunge (Ende) / Nut (Anfang).
// offsetA/offsetB sind die beiden Kantenabstände von der Mittellinie (in Normalenrichtung),
// MÜSSEN NICHT symmetrisch sein (offsetA < offsetB) - für Bande symmetrisch (-halfWidth/+halfWidth),
// für Curb asymmetrisch (0 bis Gesamtbreite), damit die Fahrbahnseite an der Skizzenlinie liegt.
// roundStart/roundEnd runden das jeweilige Ende ab, statt es gerade abzuschneiden - nur sinnvoll,
// wenn dort KEINE Nut/Zunge existiert (echtes Ende eines Strangs, keine Segmentgrenze).
// tabOverride { tabHalf, tabTipHalf, possible, anchorOffset } - WICHTIG bei gestapelten Schichten
// (Bande-Stufen, Curb Basis+Rampenstufen): OHNE diesen Parameter würde JEDE Schicht ihre eigene
// Zungengröße UND -position (bezogen auf die eigene, unterschiedlich breite Mitte) berechnen -
// das ergibt seitlich zueinander versetzte, unterschiedlich große Zungen je Schicht, die beim
// Stapeln wie viele kleine Zacken statt EINER sauberen Zunge aussehen. Der Aufrufer berechnet
// daher Größe+Position EINMAL (von der schmalsten Schicht im Stapel) und gibt sie an ALLE
// Schichten weiter. Die Rundung (roundStart/roundEnd) bleibt davon unberührt und nutzt weiterhin
// die eigene, echte Mitte dieser Schicht (die beiden Zwecke schließen sich pro Ende ohnehin aus).
// Schneidet ein lokales Connector-Polygon (l = Längsrichtung, w = Curb-Breite)
// auf die tatsächlich in dieser Höhenlage vorhandene Breite [wMin,wMax].
// So bleibt der Curb-Schwalbenschwanz über ALLE Höhenlagen auf derselben globalen
// Curb-Mitte, ohne dass schmalere Rampenstufen ihn neu zentrieren oder verkleinern.
function clipConnectorPolygonToWidth(poly, wMin, wMax) {
    function clip(input, keep, intersect) {
        if (!input.length) return [];
        const out = [];
        for (let i = 0; i < input.length; i++) {
            const a = input[i];
            const b = input[(i + 1) % input.length];
            const ain = keep(a), bin = keep(b);
            if (ain && bin) out.push(b);
            else if (ain && !bin) out.push(intersect(a, b));
            else if (!ain && bin) { out.push(intersect(a, b)); out.push(b); }
        }
        return out;
    }
    let out = poly.slice();
    out = clip(out, p => p.w >= wMin - 1e-9, (a,b) => {
        const t = (wMin - a.w) / ((b.w - a.w) || 1e-12);
        return { l: a.l + (b.l - a.l) * t, w: wMin };
    });
    out = clip(out, p => p.w <= wMax + 1e-9, (a,b) => {
        const t = (wMax - a.w) / ((b.w - a.w) || 1e-12);
        return { l: a.l + (b.l - a.l) * t, w: wMax };
    });
    return out;
}

// Liefert aus dem geclippten Trapez die offene Randlinie vom unteren zum oberen
// Anschluss an der Segment-Stirnfläche (l=0), aber über die tiefe/projizierte Seite.
// Gibt [] zurück, wenn diese Höhenlage die Connector-Basis gar nicht berührt.
function connectorOpenBoundary(poly, wMin, wMax) {
    const q = clipConnectorPolygonToWidth(poly, wMin, wMax);
    if (q.length < 3) return [];
    const zero = [];
    q.forEach((p, i) => { if (Math.abs(p.l) < 1e-7) zero.push({ i, p }); });
    if (zero.length < 2) return [];
    zero.sort((a,b) => a.p.w - b.p.w);
    const lo = zero[0], hi = zero[zero.length - 1];

    function pathBetween(i0, i1, step) {
        const path = [q[i0]];
        let i = i0;
        for (let guard = 0; guard < q.length + 2; guard++) {
            if (i === i1) break;
            i = (i + step + q.length) % q.length;
            path.push(q[i]);
            if (i === i1) break;
        }
        return path;
    }
    const p1 = pathBetween(lo.i, hi.i, 1);
    const p2 = pathBetween(lo.i, hi.i, -1);
    const maxL1 = Math.max(...p1.map(p => p.l));
    const maxL2 = Math.max(...p2.map(p => p.l));
    return maxL1 >= maxL2 ? p1 : p2;
}

function buildSegmentOutline(centerlinePoints, offsetA, offsetB, hasStartNotch, hasEndTab, roundStart, roundEnd, tabOverride) {
    const n = centerlinePoints.length;
    const tangents = centerlinePoints.map((p, i) => {
        const a = centerlinePoints[Math.max(0, i - 1)];
        const b = centerlinePoints[Math.min(n - 1, i + 1)];
        const dx = b.x - a.x, dy = b.y - a.y;
        const len = Math.hypot(dx, dy) || 1;
        return { x: dx / len, y: dy / len };
    });
    const normals = tangents.map(t => ({ x: -t.y, y: t.x }));

    const edgeA = centerlinePoints.map((p, i) => offsetPoint(p, normals[i], offsetA));
    const edgeB = centerlinePoints.map((p, i) => offsetPoint(p, normals[i], offsetB));

    const halfWidth = (offsetB - offsetA) / 2;
    const ownCenterOffset = (offsetA + offsetB) / 2; // echte Mitte DIESER Schicht (für Rundung)

    // Zunge/Nut dürfen die Restwandstärke außen nicht unter DOVETAIL.minWallMM drücken - sonst
    // droht Bruch beim/nach dem Druck. Wird's zu eng, schrumpft die Zunge automatisch; reicht
    // selbst das nicht (extrem dünnes Bauteil), fällt die Steckverbindung ganz weg (gerader Stoß).
    const clearance = DOVETAIL.clearance;

    let tabHalf, tabTipHalf, tabLength, dovetailPossible, tabCenterOffset;
    if (tabOverride) {
        tabHalf = tabOverride.tabHalf;
        tabTipHalf = tabOverride.tabTipHalf;
        tabLength = tabOverride.tabLength;
        dovetailPossible = tabOverride.possible;
        tabCenterOffset = tabOverride.anchorOffset;

        if (dovetailPossible && !tabOverride.fixedCenter) {
            // Standardverhalten (z.B. Bande): auf die jeweilige Schicht anpassen.
            const reach = tabTipHalf + clearance;
            const layerWidth = offsetB - offsetA;
            if (layerWidth < 2 * reach + 0.01) {
                const resized = computeTabSize(layerWidth / 2);
                if (resized.possible) {
                    tabHalf = resized.tabHalf;
                    tabTipHalf = resized.tabTipHalf;
                    tabLength = resized.tabLength;
                    tabCenterOffset = ownCenterOffset;
                } else {
                    dovetailPossible = false;
                }
            } else {
                const minCenter = offsetA + reach;
                const maxCenter = offsetB - reach;
                if (tabCenterOffset < minCenter) tabCenterOffset = minCenter;
                else if (tabCenterOffset > maxCenter) tabCenterOffset = maxCenter;
            }
        }
        // fixedCenter (Curb): Größe + Achse bleiben exakt von der VOLLEN Curb-Breite abgeleitet.
        // Die Überschneidung mit schmaleren Höhenlagen wird weiter unten geometrisch geclippt.
    } else {
        const size = computeTabSize(halfWidth);
        tabHalf = size.tabHalf;
        tabTipHalf = size.tabTipHalf;
        tabLength = size.tabLength;
        dovetailPossible = size.possible;
        tabCenterOffset = ownCenterOffset;
    }

    const effStartNotch = hasStartNotch && dovetailPossible;
    const effEndTab = hasEndTab && dovetailPossible;
    if ((hasStartNotch || hasEndTab) && !dovetailPossible) {
        console.warn(`Bauteil zu dünn (${(halfWidth * 2).toFixed(1)}mm) für eine Schwalbenschwanz-Verbindung mit ${DOVETAIL.minWallMM}mm Mindestwandstärke - Segmentende bleibt gerade.`);
    }

    const outline = [];

    // --- START (Nut/Aussparung ODER Rundung ODER gerade Kante) ---
    const startTangent = tangents[0];
    const startNormal = normals[0];
    const startRoundCenter = offsetPoint(centerlinePoints[0], startNormal, ownCenterOffset);
    const startTabCenter = offsetPoint(centerlinePoints[0], startNormal, tabCenterOffset);

    if (roundStart && !effStartNotch) {
        pushRoundedCap(outline, startRoundCenter, { x: -startTangent.x, y: -startTangent.y }, startNormal, offsetA - ownCenterOffset, offsetB - ownCenterOffset, 10);
    } else {
        outline.push(edgeA[0]);
        if (effStartNotch) {
            const notch = computeNotchGeometry(tabHalf, tabTipHalf, tabLength, clearance);
            if (tabOverride && tabOverride.fixedCenter) {
                const poly = [
                    { l: 0, w: tabCenterOffset - notch.mouthHalf },
                    { l: notch.depth, w: tabCenterOffset - notch.bottomHalf },
                    { l: notch.depth, w: tabCenterOffset + notch.bottomHalf },
                    { l: 0, w: tabCenterOffset + notch.mouthHalf }
                ];
                const path = connectorOpenBoundary(poly, offsetA, offsetB);
                path.forEach(lp => {
                    outline.push(offsetPoint(offsetPoint(centerlinePoints[0], startNormal, lp.w), startTangent, lp.l));
                });
            } else {
                outline.push(offsetPoint(startTabCenter, startNormal, -notch.mouthHalf));
                outline.push(offsetPoint(offsetPoint(startTabCenter, startNormal, -notch.bottomHalf), startTangent, notch.depth));
                outline.push(offsetPoint(offsetPoint(startTabCenter, startNormal, notch.bottomHalf), startTangent, notch.depth));
                outline.push(offsetPoint(startTabCenter, startNormal, notch.mouthHalf));
            }
        }
        outline.push(edgeB[0]);
    }

    // --- SEITENKANTE B ---
    for (let i = 1; i < n; i++) outline.push(edgeB[i]);

    // --- ENDE (Zunge ODER Rundung ODER gerade Kante) ---
    const endTangent = tangents[n - 1];
    const endNormal = normals[n - 1];
    const endRoundCenter = offsetPoint(centerlinePoints[n - 1], endNormal, ownCenterOffset);
    const endTabCenter = offsetPoint(centerlinePoints[n - 1], endNormal, tabCenterOffset);

    if (roundEnd && !effEndTab) {
        // Von B nach A (Rückweg) - Rundung entsprechend in umgekehrter Richtung aufbauen
        pushRoundedCap(outline, endRoundCenter, endTangent, endNormal, offsetB - ownCenterOffset, offsetA - ownCenterOffset, 10);
    } else {
        if (effEndTab) {
            if (tabOverride && tabOverride.fixedCenter) {
                const poly = [
                    { l: 0, w: tabCenterOffset - tabHalf },
                    { l: tabLength, w: tabCenterOffset - tabTipHalf },
                    { l: tabLength, w: tabCenterOffset + tabTipHalf },
                    { l: 0, w: tabCenterOffset + tabHalf }
                ];
                const path = connectorOpenBoundary(poly, offsetA, offsetB).reverse(); // außen B -> außen A
                path.forEach(lp => {
                    outline.push(offsetPoint(offsetPoint(centerlinePoints[n - 1], endNormal, lp.w), endTangent, lp.l));
                });
            } else {
                outline.push(offsetPoint(endTabCenter, endNormal, tabHalf));
                outline.push(offsetPoint(offsetPoint(endTabCenter, endNormal, tabTipHalf), endTangent, tabLength));
                outline.push(offsetPoint(offsetPoint(endTabCenter, endNormal, -tabTipHalf), endTangent, tabLength));
                outline.push(offsetPoint(endTabCenter, endNormal, -tabHalf));
            }
        }
        outline.push(edgeA[n - 1]);
    }

    // --- SEITENKANTE A ZURÜCK ---
    for (let i = n - 2; i >= 0; i--) outline.push(edgeA[i]);

    return outline;
}

// --- 8. 3D-SZENE ---
// WICHTIG: Die Szene nutzt Z-UP (Druck-/Slicer-Konvention: X-Y = Druckbett-Ebene,
// Z = Höhe/Druckrichtung), NICHT die in Three.js sonst übliche Y-up-Konvention.
// Dadurch entsprechen die exportierten STL-Koordinaten exakt dem, was ein Slicer
// erwartet: Bauteil liegt flach auf der X-Y-Ebene, Höhe wächst in Z.
// Erzeugt einen sanften Grauverlauf (dunkler unten, heller oben) als Szenen-Hintergrund -
// über eine kleine Canvas-Textur, da THREE.Scene.background nur Vollfarben oder Texturen kennt,
// keine CSS-artigen Verläufe direkt.
function createGradientBackground() {
    const canvas = document.createElement('canvas');
    canvas.width = 2;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    const gradient = ctx.createLinearGradient(0, 0, 0, 256);
    gradient.addColorStop(0, '#6b6e75');
    gradient.addColorStop(0.5, '#45474d');
    gradient.addColorStop(1, '#232428');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 2, 256);
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
}

function init3DScene() {
    const container = document.getElementById('threeContainer');
    if (!container || typeof THREE === 'undefined') return;

    scene = new THREE.Scene();
    scene.background = createGradientBackground();

    camera = new THREE.PerspectiveCamera(45, container.clientWidth / (container.clientHeight || 1), 1, 20000);
    camera.up.set(0, 0, 1);
    camera.position.set(-150, -420, 380);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio || 1);
    renderer.setSize(container.clientWidth, container.clientHeight || 500);
    container.appendChild(renderer.domElement);

    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.target.set(125, 125, 0);
    controls.update();

    scene.add(new THREE.HemisphereLight(0xffffff, 0x333333, 1.2));
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(-200, -300, 500);
    scene.add(dirLight);

    bedGroup = new THREE.Group();
    bedGroup.visible = false;
    scene.add(bedGroup);
    rebuildBedVisuals(1);

    trackSurfaceGroup = new THREE.Group();
    scene.add(trackSurfaceGroup);

    trackPreviewGroup = new THREE.Group();
    scene.add(trackPreviewGroup);

    trackGroup = new THREE.Group();
    trackGroup.visible = false;
    scene.add(trackGroup);

    updateTrackPreviewSurface();
    animate3D();

    window.addEventListener('resize', () => {
        resizeThreeRendererToContainer();
        if (viewportMode !== '2d') fitCameraToScene(viewportMode === 'layout3d' ? 'layout' : 'track');
    });
}

let bedGroup = null;
const PLATE_GAP_MM = 80; // sichtbarer Abstand zwischen mehreren Druckplatten in der Vorschau

// Baut die Visualisierung EINER Druckplatte (Fläche + Kontur + Raster) an der Position, die
// dieser Plattenindex im nebeneinander aufgereihten Mehrplatten-Layout einnimmt.
function createPlateVisual(index) {
    const group = new THREE.Group();
    const offsetX = index * (bedWidthMM + PLATE_GAP_MM);

    const bedGeo = new THREE.PlaneGeometry(bedWidthMM, bedLengthMM);
    const bedMat = new THREE.MeshStandardMaterial({ color: 0x3a3a3a, side: THREE.DoubleSide, roughness: 0.9 });
    const bedMesh = new THREE.Mesh(bedGeo, bedMat);
    bedMesh.position.set(offsetX + bedWidthMM / 2, bedLengthMM / 2, 0);
    group.add(bedMesh);

    const bedEdges = new THREE.LineSegments(
        new THREE.EdgesGeometry(bedGeo),
        new THREE.LineBasicMaterial({ color: 0x00adb5 })
    );
    bedEdges.position.copy(bedMesh.position);
    bedEdges.position.z = 0.4;
    group.add(bedEdges);

    const gridSize = Math.max(bedWidthMM, bedLengthMM);
    const grid = new THREE.GridHelper(gridSize, 25, 0x00adb5, 0x555555);
    grid.scale.set(bedWidthMM / gridSize, 1, bedLengthMM / gridSize); // auf Rechteck stauchen
    grid.rotation.x = Math.PI / 2; // Grid liegt standardmäßig in der XZ-Ebene -> in XY-Ebene drehen
    grid.position.set(offsetX + bedWidthMM / 2, bedLengthMM / 2, 0.2);
    group.add(grid);

    return group;
}

// Löscht die alte(n) Druckplatten-Visualisierung(en) und baut plateCount neue, nebeneinander
// aufgereihte Platten in aktueller Größe/Anzahl auf.
function rebuildBedVisuals(plateCount) {
    if (!bedGroup) return;
    clearGroupContents(bedGroup);
    for (let i = 0; i < plateCount; i++) {
        bedGroup.add(createPlateVisual(i));
    }
}

function clearGroupContents(group) {
    if (!group) return;
    while (group.children.length) {
        const child = group.children[group.children.length - 1];
        group.remove(child);
        child.traverse(node => {
            if (node.geometry) node.geometry.dispose();
            if (node.material) {
                const mats = Array.isArray(node.material) ? node.material : [node.material];
                mats.forEach(mat => {
                    if (mat.map) mat.map.dispose?.();
                    mat.dispose?.();
                });
            }
        });
    }
}

function updateTrackPreviewSurface() {
    if (!trackSurfaceGroup || typeof THREE === 'undefined') return;
    clearGroupContents(trackSurfaceGroup);

    const dims = getLiveTrackDimsMM();
    if (!(dims.lengthMM > 0) || !(dims.widthMM > 0)) return;

    const planeGeo = new THREE.PlaneGeometry(dims.lengthMM, dims.widthMM);
    let planeMat;
    if (bgImage) {
        const texture = new THREE.Texture(bgImage);
        texture.needsUpdate = true;
        if ('colorSpace' in texture && THREE.SRGBColorSpace) texture.colorSpace = THREE.SRGBColorSpace;
        texture.wrapS = THREE.ClampToEdgeWrapping;
        texture.wrapT = THREE.ClampToEdgeWrapping;
        texture.flipY = true;
        planeMat = new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide });
    } else {
        planeMat = new THREE.MeshStandardMaterial({ color: 0x5a5d65, roughness: 1.0, metalness: 0.0, side: THREE.DoubleSide });
    }

    const plane = new THREE.Mesh(planeGeo, planeMat);
    plane.position.set(dims.lengthMM / 2, dims.widthMM / 2, -0.3);
    trackSurfaceGroup.add(plane);

    const outline = new THREE.LineSegments(
        new THREE.EdgesGeometry(planeGeo),
        new THREE.LineBasicMaterial({ color: 0x00d6c8, transparent: true, opacity: 0.55 })
    );
    outline.position.copy(plane.position);
    outline.position.z = 0.2;
    trackSurfaceGroup.add(outline);
}

function animate3D() {
    requestAnimationFrame(animate3D);
    if (controls) controls.update();
    if (renderer && scene && camera) renderer.render(scene, camera);
}

function clearGeneratedMeshes() {
    clearGroupContents(trackGroup);
    clearGroupContents(trackPreviewGroup);
}

function fitCameraToScene(target = 'track') {
    if (!camera || !controls) return;
    const box = new THREE.Box3();
    let hasContent = false;

    function unionObject(obj) {
        if (!obj || !obj.children || obj.children.length === 0) return;
        const objBox = new THREE.Box3().setFromObject(obj);
        if (objBox.isEmpty()) return;
        if (!hasContent) box.copy(objBox);
        else box.union(objBox);
        hasContent = true;
    }

    if (target === 'layout') {
        unionObject(bedGroup);
        unionObject(trackGroup);
    } else {
        unionObject(trackSurfaceGroup);
        unionObject(trackPreviewGroup);
    }

    if (!hasContent) return;
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z, 150);
    if (target === 'track') {
        camera.position.set(center.x, center.y - maxDim * 0.95, center.z + maxDim * 1.05);
    } else {
        camera.position.set(center.x - maxDim * 0.16, center.y - maxDim * 0.92, center.z + maxDim * 0.72);
    }
    controls.target.set(center.x, center.y, Math.max(center.z * 0.12, 0));
    controls.update();
}

function cloneGroupWithResources(source) {
    const clone = source.clone(true);
    const sourceMeshes = [];
    const cloneMeshes = [];
    source.traverse(node => { if (node.isMesh) sourceMeshes.push(node); });
    clone.traverse(node => { if (node.isMesh) cloneMeshes.push(node); });

    for (let i = 0; i < Math.min(sourceMeshes.length, cloneMeshes.length); i++) {
        cloneMeshes[i].geometry = sourceMeshes[i].geometry.clone();
        cloneMeshes[i].material = Array.isArray(sourceMeshes[i].material)
            ? sourceMeshes[i].material.map(mat => mat.clone())
            : sourceMeshes[i].material.clone();
    }
    return clone;
}

// Einfaches "Regal"-Layout: platziert generierte Segmente lückenlos nebeneinander/zeilenweise.
// Passt eine Zeile nicht mehr auf die aktuelle Platte (Höhe überschritten), wird automatisch
// eine neue Druckplatte begonnen (nebeneinander in der Vorschau, siehe createPlateVisual).
// Kein echtes Nesting/Optimierung, nur ein zeilenweises Regal je Platte.
let layoutCursorX = 0;
let layoutCursorY = 0;
let layoutRowHeight = 0;
let layoutPlateIndex = 0;
const LAYOUT_GAP_MM = 15;

function resetLayoutCursor() {
    layoutCursorX = 0;
    layoutCursorY = 0;
    layoutRowHeight = 0;
    layoutPlateIndex = 0;
}

// Platziert mesh auf der aktuellen (oder ggf. einer neuen) Druckplatte und gibt zurück, auf
// welchem Plattenindex (0-basiert) es gelandet ist - wird für den plattenweisen Export gebraucht.
function placeInLayout(mesh, bbox) {
    const w = bbox.max.x - bbox.min.x;
    const h = bbox.max.y - bbox.min.y;

    if (layoutCursorX > 0 && layoutCursorX + w > bedWidthMM) {
        layoutCursorX = 0;
        layoutCursorY += layoutRowHeight + LAYOUT_GAP_MM;
        layoutRowHeight = 0;
    }
    if (layoutCursorY > 0 && layoutCursorY + h > bedLengthMM) {
        layoutPlateIndex++;
        layoutCursorX = 0;
        layoutCursorY = 0;
        layoutRowHeight = 0;
    }

    const plateOffsetX = layoutPlateIndex * (bedWidthMM + PLATE_GAP_MM);

    mesh.position.x += (plateOffsetX + layoutCursorX - bbox.min.x);
    mesh.position.y += (layoutCursorY - bbox.min.y);

    layoutCursorX += w + LAYOUT_GAP_MM;
    layoutRowHeight = Math.max(layoutRowHeight, h);

    return layoutPlateIndex;
}

// Curb-Optik: zweifarbige Streifen entlang der Länge + Rampe QUER zur Fahrbahn.
// Segmentteilungen verändern die Curb-Oberfläche nicht: nach dem Zusammenstecken läuft Profil,
// Rot/Weiß-Muster und Riefenphase exakt so weiter, als wäre der Curb nie geteilt worden.
const CURB_STYLE = {
    stripeLengthMM: 20,          // wird beim Generieren aus dem UI-Wert überschrieben
    colors: [0xd93a2b, 0xf0f0f0],
    baseHeightMM: 0.4,           // fester weißer Grundkörper
    rampSteps: 6,                // Querstufen bleiben unverändert: sie bilden den Curb-Winkel
    innerFlatWidthMM: 1.0,
    rumbleEnabled: true,
    surfaceCellsPerStripe: 2.5,  // halb so viele Längs-Strukturelemente wie zuvor (5 -> 2,5 je Farbblock)
    rumbleHeightMM: 0.25,
    rumbleColor: 0x555555,
    endRiseLengthMM: 28,         // nur an echten Strang-Enden: sanfter Längsanstieg/-abfall
    endRiseSlices: 10
};

// Liefert Teilstrecken mit EXAKT global ausgerichteten Grenzen für Farbe/Riefen.
// globalStartMM ist die Bogenlänge des Segmentanfangs innerhalb des Strangs.
function splitByGlobalPeriod(points, globalStartMM, periodMM) {
    const len = polylineLength(points);
    if (points.length < 2 || len < 1e-6 || periodMM <= 0) return [];
    const out = [];
    let local = 0;
    while (local < len - 1e-6) {
        const g = globalStartMM + local;
        const nextBoundary = (Math.floor(g / periodMM) + 1) * periodMM;
        const localEnd = Math.min(len, local + Math.max(nextBoundary - g, 1e-6));
        const pts = sliceByArcLength(points, local, localEnd);
        if (pts.length >= 2) out.push({ points: pts, localStart: local, localEnd });
        local = localEnd;
    }
    return out;
}

function smoothStep01(t) {
    t = Math.max(0, Math.min(1, t));
    return t * t * (3 - 2 * t);
}

// Faktor für den sanften Höhenanstieg an den BEIDEN echten Enden eines Strangs.
// An Segmentteilungen bleibt factor immer 1.0, damit die Geometrie dort unverändert weiterläuft.
function curbEndRiseFactor(globalD, pathLengthMM) {
    const L = Math.min(CURB_STYLE.endRiseLengthMM, Math.max(pathLengthMM / 2, 0));
    if (L < 0.5) return 1;
    const fromStart = smoothStep01(globalD / L);
    const fromEnd = smoothStep01((pathLengthMM - globalD) / L);
    return Math.min(fromStart, fromEnd, 1);
}

// Schneidet ein konvexes Polygon (hier jeweils EIN Dreieck aus der Triangulierung)
// anhand des Querwertes u auf [uMin,uMax]. Da nur konvexe Dreiecke geclippt
// werden, entstehen dabei keine getrennten Polygon-Inseln.
function clipConvexPolygonByURange(poly, uMin, uMax) {
    function clipHalf(input, keep, boundary) {
        if (!input.length) return [];
        const out = [];
        for (let i = 0; i < input.length; i++) {
            const a = input[i];
            const b = input[(i + 1) % input.length];
            const ain = keep(a.u), bin = keep(b.u);
            if (ain && bin) {
                out.push({ ...b });
            } else if (ain && !bin) {
                const du = b.u - a.u;
                const t = Math.abs(du) < 1e-12 ? 0 : (boundary - a.u) / du;
                out.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, u: boundary });
            } else if (!ain && bin) {
                const du = b.u - a.u;
                const t = Math.abs(du) < 1e-12 ? 0 : (boundary - a.u) / du;
                out.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, u: boundary });
                out.push({ ...b });
            }
        }
        return out;
    }

    let out = poly.map(v => ({ ...v }));
    out = clipHalf(out, u => u >= uMin - 1e-8, uMin);
    out = clipHalf(out, u => u <= uMax + 1e-8, uMax);
    return out;
}

// Bestimmt den Querabstand u eines Punktes zur tatsächlichen (ggf. gekrümmten)
// Mittellinie der Steckverbinder-Zone. Im Gegensatz zur früheren V8-Lösung wird
// NICHT nur eine einzige globale Normale für die ganze Zone verwendet. Gerade in
// Kurven hatte das die Querbänder schräg durch den Curb geschnitten und sichtbare
// Dreiecks-Artefakte erzeugt.
function curbTransverseUAtPoint(v, points, outerSign) {
    const dir = outerSign >= 0 ? 1 : -1;
    let bestD2 = Infinity;
    let bestU = 0;

    for (let i = 1; i < points.length; i++) {
        const a = points[i - 1], b = points[i];
        const dx = b.x - a.x, dy = b.y - a.y;
        const len2 = dx * dx + dy * dy;
        if (len2 < 1e-12) continue;

        let t = ((v.x - a.x) * dx + (v.y - a.y) * dy) / len2;
        t = Math.max(0, Math.min(1, t));
        const qx = a.x + dx * t, qy = a.y + dy * t;
        const ex = v.x - qx, ey = v.y - qy;
        const d2 = ex * ex + ey * ey;
        if (d2 >= bestD2) continue;

        const len = Math.sqrt(len2);
        const nx = -dy / len, ny = dx / len;
        bestD2 = d2;
        bestU = dir * (ex * nx + ey * ny);
    }

    return bestU;
}

function polygonArea2D(poly) {
    let a = 0;
    for (let i = 0; i < poly.length; i++) {
        const p = poly[i], q = poly[(i + 1) % poly.length];
        a += p.x * q.y - q.x * p.y;
    }
    return a * 0.5;
}

function cleanPolygon2D(poly) {
    const out = [];
    poly.forEach(v => {
        const prev = out[out.length - 1];
        if (!prev || Math.hypot(v.x - prev.x, v.y - prev.y) > 1e-6) out.push({ x: v.x, y: v.y, u: v.u });
    });
    if (out.length > 2 && Math.hypot(out[0].x - out[out.length - 1].x, out[0].y - out[out.length - 1].y) < 1e-6) out.pop();
    if (out.length >= 3 && polygonArea2D(out) < 0) out.reverse();
    return out;
}

// Extrudiert viele aneinandergrenzende, bereits triangulierte Teilpolygone als
// EIN gemeinsames BufferGeometry. Interne Dreieckskanten werden erkannt und
// bekommen KEINE Seitenwände. Das beseitigt die vielen überlappenden Mini-
// Extrusionen aus V8, die als Risse/Dreiecke im Curb sichtbar wurden.
function buildClosedExtrudedRegionMesh(polygons, z0, z1, material) {
    if (!polygons.length || z1 - z0 < 1e-6) return null;

    const positions = [];
    const indices = [];
    const vertexMap = new Map();
    const edgeMap = new Map();
    const Q = 100000; // 0,00001 mm Quantisierung für gemeinsame Kanten

    function pointKey(v) {
        return `${Math.round(v.x * Q)},${Math.round(v.y * Q)}`;
    }

    function vertexIndex(v, top) {
        const pk = pointKey(v);
        const key = `${pk},${top ? 1 : 0}`;
        if (vertexMap.has(key)) return vertexMap.get(key);
        const idx = positions.length / 3;
        positions.push(v.x, v.y, top ? z1 : z0);
        vertexMap.set(key, idx);
        return idx;
    }

    polygons.forEach(raw => {
        const poly = cleanPolygon2D(raw);
        if (poly.length < 3 || Math.abs(polygonArea2D(poly)) < 1e-9) return;

        // Ober- und Unterseite: die geclippten Dreiecke sind konvex, daher reicht
        // eine stabile Fächer-Triangulierung.
        const top0 = vertexIndex(poly[0], true);
        const bot0 = vertexIndex(poly[0], false);
        for (let i = 1; i < poly.length - 1; i++) {
            const top1 = vertexIndex(poly[i], true);
            const top2 = vertexIndex(poly[i + 1], true);
            const bot1 = vertexIndex(poly[i], false);
            const bot2 = vertexIndex(poly[i + 1], false);
            indices.push(top0, top1, top2);
            indices.push(bot0, bot2, bot1);
        }

        // Kanten zählen. Eine Kante, die zweimal vorkommt, liegt zwischen zwei
        // Teilpolygonen und ist intern; nur einfach vorkommende Kanten sind echte
        // Außenkontur und benötigen eine vertikale Wand.
        for (let i = 0; i < poly.length; i++) {
            const a = poly[i], b = poly[(i + 1) % poly.length];
            const ka = pointKey(a), kb = pointKey(b);
            const undirected = ka < kb ? `${ka}|${kb}` : `${kb}|${ka}`;
            const rec = edgeMap.get(undirected);
            if (rec) rec.count += 1;
            else edgeMap.set(undirected, { count: 1, a, b });
        }
    });

    edgeMap.forEach(edge => {
        if (edge.count !== 1) return;
        const ba = vertexIndex(edge.a, false);
        const bb = vertexIndex(edge.b, false);
        const ta = vertexIndex(edge.a, true);
        const tb = vertexIndex(edge.b, true);
        indices.push(ba, bb, tb);
        indices.push(ba, tb, ta);
    });

    if (indices.length < 3) return null;

    let geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setIndex(indices);
    // Nicht indiziert -> harte Kanten zwischen Deckfläche und Seitenwand, keine
    // künstlich geglätteten Dreiecksflächen in der Vorschau.
    geometry = geometry.toNonIndexed();
    geometry.computeVertexNormals();
    return new THREE.Mesh(geometry, material);
}

// Baut den oberen Curb-Anteil in einer geschützten Steckverbinder-Zone als
// eine einzige saubere Steckverbinder-Geometrie pro Quer-Höhenlage.
//
// V8 extrudierte jedes geclippte Dreieck separat. In Kurven und an den Grenzen
// der Querlagen entstanden dadurch überlappende Seitenflächen und sichtbare
// Dreiecks-Artefakte. V9 sammelt die geclippten Dreiecke je Höhenlage und baut
// daraus EIN geschlossenes Mesh. Zusätzlich wird u relativ zur echten gekrümmten
// Mittellinie bestimmt statt mit einer einzigen globalen Normale.
function buildCurbProtectedConnectorUpperMeshes(points, thickness, totalHeight, baseHeight, outerSign,
                                                 hasStartNotch, hasEndTab, sharedTab, material) {
    const meshes = [];
    if (points.length < 2) return meshes;

    const dir = outerSign >= 0 ? 1 : -1;
    const fullOffsetA = Math.min(0, dir * thickness);
    const fullOffsetB = Math.max(0, dir * thickness);

    const outline = buildSegmentOutline(
        points, fullOffsetA, fullOffsetB,
        hasStartNotch, hasEndTab, false, false, sharedTab
    );
    if (outline.length < 3) return meshes;

    const contour = outline.map(p => new THREE.Vector2(p.x, p.y));
    let triangles;
    try {
        triangles = THREE.ShapeUtils.triangulateShape(contour, []);
    } catch (err) {
        console.error('Curb-Steckverbinder konnte nicht trianguliert werden', err);
        return meshes;
    }
    if (!triangles || !triangles.length) return meshes;

    const sourceTriangles = triangles.map(face => face.map(idx => {
        const v = contour[idx];
        return {
            x: v.x,
            y: v.y,
            u: curbTransverseUAtPoint(v, points, outerSign)
        };
    }));

    const rampWidth = Math.max(thickness - CURB_STYLE.innerFlatWidthMM, thickness * 0.3);
    const stepWidth = rampWidth / CURB_STYLE.rampSteps;
    const rise = Math.max(totalHeight - baseHeight, 0);
    const stepHeight = rise / CURB_STYLE.rampSteps;
    if (stepHeight <= 1e-6) return meshes;

    // Gleiche NESTED-Layer-Struktur wie im normalen Curb: jede höhere Lage beginnt
    // weiter außen, ist aber nur stepHeight dick. So stimmt der Steckverbinder exakt
    // mit der unveränderten Curb-Querneigung überein.
    for (let step = 1; step <= CURB_STYLE.rampSteps; step++) {
        const uMin = CURB_STYLE.innerFlatWidthMM + (step - 1) * stepWidth;
        const uMax = thickness + 1e-5;
        const clippedPolygons = [];

        sourceTriangles.forEach(tri => {
            const clipped = cleanPolygon2D(clipConvexPolygonByURange(tri, uMin, uMax));
            if (clipped.length >= 3 && Math.abs(polygonArea2D(clipped)) > 1e-8) clippedPolygons.push(clipped);
        });

        const z0 = baseHeight + (step - 1) * stepHeight;
        const z1 = z0 + stepHeight;
        const mesh = buildClosedExtrudedRegionMesh(clippedPolygons, z0, z1, material);
        if (mesh) meshes.push(mesh);
    }

    return meshes;
}

// Curb-Rampenstufen. Der Winkel ist jetzt ausschließlich die QUERNEIGUNG des Curbs.
// Dovetail/Schwalbenschwanz wird hier NICHT verändert.

// V11: Baut EINE Curb-Hoehenlage mit einer geometrisch festen Steckverbindung.
// Entscheidend: Nut/Zapfen werden einmal aus der GESAMTEN Curb-Tiefe berechnet
// (sharedTab) und NICHT pro Quer-Stufe neu skaliert. Schneidet die feste Nut eine
// schmalere obere Lage nur im Inneren, wird dort ein echtes Shape-Hole angelegt.
// Dadurch durchdringt die weibliche Nut jede vorhandene Hoehenlage vollstaendig,
// auch wenn die Nut-Oeffnung an der Stirnkante in dieser Lage selbst nicht mehr
// sichtbar ist. Beim maennlichen Gegenstueck wird ein ggf. vom Stirnrand getrenntes
// Teil der festen Zapfen-Planform als zusaetzliche Insel derselben Z-Lage erzeugt;
// es ist ueber die darunterliegenden Lagen mit dem Zapfen verbunden.
function buildCurbFixedConnectorLayerMeshes(points, offsetA, offsetB, z0, z1,
                                             hasStartNotch, hasEndTab, sharedTab, material) {
    const meshes = [];
    if (!points || points.length < 2 || z1 - z0 < 1e-6) return meshes;

    const n = points.length;
    const startA = points[0], startB = points[Math.min(1, n - 1)];
    const endA = points[Math.max(0, n - 2)], endB = points[n - 1];

    function tangentNormal(a, b) {
        const dx = b.x - a.x, dy = b.y - a.y;
        const len = Math.hypot(dx, dy) || 1;
        const t = { x: dx / len, y: dy / len };
        return { t, n: { x: -t.y, y: t.x } };
    }
    const sf = tangentNormal(startA, startB);
    const ef = tangentNormal(endA, endB);

    const notch = computeNotchGeometry(
        sharedTab.tabHalf, sharedTab.tabTipHalf, sharedTab.tabLength, DOVETAIL.clearance
    );
    const notchLocal = [
        { l: 0, w: sharedTab.anchorOffset - notch.mouthHalf },
        { l: notch.depth, w: sharedTab.anchorOffset - notch.bottomHalf },
        { l: notch.depth, w: sharedTab.anchorOffset + notch.bottomHalf },
        { l: 0, w: sharedTab.anchorOffset + notch.mouthHalf }
    ];
    const tabLocal = [
        { l: 0, w: sharedTab.anchorOffset - sharedTab.tabHalf },
        { l: sharedTab.tabLength, w: sharedTab.anchorOffset - sharedTab.tabTipHalf },
        { l: sharedTab.tabLength, w: sharedTab.anchorOffset + sharedTab.tabTipHalf },
        { l: 0, w: sharedTab.anchorOffset + sharedTab.tabHalf }
    ];

    function clippedInfo(poly) {
        const q = clipConnectorPolygonToWidth(poly, offsetA, offsetB);
        const clean = [];
        q.forEach(v => {
            const prev = clean[clean.length - 1];
            if (!prev || Math.hypot(v.l - prev.l, v.w - prev.w) > 1e-7) clean.push(v);
        });
        if (clean.length > 2 && Math.hypot(clean[0].l - clean[clean.length - 1].l,
                                          clean[0].w - clean[clean.length - 1].w) < 1e-7) clean.pop();
        const mouthPts = clean.filter(v => Math.abs(v.l) < 1e-7);
        return { poly: clean, touchesMouth: mouthPts.length >= 2 };
    }

    const notchInfo = hasStartNotch ? clippedInfo(notchLocal) : { poly: [], touchesMouth: false };
    const tabInfo = hasEndTab ? clippedInfo(tabLocal) : { poly: [], touchesMouth: false };

    // Ist der Connector in dieser Lage zur Stirnkante offen, darf buildSegmentOutline
    // die Aussenkontur direkt entsprechend formen. Liegt ein Teil der Nut/Zunge in
    // dieser Lage nur im Inneren, bleibt die Aussenkontur gerade und wird unten als
    // Hole bzw. zusaetzliche Insel behandelt.
    const openStartNotch = hasStartNotch && notchInfo.touchesMouth;
    const openEndTab = hasEndTab && tabInfo.touchesMouth;

    const outline = buildSegmentOutline(
        points, offsetA, offsetB,
        openStartNotch, openEndTab,
        false, false, sharedTab
    );
    if (outline.length < 3) return meshes;

    const shape = new THREE.Shape(outline.map(v => new THREE.Vector2(v.x, v.y)));

    function localToWorld(poly, origin, frame, inward) {
        // Start-Nut: +l zeigt IN das Segment. End-Zapfen: +l zeigt AUS dem Segment.
        const sign = inward ? 1 : 1;
        return poly.map(v => {
            const lx = v.l * sign;
            return new THREE.Vector2(
                origin.x + frame.n.x * v.w + frame.t.x * lx,
                origin.y + frame.n.y * v.w + frame.t.y * lx
            );
        });
    }

    // Weibliche Seite: Falls die feste Nut in dieser Hoehenlage nicht mehr zur
    // Stirnkante offen ist, ist sie geometrisch ein INNERER Durchbruch. Genau dieser
    // Fall war bisher verloren gegangen und fuehrte zu den sichtbaren Reststegen.
    if (hasStartNotch && notchInfo.poly.length >= 3 && !notchInfo.touchesMouth) {
        const holePts = localToWorld(notchInfo.poly, points[0], sf, true);
        const hole = new THREE.Path();
        hole.moveTo(holePts[0].x, holePts[0].y);
        for (let i = 1; i < holePts.length; i++) hole.lineTo(holePts[i].x, holePts[i].y);
        hole.closePath();
        shape.holes.push(hole);
    }

    try {
        const geo = new THREE.ExtrudeGeometry(shape, { depth: z1 - z0, bevelEnabled: false, steps: 1 });
        geo.translate(0, 0, z0);
        meshes.push(new THREE.Mesh(geo, material));
    } catch (err) {
        console.error('Curb-Steckverbinder-Hauptlage uebersprungen', err);
    }

    // V16: Legacy-Zapfen-Inseln bleiben deaktiviert; der maennliche Zapfen wird weiter unten als ein zusammenhaengender Stufenkoerper erzeugt.
    // Genau diese nur vertikal an darunterliegenden Lagen anliegenden Inseln waren
    // in WebGL und im Slicer als duenne Dreiecks-/Flaechen-Artefakte sichtbar.
    // Der maennliche Schwalbenschwanz bleibt in jeder Hoehenlage nur dort aktiv,
    // wo seine Kontur die Stirnflaeche wirklich erreicht. Dadurch bleibt die
    // Geometrie manifold/slicer-freundlich, ohne Farbverlauf, Curb-Stufen,
    // weiblichen Vollschnitt oder die 0,2-mm-Passung anzutasten.

    return meshes;
}


// V16: Baut den maennlichen Curb-Schwalbenschwanz als EINEN zusammenhaengenden
// gestuften 3D-Koerper. Die Hoehe jedes Querbandes entspricht exakt der Curb-
// Hoehe an derselben Position. Anders als zuvor entstehen die oberen Teilbereiche
// nicht als voneinander getrennte Extrusionen; dadurch gibt es keine duennen
// Dreiecks-/Spitzen-Artefakte zwischen den Stufen.
function buildCurbSteppedMaleDovetailMesh(points, thickness, totalHeight, baseHeight, outerSign, sharedTab, material) {
    if (!points || points.length < 2 || !sharedTab || !sharedTab.possible) return null;

    const end = points[points.length - 1];
    const prev = points[points.length - 2];
    const dx = end.x - prev.x, dy = end.y - prev.y;
    const len = Math.hypot(dx, dy) || 1;
    const tangent = { x: dx / len, y: dy / len };
    const normal = { x: -tangent.y, y: tangent.x };

    // V17: Nur noch eine MINIMALE Ueberlappung IN das eigene Curb-Segment.
    // Die vorher groessere Einbindung hat zwar Zapfen und Curb sicher verbunden,
    // dabei aber die im Screenshot sichtbaren duennen inneren Linien/Flaechen im
    // Zapfen-Bereich erzeugt. Eine sehr kleine technische Ueberlappung reicht fuer
    // den Export weiterhin aus, ohne diese sichtbaren Artefakte zu provozieren.
    const anchorOverlapMM = 0.02;
    const tabPoly = [
        { l: -anchorOverlapMM, w: sharedTab.anchorOffset - sharedTab.tabHalf },
        { l: 0,                w: sharedTab.anchorOffset - sharedTab.tabHalf },
        { l: sharedTab.tabLength, w: sharedTab.anchorOffset - sharedTab.tabTipHalf },
        { l: sharedTab.tabLength, w: sharedTab.anchorOffset + sharedTab.tabTipHalf },
        { l: 0,                w: sharedTab.anchorOffset + sharedTab.tabHalf },
        { l: -anchorOverlapMM, w: sharedTab.anchorOffset + sharedTab.tabHalf }
    ];

    const dir = outerSign >= 0 ? 1 : -1;
    const rampWidth = Math.max(thickness - CURB_STYLE.innerFlatWidthMM, thickness * 0.3);
    const stepWidth = rampWidth / CURB_STYLE.rampSteps;
    const rise = Math.max(totalHeight - baseHeight, 0);
    const stepHeight = rise / CURB_STYLE.rampSteps;

    // Querbaender des Curb-Profils: innen nur Grundhoehe, danach pro Band eine
    // weitere Hoehenstufe. Die Baender werden in signed-w Koordinaten geclippt.
    const bands = [];
    const pushBand = (u0, u1, topZ) => {
        if (u1 - u0 <= 1e-8) return;
        const wa = dir * u0, wb = dir * u1;
        bands.push({ wMin: Math.min(wa, wb), wMax: Math.max(wa, wb), topZ });
    };
    pushBand(0, Math.min(CURB_STYLE.innerFlatWidthMM, thickness), baseHeight);
    for (let step = 1; step <= CURB_STYLE.rampSteps; step++) {
        const u0 = CURB_STYLE.innerFlatWidthMM + (step - 1) * stepWidth;
        const u1 = step === CURB_STYLE.rampSteps ? thickness : Math.min(thickness, CURB_STYLE.innerFlatWidthMM + step * stepWidth);
        pushBand(Math.max(0, u0), Math.max(0, u1), baseHeight + step * stepHeight);
    }

    function areaLW(poly) {
        let a = 0;
        for (let i = 0; i < poly.length; i++) {
            const p = poly[i], q = poly[(i + 1) % poly.length];
            a += p.l * q.w - q.l * p.w;
        }
        return a * 0.5;
    }
    function cleanLW(poly) {
        const out = [];
        poly.forEach(v => {
            const last = out[out.length - 1];
            if (!last || Math.hypot(v.l-last.l, v.w-last.w) > 1e-7) out.push({l:v.l,w:v.w});
        });
        if (out.length > 2 && Math.hypot(out[0].l-out[out.length-1].l, out[0].w-out[out.length-1].w) < 1e-7) out.pop();
        if (out.length >= 3 && areaLW(out) < 0) out.reverse();
        return out;
    }

    const pieces = [];
    bands.forEach(b => {
        const q = cleanLW(clipConnectorPolygonToWidth(tabPoly, b.wMin, b.wMax));
        if (q.length >= 3 && Math.abs(areaLW(q)) > 1e-9) pieces.push({ poly:q, topZ:b.topZ });
    });
    if (!pieces.length) return null;

    const positions = [];
    const indices = [];
    const vmap = new Map();
    const edgeMap = new Map();
    const Q = 100000;

    function world(l, w, z) {
        return {
            x: end.x + tangent.x * l + normal.x * w,
            y: end.y + tangent.y * l + normal.y * w,
            z
        };
    }
    function keyLW(v) { return `${Math.round(v.l*Q)},${Math.round(v.w*Q)}`; }
    function vid(v, z) {
        const k = `${keyLW(v)},${Math.round(z*Q)}`;
        if (vmap.has(k)) return vmap.get(k);
        const P = world(v.l, v.w, z);
        const id = positions.length/3;
        positions.push(P.x,P.y,P.z);
        vmap.set(k,id);
        return id;
    }
    function addQuad(a,b,z0,z1,reverse=false) {
        if (z1-z0 < 1e-8) return;
        const a0=vid(a,z0), b0=vid(b,z0), a1=vid(a,z1), b1=vid(b,z1);
        if (!reverse) indices.push(a0,b0,b1, a0,b1,a1);
        else indices.push(a0,b1,b0, a0,a1,b1);
    }

    // Oberseiten je Querband und Kantenregister fuer Aussenwaende/Stufenriser.
    pieces.forEach(pc => {
        const poly = pc.poly;
        const t0 = vid(poly[0], pc.topZ);
        for (let i=1;i<poly.length-1;i++) indices.push(t0, vid(poly[i],pc.topZ), vid(poly[i+1],pc.topZ));
        for (let i=0;i<poly.length;i++) {
            const a=poly[i], b=poly[(i+1)%poly.length];
            const ka=keyLW(a), kb=keyLW(b);
            const k=ka<kb?`${ka}|${kb}`:`${kb}|${ka}`;
            if (!edgeMap.has(k)) edgeMap.set(k,[]);
            edgeMap.get(k).push({a,b,topZ:pc.topZ});
        }
    });

    // Eine durchgehende Unterseite fuer den gesamten Zapfen.
    const bottom = cleanLW(tabPoly);
    const b0 = vid(bottom[0], 0);
    for (let i=1;i<bottom.length-1;i++) indices.push(b0, vid(bottom[i+1],0), vid(bottom[i],0));

    edgeMap.forEach(edges => {
        if (edges.length === 1) {
            const e=edges[0];
            addQuad(e.a,e.b,0,e.topZ,false);
        } else {
            // Gemeinsame Querband-Grenze: nur die sichtbare Stufenwand zwischen
            // den beiden unterschiedlichen Oberhoehen erzeugen, keine Doppelwand.
            const zVals = edges.map(e=>e.topZ).sort((a,b)=>a-b);
            const zLo=zVals[0], zHi=zVals[zVals.length-1];
            if (zHi-zLo > 1e-7) {
                const e=edges[0];
                addQuad(e.a,e.b,zLo,zHi,false);
            }
        }
    });

    if (!indices.length) return null;
    let geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions,3));
    geo.setIndex(indices);
    geo = geo.toNonIndexed();
    geo.computeVertexNormals();
    return new THREE.Mesh(geo, material);
}

function buildCurbRampMeshes(localChunk, thickness, totalHeight, baseHeight, outerSign,
                             globalStartMM, pathLengthMM, hasStartNotch, hasEndTab,
                             sharedTab) {
    const meshes = [];
    const dir = outerSign >= 0 ? 1 : -1;
    const rampWidth = Math.max(thickness - CURB_STYLE.innerFlatWidthMM, thickness * 0.3);
    const stepWidth = rampWidth / CURB_STYLE.rampSteps;

    // Die Querneigung ergibt sich ausschließlich aus Höhe und Tiefe des Curbs.
    // Der weiße Grundkörper bleibt immer 0,4 mm hoch; darüber wird die eingestellte
    // Gesamthöhe gleichmäßig auf die vorhandenen Quer-Stufen verteilt.
    const rise = Math.max(totalHeight - baseHeight, 0);
    const stepHeight = rise / CURB_STYLE.rampSteps;
    const chunkLen = polylineLength(localChunk);

    const surfaceCellMM = CURB_STYLE.stripeLengthMM / CURB_STYLE.surfaceCellsPerStripe;

    // WICHTIG FUER DIE STECKVERBINDUNG:
    // Farbe und Oberflaechenraster duerfen die Geometrie der Nut/Zunge NICHT begrenzen.
    // Besonders die Nut ragt um ihre komplette Tiefe in das Bauteil hinein. Wenn ein Farb-
    // oder Strukturblock kuerzer als diese Tiefe ist, wuerde ein normales Aufteilen die Nut
    // mitten im Schwalbenschwanz abschneiden. Deshalb werden an Segmentgrenzen geschuetzte
    // Laengszonen erzeugt, die mindestens die komplette Steckverbindung enthalten. Erst
    // ausserhalb dieser Zonen darf wieder nach Farbe/Struktur gesplittet werden.
    const notchGeom = computeNotchGeometry(
        sharedTab.tabHalf, sharedTab.tabTipHalf, sharedTab.tabLength, DOVETAIL.clearance
    );
    const connectorSafeMM = Math.max(notchGeom.depth, sharedTab.tabLength) + 0.6;
    const startProtectedMM = hasStartNotch ? Math.min(connectorSafeMM, chunkLen) : 0;
    const endProtectedMM = hasEndTab ? Math.min(connectorSafeMM, Math.max(chunkLen - startProtectedMM, 0)) : 0;

    const stripePieces = [];

    function pushStripeAlignedZone(zonePoints, zoneLocalStart, zoneGlobalStart, opts = {}) {
        const zoneLen = polylineLength(zonePoints);
        if (!zonePoints || zonePoints.length < 2 || zoneLen <= 0.05) return;
        let pieces = splitByGlobalPeriod(zonePoints, zoneGlobalStart, CURB_STYLE.stripeLengthMM);
        if (!pieces || pieces.length === 0) {
            pieces = [{ points: zonePoints, localStart: 0, localEnd: zoneLen }];
        }
        pieces.forEach(mp => {
            stripePieces.push({
                points: mp.points,
                localStart: zoneLocalStart + mp.localStart,
                localEnd: zoneLocalStart + mp.localEnd,
                connectorStart: !!opts.connectorStart && mp.localStart < 0.05,
                connectorEnd: !!opts.connectorEnd && (zoneLen - mp.localEnd) < 0.05,
                inProtectedZone: !!opts.inProtectedZone
            });
        });
    }

    // Geschuetzte Nut-/Zapfen-Zonen bleiben geometrisch sicher, die Farbwechsel werden
    // darin aber trotzdem auf das globale Farbraster ausgerichtet. So bleiben Rot/Weiss-
    // Streifen auch am Schwalbenschwanz gleich breit.
    if (startProtectedMM > 0.05) {
        pushStripeAlignedZone(
            sliceByArcLength(localChunk, 0, startProtectedMM),
            0,
            globalStartMM,
            { connectorStart: hasStartNotch, inProtectedZone: true }
        );
    }

    const middleStart = startProtectedMM;
    const middleEnd = Math.max(middleStart, chunkLen - endProtectedMM);
    if (middleEnd - middleStart > 0.05) {
        pushStripeAlignedZone(
            sliceByArcLength(localChunk, middleStart, middleEnd),
            middleStart,
            globalStartMM + middleStart,
            { inProtectedZone: false }
        );
    }

    if (endProtectedMM > 0.05) {
        const z0 = Math.max(startProtectedMM, chunkLen - endProtectedMM);
        pushStripeAlignedZone(
            sliceByArcLength(localChunk, z0, chunkLen),
            z0,
            globalStartMM + z0,
            { connectorEnd: hasEndTab, inProtectedZone: true }
        );
    }

    if (stripePieces.length === 0 && chunkLen > 0.05) {
        stripePieces.push({
            points: localChunk, localStart: 0, localEnd: chunkLen,
            connectorStart: hasStartNotch, connectorEnd: hasEndTab,
            inProtectedZone: hasStartNotch || hasEndTab
        });
    }

    stripePieces.forEach(piece => {
        const stripeRefMM = globalStartMM + (piece.localStart + piece.localEnd) / 2;
        const stripeIndex = Math.floor(stripeRefMM / CURB_STYLE.stripeLengthMM);
        const color = CURB_STYLE.colors[((stripeIndex % CURB_STYLE.colors.length) + CURB_STYLE.colors.length) % CURB_STYLE.colors.length];
        const material = new THREE.MeshStandardMaterial({ color, roughness: 0.8, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });

        // Längsstruktur: exakt halb so dicht wie die frühere 5-Felder-pro-Farbblock-Teilung.
        // Die Quer-Stufen (rampSteps), welche die Curb-Neigung bilden, bleiben davon unberührt.
        const smallPieces = (CURB_STYLE.rumbleEnabled && !piece.inProtectedZone)
            ? splitByGlobalPeriod(piece.points, globalStartMM + piece.localStart, surfaceCellMM)
            : [{ points: piece.points, localStart: 0, localEnd: polylineLength(piece.points) }];

        smallPieces.forEach(rp => {
            if (rp.points.length < 2) return;
            const rpGlobalStart = globalStartMM + piece.localStart + rp.localStart;
            const rpGlobalEnd = globalStartMM + piece.localStart + rp.localEnd;
            const rpGlobalMid = (rpGlobalStart + rpGlobalEnd) / 2;
            const cellIndex = Math.floor(rpGlobalMid / surfaceCellMM);
            const isRidge = CURB_STYLE.rumbleEnabled && (cellIndex % 2 === 0);
            const riseFactor = curbEndRiseFactor(rpGlobalMid, pathLengthMM);

            // Nur das Teilstück, das direkt an einer Segmentteilung liegt, trägt Nut/Zapfen.
            // Dadurch wird pro Unterbrechung genau EIN gemeinsamer Schwalbenschwanz erzeugt.
            const pieceTouchesStart = !!piece.connectorStart;
            const pieceTouchesEnd = !!piece.connectorEnd;

            // V13: beide Seiten folgen jetzt exakt derselben Curb-Stufenlogik.
            // Die weibliche Nut bleibt in JEDER vorhandenen Curb-Hoehenlage aktiv und
            // durchdringt damit alle Ebenen vollstaendig. Der maennliche Zapfen wird in
            // denselben Hoehenlagen mit derselben festen, aus der KOMPLETTEN Curb-Tiefe
            // skalierten 2D-Schwalbenschwanzkontur aufgebaut. Dadurch bekommt auch das
            // Positivteil die Curb-Stufen. Beim Zusammenstecken fuellen diese Stufen die
            // entsprechenden Ausschnitte des Negativteils; einzig der umlaufende 0,2-mm-
            // Versatz der Nut bleibt als Montage-Spiel bestehen.
            if (piece.connectorStart || piece.connectorEnd) {
                for (let step = 1; step <= CURB_STYLE.rampSteps; step++) {
                    const innerBoundary = dir * (CURB_STYLE.innerFlatWidthMM + (step - 1) * stepWidth);
                    const outerBoundary = dir * thickness;
                    const offsetA = Math.min(innerBoundary, outerBoundary);
                    const offsetB = Math.max(innerBoundary, outerBoundary);
                    const z0 = baseHeight + (step - 1) * stepHeight;
                    const z1 = z0 + Math.max(stepHeight, 0.03);

                    const layerMeshes = buildCurbFixedConnectorLayerMeshes(
                        rp.points, offsetA, offsetB, z0, z1,
                        pieceTouchesStart, false,
                        sharedTab, material
                    );
                    layerMeshes.forEach(m => meshes.push(m));
                }
                if (pieceTouchesEnd) {
                    const maleMesh = buildCurbSteppedMaleDovetailMesh(
                        rp.points, thickness, totalHeight, baseHeight, outerSign,
                        sharedTab, material
                    );
                    if (maleMesh) meshes.push(maleMesh);
                }
                return;
            }

            // Außerhalb der Steckverbinder-Zonen bleibt die vorhandene Oberflächenstruktur
            // unverändert. Dort gibt es bewusst keine Nut/Zapfen-Geometrie.
            for (let step = 1; step <= CURB_STYLE.rampSteps; step++) {
                const innerBoundary = dir * (CURB_STYLE.innerFlatWidthMM + (step - 1) * stepWidth);
                const outerBoundary = dir * thickness;
                const offsetA = Math.min(innerBoundary, outerBoundary);
                const offsetB = Math.max(innerBoundary, outerBoundary);
                const zOffset = baseHeight + (step - 1) * stepHeight * riseFactor;
                // V14: Die eigentliche Rampenlage endet exakt an ihrer Sollhoehe. In den
                // aelteren Versionen wurde die Riefenhoehe auf die komplette, nach aussen
                // verschachtelte Lage addiert. Dadurch ueberlappten sich benachbarte Z-Lagen
                // grossflaechig. In der 3D-Vorschau sah das meist harmlos aus, im Slicer
                // entstanden daraus jedoch Selbstueberschneidungen, Loecher und Reparatur-
                // Artefakte. Die Riefe wird deshalb unten als eigener AUFLAGE-Streifen nur
                // auf der tatsaechlich sichtbaren Treppenflaeche erzeugt.
                const h = Math.max(stepHeight * riseFactor, 0.03);

                const roundStart = !hasStartNotch && rpGlobalStart < 0.05;
                const roundEnd = !hasEndTab && (pathLengthMM - rpGlobalEnd) < 0.05;
                const outline = buildSegmentOutline(
                    rp.points, offsetA, offsetB, false, false,
                    roundStart, roundEnd, sharedTab
                );
                if (outline.length < 3) continue;
                const shape = new THREE.Shape(outline.map(p => new THREE.Vector2(p.x, p.y)));
                try {
                    const geometry = new THREE.ExtrudeGeometry(shape, { depth: h, bevelEnabled: false, steps: 1 });
                    geometry.translate(0, 0, zOffset);
                    meshes.push(new THREE.Mesh(geometry, material));
                } catch (err) {
                    console.error('Curb-Rampenstück übersprungen (ungültige Geometrie)', err);
                }

                // Riefen nur auf der sichtbaren horizontalen "Trittstufe" dieser Lage.
                // Damit gibt es keine Volumen-Ueberlappung mit der darueberliegenden Lage.
                if (isRidge && CURB_STYLE.rumbleHeightMM > 0.001) {
                    const nextInner = (step < CURB_STYLE.rampSteps)
                        ? dir * (CURB_STYLE.innerFlatWidthMM + step * stepWidth)
                        : outerBoundary;
                    const shelfA = Math.min(innerBoundary, nextInner);
                    const shelfB = Math.max(innerBoundary, nextInner);
                    if (shelfB - shelfA > 0.01) {
                        const ridgeOutline = buildSegmentOutline(
                            rp.points, shelfA, shelfB, false, false,
                            roundStart, roundEnd, sharedTab
                        );
                        if (ridgeOutline.length >= 3) {
                            const ridgeShape = new THREE.Shape(ridgeOutline.map(p => new THREE.Vector2(p.x, p.y)));
                            try {
                                const ridgeGeo = new THREE.ExtrudeGeometry(ridgeShape, {
                                    depth: Math.max(CURB_STYLE.rumbleHeightMM * riseFactor, 0.01),
                                    bevelEnabled: false,
                                    steps: 1
                                });
                                ridgeGeo.translate(0, 0, zOffset + h);
                                meshes.push(new THREE.Mesh(ridgeGeo, material));
                            } catch (err) {
                                console.error('Curb-Riefenauflage übersprungen (ungültige Geometrie)', err);
                            }
                        }
                    }
                }
            }
        });
    });

    return meshes;
}

// Baut die gestufte, sich nach oben verjüngende Bande (Beton-Leitwand-Optik): mehrere
// symmetrisch zentrierte Stufen, die von der vollen Breite unten zur schmaleren Oberkante oben
// abnehmen. Jede Stufe trägt ihre eigene Zunge/Nut, dadurch ist die Steckverbindung wie beim
// Curb über die gesamte Höhe durchgängig, nicht nur an der Basis.

// Bande: Nut und Zapfen werden NICHT über die komplette Bauteilhöhe durchgezogen (anders als
// beim Curb), sondern auf feste Werte ab der Unterkante (Z=0) begrenzt: die Nut (Aussparung,
// hasStartNotch) auf BANDE_DOVETAIL_Z.notchHeightMM, der Zapfen (Vorsprung, hasEndTab) auf
// BANDE_DOVETAIL_Z.tabHeightMM - unabhängig von der Gesamthöhe der Bande.
const BANDE_DOVETAIL_Z = {
    notchHeightMM: 5, // Nut schneidet nur bis zu dieser Höhe ins Bauteil
    tabHeightMM: 4     // Zapfen steht nur bis zu dieser Höhe außen an
};

// Teilt einen Höhenbereich [z0,z1) an den beiden Schwalbenschwanz-Schwellen (tabHeightMM,
// notchHeightMM) auf und gibt für jeden entstehenden Teilbereich zurück, ob dort Nut bzw. Zapfen
// aktiv sein sollen. So kann eine Bande-Stufe, die eine der Schwellen überschreitet, in mehrere
// Extrusionen mit jeweils passendem Nut/Zapfen-Zustand zerlegt werden.
function splitZRangeByDovetailLimits(z0, z1, hasStartNotch, hasEndTab) {
    const cuts = new Set([z0, z1]);
    if (BANDE_DOVETAIL_Z.tabHeightMM > z0 && BANDE_DOVETAIL_Z.tabHeightMM < z1) cuts.add(BANDE_DOVETAIL_Z.tabHeightMM);
    if (BANDE_DOVETAIL_Z.notchHeightMM > z0 && BANDE_DOVETAIL_Z.notchHeightMM < z1) cuts.add(BANDE_DOVETAIL_Z.notchHeightMM);
    const points = [...cuts].sort((a, b) => a - b);

    const segments = [];
    for (let i = 0; i < points.length - 1; i++) {
        const zFrom = points[i], zTo = points[i + 1];
        if (zTo - zFrom < 1e-6) continue;
        const mid = (zFrom + zTo) / 2;
        segments.push({
            zFrom, zTo,
            notch: hasStartNotch && mid <= BANDE_DOVETAIL_Z.notchHeightMM,
            tab: hasEndTab && mid <= BANDE_DOVETAIL_Z.tabHeightMM
        });
    }
    return segments;
}

function bandeWidthFactorAt(h) {
    const kf = BANDE_STYLE.profileKeyframes;
    h = Math.max(0, Math.min(1, h));
    for (let i = 0; i < kf.length - 1; i++) {
        const a = kf[i], b = kf[i + 1];
        if (h <= b.h + 1e-9) {
            const t = Math.abs(b.h - a.h) < 1e-9 ? 0 : (h - a.h) / (b.h - a.h);
            return a.w + (b.w - a.w) * Math.max(0, Math.min(1, t));
        }
    }
    return kf[kf.length - 1].w;
}

// Verbindet zwei Umrisse auf unterschiedlichen Z-Höhen. Dadurch wird die schräge
// Leitwandfläche wirklich planar/glatt statt als Treppe aus mehreren Extrusionen aufgebaut.
function buildLoftSectionMesh(outline0, outline1, z0, z1, material) {
    if (!outline0 || !outline1 || outline0.length < 3 || outline0.length !== outline1.length) return null;

    const poly0 = outline0.map(p => ({ x: p.x, y: p.y }));
    const poly1 = outline1.map(p => ({ x: p.x, y: p.y }));
    let area = 0;
    for (let i = 0; i < poly0.length; i++) {
        const a = poly0[i], b = poly0[(i + 1) % poly0.length];
        area += a.x * b.y - b.x * a.y;
    }
    if (area < 0) {
        poly0.reverse();
        poly1.reverse();
    }

    const n = poly0.length;
    const positions = [];
    for (const p of poly0) positions.push(p.x, p.y, z0);
    for (const p of poly1) positions.push(p.x, p.y, z1);

    const indices = [];
    // Seitenflächen: gleiche Polygon-Topologie an beiden Höhen -> direkte Zuordnung.
    for (let i = 0; i < n; i++) {
        const j = (i + 1) % n;
        indices.push(i, j, n + j, i, n + j, n + i);
    }

    // Deckel/Boden triangulieren. ShapeUtils arbeitet mit der XY-Kontur.
    const contour = poly0.map(p => new THREE.Vector2(p.x, p.y));
    const tris = THREE.ShapeUtils.triangulateShape(contour, []);
    tris.forEach(t => {
        indices.push(t[2], t[1], t[0]);
        indices.push(n + t[0], n + t[1], n + t[2]);
    });

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    return new THREE.Mesh(geometry, material);
}

function buildBandeMeshes(localChunk, thickness, totalHeight, outerSign, hasStartNotch, hasEndTab, roundStart, roundEnd, color) {
    const meshes = [];
    const material = new THREE.MeshStandardMaterial({ color, metalness: 0.05, roughness: 0.9, flatShading: false, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
    const side = outerSign >= 0 ? 1 : -1;
    const centerOffset = side * thickness / 2; // Skizzenlinie = innere Kante, wie beim Curb

    const tabSize = computeTabSize(thickness / 2);
    const sharedTab = {
        tabHalf: tabSize.tabHalf,
        tabTipHalf: tabSize.tabTipHalf,
        tabLength: tabSize.tabLength,
        possible: tabSize.possible,
        anchorOffset: centerOffset
    };

    // Profil-Knicke + Schwalbenschwanz-Höhengrenzen bilden echte Abschnittsgrenzen.
    // Innerhalb eines Abschnitts ändert sich die Breite linear -> eine glatte Ebene.
    const cuts = new Set([0, totalHeight]);
    BANDE_STYLE.profileKeyframes.forEach(k => cuts.add(Math.max(0, Math.min(totalHeight, k.h * totalHeight))));
    [BANDE_DOVETAIL_Z.tabHeightMM, BANDE_DOVETAIL_Z.notchHeightMM].forEach(z => {
        if (z > 0 && z < totalHeight) cuts.add(z);
    });
    const zs = [...cuts].sort((a,b) => a-b);

    for (let i = 0; i < zs.length - 1; i++) {
        const z0 = zs[i], z1 = zs[i+1];
        if (z1 - z0 < 1e-6) continue;
        const mid = (z0 + z1) / 2;
        const notch = hasStartNotch && mid <= BANDE_DOVETAIL_Z.notchHeightMM;
        const tab = hasEndTab && mid <= BANDE_DOVETAIL_Z.tabHeightMM;

        const hw0 = thickness * bandeWidthFactorAt(z0 / totalHeight) / 2;
        const hw1 = thickness * bandeWidthFactorAt(z1 / totalHeight) / 2;
        const offA0 = centerOffset - hw0, offB0 = centerOffset + hw0;
        const offA1 = centerOffset - hw1, offB1 = centerOffset + hw1;
        const o0 = buildSegmentOutline(localChunk, offA0, offB0, notch, tab, roundStart, roundEnd, sharedTab);
        const o1 = buildSegmentOutline(localChunk, offA1, offB1, notch, tab, roundStart, roundEnd, sharedTab);

        let mesh = buildLoftSectionMesh(o0, o1, z0, z1, material);
        if (!mesh) {
            // Sicherheits-Fallback nur für Sonderfälle mit unterschiedlicher Polygon-Topologie.
            const hw = (hw0 + hw1) / 2;
            const outline = buildSegmentOutline(localChunk, centerOffset-hw, centerOffset+hw, notch, tab, roundStart, roundEnd, sharedTab);
            if (outline.length >= 3) {
                const shape = new THREE.Shape(outline.map(p => new THREE.Vector2(p.x, p.y)));
                const geometry = new THREE.ExtrudeGeometry(shape, { depth: z1-z0, bevelEnabled:false, steps:1 });
                geometry.translate(0,0,z0);
                mesh = new THREE.Mesh(geometry, material);
            }
        }
        if (mesh) meshes.push(mesh);
    }
    return meshes;
}

// --- 9. 3D-MODELL GENERIEREN ---
function generate3DModel() {
    if (typeof THREE === 'undefined' || !trackGroup) {
        alert('Three.js konnte nicht geladen werden (CDN nicht erreichbar?).');
        return;
    }

    const lengthInput = parseFloat((document.getElementById('trackLength').value || '').toString().replace(',', '.'));
    const widthInput = parseFloat((document.getElementById('trackWidth').value || '').toString().replace(',', '.'));

    if (!lengthInput || !widthInput || lengthInput <= 0 || widthInput <= 0) {
        alert('Bitte gültige Streckenmaße (Länge/Breite in cm) angeben.');
        return;
    }
    if (paths.length === 0) {
        alert('Bitte zuerst mindestens einen Strang skizzieren und mit Doppelklick/Enter abschließen.');
        return;
    }

    // Druckbett-Maße sind Pflicht: legen fest, wie lang ein Segment maximal sein darf und wie
    // die generierten Teile auf (ggf. mehrere) Druckplatten verteilt werden.
    const bedWidthInput = parseFloat((document.getElementById('bedWidth').value || '').toString().replace(',', '.'));
    const bedLengthInput = parseFloat((document.getElementById('bedLength').value || '').toString().replace(',', '.'));
    if (!bedWidthInput || !bedLengthInput || bedWidthInput < 20 || bedLengthInput < 20) {
        alert('Bitte gültige Druckbett-Maße (Breite X / Tiefe Y, mind. 20mm) im Tab "Bauteil" angeben - das ist Pflicht, damit die Segmente richtig zugeschnitten werden können.');
        return;
    }
    bedWidthMM = bedWidthInput;
    bedLengthMM = bedLengthInput;

    trackLengthMM = lengthInput * 10;
    trackWidthMM = widthInput * 10;

    const elementTypeValue = document.getElementById('elementType').value;
    const profile = { ...ELEMENT_PROFILES[elementTypeValue] };

    // Curb: Höhe/Tiefe kommen aus den eigenen Eingabefeldern (überschreiben den Profil-Default),
    // damit sie an die eigene Bodenfreiheit/das eigene Fahrzeug angepasst werden können.
    let curbPatternLengthMM = CURB_STYLE.stripeLengthMM;
    if (elementTypeValue === 'curb') {
        const curbHeightInput = parseFloat((document.getElementById('curbHeight').value || '').toString().replace(',', '.'));
        const curbDepthInput = parseFloat((document.getElementById('curbDepth').value || '').toString().replace(',', '.'));
        const curbPatternInput = parseFloat((document.getElementById('curbPatternLength')?.value || '').toString().replace(',', '.'));
        if (curbHeightInput > 0) profile.height = curbHeightInput;
        if (curbDepthInput > 0) profile.thickness = curbDepthInput;
        if (curbPatternInput >= 5) curbPatternLengthMM = curbPatternInput;
        CURB_STYLE.stripeLengthMM = curbPatternLengthMM;
    } else if (elementTypeValue === 'bande') {
        const bandeHeightInput = parseFloat((document.getElementById('bandeHeight').value || '').toString().replace(',', '.'));
        const bandeThicknessInput = parseFloat((document.getElementById('bandeThickness').value || '').toString().replace(',', '.'));
        if (bandeHeightInput > 0) profile.height = bandeHeightInput;
        if (bandeThicknessInput > 0) profile.thickness = bandeThicknessInput;
    }

    clearGeneratedMeshes();
    generatedSegments = [];
    resetLayoutCursor();

    let segmentCounter = 0;
    

    paths.forEach((path, pathIndex) => {
        const pathPoints = path.points;
        if (pathPoints.length < 2) return;
        const chunks = splitPathIntoSegments(pathPoints);
        const isCurb = elementTypeValue === 'curb';
        const outerSign = path.outerSign >= 0 ? -1 : 1; // Y-Achse wird beim Export gespiegelt; Vorzeichen kompensiert die sichtbare Außenseite
        const pathLengthMM = chunks.reduce((sum, c) => sum + polylineLength(c), 0);
        let pathArcOffsetMM = 0;

        chunks.forEach((chunk, chunkIndex) => {
            const hasStartNotch = chunkIndex > 0;
            const hasEndTab = chunkIndex < chunks.length - 1;
            // Beide Element-Typen bekommen an echten Strang-Enden (keine Segmentgrenze) eine
            // abgerundete Kappe statt eines geraden Abschlusses.
            const roundStart = !hasStartNotch;
            const roundEnd = !hasEndTab;

            // Auf lokale Koordinaten (Segment-Start = Ursprung) umrechnen. Das sorgt dafür,
            // dass jedes Segment unabhängig von seiner Position auf der Gesamtstrecke nahe
            // (0,0) liegt - Voraussetzung für eine saubere, platzsparende Vorschau/Export.
            const localOrigin = chunk[0];
            const localChunk = chunk.map(p => ({ x: p.x - localOrigin.x, y: p.y - localOrigin.y }));

            // Alle Teile eines Segments (mehrere gestapelte Stufen bei Bande, Basis + Curb-
            // Rampenstufen beim Curb) werden in einer Gruppe zusammengefasst - so bleibt es
            // EIN Druckteil / EINE STL-Datei.
            const partGroup = new THREE.Group();

            if (isCurb) {
                const bodyHeight = CURB_STYLE.baseHeightMM;
                // Curb: die Skizzenlinie IST die Fahrbahnkante (innen, Offset 0) - das Material
                // liegt komplett auf der outerSign-Seite davon.
                const offsetA = Math.min(0, outerSign * profile.thickness);
                const offsetB = Math.max(0, outerSign * profile.thickness);

                // EINE gemeinsame Zunge, abgeleitet von der VOLLEN Bauteilbreite der untersten
                // (breitesten) Ebene - der Basis - und mittig darauf zentriert. Sie wird
                // unverändert an die Neigungs-Rampe an jeder Segmentgrenze weitergegeben (siehe
                // buildCurbRampMeshes -> buildJointSlopeZone), wo sie mit EINER Zungengröße durch
                // die komplette (dort auf volle Basisbreite laufende) Bauteilhöhe durchdringt.
                const tabSize = computeTabSize((offsetB - offsetA) / 2);
                const sharedTab = {
                    tabHalf: tabSize.tabHalf,
                    tabTipHalf: tabSize.tabTipHalf,
                    tabLength: tabSize.tabLength,
                    possible: tabSize.possible,
                    anchorOffset: (offsetA + offsetB) / 2,
                    fixedCenter: true
                };

                // Die flache Basis selbst trägt KEINE eigene Nut/Zapfen mehr (unconditional false)
                // - die Steckverbindung sitzt jetzt ausschließlich in der Neigungs-Rampe, die
                // ohnehin bei Z=0 beginnt und diesen Bereich mit abdeckt (redundante, doppelt
                // geschnittene Geometrie an derselben Stelle wird so vermieden).
                let outline;
                try {
                    outline = buildSegmentOutline(localChunk, offsetA, offsetB, hasStartNotch, false, roundStart, roundEnd, sharedTab);
                } catch (err) {
                    console.error('Fehler beim Erzeugen des Umrisses', err);
                    return;
                }
                if (outline.length >= 3) {
                    const shape = new THREE.Shape(outline.map(p => new THREE.Vector2(p.x, p.y)));
                    try {
                        // Bewusst KEINE Rotation: ExtrudeGeometry liefert die Kontur bereits in
                        // der X-Y-Ebene und extrudiert die Höhe entlang Z - exakt die gewünschte
                        // "flach auf dem Druckbett liegend" Orientierung für den STL-Export.
                        const geometry = new THREE.ExtrudeGeometry(shape, { depth: bodyHeight, bevelEnabled: false, steps: 1 });
                        const material = new THREE.MeshStandardMaterial({ color: profile.color, metalness: 0.1, roughness: 0.85, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
                        partGroup.add(new THREE.Mesh(geometry, material));
                    } catch (err) {
                        console.error('Ungültige Segment-Geometrie (Selbstüberschneidung?) - übersprungen', err);
                    }
                }

                const rampMeshes = buildCurbRampMeshes(localChunk, profile.thickness, profile.height, bodyHeight, outerSign, pathArcOffsetMM, pathLengthMM, hasStartNotch, hasEndTab, sharedTab);
                rampMeshes.forEach(m => partGroup.add(m));
            } else {
                // Bande: gleiche Grundgeometrie, aber mit echter glatter Schräge. Die Skizzenlinie
                // ist wie beim Curb die innere Kante; outerSign bestimmt innen/außen.
                const bandeMeshes = buildBandeMeshes(localChunk, profile.thickness, profile.height, outerSign, hasStartNotch, hasEndTab, roundStart, roundEnd, profile.color);
                bandeMeshes.forEach(m => partGroup.add(m));
            }

            pathArcOffsetMM += polylineLength(chunk);
            if (partGroup.children.length === 0) return;

            const previewWrapper = new THREE.Group();
            previewWrapper.position.set(localOrigin.x, localOrigin.y, 0);
            previewWrapper.add(partGroup);
            trackPreviewGroup.add(previewWrapper);

            const exportGroup = cloneGroupWithResources(partGroup);
            const bbox = new THREE.Box3().setFromObject(exportGroup);
            const bboxX = bbox.max.x - bbox.min.x;
            const bboxY = bbox.max.y - bbox.min.y;
            const fitsBed = bboxX <= bedWidthMM && bboxY <= bedLengthMM;

            const plateIndex = placeInLayout(exportGroup, bbox);
            trackGroup.add(exportGroup);

            const lengthMM = polylineLength(chunk);

            segmentCounter++;
            generatedSegments.push({
                id: segmentCounter,
                pathIndex,
                chunkIndex,
                type: elementTypeValue,
                lengthMM,
                mesh: exportGroup,
                previewMesh: previewWrapper,
                fitsBed,
                plateIndex
            });
        });
    });

    rebuildBedVisuals(layoutPlateIndex + 1);
    updatePartsList();
    const exportBtn = document.getElementById('exportStl');
    if (exportBtn) exportBtn.disabled = generatedSegments.length === 0;
    const export3mfBtn = document.getElementById('export3mf');
    if (export3mfBtn) export3mfBtn.disabled = generatedSegments.length === 0;

    if (generatedSegments.length === 0) {
        alert('Es konnten keine Segmente erzeugt werden. Sind die skizzierten Stränge lang genug (mind. 2 Punkte, spürbarer Abstand)?');
        return;
    }

    generatedPreview = buildGeneratedPreviewData(elementTypeValue, profile.thickness);
    redraw2DCanvas();
    updateTrackPreviewSurface();
    if (viewportMode !== '2d') {
        fitCameraToScene(viewportMode === 'layout3d' ? 'layout' : 'track');
    }
    if (window.matchMedia && window.matchMedia('(max-width: 900px)').matches) {
        setMobileSection('preview');
    }
}

// --- 10. STÜCKLISTE ---
function updatePartsList() {
    const container = document.getElementById('partList');
    if (!container) return;

    if (generatedSegments.length === 0) {
        container.textContent = 'Keine Segmente generiert';
        return;
    }

    let html = '<table><tr><th>#</th><th>Typ</th><th>Länge</th><th>Platte</th><th>Bett</th></tr>';
    generatedSegments.forEach(seg => {
        const typeLabel = ELEMENT_PROFILES[seg.type] ? ELEMENT_PROFILES[seg.type].label : seg.type;
        html += `<tr>
            <td>${seg.id}</td>
            <td>${typeLabel}</td>
            <td>${seg.lengthMM.toFixed(0)} mm</td>
            <td>${(seg.plateIndex ?? 0) + 1}</td>
            <td style="color:${seg.fitsBed ? '#4caf50' : '#ff5555'}">${seg.fitsBed ? 'OK' : '⚠'}</td>
        </tr>`;
    });
    html += '</table>';
    const plateCount = Math.max(...generatedSegments.map(s => (s.plateIndex ?? 0))) + 1;
    html += `<div style="margin-top:5px;color:#999;">Gesamt: ${generatedSegments.length} Teile auf ${plateCount} Druckplatte${plateCount > 1 ? 'n' : ''}</div>`;
    container.innerHTML = html;
}

// --- 11. STL-EXPORT (ZIP) ---
// Gruppiert die generierten Segmente nach Druckplatte (plateIndex, 0-basiert). Map-Reihenfolge
// entspricht der Einfüge-Reihenfolge, wird aber unten trotzdem sortiert durchlaufen.
function groupSegmentsByPlate() {
    const groups = new Map();
    generatedSegments.forEach(seg => {
        const p = seg.plateIndex ?? 0;
        if (!groups.has(p)) groups.set(p, []);
        groups.get(p).push(seg);
    });
    return groups;
}

// Baut ein ZIP (als Uint8Array) mit den STL-Dateien EINER Druckplatte.
async function buildPlateSTLZipBytes(segments) {
    const exporter = new THREE.STLExporter();
    const zip = new JSZip();

    segments.forEach(seg => {
        const rawResult = exporter.parse(seg.mesh, { binary: true });
        // Der three.js STLExporter liefert im Binary-Modus ein DataView zurück -
        // JSZip erkennt DataView nicht als gültigen Datentyp, deshalb hier explizit
        // in ein Uint8Array (auf denselben Bytes) umwandeln.
        const stlData = (rawResult instanceof DataView)
            ? new Uint8Array(rawResult.buffer, rawResult.byteOffset, rawResult.byteLength)
            : rawResult;
        const filename = `segment_${String(seg.id).padStart(2, '0')}_${seg.type}.stl`;
        zip.file(filename, stlData);
    });

    return zip.generateAsync({ type: 'uint8array' });
}

async function exportAllSTL() {
    if (generatedSegments.length === 0) return;
    if (typeof THREE.STLExporter === 'undefined' || typeof JSZip === 'undefined') {
        alert('STL-Exporter oder JSZip konnte nicht geladen werden (CDN nicht erreichbar?).');
        return;
    }

    const exportBtn = document.getElementById('exportStl');
    if (exportBtn) exportBtn.disabled = true;

    try {
        const groups = groupSegmentsByPlate();
        const plateIndices = [...groups.keys()].sort((a, b) => a - b);

        if (plateIndices.length <= 1) {
            // Nur eine Platte -> wie bisher direkt ein ZIP mit allen STL-Dateien.
            const bytes = await buildPlateSTLZipBytes(generatedSegments);
            downloadBlob(new Blob([bytes]), 'rc-track-segmente.zip');
        } else {
            // Mehrere Platten -> je Platte ein eigenes ZIP, alle gebündelt in einem äußeren ZIP
            // (ein einzelner Download-Klick, aber pro Druckplatte eine eigene, in sich
            // vollständige Datei zum separaten Slicen/Drucken).
            const outerZip = new JSZip();
            for (const p of plateIndices) {
                const bytes = await buildPlateSTLZipBytes(groups.get(p));
                outerZip.file(`Druckplatte_${p + 1}.zip`, bytes);
            }
            const blob = await outerZip.generateAsync({ type: 'blob' });
            downloadBlob(blob, `rc-track-segmente-${plateIndices.length}-platten.zip`);
        }
    } catch (err) {
        console.error(err);
        alert('STL-Export fehlgeschlagen: ' + err.message);
    } finally {
        if (exportBtn) exportBtn.disabled = generatedSegments.length === 0;
    }
}

// --- 11b. 3MF-EXPORT (mit Farbe) ---
// three.js liefert selbst keinen 3MF-Exporter mit (nur einen Loader). 3MF ist im Kern aber nur
// ein ZIP-Container mit ein paar XML-Dateien (ähnlich docx/xlsx) - das lässt sich mit dem
// bereits geladenen JSZip direkt selbst schreiben. Pro Druckteil (Segment) werden alle seine
// Meshes (Basis, Rampenstufen, Streifen, ...) zu EINEM <object> zusammengefasst - Farbe bleibt
// dabei pro Dreieck über eine m:colorgroup erhalten (siehe Kommentar unten), Weltposition wird
// beim Zusammenfassen direkt in die Vertex-Koordinaten eingerechnet.
// Baut die 3MF-Bytes (Uint8Array) für EINE Druckplatte, oder null, wenn nichts zu exportieren ist.
async function buildPlate3MFBytes(segments) {
    const zip = new JSZip();

    const colorToIndex = new Map();
    const colorList = [];
    function materialIndexFor(hexColor) {
        if (colorToIndex.has(hexColor)) return colorToIndex.get(hexColor);
        const idx = colorList.length;
        colorList.push(hexColor);
        colorToIndex.set(hexColor, idx);
        return idx;
    }

    // V14: Ein Segment besteht konstruktiv aus vielen einzeln geschlossenen Teilkoerpern
    // (Basis, Querlagen, Farb-/Strukturabschnitte, Connector-Lagen). In V13 wurden deren
    // Dreiecke stumpf in EIN 3MF-Mesh kopiert. Beruehrende bzw. teilweise ueberlappende
    // geschlossene Koerper innerhalb eines einzigen Meshes erzeugen jedoch nicht-manifold
    // Kanten und doppelte Innenflaechen. Bambu/Orca reparieren so etwas beim Slicen und
    // koennen dabei genau die beobachteten Loecher/Dreiecks-Artefakte erzeugen.
    //
    // Deshalb bleiben die geschlossenen Teilkoerper jetzt als echte 3MF-Komponenten erhalten.
    // Ein Parent-Object fasst sie zu EINEM Druckteil zusammen. Das ist 3MF-konform und laesst
    // den Slicer die Volumina sauber als Komponenten desselben Bauteils behandeln, anstatt
    // eine ungueltige Dreiecks-Suppe reparieren zu muessen. Farbe bleibt je Komponente erhalten.
    let resourcesXML = '';
    let itemsXML = '';
    let objectId = 2; // 1 ist die Farb-Resource
    const v = new THREE.Vector3();

    segments.forEach(seg => {
        seg.mesh.updateMatrixWorld(true);
        const componentIds = [];

        seg.mesh.traverse(node => {
            if (!node.isMesh) return;
            const geometry = node.geometry;
            const posAttr = geometry && geometry.attributes && geometry.attributes.position;
            if (!posAttr || posAttr.count < 3) return;

            const mat = Array.isArray(node.material) ? node.material[0] : node.material;
            const color = mat && mat.color ? mat.color : new THREE.Color(0xffffff);
            const hexColor = '#' + color.getHexString().toUpperCase();
            const matIdx = materialIndexFor(hexColor);

            let verticesXML = '';
            let trianglesXML = '';

            for (let i = 0; i < posAttr.count; i++) {
                v.fromBufferAttribute(posAttr, i);
                v.applyMatrix4(node.matrixWorld);
                verticesXML += `<vertex x="${v.x.toFixed(4)}" y="${v.y.toFixed(4)}" z="${v.z.toFixed(4)}"/>`;
            }

            const index = geometry.index;
            if (index) {
                for (let i = 0; i < index.count; i += 3) {
                    trianglesXML += `<triangle v1="${index.getX(i)}" v2="${index.getX(i + 1)}" v3="${index.getX(i + 2)}" pid="1" p1="${matIdx}"/>`;
                }
            } else {
                for (let i = 0; i + 2 < posAttr.count; i += 3) {
                    trianglesXML += `<triangle v1="${i}" v2="${i + 1}" v3="${i + 2}" pid="1" p1="${matIdx}"/>`;
                }
            }

            if (!trianglesXML) return;
            const childId = objectId++;
            resourcesXML += `<object id="${childId}" type="model"><mesh><vertices>${verticesXML}</vertices><triangles>${trianglesXML}</triangles></mesh></object>`;
            componentIds.push(childId);
        });

        if (!componentIds.length) return;

        const parentId = objectId++;
        const componentsXML = componentIds.map(id => `<component objectid="${id}"/>`).join('');
        resourcesXML += `<object id="${parentId}" type="model"><components>${componentsXML}</components></object>`;
        itemsXML += `<item objectid="${parentId}"/>`;
    });

    if (!itemsXML) return null;

    const colorGroupXML = colorList.map(c => `<m:color color="${c}FF"/>`).join('');
    const modelXML = `<?xml version="1.0" encoding="UTF-8"?>
<model unit="millimeter" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02" xmlns:m="http://schemas.microsoft.com/3dmanufacturing/material/2015/02">
<resources>
<m:colorgroup id="1">${colorGroupXML}</m:colorgroup>
${resourcesXML}
</resources>
<build>${itemsXML}</build>
</model>`;

    zip.file('[Content_Types].xml',
        `<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
        `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>` +
        `<Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml"/></Types>`);

    zip.file('_rels/.rels',
        `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
        `<Relationship Target="/3D/3dmodel.model" Id="rel0" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"/></Relationships>`);

    zip.file('3D/3dmodel.model', modelXML);
    return zip.generateAsync({ type: 'uint8array' });
}

async function exportColored3MF() {
    if (generatedSegments.length === 0) return;
    if (typeof JSZip === 'undefined') {
        alert('JSZip konnte nicht geladen werden (CDN nicht erreichbar?).');
        return;
    }

    const btn = document.getElementById('export3mf');
    if (btn) btn.disabled = true;

    try {
        const groups = groupSegmentsByPlate();
        const plateIndices = [...groups.keys()].sort((a, b) => a - b);

        if (plateIndices.length <= 1) {
            const bytes = await buildPlate3MFBytes(generatedSegments);
            if (!bytes) {
                alert('Keine exportierbaren Bauteile gefunden.');
                return;
            }
            downloadBlob(new Blob([bytes]), 'rc-track-farbig.3mf');
        } else {
            // Mehrere Platten -> je Platte eine eigene, vollständige .3mf-Datei, alle gebündelt
            // in einem äußeren ZIP (ein Download-Klick, mehrere eigenständige 3MF-Dateien drin).
            const outerZip = new JSZip();
            for (const p of plateIndices) {
                const bytes = await buildPlate3MFBytes(groups.get(p));
                if (bytes) outerZip.file(`Druckplatte_${p + 1}.3mf`, bytes);
            }
            const blob = await outerZip.generateAsync({ type: 'blob' });
            downloadBlob(blob, `rc-track-farbig-${plateIndices.length}-platten.zip`);
        }
    } catch (err) {
        console.error(err);
        alert('3MF-Export fehlgeschlagen: ' + err.message);
    } finally {
        if (btn) btn.disabled = generatedSegments.length === 0;
    }
}

function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}

// --- 12. PROJEKT SPEICHERN / LADEN (Datei) ---
function saveProject() {
    const data = {
        version: 2,
        trackUnits: 'cm',
        presetFilename: currentPresetFilename,
        trackLength: document.getElementById('trackLength').value,
        trackWidth: document.getElementById('trackWidth').value,
        elementType: document.getElementById('elementType').value,
        curbHeight: document.getElementById('curbHeight').value,
        curbDepth: document.getElementById('curbDepth').value,
        curbPatternLength: document.getElementById('curbPatternLength')?.value,
        bandeHeight: document.getElementById('bandeHeight').value,
        bandeThickness: document.getElementById('bandeThickness').value,
        bedWidth: document.getElementById('bedWidth').value,
        bedLength: document.getElementById('bedLength').value,
        paths
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    downloadBlob(blob, 'rc-track-projekt.json');
}

function loadProjectFromFile(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = JSON.parse(e.target.result);
            applyProjectData(data);
        } catch (err) {
            alert('Projekt-Datei konnte nicht gelesen werden: ' + err.message);
        }
    };
    reader.readAsText(file);
}

function applyProjectData(data) {
    const storedAsCM = data.trackUnits === 'cm' || Number(data.version || 0) >= 2;
    const storedLength = parseFloat(String(data.trackLength ?? (storedAsCM ? '270' : '2.7')).replace(',', '.'));
    const storedWidth = parseFloat(String(data.trackWidth ?? (storedAsCM ? '150' : '1.5')).replace(',', '.'));
    document.getElementById('trackLength').value = Number.isFinite(storedLength) ? (storedAsCM ? storedLength : storedLength * 100) : 270;
    document.getElementById('trackWidth').value = Number.isFinite(storedWidth) ? (storedAsCM ? storedWidth : storedWidth * 100) : 150;
    document.getElementById('elementType').value = data.elementType ?? 'bande';
    document.getElementById('curbHeight').value = data.curbHeight ?? '1.2';
    document.getElementById('curbDepth').value = data.curbDepth ?? '20';
    if (document.getElementById('curbPatternLength')) document.getElementById('curbPatternLength').value = data.curbPatternLength ?? '20';
    document.getElementById('bandeHeight').value = data.bandeHeight ?? '15';
    document.getElementById('bandeThickness').value = data.bandeThickness ?? '10';
    document.getElementById('bedWidth').value = data.bedWidth ?? '250';
    document.getElementById('bedLength').value = data.bedLength ?? '250';
    updateElementDimsVisibility();
    // Abwärtskompatibel: alte Projektdateien speicherten paths als reine Punkt-Arrays.
    paths = Array.isArray(data.paths)
        ? data.paths.map(p => Array.isArray(p) ? { points: p, outerSign: 1 } : { points: p.points || [], outerSign: p.outerSign ?? 1 })
        : [];
    currentPath = [];
    selectedPointRef = null;
    draggingPointRef = null;

    if (data.presetFilename) {
        selectPresetInUI(data.presetFilename);
        loadPresetImage(data.presetFilename); // setzt Hersteller/Strecke, Bild und Maße
    } else {
        const manufacturerSelect = document.getElementById('manufacturerSelect');
        if (manufacturerSelect) manufacturerSelect.value = '';
        populateTrackSelect('');
        currentPresetFilename = '';
        bgImage = null;
        redraw2DCanvas();
        updateTrackPreviewSurface();
    }
    updateSketchStatus();
    updateDeleteButtonState();
}

// --- 13. AUTOSAVE (localStorage, "lokal im Browser gespeichert") ---
const AUTOSAVE_KEY = 'rcTrackBuilder_autosave';

function autosave() {
    try {
        localStorage.setItem(AUTOSAVE_KEY, JSON.stringify({
            version: 2,
            trackUnits: 'cm',
            presetFilename: currentPresetFilename,
            trackLength: document.getElementById('trackLength')?.value,
            trackWidth: document.getElementById('trackWidth')?.value,
            elementType: document.getElementById('elementType')?.value,
            curbHeight: document.getElementById('curbHeight')?.value,
            curbDepth: document.getElementById('curbDepth')?.value,
            curbPatternLength: document.getElementById('curbPatternLength')?.value,
            bandeHeight: document.getElementById('bandeHeight')?.value,
            bandeThickness: document.getElementById('bandeThickness')?.value,
            bedWidth: document.getElementById('bedWidth')?.value,
            bedLength: document.getElementById('bedLength')?.value,
            paths
        }));
    } catch (e) {
        console.warn('Autosave fehlgeschlagen', e);
    }
}

function tryRestoreAutosave() {
    let raw;
    try {
        raw = localStorage.getItem(AUTOSAVE_KEY);
    } catch (e) {
        return;
    }
    if (!raw) return;
    if (!confirm('Es wurde eine automatisch gespeicherte Skizze aus diesem Browser gefunden. Wiederherstellen?')) return;

    try {
        const data = JSON.parse(raw);
        applyProjectData(data);
    } catch (e) {
        console.warn('Autosave konnte nicht wiederhergestellt werden', e);
    }
}
