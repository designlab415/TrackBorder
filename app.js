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
const MAX_SEGMENT_LENGTH_MM = 250;
const SEGMENT_MARGIN_MM = 8;
const EFFECTIVE_MAX_LENGTH_MM = MAX_SEGMENT_LENGTH_MM - SEGMENT_MARGIN_MM;
const RESAMPLE_STEP_MM = 2; // Auflösung der Mittellinie für glattere Kurven

// Profile je Element-Typ (Höhe/Breite in mm, Farbe für die 3D-Vorschau) - Standardwerte,
// über die Eingabefelder in der Seitenleiste überschreibbar.
// Curb-Höhe bewusst SEHR niedrig (an der CAD-Vorlage orientiert, dort nur ~1,5mm) - sonst
// bleiben RC-Fahrzeuge mit niedriger Bodenfreiheit am Curb hängen.
const ELEMENT_PROFILES = {
    bande: { height: 15, thickness: 10, color: 0xb8b8b8, label: "Bande" },
    curb:  { height: 2,  thickness: 20, color: 0xff5533, label: "Curb" }
};

// Bande-Optik: gestufte, sich nach oben verjüngende Form wie eine Beton-Leitwand (NORDBETON-
// Style) statt eines einfachen rechteckigen Blocks. Jede Stufe trägt ihre eigene Zunge/Nut
// (siehe buildSegmentOutline) - dadurch ist die Steckverbindung wie gewünscht durchgängig.
const BANDE_STYLE = {
    steps: 4,             // Anzahl Stufen von der breiten Basis zur schmaleren Oberkante
    topWidthRatio: 0.55,  // Breite der obersten Stufe relativ zur Basisbreite
    baseHeightRatio: 0.32 // Anteil der Gesamthöhe, den die unterste (volle Breite) Stufe einnimmt
};

// Schwalbenschwanz / Puzzle-Zunge (mm)
const DOVETAIL = {
    tabLength: 5,          // wie weit die Zunge über das Segmentende hinausragt
    tabWidthRatio: 0.42,   // Anteil der Wandbreite, den die Zungenbasis einnimmt (vor Kappung)
    maxTabHalfMM: 3.2,      // Obergrenze für die halbe Zungenbasis - verhindert überbreite/flache
                            // Zungen bei breiten Bauteilen wie dem Curb (Zunge bleibt handlich)
    tabFlare: 2.0,          // Spitze ist um diesen Betrag breiter als die Basis (Trapez)
    clearance: 0.2,         // Durchgängiger Spalt zwischen Zunge und Nut (mm) für sauberen Sitz nach dem Druck
    minWallMM: 1.0          // Mindest-Restwandstärke außen um die Nut - bei zu dünnen Bauteilen
                             // (schmale Bande, flacher Curb) wird die Zunge automatisch verkleinert
                             // oder (wenn selbst das nicht reicht) ganz weggelassen, um Bruch zu vermeiden.
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
    ctx2D.fillStyle = '#111111';
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
        ctx2D.fillStyle = '#555555';
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
        if (currentLen + segLen > EFFECTIVE_MAX_LENGTH_MM && currentChunk.length > 1) {
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
// unter Einhaltung der Mindestwandstärke (DOVETAIL.minWallMM). possible=false, wenn selbst eine
// minimale Zunge nicht ohne Bruchgefahr reinpasst.
function computeTabSize(halfWidth) {
    const clearance = DOVETAIL.clearance;
    const availableHalf = halfWidth - DOVETAIL.minWallMM - clearance;
    if (availableHalf < 0.6) return { possible: false, tabHalf: 0, tabTipHalf: 0 };
    let tabTipHalf = Math.min(Math.min(halfWidth * DOVETAIL.tabWidthRatio, DOVETAIL.maxTabHalfMM) + DOVETAIL.tabFlare, availableHalf);
    let tabHalf = Math.min(halfWidth * DOVETAIL.tabWidthRatio, DOVETAIL.maxTabHalfMM, tabTipHalf - 0.3);
    if (tabHalf < 0.3) tabHalf = tabTipHalf * 0.5;
    return { possible: true, tabHalf, tabTipHalf };
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

    let tabHalf, tabTipHalf, dovetailPossible, tabCenterOffset;
    if (tabOverride) {
        tabHalf = tabOverride.tabHalf;
        tabTipHalf = tabOverride.tabTipHalf;
        dovetailPossible = tabOverride.possible;
        tabCenterOffset = tabOverride.anchorOffset;
    } else {
        const size = computeTabSize(halfWidth);
        tabHalf = size.tabHalf;
        tabTipHalf = size.tabTipHalf;
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
            // Tasche verjüngt sich zur Öffnung hin (mouthHalf, schmal) und ist am Grund
            // (bottomHalf, breit) am weitesten - exakt das Gegenstück zur Zunge, die an
            // ihrer Basis schmal ist und zur Spitze hin ausflammt (tabHalf -> tabTipHalf).
            const depth = DOVETAIL.tabLength + clearance;
            const mouthHalf = tabHalf + clearance;
            const bottomHalf = tabTipHalf + clearance;
            outline.push(offsetPoint(startTabCenter, startNormal, -mouthHalf));
            outline.push(offsetPoint(offsetPoint(startTabCenter, startNormal, -bottomHalf), startTangent, depth));
            outline.push(offsetPoint(offsetPoint(startTabCenter, startNormal, bottomHalf), startTangent, depth));
            outline.push(offsetPoint(startTabCenter, startNormal, mouthHalf));
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
            outline.push(offsetPoint(offsetPoint(endTabCenter, endNormal, tabTipHalf), endTangent, DOVETAIL.tabLength));
            outline.push(offsetPoint(offsetPoint(endTabCenter, endNormal, -tabTipHalf), endTangent, DOVETAIL.tabLength));
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
function init3DScene() {
    const container = document.getElementById('threeContainer');
    if (!container || typeof THREE === 'undefined') return;

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x101010);

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

    // Druckbett-Platte (250x250mm), liegt flach in der X-Y-Ebene bei Z=0 und beginnt
    // bei (0,0) - genau dort, wo auch die generierten Segmente angeordnet werden.
    const bedGeo = new THREE.PlaneGeometry(MAX_SEGMENT_LENGTH_MM, MAX_SEGMENT_LENGTH_MM);
    const bedMat = new THREE.MeshStandardMaterial({ color: 0x3a3a3a, side: THREE.DoubleSide, roughness: 0.9 });
    const bedMesh = new THREE.Mesh(bedGeo, bedMat);
    bedMesh.position.set(MAX_SEGMENT_LENGTH_MM / 2, MAX_SEGMENT_LENGTH_MM / 2, 0);
    scene.add(bedMesh);

    const bedEdges = new THREE.LineSegments(
        new THREE.EdgesGeometry(bedGeo),
        new THREE.LineBasicMaterial({ color: 0x00adb5 })
    );
    bedEdges.position.copy(bedMesh.position);
    bedEdges.position.z = 0.4;
    scene.add(bedEdges);

    const grid = new THREE.GridHelper(MAX_SEGMENT_LENGTH_MM, 25, 0x00adb5, 0x555555);
    grid.rotation.x = Math.PI / 2; // Grid liegt standardmäßig in der XZ-Ebene -> in XY-Ebene drehen
    grid.position.set(MAX_SEGMENT_LENGTH_MM / 2, MAX_SEGMENT_LENGTH_MM / 2, 0.2);
    scene.add(grid);

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
    // Druckbett (0..250 / 0..250) immer mit ins Bild nehmen, auch wenn die Segmente kleiner sind
    box.expandByPoint(new THREE.Vector3(0, 0, 0));
    box.expandByPoint(new THREE.Vector3(MAX_SEGMENT_LENGTH_MM, MAX_SEGMENT_LENGTH_MM, 0));
    if (box.isEmpty()) return;

    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z, 150);
    camera.position.set(center.x - maxDim * 0.15, center.y - maxDim * 0.9, center.z + maxDim * 0.85);
    controls.target.set(center.x, center.y, 0);
    controls.update();
}

// Einfaches "Regal"-Layout: platziert generierte Segmente lückenlos nebeneinander/
// zeilenweise, damit sie sich in der Vorschau nicht überlappen und gut mit der
// 250x250mm-Platte vergleichbar sind. Kein echtes Nesting/Optimierung.
let layoutCursorX = 0;
let layoutCursorY = 0;
let layoutRowHeight = 0;
const LAYOUT_GAP_MM = 15;
const LAYOUT_MAX_ROW_WIDTH_MM = MAX_SEGMENT_LENGTH_MM * 3 + LAYOUT_GAP_MM * 2;

function resetLayoutCursor() {
    layoutCursorX = 0;
    layoutCursorY = 0;
    layoutRowHeight = 0;
}

function placeInLayout(mesh, bbox) {
    const w = bbox.max.x - bbox.min.x;
    const h = bbox.max.y - bbox.min.y;

    if (layoutCursorX > 0 && layoutCursorX + w > LAYOUT_MAX_ROW_WIDTH_MM) {
        layoutCursorX = 0;
        layoutCursorY += layoutRowHeight + LAYOUT_GAP_MM;
        layoutRowHeight = 0;
    }

    mesh.position.x += (layoutCursorX - bbox.min.x);
    mesh.position.y += (layoutCursorY - bbox.min.y);

    layoutCursorX += w + LAYOUT_GAP_MM;
    layoutRowHeight = Math.max(layoutRowHeight, h);
}

// Curb-Optik: zweifarbige Streifen entlang der Länge + eine gestufte RAMPE quer zur Breite -
// flach/niedrig auf der Fahrbahnseite (damit das Fahrzeug auffahren kann), hoch auf der
// Außenseite. Die tragende Schwalbenschwanz-Verbindung sitzt ausschließlich in der (niedrigen,
// über die volle Breite durchgehenden) Basis; die Rampenstufen sitzen obenauf, ohne eigene
// Steckverbindung.
const CURB_STYLE = {
    stripeLengthMM: 15,           // Länge eines Rot/Weiß-Streifens (an CAD-Vorlage angelehnt)
    colors: [0xd93a2b, 0xf0f0f0], // Rot / Weiß, alternierend
    baseHeightRatio: 0.5,         // Anteil der Gesamthöhe für die tragende Basis (trägt die Zunge/Nut)
    rampSteps: 3,                 // zusätzliche Stufen von der Fahrbahnseite (flach) zur Außenseite (hoch)
    innerFlatWidthMM: 2           // Breite ab der Skizzenlinie, die dauerhaft nur Basishöhe hat (0 Stufen)
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
// EINE gemeinsame Zunge/Nut-Größe+Position für ALLE Stufen (sonst seitlich versetzte Zacken).
function buildCurbRampMeshes(localChunk, thickness, totalHeight, baseHeight, outerSign, stripeOffset, hasStartNotch, hasEndTab, sharedTab) {
    const stripes = splitIntoStripes(localChunk, CURB_STYLE.stripeLengthMM);
    const meshes = [];

    const dir = outerSign >= 0 ? 1 : -1;
    const rampWidth = Math.max(thickness - CURB_STYLE.innerFlatWidthMM, thickness * 0.3);
    const stepWidth = rampWidth / CURB_STYLE.rampSteps;
    const stepHeight = (totalHeight - baseHeight) / CURB_STYLE.rampSteps;

    stripes.forEach((stripePts, i) => {
        if (stripePts.length < 2) return;
        const color = CURB_STYLE.colors[(stripeOffset + i) % CURB_STYLE.colors.length];
        const material = new THREE.MeshStandardMaterial({ color, roughness: 0.8 });

        const roundStart = i === 0 && !hasStartNotch;
        const roundEnd = i === stripes.length - 1 && !hasEndTab;
        const stripeHasStartNotch = i === 0 && hasStartNotch;
        const stripeHasEndTab = i === stripes.length - 1 && hasEndTab;

        for (let step = 1; step <= CURB_STYLE.rampSteps; step++) {
            // Jede Stufe beginnt weiter außen (vom Fahrbahnrand weg) als die vorherige und
            // reicht bis zur vollen Außenkante - klassische Treppen-Verschachtelung.
            const innerBoundary = dir * (CURB_STYLE.innerFlatWidthMM + (step - 1) * stepWidth);
            const outerBoundary = dir * thickness;
            const offsetA = Math.min(innerBoundary, outerBoundary);
            const offsetB = Math.max(innerBoundary, outerBoundary);

            // sharedTab statt eigener Berechnung je Stufe: dadurch sitzt die Zunge/Nut bei
            // Basis UND allen Rampenstufen an derselben Stelle mit derselben Größe - eine
            // durchgehende Steckverbindung statt vieler kleiner, versetzter Zacken.
            const outline = buildSegmentOutline(stripePts, offsetA, offsetB, stripeHasStartNotch, stripeHasEndTab, roundStart, roundEnd, sharedTab);
            if (outline.length < 3) continue;

            const shape = new THREE.Shape(outline.map(p => new THREE.Vector2(p.x, p.y)));
            let geometry;
            try {
                geometry = new THREE.ExtrudeGeometry(shape, { depth: stepHeight, bevelEnabled: false, steps: 1 });
            } catch (err) {
                console.error('Curb-Rampenstufe übersprungen (ungültige Geometrie)', err);
                continue;
            }
            geometry.translate(0, 0, baseHeight + (step - 1) * stepHeight);
            meshes.push(new THREE.Mesh(geometry, material));
        }
    });

    return meshes;
}

// Baut die gestufte, sich nach oben verjüngende Bande (Beton-Leitwand-Optik): mehrere
// symmetrisch zentrierte Stufen, die von der vollen Breite unten zur schmaleren Oberkante oben
// abnehmen. Jede Stufe trägt ihre eigene Zunge/Nut, dadurch ist die Steckverbindung wie beim
// Curb über die gesamte Höhe durchgängig, nicht nur an der Basis.
function buildBandeMeshes(localChunk, thickness, totalHeight, hasStartNotch, hasEndTab, roundStart, roundEnd, color) {
    const meshes = [];
    const steps = BANDE_STYLE.steps;
    const baseHeight = totalHeight * BANDE_STYLE.baseHeightRatio;
    const otherStepsHeight = (totalHeight - baseHeight) / (steps - 1);
    const material = new THREE.MeshStandardMaterial({ color, metalness: 0.05, roughness: 0.9 });

    // Gemeinsame Zunge/Nut für ALLE Stufen, abgeleitet von der SCHMALSTEN Stufe (meist die
    // Oberkante) - sonst würde jede Stufe ihre eigene, unterschiedlich große Zunge bekommen,
    // was gestapelt wie mehrere kleine Zacken statt einer sauberen Zunge aussieht. Da Bande
    // symmetrisch ist (-halfWidth/+halfWidth), liegt die Mitte ohnehin bei jeder Stufe exakt
    // bei 0 - anchorOffset ist hier also nur der Vollständigkeit halber gesetzt.
    let narrowestHalfWidth = Infinity;
    for (let step = 1; step <= steps; step++) {
        const widthFrac = 1 - ((step - 1) / (steps - 1)) * (1 - BANDE_STYLE.topWidthRatio);
        narrowestHalfWidth = Math.min(narrowestHalfWidth, (thickness / 2) * widthFrac);
    }
    const tabSize = computeTabSize(narrowestHalfWidth);
    const sharedTab = { tabHalf: tabSize.tabHalf, tabTipHalf: tabSize.tabTipHalf, possible: tabSize.possible, anchorOffset: 0 };

    let zCursor = 0;
    for (let step = 1; step <= steps; step++) {
        const stepHeight = step === 1 ? baseHeight : otherStepsHeight;
        const widthFrac = 1 - ((step - 1) / (steps - 1)) * (1 - BANDE_STYLE.topWidthRatio);
        const halfWidth = (thickness / 2) * widthFrac;

        const outline = buildSegmentOutline(localChunk, -halfWidth, halfWidth, hasStartNotch, hasEndTab, roundStart, roundEnd, sharedTab);
        if (outline.length >= 3) {
            const shape = new THREE.Shape(outline.map(p => new THREE.Vector2(p.x, p.y)));
            try {
                const geometry = new THREE.ExtrudeGeometry(shape, { depth: stepHeight, bevelEnabled: false, steps: 1 });
                geometry.translate(0, 0, zCursor);
                meshes.push(new THREE.Mesh(geometry, material));
            } catch (err) {
                console.error('Bande-Stufe übersprungen (ungültige Geometrie)', err);
            }
        }
        zCursor += stepHeight;
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
        alert('Bitte gültige Streckenmaße (Länge/Breite in Metern) angeben.');
        return;
    }
    if (paths.length === 0) {
        alert('Bitte zuerst mindestens einen Strang skizzieren und mit Doppelklick/Enter abschließen.');
        return;
    }

    trackLengthMM = lengthInput * 1000;
    trackWidthMM = widthInput * 1000;

    const elementTypeValue = document.getElementById('elementType').value;
    const profile = { ...ELEMENT_PROFILES[elementTypeValue] };

    // Curb: Höhe/Tiefe kommen aus den eigenen Eingabefeldern (überschreiben den Profil-Default),
    // damit sie an die eigene Bodenfreiheit/das eigene Fahrzeug angepasst werden können.
    if (elementTypeValue === 'curb') {
        const curbHeightInput = parseFloat((document.getElementById('curbHeight').value || '').toString().replace(',', '.'));
        const curbDepthInput = parseFloat((document.getElementById('curbDepth').value || '').toString().replace(',', '.'));
        if (curbHeightInput > 0) profile.height = curbHeightInput;
        if (curbDepthInput > 0) profile.thickness = curbDepthInput;
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
                const dirSign = outerSign >= 0 ? 1 : -1;
                // Curb: die Skizzenlinie IST die Fahrbahnkante (innen, Offset 0) - das Material
                // liegt komplett auf der outerSign-Seite davon.
                const offsetA = Math.min(0, outerSign * profile.thickness);
                const offsetB = Math.max(0, outerSign * profile.thickness);

                // Gemeinsame Zunge/Nut über ALLE Schichten (Basis + jede Rampenstufe) hinweg:
                // von der SCHMALSTEN Schicht ableiten (das ist bei der Rampe immer die äußerste,
                // oberste Stufe) und an jede Schicht dieselbe Größe+Position weitergeben. Ohne
                // das würde jede Schicht ihre eigene Zunge an ihrer eigenen (unterschiedlichen)
                // Mitte bauen - das erzeugt die seitlich versetzten "Zacken" statt einer saubere
                // durchgehenden Steckverbindung.
                const rampWidth = Math.max(profile.thickness - CURB_STYLE.innerFlatWidthMM, profile.thickness * 0.3);
                const stepWidth = rampWidth / CURB_STYLE.rampSteps;
                const layerRanges = [{ offsetA, offsetB }];
                for (let step = 1; step <= CURB_STYLE.rampSteps; step++) {
                    const innerBoundary = dirSign * (CURB_STYLE.innerFlatWidthMM + (step - 1) * stepWidth);
                    const outerBoundary = dirSign * profile.thickness;
                    layerRanges.push({ offsetA: Math.min(innerBoundary, outerBoundary), offsetB: Math.max(innerBoundary, outerBoundary) });
                }
                let narrowest = layerRanges[0];
                layerRanges.forEach(l => {
                    if ((l.offsetB - l.offsetA) < (narrowest.offsetB - narrowest.offsetA)) narrowest = l;
                });
                const narrowestHalfWidth = (narrowest.offsetB - narrowest.offsetA) / 2;
                const tabSize = computeTabSize(narrowestHalfWidth);
                const sharedTab = {
                    tabHalf: tabSize.tabHalf,
                    tabTipHalf: tabSize.tabTipHalf,
                    possible: tabSize.possible,
                    anchorOffset: (narrowest.offsetA + narrowest.offsetB) / 2
                };

                let outline;
                try {
                    outline = buildSegmentOutline(localChunk, offsetA, offsetB, hasStartNotch, hasEndTab, roundStart, roundEnd, sharedTab);
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

                const rampMeshes = buildCurbRampMeshes(localChunk, profile.thickness, profile.height, bodyHeight, outerSign, globalStripeIndex, hasStartNotch, hasEndTab, sharedTab);
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
            const fitsBed = bboxX <= MAX_SEGMENT_LENGTH_MM && bboxY <= MAX_SEGMENT_LENGTH_MM;

            placeInLayout(partGroup, bbox);
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
                fitsBed
            });
        });
    });

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

    let html = '<table><tr><th>#</th><th>Typ</th><th>Länge</th><th>Bett</th></tr>';
    generatedSegments.forEach(seg => {
        const typeLabel = ELEMENT_PROFILES[seg.type] ? ELEMENT_PROFILES[seg.type].label : seg.type;
        html += `<tr>
            <td>${seg.id}</td>
            <td>${typeLabel}</td>
            <td>${seg.lengthMM.toFixed(0)} mm</td>
            <td style="color:${seg.fitsBed ? '#4caf50' : '#ff5555'}">${seg.fitsBed ? 'OK' : '⚠'}</td>
        </tr>`;
    });
    html += '</table>';
    html += `<div style="margin-top:5px;color:#999;">Gesamt: ${generatedSegments.length} Teile</div>`;
    container.innerHTML = html;
}

// --- 11. STL-EXPORT (ZIP) ---
async function exportAllSTL() {
    if (generatedSegments.length === 0) return;
    if (typeof THREE.STLExporter === 'undefined' || typeof JSZip === 'undefined') {
        alert('STL-Exporter oder JSZip konnte nicht geladen werden (CDN nicht erreichbar?).');
        return;
    }

    const exportBtn = document.getElementById('exportStl');
    if (exportBtn) exportBtn.disabled = true;

    try {
        const exporter = new THREE.STLExporter();
        const zip = new JSZip();

        generatedSegments.forEach(seg => {
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

        const blob = await zip.generateAsync({ type: 'blob' });
        downloadBlob(blob, 'rc-track-segmente.zip');
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
// bereits geladenen JSZip direkt selbst schreiben. Jedes einzelne Mesh (Basis, jede Rampenstufe,
// jeder Rot/Weiß-Streifen) wird als eigenes <object> mit eigener Farbe (<basematerials>)
// exportiert, seine Weltposition/-drehung wird als 4x4-Transform-Matrix auf das <item> gelegt.
async function exportColored3MF() {
    if (generatedSegments.length === 0) return;
    if (typeof JSZip === 'undefined') {
        alert('JSZip konnte nicht geladen werden (CDN nicht erreichbar?).');
        return;
    }

    const btn = document.getElementById('export3mf');
    if (btn) btn.disabled = true;

    try {
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
        let objectId = 2; // 1 ist konventionell für die Material-Resource reserviert

        const v = new THREE.Vector3();

        generatedSegments.forEach(seg => {
            seg.mesh.updateMatrixWorld(true);
            seg.mesh.traverse(node => {
                if (!node.isMesh) return;
                const geometry = node.geometry;
                const posAttr = geometry.attributes.position;
                if (!posAttr) return;

                const hexColor = '#' + node.material.color.getHexString().toUpperCase();
                const matIdx = materialIndexFor(hexColor);

                let verticesXML = '';
                for (let i = 0; i < posAttr.count; i++) {
                    v.fromBufferAttribute(posAttr, i);
                    v.applyMatrix4(node.matrixWorld);
                    verticesXML += `<vertex x="${v.x.toFixed(4)}" y="${v.y.toFixed(4)}" z="${v.z.toFixed(4)}"/>`;
                }

                let trianglesXML = '';
                const index = geometry.index;
                if (index) {
                    for (let i = 0; i < index.count; i += 3) {
                        trianglesXML += `<triangle v1="${index.getX(i)}" v2="${index.getX(i + 1)}" v3="${index.getX(i + 2)}"/>`;
                    }
                } else {
                    for (let i = 0; i < posAttr.count; i += 3) {
                        trianglesXML += `<triangle v1="${i}" v2="${i + 1}" v3="${i + 2}"/>`;
                    }
                }

                objectsXML += `<object id="${objectId}" type="model" pid="1" pindex="${matIdx}"><mesh><vertices>${verticesXML}</vertices><triangles>${trianglesXML}</triangles></mesh></object>`;
                itemsXML += `<item objectid="${objectId}"/>`;
                objectId++;
            });
        });

        if (!objectsXML) {
            alert('Keine exportierbaren Bauteile gefunden.');
            return;
        }

        const materialsXML = colorList.map(c => `<base name="c" displaycolor="${c}FF"/>`).join('');

        const modelXML = `<?xml version="1.0" encoding="UTF-8"?>
<model unit="millimeter" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02">
<resources>
<basematerials id="1">${materialsXML}</basematerials>
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

        const blob = await zip.generateAsync({ type: 'blob' });
        downloadBlob(blob, 'rc-track-farbig.3mf');
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
        bandeHeight: document.getElementById('bandeHeight').value,
        bandeThickness: document.getElementById('bandeThickness').value,
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
    document.getElementById('bandeHeight').value = data.bandeHeight ?? '15';
    document.getElementById('bandeThickness').value = data.bandeThickness ?? '10';
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
            bandeHeight: document.getElementById('bandeHeight')?.value,
            bandeThickness: document.getElementById('bandeThickness')?.value,
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
