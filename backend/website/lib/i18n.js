// Two languages: every page is built twice, in German at / and in English at
// /en/. The templates keep the German page addresses; the English pass maps
// them to the English ones (layout.js, page()). German stays the binding
// language of the legal pages.
let LANG = 'de';
const setLang = (l) => { LANG = l === 'en' ? 'en' : 'de'; };
const lang = () => LANG;
const isEn = () => LANG === 'en';
// L('Deutsch', 'English'): the text for the language being built
const L = (de, en) => (LANG === 'en' && en != null ? en : de);

// ── Formats ──────────────────────────────────────────
const locale = () => (LANG === 'en' ? 'en-GB' : 'de-DE');
const num = (n) => Number(n).toLocaleString(locale());

// ── Names of the shop's categories and devices ──────
const MAIN_EN = {
  'Sägen & Holz': 'Saws & Wood',
  'Rasen & Wiese': 'Lawn & Meadow',
  'Hecke & Garten': 'Hedge & Garden',
  'Laub, Kehren & Winter': 'Leaves, Sweeping & Winter',
  Reinigen: 'Cleaning',
  'Bau & Werkstatt': 'Construction & Workshop',
  Fahrräder: 'Bicycles',
  'Zubehör': 'Accessories',
};
const DEVICE_EN = {
  'Motorsägen': 'Chainsaws',
  'Hochentaster': 'Pole pruners',
  'Gehölzschneider & Astscheren': 'Pruners & shears',
  'Holzspalter': 'Log splitters',
  'Rasenmäher & Balkenmäher': 'Lawn mowers & sickle bar mowers',
  'Mähroboter': 'Robotic mowers',
  'Rasentraktoren': 'Lawn tractors',
  'Rasentrimmer': 'Grass trimmers',
  'Freischneider & Motorsensen': 'Brushcutters & clearing saws',
  'Vertikutierer & Lüfter': 'Scarifiers & lawn aerators',
  'Heckenscheren': 'Hedge trimmers',
  'Häcksler': 'Garden shredders',
  'Motorhacken & Bodenfräsen': 'Tillers & cultivators',
  'Einachser': 'Two-wheel tractors',
  'Spritzgeräte': 'Sprayers',
  'Kombigeräte': 'Multi-tool systems',
  'Laubbläser & Laubsauger': 'Leaf blowers & vacuums',
  'Kehrmaschinen': 'Sweepers',
  'Radialbesen': 'Power brooms',
  'Wildkrautentfernung': 'Weed removal',
  'Schneefräsen & Räumschilder': 'Snow blowers & snow blades',
  'Hochdruckreiniger': 'Pressure washers',
  'Sauger': 'Vacuum cleaners',
  'Boden- & Dampfreiniger': 'Floor & steam cleaners',
  'Trennschleifer': 'Cut-off saws',
  'Rüttelplatten': 'Plate compactors',
  'Kompressoren': 'Compressors',
  'Stromerzeuger': 'Generators',
  'Pumpen': 'Pumps',
  'Erdbohrer': 'Earth augers',
  'E-Bikes': 'E-bikes',
  'Mountainbikes': 'Mountain bikes',
  'Zubehör & Sonstiges': 'Accessories & more',
  Sonstiges: 'Other',
};
const mainName = (n) => L(n, MAIN_EN[n] || n);
const deviceName = (n) => L(n, DEVICE_EN[n] || n);
const DRIVE = {
  de: { akku: 'Akku', benzin: 'Benzin', elektro: 'Elektro', diesel: 'Diesel', manuell: 'Ohne Motor' },
  en: { akku: 'Battery', benzin: 'Petrol', elektro: 'Electric', diesel: 'Diesel', manuell: 'No motor' },
};
const driveName = (k) => (k ? DRIVE[LANG][k] : undefined);
const systemName = (s) => (s ? L(`${s}-System`, `${s} system`) : '');

// Departments and positions of the team (from the app's team list)
const DEP_EN = {
  Geschaeftsfuehrung: 'Management',
  Buchhaltung: 'Accounting',
  'Service / Reparatur': 'Service / repairs',
  'Verkauf E-Bikes': 'Sales e-bikes',
  'Verkauf Motorgeraete / Kaercher': 'Sales power tools / Kärcher',
  'Werkstatt Zweirad': 'Bicycle workshop',
  'Werkstatt Motorgeraete': 'Power tool workshop',
  Maehroboter: 'Robotic mowers',
  Kaercher: 'Kärcher',
  Hausmeister: 'Caretaking',
};
const POSITION_EN = {
  'Geschäftsführer': 'Managing Director',
  'Geschäftsführerin': 'Managing Director',
  Buchhaltung: 'Accounting',
  'Buchhaltung | Garantie': 'Accounting | Warranty',
  'Die gute Seele des Betriebes': 'The heart and soul of the business',
  Ersatzteilservice: 'Spare parts service',
  Kundendienst: 'Customer service',
  'Reparatur- und Serviceannahme': 'Repair and service reception',
  'Verkauf - Experte E-Bikes': 'Sales, e-bike expert',
  'Verkauf - Experte E-Bikes u. Motorgeräte': 'Sales, e-bike and power tool expert',
  'Verkauf - Experte Kärcher': 'Sales, Kärcher expert',
  'Verkauf - Experte Motorgeräte': 'Sales, power tool expert',
  'Auszubildender Zweiradmechatroniker': 'Apprentice bicycle mechatronics technician',
  'Auszubildende Zweiradmechatronikerin': 'Apprentice bicycle mechatronics technician',
  'Auszubildender Zweiradmechatronikerin': 'Apprentice bicycle mechatronics technician',
  Zweiradmechaniker: 'Bicycle mechanic',
  Zweiradmechanikerin: 'Bicycle mechanic',
  Zweiradmechanikermeisterin: 'Master bicycle mechanic',
  Zweiradmechanikermeister: 'Master bicycle mechanic',
  Zweiradmechatroniker: 'Bicycle mechatronics technician',
  Zweiradmechatronikerin: 'Bicycle mechatronics technician',
  'Zweiradmechatroniker - Serviceannahme': 'Bicycle mechatronics technician, service reception',
  'Mechaniker Motorgeräte': 'Power tool mechanic',
  'Werkstattleitung Motorgeräte': 'Head of the power tool workshop',
  'Experte - Mähroboter': 'Robotic mower expert',
  'Kärcher Monteur Außendienst': 'Kärcher field service technician',
  'Kärcher Werkstattleitung': 'Head of the Kärcher workshop',
  Hausmeister: 'Caretaker',
  Hausmeisterin: 'Caretaker',
};
const depName = (key, label) => L(label, DEP_EN[key] || label);
const positionName = (p) => L(p || '', POSITION_EN[String(p || '').trim()] || p || '');

// Public holidays and other closed days (names from the app's settings)
const HOLIDAY_EN = {
  Neujahr: "New Year's Day",
  'Heilige Drei Könige': 'Epiphany',
  Karfreitag: 'Good Friday',
  Ostersonntag: 'Easter Sunday',
  Ostermontag: 'Easter Monday',
  'Tag der Arbeit': 'Labour Day',
  'Christi Himmelfahrt': 'Ascension Day',
  Pfingstsonntag: 'Whit Sunday',
  Pfingstmontag: 'Whit Monday',
  Fronleichnam: 'Corpus Christi',
  'Tag der Deutschen Einheit': 'German Unity Day',
  Reformationstag: 'Reformation Day',
  Allerheiligen: "All Saints' Day",
  Heiligabend: 'Christmas Eve',
  '1. Weihnachtstag': 'Christmas Day',
  '1. Weihnachtsfeiertag': 'Christmas Day',
  'Erster Weihnachtstag': 'Christmas Day',
  '2. Weihnachtstag': 'Boxing Day',
  '2. Weihnachtsfeiertag': 'Boxing Day',
  'Zweiter Weihnachtstag': 'Boxing Day',
  Silvester: "New Year's Eve",
  Inventur: 'Stocktaking',
  Betriebsferien: 'Company holiday',
  Geschlossen: 'Closed',
};
const holidayName = (n) => L(n, HOLIDAY_EN[String(n || '').trim()] || n);

// ── Technical data of the products ──────────────────
// The most common labels of the shop's data and the manufacturers' data
// sheets (about 85 % of all rows). Labels that are not listed stay German.
const SPEC_EN = {
  Leistung: 'Power', Gewicht: 'Weight', Schalldruckpegel: 'Sound pressure level', Schallleistungspegel: 'Sound power level',
  Schnittlänge: 'Cutting length', Nennspannung: 'Rated voltage', Hubraum: 'Displacement', 'Vibrationswert rechts': 'Vibration value right',
  'Vibrationswert links': 'Vibration value left', 'Akku-System': 'Battery system', 'Akku System': 'Battery system', 'Empfohlener Akku': 'Recommended battery',
  'Max. Spannung': 'Max. voltage', 'Gerätegewicht ohne Akku': 'Weight without battery', Leistungsaufnahme: 'Power consumption', Motor: 'Motor',
  'IP Schutzgrad': 'IP rating', 'Gerätegewicht unbetankt': 'Weight without fuel', Arbeitsbreite: 'Working width', CO2: 'CO2', Zahnabstand: 'Tooth spacing',
  'Schienenlänge': 'Guide bar length', Nutbreite: 'Groove width', 'Sägekettenteilung': 'Saw chain pitch',
  'Vibrationswert links im Rechtshänderbetrieb': 'Vibration value left (right-handed use)', 'Vibrationswert rechts im Rechtshänderbetrieb': 'Vibration value right (right-handed use)',
  'Gerätelänge mit Krallenanschlag': 'Length with bumper spike', 'Länge': 'Length', Tankinhalt: 'Tank capacity', Breite: 'Width', 'Höhe': 'Height', Hubzahl: 'Stroke rate',
  Antrieb: 'Drive', 'Sägekette': 'Saw chain', 'Erklärung maximale Laufzeit': 'Note on maximum run time', 'Erklärung minimale Laufzeit': 'Note on minimum run time',
  Leistungsgewicht: 'Power-to-weight ratio', Schneidkreisdurchmesser: 'Cutting circle diameter', 'Gerätelänge ohne Schneidwerkzeug': 'Length without cutting tool',
  Laufzeit: 'Run time', 'K-Wert': 'K value', 'Systemgewicht unbetankt': 'System weight without fuel', Spannung: 'Voltage', Motortyp: 'Motor type',
  'Max. Luftgeschwindigkeit mit Rund-Düse': 'Max. air speed with round nozzle', 'Luftdurchsatz mit Rund-Düse': 'Air flow with round nozzle',
  'Blaskraft mit Rund-Düse': 'Blowing force with round nozzle', 'Gerätelänge mit Messer': 'Length with blade', Schneidkreis: 'Cutting circle',
  'Flächenleistung': 'Area performance', 'Max. Leistung': 'Max. power', 'Gesamtlänge': 'Overall length', Artikelnummer: 'Item number',
  'Gerätebreite': 'Width', 'Gerätehöhe': 'Height', 'Schlauchlänge': 'Hose length', Arbeitsdruck: 'Working pressure',
  'Standard-Schneidwerkzeug': 'Standard cutting tool', Kette: 'Chain', 'Schalldruckpegel 15 m Entfernung': 'Sound pressure level at 15 m',
  'Max. Wasserzulauftemperatur': 'Max. inlet water temperature', 'Gerätegewicht ohne Kabel': 'Weight without cable', Nennleistung: 'Rated power',
  Tankvolumen: 'Tank volume', Leistungsquelle: 'Power source', Fadenkopf: 'Trimmer head', 'Max. Druck': 'Max. pressure', Kraftstoff: 'Fuel',
  'Max. Gerätelänge mit Werkzeug': 'Max. length with tool', 'Max. Wasserdurchsatz': 'Max. water flow', Schnittbreite: 'Cutting width', Frequenz: 'Frequency',
  Ladezeit: 'Charging time', 'Min. Wasserdurchsatz': 'Min. water flow', 'Motor / Akku System': 'Motor / battery system', Messerbalken: 'Cutter bar',
  'Aststärke': 'Branch thickness', Behälterinhalt: 'Container capacity', 'Maximale Motordrehzahl': 'Max. engine speed', 'EAN Code': 'EAN code',
  'Gerätegewicht': 'Weight', 'Volumenstrom an Turbine': 'Air flow at the fan', 'Gerätelänge': 'Length', Grasschneideblatt: 'Grass cutting blade',
  Akku: 'Battery', 'Motorölvolumen': 'Engine oil capacity', Motorleistung: 'Engine power', 'Geeignet für': 'Suitable for', 'Bürstendurchmesser': 'Brush diameter',
  'Passend für': 'Fits', 'Maße': 'Dimensions', Phasenanzahl: 'Number of phases', 'Maximale Schnitttiefe': 'Max. cutting depth', Motordrehzahl: 'Engine speed',
  Geschwindigkeit: 'Speed', 'Artikel-Nr.': 'Item no.', 'Art.-Nr.': 'Item no.', Bruttogewicht: 'Gross weight', Nettogewicht: 'Net weight',
  Verpackungsbreite: 'Packaging width', 'Verpackungslänge': 'Packaging length', 'Verpackungshöhe': 'Packaging height',
  'Systemgewicht ohne Akku': 'System weight without battery', Getriebe: 'Gearbox', Startsystem: 'Starting system', Verdichtungstiefe: 'Compaction depth',
  'Länge bis Kupplungsmuffe': 'Length to coupling sleeve', 'Min. Gerätelänge mit Werkzeug': 'Min. length with tool', 'Luftdurchsatz mit Flach-Düse': 'Air flow with flat nozzle',
  Motormodell: 'Engine model', 'Zubehör': 'Accessories', Drehzahl: 'Speed', Schutzklasse: 'Protection class', 'Aufstellmaß': 'Footprint', 'Gerätetiefe': 'Depth',
  Dickichtmesser: 'Brush knife', 'Gehäuse': 'Housing', 'Spaltlänge': 'Splitting length', 'Schalldruckpegel gemessen LpA': 'Measured sound pressure level LpA',
  'Schallleistungspegel garantiert LWA': 'Guaranteed sound power level LWA', 'Unsicherheitsfaktor Schalldruckpegel KpA': 'Uncertainty sound pressure level KpA',
  Display: 'Display', Schaltung: 'Gears', Bremsen: 'Brakes', Trockengewicht: 'Dry weight', Start: 'Start', Tank: 'Tank', 'Bürste': 'Brush',
  Trennscheibendurchmesser: 'Cutting wheel diameter', 'Gerätelänge mit Trennscheibe': 'Length with cutting wheel', Radtyp: 'Wheel type',
  'Breite Frässchnecke': 'Auger width', Wurfleistung: 'Throwing capacity', 'Ausführung': 'Version', 'Gewicht ohne Akku': 'Weight without battery',
  'Behälter': 'Container', Spaltkraft: 'Splitting force', Arbeitsgeschwindigkeit: 'Working speed', 'Max. Astdurchmesser': 'Max. branch diameter',
  'Nenndrehzahl Arbeitswerkzeug': 'Rated speed of the cutting tool', Schneidwerkzeug: 'Cutting tool', 'Max. Gerätehöhe': 'Max. height', IPX: 'IPX',
  'Typ des Motors': 'Motor type', 'Akku-Set': 'Battery set', 'Lithium Akku Nennleistung': 'Lithium battery rated capacity', 'Gewicht ohne Batterie': 'Weight without battery',
  Arbeitszeit: 'Working time', 'Ansaughöhe': 'Suction height', 'Förderdruck': 'Delivery pressure', Nenndrehzahl: 'Rated speed', Leergewicht: 'Empty weight',
  Luftdurchsatz: 'Air flow', Zentrifugalkraft: 'Centrifugal force', 'Verpackungsmaße': 'Packaging dimensions', Beschreibung: 'Description',
  'Motor marke': 'Engine brand', 'Motor Marke': 'Engine brand', 'Motor Typ': 'Engine type', 'Räder': 'Wheels', 'Max. Schnitttiefe': 'Max. cutting depth',
  Luftfiltertyp: 'Air filter type', Antriebstechnik: 'Drive technology', 'Geschwindigkeit vorwärts': 'Forward speed', Einsatzdauer: 'Operating time',
  'Drehrichtung Bürste': 'Brush rotation', Bereifung: 'Tyres', 'Schall-Leistungspegel': 'Sound power level', Kettenteilung: 'Chain pitch',
  'Behältervolumen': 'Container volume', 'Max. Luftgeschwindigkeit mit Flach-Düse': 'Max. air speed with flat nozzle', 'Schalldruckpegel / Schallleistungspegel': 'Sound pressure / sound power level',
  Messer: 'Blade', 'Rücklaufgeschwindigkeit': 'Return speed', Spaltgutdurchmesser: 'Log diameter', 'Schall-Druckpegel': 'Sound pressure level',
  Schnittgeschwindigkeit: 'Cutting speed', Material: 'Material', 'Batterieladegerät': 'Battery charger', 'Kehrbürste': 'Sweeping brush', Rahmenfarbe: 'Frame colour',
  'Schnitthöhe': 'Cutting height', Kapazität: 'Capacity', 'Gesamtförderhöhe': 'Total head', 'max. Korngröße': 'Max. particle size',
  'Betriebsdauer pro Tankfüllung': 'Run time per tank', Schalldruck: 'Sound pressure', 'Motorleistung, max.': 'Max. engine power', 'Motoröl': 'Engine oil',
  'Aststärke Ø, max.': 'Max. branch diameter', 'Drehzahl der Messer': 'Blade speed', Verpackung: 'Packaging', 'Baumaße': 'Dimensions', 'Max. Vorschub': 'Max. feed',
  'Vibrationsstöße': 'Impact rate', 'Plattengröße': 'Plate size', Fangsackvolumen: 'Grass bag volume', 'Häckselverhältnis': 'Shredding ratio',
  'Überlastungsschutz': 'Overload protection', 'Füllmenge Motoröl': 'Engine oil capacity', Drehrichtung: 'Direction of rotation', 'Akku-Laufzeit': 'Battery run time',
  'Akku-Ladezeit': 'Battery charging time', Betriebsart: 'Operating mode', Kabellänge: 'Cable length', 'Länge der Klinge': 'Blade length', Batterietyp: 'Battery type',
  'Max. Werkzeuglänge': 'Max. tool length', Feature: 'Feature', Features: 'Features', 'Min. Arbeitsdruck': 'Min. working pressure', 'Max. Arbeitsdruck': 'Max. working pressure',
  Radantrieb: 'Wheel drive', Lieferumfang: 'Scope of delivery', Materialnummer: 'Material number', 'Rahmenh./Form': 'Frame size / shape', 'Kraftübertragung': 'Power transmission',
  Luftgeschwindigkeit: 'Air speed', Betriebsgewicht: 'Operating weight', Ausstattung: 'Equipment', Abmessungen: 'Dimensions', Dauerleistung: 'Continuous power',
  'Max. Volumenstrom': 'Max. flow rate', Trennscheibe: 'Cutting wheel', 'Gerätelänge mit Werkzeug': 'Length with tool', Netzspannung: 'Mains voltage',
  Batteriekapazität: 'Battery capacity', 'Maximale Luftgeschwindigkeit': 'Max. air speed', 'Anzahl Akkus': 'Number of batteries', 'Gewicht inkl. Verpackung': 'Weight incl. packaging',
  'Reifengröße': 'Tyre size', 'Fördermenge': 'Delivery rate', Rahmen: 'Frame', Licht: 'Lights', 'Schnitthöhenverstellung': 'Cutting height adjustment',
  'Transportgewicht': 'Transport weight', Typ: 'Type', 'Motor / Antrieb': 'Motor / drive', 'Antrieb / Motor': 'Drive / motor', Schutzart: 'Protection rating',
  Motorbremse: 'Engine brake', 'Häckselleistung': 'Shredding capacity', Tragegurt: 'Harness', 'Vibrationswert links / rechts': 'Vibration value left / right',
  Kehrgutbehälter: 'Debris container', Schneeschild: 'Snow blade', Set: 'Set', 'Grundgerät': 'Tool only', Standard: 'Standard',
  // bicycles (manufacturer data sheets)
  'Laufradgröße': 'Wheel size', Reifen: 'Tyres', Gabel: 'Fork', 'Sattelstütze': 'Seat post', 'Gepäckträger': 'Rear rack', Sitzposition: 'Riding position',
  'Gewicht inkl. Akku': 'Weight incl. battery', 'Zul. Gesamtgewicht': 'Max. permitted total weight', 'Max. Geschwindigkeit': 'Max. assisted speed',
  Rahmengröße: 'Frame size', Rahmenform: 'Frame shape', Rahmenmaterial: 'Frame material', Federgabel: 'Suspension fork', Sattel: 'Saddle', Lenker: 'Handlebar',
  Vorbau: 'Stem', Pedale: 'Pedals', Kurbel: 'Crank', Schaltwerk: 'Rear derailleur', Kassette: 'Cassette', 'Ständer': 'Kickstand', Schutzbleche: 'Mudguards',
  Reichweite: 'Range', Ladegerät: 'Charger', Drehmoment: 'Torque', Farbe: 'Colour', Modelljahr: 'Model year', Naben: 'Hubs', Felgen: 'Rims',
  // further rows that occur on several pages
  'Max. zulässige Schräglage des Motors': 'Max. permitted engine tilt', 'Nicht verwendbar mit': 'Not compatible with', 'Max. Saugschlauchlänge': 'Max. suction hose length',
  'Öltankvolumen': 'Oil tank capacity', 'Plattenlänge': 'Plate length', 'Schwenkbereich Bürste': 'Brush swivel range', 'Bürstenantrieb': 'Brush drive',
  'Fangkorb Kapazität': 'Grass box capacity', 'Ölmenge Antriebsgehäuse': 'Gearbox oil capacity', 'Transporträder': 'Transport wheels', 'Höhe Fräsgehäuse': 'Auger housing height',
  'Durchmesser Frässchnecke': 'Auger diameter', 'Typ Frässchnecke': 'Auger type', 'Lenkerhöhenverstellung': 'Handlebar height adjustment', 'Führungsrad / Tastrad': 'Guide wheel',
  'Hydrauliköl Kapazität': 'Hydraulic oil capacity', 'Hydraulikölmenge': 'Hydraulic oil capacity', 'Länge der Linie': 'Line length', 'Geräteanschluss': 'Tool connection',
  'Vorwärtsgänge': 'Forward gears', 'Rückwärtsgänge': 'Reverse gears', Kühlung: 'Cooling', 'Zündanlage': 'Ignition', 'Düse': 'Nozzle', 'Füllmenge': 'Filling quantity',
  'Bürstenmaterial': 'Brush material', 'Bürstenabdeckung': 'Brush cover', 'Min. Werkzeuglänge': 'Min. tool length', 'Blaskraft mit Flach-Düse': 'Blowing force with flat nozzle',
  'Gewicht netto': 'Net weight', 'Gewicht brutto': 'Gross weight', 'Bürstendrehzahl': 'Brush speed', 'Empfohlen für': 'Recommended for', 'Zusätzliche Funktionen': 'Additional functions',
  'Zubehör im Lieferumfang': 'Accessories included', 'Geschwindigkeit Vorwärts': 'Forward speed', 'Bohrung und Hub': 'Bore and stroke', 'Geräuschepegel': 'Noise level',
  'Anschlüsse Durchmesser': 'Connection diameter', 'Hydrauliköldruck': 'Hydraulic oil pressure', 'Hydraulikölvolumen': 'Hydraulic oil volume',
};
// Labels that are a known label plus a battery or a mode ("Max. Akkulaufzeit AP 300 S")
const SPEC_PREFIX_EN = [
  ['Max. Akkulaufzeit', 'Max. battery run time'], ['Min. Akkulaufzeit', 'Min. battery run time'],
  ['Max. Schnitte pro Akkuladung', 'Max. cuts per battery charge'], ['Max. Fläche pro Akkuladung', 'Max. area per battery charge'],
  ['Max. Rasenkante pro Akkuladung', 'Max. lawn edge per battery charge'], ['Hubzahl Stufe', 'Stroke rate, level'],
  ['Motorleistung', 'Engine power'], ['Schalldruckpegel', 'Sound pressure level'], ['Schallleistungspegel', 'Sound power level'],
  ['Garantierter Schallleistungspegel', 'Guaranteed sound power level'], ['Garantierter Schall-Leistungspegel', 'Guaranteed sound power level'],
  ['Max. Akku-Laufzeit', 'Max. battery run time'], ['Min. Akku-Laufzeit', 'Min. battery run time'],
];
// The rest of such a label: battery names stay, the tools are translated
const TOOL_EN = [[/\bmit\b/g, 'with'], [/\bFadenmähkopf\b/g, 'trimmer head'], [/\bKunststoffmesser\b/g, 'plastic blade'], [/\bMetallwerkzeug\b/g, 'metal tool']];
const restText = (s) => TOOL_EN.reduce((t, [re, en]) => t.replace(re, en), s);
// Units and additions in brackets or after "in"
const UNIT_EN = [[/\(Liter\)/, '(litres)'], [/\(Zoll\)/, '(inches)'], [/\(o\. Zubehör\)/, '(without accessories)'], [/\(mit Zubehör\)/, '(with accessories)'],
  [/\(ohne Deichsel\)/, '(without drawbar)'], [/\(inkl\. Räder\)/, '(incl. wheels)'], [/\(inkl\. Bürste\)/, '(incl. brush)'], [/\(L × B × H\)/, '(L × W × H)'],
  [/\(L x B x H\)/, '(L x W x H)']];
const unitText = (u) => UNIT_EN.reduce((t, [re, en]) => t.replace(re, en), u);
function specLabel(k) {
  const s = String(k || '').trim();
  if (!isEn()) return s;
  if (SPEC_EN[s]) return SPEC_EN[s];
  // "Länge (mm)", "Tankvolumen (Liter)": the label plus its unit
  const unit = /^(.*?)\s*(\([^()]*(?:\([^()]*\))?[^()]*\))$/.exec(s);
  if (unit && SPEC_EN[unit[1]]) return `${SPEC_EN[unit[1]]} ${unitText(unit[2])}`;
  // "Verpackungslänge in mm", "Gewicht in kg"
  const inUnit = /^(.*?) (?:in )?(mm|cm|m|kg|g|s|l)$/.exec(s);
  if (inUnit && SPEC_EN[inUnit[1]]) return `${SPEC_EN[inUnit[1]]} (${inUnit[2]})`;
  for (const [de, en] of SPEC_PREFIX_EN) if (s.startsWith(`${de} `)) return `${en} ${restText(s.slice(de.length + 1))}`;
  return s;
}
const SPEC_VALUE_EN = {
  ja: 'Yes', nein: 'No', 'ja - schwenkräder': 'Yes, swivel castors', benzin: 'Petrol', 'benzin bleifrei': 'Unleaded petrol', akku: 'Battery', elektro: 'Electric',
  bürstenlos: 'Brushless', serienmäßig: 'Standard', kunststoff: 'Plastic', 'höchste leistung': 'Highest power', 'niedrigste leistung': 'Lowest power',
  seilzug: 'Pull cord', 'links/rechts': 'Left/right', links: 'Left', rechts: 'Right', einphasig: 'Single-phase', dreiphasig: 'Three-phase',
  'hydraulische scheibenbremsen': 'Hydraulic disc brakes', reversierstart: 'Recoil start', durchgehend: 'Continuous', 'lithium-ionen': 'Lithium-ion',
  fliehkraftkupplung: 'Centrifugal clutch', gleichzeitig: 'Simultaneous', mechanisch: 'Mechanical', inklusive: 'Included', 'nicht enthalten': 'Not included',
  handstart: 'Manual start', 'handstart, elektrostart': 'Manual start, electric start', elektrostart: 'Electric start', elektroanlasser: 'Electric starter',
  stahl: 'Steel', stahlblech: 'Sheet steel', aluminium: 'Aluminium', luft: 'Air', 'ohne radantrieb': 'Without wheel drive', 'mit radantrieb': 'With wheel drive',
  vorwärts: 'Forward', automatisch: 'Automatic', schwarz: 'Black', manuell: 'Manual', stufenlos: 'Continuously variable', zweistufig: 'Two-stage',
  ölbad: 'Oil bath', 'kunststoff, gummiert': 'Plastic, rubberised', nylon: 'Nylon', textil: 'Textile', keinen: 'None', 'mit bürsten': 'With brushes',
  'vertikal und horizontal': 'Vertical and horizontal', 'kette + riemen': 'Chain + belt', 'gebogene welle': 'Curved shaft', 'verstärkter stahl': 'Reinforced steel',
  aufrecht: 'Upright', sportlich: 'Sporty', 'aluminium, gefedert': 'Aluminium, suspension', '1 vorwärtsgang': '1 forward gear', '1 vorwärts': '1 forward',
  '1 vorwärts + 1 rückwärts': '1 forward + 1 reverse', '2 vorwärts + 1 rückwärts': '2 forward + 1 reverse', '6 vorwärts + 2 rückwärts': '6 forward + 2 reverse',
  '1 gang radantrieb': 'Single-speed wheel drive', sprühen: 'Spraying', 'spritzen, sprühen': 'Spraying', '6 stück': '6 pieces', weiß: 'White', grau: 'Grey', blau: 'Blue', rot: 'Red', grün: 'Green', silber: 'Silver',
};
// Words in variant names ("29"/ 58 cm / Herren", "Rahmenfarbe Schwarz matt").
// Manufacturer colour names ("midnightplum") stay as they are.
const WORD_EN = { Herren: 'Men’s', Damen: 'Women’s', Schwarz: 'Black', 'Weiß': 'White', Grau: 'Grey', Blau: 'Blue', Rot: 'Red', 'Grün': 'Green',
  Silber: 'Silver', Gelb: 'Yellow', Orange: 'Orange', Braun: 'Brown', 'glänzend': 'gloss', Tiefeinsteiger: 'Low-step', Trapez: 'Trapeze' };
const wordsText = (s) => s.replace(/[A-Za-zÄÖÜäöüß]+/g, (w) => WORD_EN[w] || w);
// German left in a text the page shows in English: such texts get lang="de".
// A rough check (umlauts or common German words), only used for that mark.
const GERMAN_RE = /[äöüßÄÖÜ]|\b(und|oder|mit|ohne|für|inkl|bis|bei|zum|zur|der|die|das|des|dem|den|ein|eine|einer|vorne|hinten|vorwärts|Gang|Stück|Herren|Damen|Schwarz|Rahmen|verstellbar\w*|gefedert|integriert|optional\w*|Nabenschaltung|Federweg|Traglast|Farbdisplay|Schiebehilfe|Scheibenbremsen?|Reifen|Düsen?|Stahl\w*|Kunststoff\w*|Walze|Zähnen|Schlüssel|Lanze)\b/i;
const looksGerman = (s) => GERMAN_RE.test(String(s || ''));
// German decimal commas and thousands points in the English pages
const enNumbers = (s) => String(s).replace(/(?<![\d.,])(\d{1,3}(?:\.\d{3})+(?:,\d+)?|\d+,\d+)(?![\d.,]*\d)/g, (tok) => {
  if (/^0\./.test(tok)) return tok;
  const [i, f] = tok.replace(/\./g, '').split(',');
  return i.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + (f ? `.${f}` : '');
});
function specValue(v) {
  const s = String(v ?? '');
  if (!isEn()) return s;
  // "2,9 kW bei 3600 U/min" -> "2.9 kW at 3600 rpm"
  return SPEC_VALUE_EN[s.trim().toLowerCase()]
    || enNumbers(s).replace(/(\d)\s*U\/min\b/g, '$1 rpm').replace(/(\d\s*\S*)\s+bei\s+(?=\d)/g, '$1 at ');
}
// A label of the data that has no English text yet: the data is German, so
// it is German too (unless it is only a short code like "IPX")
function labelIsGerman(k) {
  const s = String(k || '').trim();
  return isEn() && !SPEC_EN[s] && specLabel(s) === s && /[A-Za-zÄÖÜäöüß]{3,}/.test(s);
}
// Variant labels are made of the same labels: "Schnittlänge 35 cm, Gewicht 4,5 Kg"
function variantLabel(label) {
  const s = String(label || '');
  if (!isEn()) return s;
  const keys = Object.keys(SPEC_EN).sort((a, b) => b.length - a.length);
  return s.split(/,\s*/).map((part) => {
    const key = keys.find((k) => part === k || part.startsWith(`${k} `) || part.startsWith(`${k}:`));
    if (!key) return wordsText(enNumbers(part));
    const rest = part.slice(key.length).replace(/^:?\s*/, '');
    const value = SPEC_VALUE_EN[rest.toLowerCase()] || wordsText(enNumbers(rest)).replace(/\bKg\b/, 'kg');
    return `${SPEC_EN[key]} ${value}`.trim();
  }).join(', ').replace(/,\s*$/, '');
}
// Equipment notes of the shop: the common ones in English, the others stay German
const NOTE_EN = {
  'ohne akku und ladegerät': 'Without battery and charger',
  'ohne akku u. ladegerät': 'Without battery and charger',
  'für arbeiten im privaten bereich und in handwerksbetrieben': 'For private use and trade businesses',
  'benzin-motorsäge für die grundstückspflege': 'Petrol chainsaw for property maintenance',
  'starre antriebswelle': 'Rigid drive shaft',
  'doppelseitig geschliffene messer': 'Double-sided blades',
  'einseitig geschliffene messer': 'Single-sided blades',
  'inkl. drehbarer multifunktionsgriff': 'Incl. rotating multi-function handle',
  'seitliche kettenspannung': 'Side-mounted chain tensioner',
  'inkl. traggurt': 'Incl. harness',
  antivibrationssystem: 'Anti-vibration system',
  'inkl. antivibrationssystem': 'Incl. anti-vibration system',
  'inkl. einhand multifunktionsgriff': 'Incl. one-hand multi-function handle',
  'inkl. ergostart': 'Incl. ErgoStart',
  'inkl. rundumgriff': 'Incl. loop handle',
  'kraftstoff benzin bleifrei': 'Fuel: unleaded petrol',
  'kraftstoff benzin': 'Fuel: petrol',
  'inkl. frachtkosten des herstellers': "Incl. the manufacturer's freight costs",
  'inkl. flexible antriebswelle': 'Incl. flexible drive shaft',
  'inkl. zweihandgriff / mählenker': 'Incl. two-hand bike handle',
  'weiche pflanzenteile': 'Soft plant material',
  elastostart: 'ElastoStart',
  'lange serviceintervalle durch langzeit-luftfiltersystem': 'Long service intervals thanks to the long-life air filter system',
  'langzeit luftfiltersystem': 'Long-life air filter system',
  '1 gang radantrieb': 'Single-speed wheel drive',
  'stufenlose längenverstellung des blasrohrs': 'Infinitely adjustable blower tube length',
  'werkzeuglose griffpositionsverstellung': 'Tool-free handle adjustment',
  'inkl. doppelschultergurt': 'Incl. double shoulder harness',
  'für die arbeit in landwirtschaft, bauwirtschaft und gartenbau': 'For work in agriculture, construction and horticulture',
  'einfaches starten und optimale motorleistung dank stihl m-tronic': 'Easy starting and optimum engine performance thanks to STIHL M-Tronic',
  'inkl. 4 punkt antivibrationssystem': 'Incl. 4-point anti-vibration system',
  'inkl. bügelgriff': 'Incl. loop handle',
  'kombiwerkzeug stihl': 'STIHL KombiTool',
};
// [text, translated]: untranslated notes keep lang="de" in the page
function noteText(n) {
  const s = String(n || '').trim();
  if (!isEn()) return [s, true];
  const t = NOTE_EN[s.toLowerCase()];
  return t ? [t, true] : [s, false];
}

module.exports = {
  setLang, lang, isEn, L, locale, num, MAIN_EN, DEVICE_EN, mainName, deviceName, driveName, systemName,
  depName, positionName, holidayName, HOLIDAY_EN, specLabel, specValue, variantLabel, noteText, enNumbers, looksGerman, labelIsGerman,
};
