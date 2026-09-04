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
const PRESET_FILES = [
    "ideallinie_circuit-de-drift-challenges_270-150.webp",
    "ideallinie_Tölkeschleife_400-200.webp"
];

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
    curb:  { height: 2,  thickness: 20, color: 0xf0f0f0, label: "Curb" }
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
// auf welcher Seite der Zeichenrichtung die "hohe" Curb-Außenkante liegt (die andere Seite wird
// zur Fahrbahn hin abgeflacht). Für Bande wird outerSign ignoriert (symmetrisch, egal welche Seite).
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

// 3D-Szene
let scene, camera, renderer, controls, trackGroup;
let generatedSegments = []; // Metadaten + Meshes der zuletzt generierten Teile
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
    tryRestoreAutosave();
});

// --- 3. PRESETS IM DROPDOWN BEFÜLLEN ---
function initPresets() {
    const select = document.getElementById('presetSelect');
    if (!select) return;

    select.innerHTML = '<option value="">-- Vorlage auswählen --</option>';

    PRESET_FILES.forEach(filename => {
        const cleanName = filename.replace(/\.[^/.]+$/, "");
        const parts = cleanName.split('_');

        let label = cleanName;
        if (parts.length >= 3) {
            const trackName = parts[1].replace(/-/g, ' ');
            const sizeParts = parts[2].split('-');

            if (sizeParts.length === 2) {
                const lengthM = (parseFloat(sizeParts[0]) / 100).toLocaleString('de-DE');
                const widthM = (parseFloat(sizeParts[1]) / 100).toLocaleString('de-DE');
                label = `${trackName} (Länge: ${lengthM}m x Breite: ${widthM}m)`;
            }
        }

        const option = document.createElement('option');
        option.value = filename;
        option.textContent = label;
        select.appendChild(option);
    });
}

// --- 4. BILD LADEN & MAßE AUTOMATISCH SETZEN ---
function loadPresetImage(filename) {
    if (!filename) {
        bgImage = null;
        resetZoomAndPan();
        redraw2DCanvas();
        return;
    }

    currentPresetFilename = filename;

    const cleanName = filename.replace(/\.[^/.]+$/, "");
    const parts = cleanName.split('_');
    const sizeStr = parts[parts.length - 1];
    const dimensions = sizeStr.split('-');

    if (dimensions.length === 2) {
        const lengthM = parseFloat(dimensions[0]) / 100;
        const widthM = parseFloat(dimensions[1]) / 100;

        const inputLength = document.getElementById('trackLength');
        const inputWidth = document.getElementById('trackWidth');

        if (inputLength && !isNaN(lengthM)) inputLength.value = lengthM;
        if (inputWidth && !isNaN(widthM)) inputWidth.value = widthM;
    }

    const img = new Image();
    img.onload = () => {
        bgImage = img;
        resetZoomAndPan();
        redraw2DCanvas();
    };

    img.onerror = () => {
        bgImage = null;
        redraw2DCanvas();
        console.error("Bild konnte nicht geladen werden: " + filename);
    };

    img.src = "./assets/tracks/" + filename;
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

        paths.forEach(path => drawPath(path.points, false));
        if (currentPath.length > 0) drawPath(currentPath, true);

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
    if (btn) btn.textContent = `Curb-Außenseite umkehren ⇄ (aktuell: ${pendingOuterSign >= 0 ? 'A' : 'B'})`;
}

function updateElementDimsVisibility() {
    const curbRow = document.getElementById('curbDimsRow');
    const bandeRow = document.getElementById('bandeDimsRow');
    const curbSlopeRow = document.getElementById('curbSlopeRow');
    const curbSlopeHint = document.getElementById('curbSlopeHint');
    const select = document.getElementById('elementType');
    if (!select) return;
    const isCurb = select.value === 'curb';
    if (curbRow) curbRow.style.display = isCurb ? 'flex' : 'none';
    if (bandeRow) bandeRow.style.display = isCurb ? 'none' : 'flex';
    if (curbSlopeRow) curbSlopeRow.style.display = isCurb ? 'flex' : 'none';
    if (curbSlopeHint) curbSlopeHint.style.display = isCurb ? 'block' : 'none';
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
function setupTabs() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
            btn.classList.add('active');
            const panel = document.querySelector(`.tab-panel[data-panel="${btn.dataset.tab}"]`);
            if (panel) panel.classList.add('active');
        });
    });
}

function setupMobileNav() {
    document.querySelectorAll('.mnav-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.mnav-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            document.body.classList.remove('mview-sketch', 'mview-3d', 'mview-settings');
            document.body.classList.add('mview-' + btn.dataset.view);

            // Canvas/Renderer waren ggf. unsichtbar (display:none) und kennen daher ihre
            // korrekte Größe nicht mehr - nach dem Sichtbarwerden neu berechnen.
            if (btn.dataset.view === '3d') {
                setTimeout(() => {
                    const container = document.getElementById('threeContainer');
                    if (container && renderer && camera) {
                        const w = container.clientWidth, h = container.clientHeight || 1;
                        camera.aspect = w / h;
                        camera.updateProjectionMatrix();
                        renderer.setSize(w, h);
                    }
                }, 50);
            } else if (btn.dataset.view === 'sketch') {
                setTimeout(() => { resizeCanvasToDisplaySize(); redraw2DCanvas(); }, 50);
            }
        });
    });
    document.body.classList.add('mview-sketch');
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
    const presetSelect = document.getElementById('presetSelect');
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

    const generateBtn = document.getElementById('generate3d');
    if (generateBtn) generateBtn.addEventListener('click', generate3DModel);

    const exportBtn = document.getElementById('exportStl');
    if (exportBtn) exportBtn.addEventListener('click', exportAllSTL);

    const export3mfBtn = document.getElementById('export3mf');
    if (export3mfBtn) export3mfBtn.addEventListener('click', exportColored3MF);

    const saveBtn = document.getElementById('saveFileBtn');
    if (saveBtn) saveBtn.addEventListener('click', saveProject);

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
        if (selectedPointRef) return; // Klick hat einen bestehenden Punkt getroffen/verschoben - keinen neuen setzen
        if (!bgImage) {
            alert('Bitte zuerst eine Strecken-Vorlage auswählen.');
            return;
        }
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
        if (touchState.mode === 'point-drag') {
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
    const mmPoints = pathPointsFrac.map(p => ({ x: p.fx * trackLengthMM, y: p.fy * trackWidthMM }));
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

        // Die EINE, gemeinsame Zunge wird von der vollen Bauteilbreite (Basis) abgeleitet und
        // soll unverändert durch JEDE Schicht durchgezogen werden. Passt sie in dieser (ggf.
        // schmaleren) Schicht nicht mehr hinein, würde ein direktes Anwenden zu einer
        // selbstüberschneidenden (kaputten, unsichtbaren) Kontur führen. Deshalb hier zuerst
        // versuchen, sie nur seitlich zu verschieben (Größe bleibt exakt erhalten); reicht auch
        // das nicht, wird sie GRÖSSENMÄSSIG (Winkel bleibt exakt 60°) auf die eigene
        // Schichtbreite heruntergerechnet - so bleibt in JEDER Schicht eine gültige, wenn auch
        // ggf. dünne Zunge/Nut erhalten, statt dass die Schicht komplett ohne Verbindung bleibt.
        if (dovetailPossible) {
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
            // Nut über echten Konturversatz berechnet (siehe computeNotchGeometry) - garantiert
            // überall entlang der Flanke denselben senkrechten 0,2mm-Spalt zur Zunge, nicht nur
            // bei Breite und Tiefe getrennt.
            const notch = computeNotchGeometry(tabHalf, tabTipHalf, tabLength, clearance);
            outline.push(offsetPoint(startTabCenter, startNormal, -notch.mouthHalf));
            outline.push(offsetPoint(offsetPoint(startTabCenter, startNormal, -notch.bottomHalf), startTangent, notch.depth));
            outline.push(offsetPoint(offsetPoint(startTabCenter, startNormal, notch.bottomHalf), startTangent, notch.depth));
            outline.push(offsetPoint(startTabCenter, startNormal, notch.mouthHalf));
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
            outline.push(offsetPoint(endTabCenter, endNormal, tabHalf));
            outline.push(offsetPoint(offsetPoint(endTabCenter, endNormal, tabTipHalf), endTangent, tabLength));
            outline.push(offsetPoint(offsetPoint(endTabCenter, endNormal, -tabTipHalf), endTangent, tabLength));
            outline.push(offsetPoint(endTabCenter, endNormal, -tabHalf));
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
    renderer.setSize(container.clientWidth, container.clientHeight || 500);
    container.appendChild(renderer.domElement);

    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.target.set(125, 125, 0);
    controls.update();

    scene.add(new THREE.HemisphereLight(0xffffff, 0x333333, 1.2));
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(-200, -300, 500);
    scene.add(dirLight);

    // Druckbett-Platte(n) - werden dynamisch erzeugt (siehe rebuildBedVisuals), da Größe und
    // Anzahl vom Nutzer festgelegte Werte sind, die sich nach jedem Generieren ändern können.
    rebuildBedVisuals(1);

    trackGroup = new THREE.Group();
    scene.add(trackGroup);

    animate3D();

    window.addEventListener('resize', () => {
        const w = container.clientWidth, h = container.clientHeight || 1;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
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
    if (!bedGroup) {
        bedGroup = new THREE.Group();
        scene.add(bedGroup);
    }
    while (bedGroup.children.length) {
        const child = bedGroup.children.pop();
        child.traverse(n => {
            if (n.geometry) n.geometry.dispose();
            if (n.material) n.material.dispose();
        });
    }
    for (let i = 0; i < plateCount; i++) {
        bedGroup.add(createPlateVisual(i));
    }
}

function animate3D() {
    requestAnimationFrame(animate3D);
    if (controls) controls.update();
    if (renderer && scene && camera) renderer.render(scene, camera);
}

function clearGeneratedMeshes() {
    if (!trackGroup) return;
    while (trackGroup.children.length) {
        const child = trackGroup.children.pop();
        child.traverse(node => {
            if (node.isMesh) {
                node.geometry.dispose();
                node.material.dispose();
            }
        });
    }
}

function fitCameraToScene() {
    if (!trackGroup) return;
    const box = new THREE.Box3().setFromObject(trackGroup);
    // Alle Druckplatten immer mit ins Bild nehmen, auch wenn die Segmente kleiner sind
    if (bedGroup && bedGroup.children.length) {
        box.union(new THREE.Box3().setFromObject(bedGroup));
    } else {
        box.expandByPoint(new THREE.Vector3(0, 0, 0));
        box.expandByPoint(new THREE.Vector3(bedWidthMM, bedLengthMM, 0));
    }
    if (box.isEmpty()) return;

    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z, 150);
    camera.position.set(center.x - maxDim * 0.15, center.y - maxDim * 0.9, center.z + maxDim * 0.85);
    controls.target.set(center.x, center.y, 0);
    controls.update();
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

// Curb-Optik: zweifarbige Streifen entlang der Länge + eine gestufte RAMPE quer zur Breite -
// flach/niedrig auf der Fahrbahnseite (damit das Fahrzeug auffahren kann), hoch auf der
// Außenseite. Die tragende Schwalbenschwanz-Verbindung sitzt ausschließlich in der (niedrigen,
// über die volle Breite durchgehenden) Basis; die Rampenstufen sitzen obenauf, ohne eigene
// Steckverbindung.
const CURB_STYLE = {
    stripeLengthMM: 15,           // Länge eines Rot/Weiß-Streifens (an CAD-Vorlage angelehnt)
    colors: [0xd93a2b, 0xf0f0f0], // Rot / Weiß, alternierend
    baseHeightRatio: 0.5,         // Anteil der Gesamthöhe für die tragende (flache, volle Breite)
                                   // Basis.
    rampSteps: 3,                 // zusätzliche Stufen von der Fahrbahnseite (flach) zur Außenseite (hoch)
    innerFlatWidthMM: 2,          // Breite ab der Skizzenlinie, die dauerhaft nur Basishöhe hat (0 Stufen)
    rumbleEnabled: true,          // periodische flache Riefen quer zur Breite für haptisches Feedback
    rumbleLengthMM: 12,           // Länge eines Riefen-Zyklus (Feld + Lücke)
    rumbleHeightMM: 0.4,          // wie hoch die Riefe übersteht - bewusst flach gehalten
    rumbleColor: 0x555555,        // dezentes Grau, unabhängig vom Rot/Weiß-Streifenmuster
    defaultJointSlopeDeg: 5       // Standard-Neigungswinkel der Auffahrrampe an jeder Segmentgrenze
                                   // (siehe buildCurbRampMeshes -> buildJointSlopeZone) - über das
                                   // Eingabefeld "Neigung Enden" im Tab "Bauteil" überschreibbar.
};

// Teilt eine Punktreihe in kurze, etwa gleich lange Abschnitte (für die Rot/Weiß-Streifen).
function splitIntoStripes(points, stripeLengthMM) {
    if (points.length < 2) return [points];
    const stripes = [];
    let current = [points[0]];
    let currentLen = 0;
    for (let i = 1; i < points.length; i++) {
        const segLen = dist(points[i - 1], points[i]);
        if (currentLen + segLen > stripeLengthMM && current.length > 1) {
            stripes.push(current);
            current = [points[i - 1]];
            currentLen = 0;
        }
        current.push(points[i]);
        currentLen += segLen;
    }
    if (current.length > 1) stripes.push(current);
    return stripes;
}

// Baut die gestufte Rampe eines Curb-Segments: mehrere schmale, treppenartig ansteigende
// Ebenen, die von der Fahrbahnseite (innerBoundary nahe 0, niedrig) zur Außenseite (volle
// Breite, volle Höhe) reichen - plus die Rot/Weiß-Längsstreifen. outerSign (+1/-1) bestimmt,
// auf welcher Seite der Skizzenlinie (Normalenrichtung) die Außenkante liegt. hasStartNotch/
// hasEndTab geben an, ob dort eine Segmentgrenze (mit Zunge/Nut) liegt - nur wenn NICHT, wird
// das jeweilige Ende abgerundet (echtes Strang-Ende). sharedTab: siehe buildSegmentOutline -
// EINE gemeinsame Zunge/Nut-Größe+Position (von der vollen Basisbreite abgeleitet, siehe
// generate3d) für die komplette Bauteilhöhe.
//
// WICHTIG: Die Zunge/Nut sitzt NICHT mehr verteilt über mehrere Rampenstufen-Z-Bänder, sondern
// ausschließlich am äußersten Rand einer eigenen "Neigungs-Rampe" (buildJointSlopeZone) direkt
// an jeder Segmentgrenze. Diese Neigungs-Rampe läuft über die VOLLE Bauteilbreite (wie die
// Basis, passend zur mittig zentrierten Zunge) und ihre Höhe steigt vom Bauteilrand (dort:
// Basishöhe, dort sitzt exakt EINE Zunge/Nut-Schicht) linear bis zur normalen Rampenhöhe an -
// mit einer über jointSlopeDeg einstellbaren Neigung, damit Fahrzeuge dort nicht an einer
// abrupten Stufe hängen bleiben. Jenseits dieser Neigungs-Rampe läuft die normale, gestufte
// Rampenoptik unverändert weiter (dort ohne eigene Steckverbindung).
function buildCurbRampMeshes(localChunk, thickness, totalHeight, baseHeight, outerSign, stripeOffset, hasStartNotch, hasEndTab, sharedTab, jointSlopeDeg) {
    const meshes = [];
    const dir = outerSign >= 0 ? 1 : -1;
    const rampWidth = Math.max(thickness - CURB_STYLE.innerFlatWidthMM, thickness * 0.3);
    const stepWidth = rampWidth / CURB_STYLE.rampSteps;
    const stepHeight = (totalHeight - baseHeight) / CURB_STYLE.rampSteps;
    const fullOffsetA = Math.min(0, dir * thickness);
    const fullOffsetB = Math.max(0, dir * thickness);
    const chunkLen = polylineLength(localChunk);

    // Farbe an einer gegebenen Bogenlänge entlang DIESES Chunks - ersetzt die bisherige, rein
    // indexbasierte (stripeOffset+i)-Formel durch eine bogenlängenbasierte Variante, damit das
    // Rot/Weiß-Muster auch dann nahtlos weiterläuft, wenn (wie jetzt) die Neigungs-Rampe und der
    // restliche Bereich unabhängig voneinander in Scheiben zerlegt werden.
    function colorAt(dAlongChunk) {
        const raw = stripeOffset + Math.floor(dAlongChunk / CURB_STYLE.stripeLengthMM);
        const n = CURB_STYLE.colors.length;
        return CURB_STYLE.colors[((raw % n) + n) % n];
    }

    // Rampen-Länge aus dem Neigungswinkel: rise/tan(Winkel) - je flacher der Winkel, desto
    // länger die Auffahrrampe. Auf maximal die halbe (bei Nut UND Zapfen) bzw. fast die ganze
    // (bei nur einem von beiden) Chunk-Länge begrenzt, damit auch kurze Segmente nicht überlaufen.
    const rise = Math.max(totalHeight - baseHeight, 0);
    const slopeDeg = Math.max(jointSlopeDeg || CURB_STYLE.defaultJointSlopeDeg, 0.5);
    const rawTaperLength = rise > 0.01 ? rise / Math.tan(slopeDeg * Math.PI / 180) : 0;
    const maxTaperEach = (hasStartNotch && hasEndTab) ? Math.max(chunkLen / 2 - 1, 0) : Math.max(chunkLen - 1, 0);
    const taperLengthMM = Math.min(rawTaperLength, maxTaperEach);

    // Baut die Neigungs-Rampe an EINEM Segmentende (isStart=true: Nut bei d=0: isStart=false:
    // Zapfen bei d=chunkLen). Mehrere dünne Längs-Scheiben, jede über die volle Bauteilbreite,
    // deren Höhe von der Bauteilkante (Basishöhe) zum Rampen-Inneren (volle Rampenhöhe) linear
    // ansteigt - die Zunge/Nut sitzt ausschließlich in der äußersten (der Kante zugewandten)
    // Scheibe.
    function buildJointSlopeZone(isStart) {
        if (taperLengthMM < 0.5) return;
        const zoneStartD = isStart ? 0 : chunkLen - taperLengthMM;
        const zoneEndD = isStart ? taperLengthMM : chunkLen;

        const numSlices = Math.min(Math.max(Math.ceil(taperLengthMM / 2), 3), 12);
        for (let s = 0; s < numSlices; s++) {
            const t0 = s / numSlices, t1 = (s + 1) / numSlices;
            const dA = zoneStartD + (zoneEndD - zoneStartD) * t0;
            const dB = zoneStartD + (zoneEndD - zoneStartD) * t1;
            const slicePts = sliceByArcLength(localChunk, dA, dB);
            if (slicePts.length < 2) continue;

            // Abstand der (der Bauteilkante zugewandten) Scheibenseite von der Segmentgrenze -
            // 0 direkt an der Kante (-> Basishöhe), taperLengthMM am rampenseitigen Ende (->
            // volle Rampenhöhe).
            const edgeD = isStart ? dA : dB;
            const distFromJoint = isStart ? edgeD : (chunkLen - edgeD);
            const localHeight = taperLengthMM > 0
                ? baseHeight + Math.min(distFromJoint / taperLengthMM, 1) * rise
                : totalHeight;

            const sliceHasStartNotch = isStart && s === 0 && hasStartNotch;
            const sliceHasEndTab = !isStart && s === numSlices - 1 && hasEndTab;

            const outline = buildSegmentOutline(slicePts, fullOffsetA, fullOffsetB, sliceHasStartNotch, sliceHasEndTab, false, false, sharedTab);
            if (outline.length < 3) continue;
            const shape = new THREE.Shape(outline.map(p => new THREE.Vector2(p.x, p.y)));
            const midD = (dA + dB) / 2;
            const material = new THREE.MeshStandardMaterial({ color: colorAt(midD), roughness: 0.8 });
            try {
                const geometry = new THREE.ExtrudeGeometry(shape, { depth: Math.max(localHeight, 0.05), bevelEnabled: false, steps: 1 });
                meshes.push(new THREE.Mesh(geometry, material));
            } catch (err) {
                console.error('Curb-Neigungsrampe übersprungen (ungültige Geometrie)', err);
            }
        }
    }

    if (hasStartNotch) buildJointSlopeZone(true);
    if (hasEndTab) buildJointSlopeZone(false);

    // Normale gestufte Rampe für den restlichen (nicht von einer Neigungs-Rampe belegten)
    // Bereich - unverändert zur bisherigen Optik, aber ohne eigene Zunge/Nut (die sitzt jetzt
    // ausschließlich in den Neigungs-Rampen oben).
    const midStartD = hasStartNotch ? taperLengthMM : 0;
    const midEndD = hasEndTab ? chunkLen - taperLengthMM : chunkLen;
    if (midEndD - midStartD < 0.5) return meshes;

    const midPts = sliceByArcLength(localChunk, midStartD, midEndD);
    const stripes = splitIntoStripes(midPts, CURB_STYLE.stripeLengthMM);
    let stripeAcc = midStartD;

    stripes.forEach((stripePts, i) => {
        if (stripePts.length < 2) { return; }
        const stripeStartD = stripeAcc;
        const color = colorAt(stripeStartD);
        const material = new THREE.MeshStandardMaterial({ color, roughness: 0.8 });
        stripeAcc += polylineLength(stripePts);

        // Echtes Strang-Ende (keine Segmentgrenze, also auch keine Neigungs-Rampe davor) wird
        // weiterhin abgerundet statt gerade abgeschnitten.
        const roundStart = i === 0 && !hasStartNotch;
        const roundEnd = i === stripes.length - 1 && !hasEndTab;

        for (let step = 1; step <= CURB_STYLE.rampSteps; step++) {
            // Jede Stufe beginnt weiter außen (vom Fahrbahnrand weg) als die vorherige und
            // reicht bis zur vollen Außenkante - klassische Treppen-Verschachtelung.
            const innerBoundary = dir * (CURB_STYLE.innerFlatWidthMM + (step - 1) * stepWidth);
            const outerBoundary = dir * thickness;
            const offsetA = Math.min(innerBoundary, outerBoundary);
            const offsetB = Math.max(innerBoundary, outerBoundary);
            const zOffset = baseHeight + (step - 1) * stepHeight;

            if (!CURB_STYLE.rumbleEnabled) {
                const outline = buildSegmentOutline(stripePts, offsetA, offsetB, false, false, roundStart, roundEnd, sharedTab);
                if (outline.length < 3) continue;
                const shape = new THREE.Shape(outline.map(p => new THREE.Vector2(p.x, p.y)));
                try {
                    const geometry = new THREE.ExtrudeGeometry(shape, { depth: stepHeight, bevelEnabled: false, steps: 1 });
                    geometry.translate(0, 0, zOffset);
                    meshes.push(new THREE.Mesh(geometry, material));
                } catch (err) {
                    console.error('Curb-Rampenstufe übersprungen (ungültige Geometrie)', err);
                }
                continue;
            }

            // Riefen für haptisches Feedback: die Stufe wird zusätzlich in kurze Abschnitte
            // unterteilt, die abwechselnd normal hoch und um rumbleHeightMM höher sind - IMMER
            // mit derselben Breite/Position wie diese Stufe UND derselben Streifenfarbe. Dadurch
            // folgen die Riefen exakt der Treppen-/Schrägform (keine schwebende Platte mehr) und
            // unterbrechen das Rot/Weiß-Muster nicht.
            const rumbleSegs = splitIntoStripes(stripePts, CURB_STYLE.rumbleLengthMM);
            rumbleSegs.forEach((segPts, si) => {
                if (segPts.length < 2) return;
                const segRoundStart = si === 0 && roundStart;
                const segRoundEnd = si === rumbleSegs.length - 1 && roundEnd;
                const isRidge = si % 2 === 0;
                const segHeight = stepHeight + (isRidge ? CURB_STYLE.rumbleHeightMM : 0);

                const outline = buildSegmentOutline(segPts, offsetA, offsetB, false, false, segRoundStart, segRoundEnd, sharedTab);
                if (outline.length < 3) return;
                const shape = new THREE.Shape(outline.map(p => new THREE.Vector2(p.x, p.y)));
                try {
                    const geometry = new THREE.ExtrudeGeometry(shape, { depth: segHeight, bevelEnabled: false, steps: 1 });
                    geometry.translate(0, 0, zOffset);
                    meshes.push(new THREE.Mesh(geometry, material));
                } catch (err) {
                    console.error('Curb-Riefen-Segment übersprungen (ungültige Geometrie)', err);
                }
            });
        }
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

function buildBandeMeshes(localChunk, thickness, totalHeight, hasStartNotch, hasEndTab, roundStart, roundEnd, color) {
    const meshes = [];
    const layers = getBandeLayers();
    const material = new THREE.MeshStandardMaterial({ color, metalness: 0.05, roughness: 0.9 });

    // EINE gemeinsame Zunge, abgeleitet von der VOLLEN Bauteilbreite (breiteste/unterste Stufe)
    // und mittig zentriert (bei Bande ohnehin immer 0, da symmetrisch). Anders als beim Curb wird
    // sie aber NICHT über die komplette Bauteilhöhe durchgezogen, sondern je nach Z-Position
    // dieser Schicht auf BANDE_DOVETAIL_Z begrenzt (siehe splitZRangeByDovetailLimits).
    const tabSize = computeTabSize(thickness / 2);
    const sharedTab = { tabHalf: tabSize.tabHalf, tabTipHalf: tabSize.tabTipHalf, tabLength: tabSize.tabLength, possible: tabSize.possible, anchorOffset: 0 };

    layers.forEach(l => {
        const layerHeight = totalHeight * (l.hTo - l.hFrom);
        if (layerHeight <= 0.001) return;
        const halfWidth = (thickness / 2) * l.w;
        const z0 = totalHeight * l.hFrom;
        const z1 = totalHeight * l.hTo;

        // Diese Stufe an den Schwalbenschwanz-Höhenschwellen aufteilen (meist nur 1 Teilstück,
        // sofern die Stufe die 4mm/5mm-Grenzen nicht überschreitet).
        const zSegments = splitZRangeByDovetailLimits(z0, z1, hasStartNotch, hasEndTab);

        zSegments.forEach(seg => {
            const segHeight = seg.zTo - seg.zFrom;
            if (segHeight <= 0.001) return;

            const outline = buildSegmentOutline(localChunk, -halfWidth, halfWidth, seg.notch, seg.tab, roundStart, roundEnd, sharedTab);
            if (outline.length >= 3) {
                const shape = new THREE.Shape(outline.map(p => new THREE.Vector2(p.x, p.y)));
                try {
                    const geometry = new THREE.ExtrudeGeometry(shape, { depth: segHeight, bevelEnabled: false, steps: 1 });
                    geometry.translate(0, 0, seg.zFrom);
                    meshes.push(new THREE.Mesh(geometry, material));
                } catch (err) {
                    console.error('Bande-Stufe übersprungen (ungültige Geometrie)', err);
                }
            }
        });
    });

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
        alert('Bitte gültige Streckenmaße (Länge/Breite in Metern) angeben.');
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

    trackLengthMM = lengthInput * 1000;
    trackWidthMM = widthInput * 1000;

    const elementTypeValue = document.getElementById('elementType').value;
    const profile = { ...ELEMENT_PROFILES[elementTypeValue] };

    // Curb: Höhe/Tiefe kommen aus den eigenen Eingabefeldern (überschreiben den Profil-Default),
    // damit sie an die eigene Bodenfreiheit/das eigene Fahrzeug angepasst werden können.
    let curbJointSlopeDeg = CURB_STYLE.defaultJointSlopeDeg;
    if (elementTypeValue === 'curb') {
        const curbHeightInput = parseFloat((document.getElementById('curbHeight').value || '').toString().replace(',', '.'));
        const curbDepthInput = parseFloat((document.getElementById('curbDepth').value || '').toString().replace(',', '.'));
        const curbJointSlopeInput = parseFloat((document.getElementById('curbJointSlope')?.value || '').toString().replace(',', '.'));
        if (curbHeightInput > 0) profile.height = curbHeightInput;
        if (curbDepthInput > 0) profile.thickness = curbDepthInput;
        if (curbJointSlopeInput > 0) curbJointSlopeDeg = curbJointSlopeInput;
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
    let globalStripeIndex = 0; // fortlaufender Zähler für ein durchgängiges Streifenmuster

    paths.forEach((path, pathIndex) => {
        const pathPoints = path.points;
        if (pathPoints.length < 2) return;
        const chunks = splitPathIntoSegments(pathPoints);
        const isCurb = elementTypeValue === 'curb';
        const outerSign = path.outerSign >= 0 ? 1 : -1;

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
                const bodyHeight = profile.height * CURB_STYLE.baseHeightRatio;
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
                    anchorOffset: (offsetA + offsetB) / 2
                };

                // Die flache Basis selbst trägt KEINE eigene Nut/Zapfen mehr (unconditional false)
                // - die Steckverbindung sitzt jetzt ausschließlich in der Neigungs-Rampe, die
                // ohnehin bei Z=0 beginnt und diesen Bereich mit abdeckt (redundante, doppelt
                // geschnittene Geometrie an derselben Stelle wird so vermieden).
                let outline;
                try {
                    outline = buildSegmentOutline(localChunk, offsetA, offsetB, false, false, roundStart, roundEnd, sharedTab);
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
                        const material = new THREE.MeshStandardMaterial({ color: profile.color, metalness: 0.1, roughness: 0.85 });
                        partGroup.add(new THREE.Mesh(geometry, material));
                    } catch (err) {
                        console.error('Ungültige Segment-Geometrie (Selbstüberschneidung?) - übersprungen', err);
                    }
                }

                const rampMeshes = buildCurbRampMeshes(localChunk, profile.thickness, profile.height, bodyHeight, outerSign, globalStripeIndex, hasStartNotch, hasEndTab, sharedTab, curbJointSlopeDeg);
                rampMeshes.forEach(m => partGroup.add(m));
                globalStripeIndex += splitIntoStripes(localChunk, CURB_STYLE.stripeLengthMM).length;
            } else {
                // Bande: gestufte, sich nach oben verjüngende Beton-Leitwand-Form (symmetrisch
                // um die Skizzenlinie), jede Stufe mit eigener Zunge/Nut.
                const bandeMeshes = buildBandeMeshes(localChunk, profile.thickness, profile.height, hasStartNotch, hasEndTab, roundStart, roundEnd, profile.color);
                bandeMeshes.forEach(m => partGroup.add(m));
            }

            if (partGroup.children.length === 0) return;

            const bbox = new THREE.Box3().setFromObject(partGroup);
            const bboxX = bbox.max.x - bbox.min.x;
            const bboxY = bbox.max.y - bbox.min.y;
            const fitsBed = bboxX <= bedWidthMM && bboxY <= bedLengthMM;

            const plateIndex = placeInLayout(partGroup, bbox);
            trackGroup.add(partGroup);

            const lengthMM = polylineLength(chunk);

            segmentCounter++;
            generatedSegments.push({
                id: segmentCounter,
                pathIndex,
                chunkIndex,
                type: elementTypeValue,
                lengthMM,
                mesh: partGroup,
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

    fitCameraToScene();
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

    let objectsXML = '';
    let itemsXML = '';
    let objectId = 2; // 1 ist für die Farb-Resource reserviert

    const v = new THREE.Vector3();

    segments.forEach(seg => {
        seg.mesh.updateMatrixWorld(true);

        // Alle Meshes DIESES Druckteils (Basis, Rampenstufen, Streifen, ...) werden zu EINEM
        // gemeinsamen <object> zusammengefasst (Vertex-Indizes je Mesh um vertexOffset
        // verschoben), statt wie zuvor ein eigenes <object> pro Einzel-Mesh zu exportieren.
        // Grund: BambuStudio meldet bei vielen separaten, überlappend/gestapelt positionierten
        // Objekten "Mehrteiliges Objekt erkannt" - ein Druckteil soll aber als EIN Objekt in
        // der Objektliste erscheinen. Farbe bleibt trotzdem pro Dreieck erhalten (Face Coloring).
        let verticesXML = '';
        let trianglesXML = '';
        let vertexOffset = 0;

        seg.mesh.traverse(node => {
            if (!node.isMesh) return;
            const geometry = node.geometry;
            const posAttr = geometry.attributes.position;
            if (!posAttr) return;

            const hexColor = '#' + node.material.color.getHexString().toUpperCase();
            const matIdx = materialIndexFor(hexColor);

            for (let i = 0; i < posAttr.count; i++) {
                v.fromBufferAttribute(posAttr, i);
                v.applyMatrix4(node.matrixWorld);
                verticesXML += `<vertex x="${v.x.toFixed(4)}" y="${v.y.toFixed(4)}" z="${v.z.toFixed(4)}"/>`;
            }

            // WICHTIG: Farbe wird pro DREIECK über pid/p1 auf die m:colorgroup gesetzt
            // ("Face Coloring") statt nur einmal auf das <object> - laut BambuStudio-Wiki
            // werden nur Vertex- oder Face-Coloring automatisch erkannt, ein reines
            // objektweites <basematerials>-pid wird von BambuStudio ignoriert (bleibt grau),
            // auch wenn Windows' eigener 3D-Viewer (breiterer 3MF-Support) es korrekt zeigt.
            const index = geometry.index;
            if (index) {
                for (let i = 0; i < index.count; i += 3) {
                    const a = index.getX(i) + vertexOffset;
                    const b = index.getX(i + 1) + vertexOffset;
                    const c = index.getX(i + 2) + vertexOffset;
                    trianglesXML += `<triangle v1="${a}" v2="${b}" v3="${c}" pid="1" p1="${matIdx}"/>`;
                }
            } else {
                for (let i = 0; i < posAttr.count; i += 3) {
                    const a = i + vertexOffset, b = i + 1 + vertexOffset, c = i + 2 + vertexOffset;
                    trianglesXML += `<triangle v1="${a}" v2="${b}" v3="${c}" pid="1" p1="${matIdx}"/>`;
                }
            }

            vertexOffset += posAttr.count;
        });

        if (!trianglesXML) return; // dieses Druckteil hatte keine exportierbare Geometrie

        // Kein objektweites pid/pindex mehr (ein Objekt kann jetzt mehrere Farben enthalten) -
        // die Farbe steckt vollständig in den Dreiecken selbst.
        objectsXML += `<object id="${objectId}" type="model"><mesh><vertices>${verticesXML}</vertices><triangles>${trianglesXML}</triangles></mesh></object>`;
        itemsXML += `<item objectid="${objectId}"/>`;
        objectId++;
    });

    if (!objectsXML) return null;

    // m:colorgroup (Materials & Properties Extension) statt/zusätzlich zu <basematerials> -
    // das ist der Mechanismus, den BambuStudio/OrcaSlicer für automatische Farberkennung
    // beim 3MF-Import tatsächlich auswerten.
    const colorGroupXML = colorList.map(c => `<m:color color="${c}FF"/>`).join('');

    const modelXML = `<?xml version="1.0" encoding="UTF-8"?>
<model unit="millimeter" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02" xmlns:m="http://schemas.microsoft.com/3dmanufacturing/material/2015/02">
<resources>
<m:colorgroup id="1">${colorGroupXML}</m:colorgroup>
${objectsXML}
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
        version: 1,
        presetFilename: currentPresetFilename,
        trackLength: document.getElementById('trackLength').value,
        trackWidth: document.getElementById('trackWidth').value,
        elementType: document.getElementById('elementType').value,
        curbHeight: document.getElementById('curbHeight').value,
        curbDepth: document.getElementById('curbDepth').value,
        curbJointSlope: document.getElementById('curbJointSlope')?.value,
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
    document.getElementById('trackLength').value = data.trackLength ?? '2.7';
    document.getElementById('trackWidth').value = data.trackWidth ?? '1.5';
    document.getElementById('elementType').value = data.elementType ?? 'bande';
    document.getElementById('curbHeight').value = data.curbHeight ?? '2';
    document.getElementById('curbDepth').value = data.curbDepth ?? '20';
    if (document.getElementById('curbJointSlope')) document.getElementById('curbJointSlope').value = data.curbJointSlope ?? '5';
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
        document.getElementById('presetSelect').value = data.presetFilename;
        loadPresetImage(data.presetFilename); // ruft redraw2DCanvas() nach dem Laden auf
    } else {
        bgImage = null;
        redraw2DCanvas();
    }
    updateSketchStatus();
    updateDeleteButtonState();
}

// --- 13. AUTOSAVE (localStorage, "lokal im Browser gespeichert") ---
const AUTOSAVE_KEY = 'rcTrackBuilder_autosave';

function autosave() {
    try {
        localStorage.setItem(AUTOSAVE_KEY, JSON.stringify({
            presetFilename: currentPresetFilename,
            trackLength: document.getElementById('trackLength')?.value,
            trackWidth: document.getElementById('trackWidth')?.value,
            elementType: document.getElementById('elementType')?.value,
            curbHeight: document.getElementById('curbHeight')?.value,
            curbDepth: document.getElementById('curbDepth')?.value,
            curbJointSlope: document.getElementById('curbJointSlope')?.value,
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
