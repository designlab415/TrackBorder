RC Track Builder - Streckenbilder hinzufügen
=============================================

1. Bilddatei nach assets/tracks/ kopieren.
2. Dateiname nach diesem Schema:
   Hersteller_Streckenname_Laenge-Breite.webp

   Beispiel:
   ideallinie_circuit-de-drift-challenges_270-150.webp

   Die letzten beiden Zahlen sind Laenge und Breite in Zentimetern.

3. Den EXAKTEN Dateinamen in app.js ganz oben in TRACK_FILES ergänzen:

   const TRACK_FILES = [
       "ideallinie_circuit-de-drift-challenges_270-150.webp",
       "ideallinie_Tölkeschleife_400-200.webp",
       "Hersteller_Neue-Strecke_300-180.webp"
   ];

Danach erscheint zuerst der Hersteller im ersten Auswahlfeld. Nach Auswahl des
Herstellers werden nur dessen Strecken im zweiten Feld angezeigt. Beim Auswaehlen
der Strecke werden Bild, Laenge und Breite automatisch gesetzt.

Hinweis: Eine reine statische Webseite kann den Inhalt eines Server-Ordners aus
Sicherheitsgruenden nicht selbst auflisten. Darum ist TRACK_FILES die zentrale
Liste/Manifest-Datei fuer die vorhandenen Streckenbilder.
