// Fixed texts of the website. Facts only from the company's own pages
// (old wilkenpoelker.de, wilpo.net) and the app; nothing invented.
// The English texts are below (EN); txt() gives the set of the page language.
const { L, isEn } = require('./i18n');

const COMPANY = {
  name: 'Wilken Poelker',
  legalName: 'Wilken Poelker GmbH & Co. KG',
  street: 'Langholter Straße 43',
  zip: '26842',
  city: 'Ostrhauderfehn',
  region: 'Niedersachsen',
  country: 'DE',
  // On the English pages the numbers are written for calls from abroad
  get phone() { return L('04952 5304', '+49 4952 5304'); },
  phoneHref: 'tel:+4949525304',
  phoneLd: '+49 4952 5304',
  get fax() { return L('04952 5096', '+49 4952 5096'); },
  faxLd: '+49 4952 5096',
  email: 'info@wilkenpoelker.de',
  founded: 1951,
  founder: 'Wilken Poelker',
  employees: 40,
  get salesArea() { return L('2.000\u00a0m²', '2,000\u00a0m²'); },
  get testTrack() { return L('2.500\u00a0m²', '2,500\u00a0m²'); },
  facebook: 'https://www.facebook.com/WilkenPoelker/',
  instagram: 'https://www.instagram.com/wilkenpoelker/',
  appStore: 'https://apps.apple.com/de/app/wilken-poelker/id6832653097',
  playStore: 'https://play.google.com/store/apps/details?id=com.hyoukacreativestudios.wilkenpoelker',
  appleAppId: '6832653097',
  // Building on OpenStreetMap (way 939467625)
  geo: { lat: 53.1129, lng: 7.6145 },
  // Towns around the shop, for local search (schema.org areaServed and the visit text)
  area: ['Ostrhauderfehn', 'Rhauderfehn', 'Westoverledingen', 'Leer', 'Papenburg', 'Saterland', 'Barßel', 'Detern', 'Uplengen', 'Moormerland'],
};
const ADDRESS_LINE = `${COMPANY.street}, ${COMPANY.zip} ${COMPANY.city}`;
const MAPS_QUERY = `${COMPANY.legalName}, ${ADDRESS_LINE}`;
const MAPS = {
  route: `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(MAPS_QUERY)}`,
  appleRoute: `https://maps.apple.com/?daddr=${encodeURIComponent(ADDRESS_LINE)}`,
  open: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(MAPS_QUERY)}`,
  get embed() { return `https://www.google.com/maps?q=${encodeURIComponent(MAPS_QUERY)}&hl=${isEn() ? 'en' : 'de'}&z=15&output=embed`; },
};

// The product categories of the app (MAIN_GROUPS in productGrouping.js) with
// texts for the category pages. icon = symbol in assets/icons.svg
const MAIN = {
  'Sägen & Holz': {
    icon: 'saw',
    photo: 'laden7',
    title: 'Motorsägen, Hochentaster und Holzspalter',
    intro: 'Für Brennholz, Baumpflege und den Forst: Motorsägen mit Benzin- oder Akkuantrieb, Hochentaster für hohe Äste, Gehölzschneider und Holzspalter. Wir beraten Sie zur passenden Schnittlänge, übergeben Ihre Säge montiert und eingestellt und zeigen Ihnen die sichere Handhabung direkt am Gerät. Für Motorsägen sind wir QMF-zertifizierter Fachbetrieb.',
  },
  'Rasen & Wiese': {
    icon: 'grass',
    photo: 'laden8',
    title: 'Rasenmäher, Mähroboter und Freischneider',
    intro: 'Vom Akku-Rasenmäher für den Reihenhausgarten bis zum Freischneider für die Wiese. Unsere Mähroboter-Experten sehen sich auf Wunsch Ihr Grundstück an und betreuen das Gerät über viele Saisons. Für Rasenmäher, Rasentraktoren und Motorsensen sind wir QMF-zertifiziert.',
  },
  'Hecke & Garten': {
    icon: 'leaf',
    photo: 'laden2',
    title: 'Heckenscheren, Häcksler und Gartengeräte',
    intro: 'Heckenscheren mit Akku oder Benzin, Häcksler für Grünschnitt, Motorhacken, Einachser, Spritzgeräte und Kombigeräte mit wechselbaren Werkzeugen. Wir zeigen Ihnen, welches Gerät zu Ihrem Garten passt, und halten Ersatzteile und Verschleißteile bereit.',
  },
  'Laub, Kehren & Winter': {
    icon: 'wind',
    photo: 'laden14',
    title: 'Laubbläser, Kehrmaschinen und Schneefräsen',
    intro: 'Laubbläser und Laubsauger, Kehrmaschinen und Radialbesen für Hof und Einfahrt, Geräte zur Wildkrautentfernung und Schneefräsen für den Winter. Für Kehrmaschinen sind wir QMF-zertifizierter Fachbetrieb.',
  },
  Reinigen: {
    icon: 'drop',
    photo: 'kaercher1',
    title: 'Hochdruckreiniger und Sauger',
    intro: 'Hochdruckreiniger, Nass- und Trockensauger und Reinigungsmaschinen für Zuhause, Handwerk und Gewerbe. Als autorisierter Kärcher-Händler führen wir die gesamte Kärcher-Palette, mit eigener Kärcher-Werkstatt und einem Monteur im Außendienst.',
  },
  'Bau & Werkstatt': {
    icon: 'hammer',
    photo: 'laden5',
    title: 'Stromerzeuger, Trennschleifer und Baugeräte',
    intro: 'Trennschleifer, Rüttelplatten, Kompressoren, Stromerzeuger, Pumpen und Erdbohrer für Baustelle, Hof und Werkstatt. Wir beraten Handwerk und Privatkunden und kümmern uns in unserer Werkstatt um Wartung und Reparatur.',
  },
  Fahrräder: {
    icon: 'bike',
    photo: 'bikes-area2',
    title: 'E-Bikes und Fahrräder',
    intro: 'E-Bikes und Fahrräder aus unserem Bestand, mit Probefahrt auf unserer 2.500\u00a0m² großen Teststrecke und Service in der eigenen Zweiradwerkstatt. Unser komplettes Fahrradsortiment mit Größen und Ausstattung finden Sie im Fahrradkatalog.',
  },
  'Zubehör': {
    icon: 'box',
    photo: 'stihl-area',
    title: 'Zubehör',
    intro: 'Zubehör und Verbrauchsmaterial für Ihre Geräte. Ersatzteile bestellen wir für Sie, unser Ersatzteilservice hilft Ihnen gern weiter.',
  },
};

// One sentence per device group (category and device pages, meta descriptions)
const DEVICE = {
  'Motorsägen': 'Motorsägen mit Benzin- oder Akkuantrieb für Brennholz, Baumpflege und Forst.',
  'Hochentaster': 'Hochentaster für Äste in großer Höhe, ohne Leiter.',
  'Gehölzschneider & Astscheren': 'Akku-Astscheren und Gehölzschneider für Obstbaum, Hecke und Strauch.',
  'Holzspalter': 'Holzspalter für das Brennholz, liegend und stehend.',
  'Rasenmäher & Balkenmäher': 'Rasenmäher mit Benzin, Akku oder Kabel und Balkenmäher für hohes Gras.',
  'Mähroboter': 'Mähroboter mit Beratung und Grundstücksbesichtigung durch unsere Experten.',
  'Rasentraktoren': 'Rasentraktoren und Aufsitzmäher für große Flächen.',
  'Rasentrimmer': 'Rasentrimmer für Kanten, Ecken und kleine Flächen.',
  'Freischneider & Motorsensen': 'Freischneider und Motorsensen für Wiese, Böschung und Gestrüpp.',
  'Vertikutierer & Lüfter': 'Vertikutierer und Rasenlüfter für einen dichten, gesunden Rasen.',
  'Heckenscheren': 'Heckenscheren mit Akku, Benzin oder Kabel, auch als Langschaft-Heckenschere.',
  'Häcksler': 'Häcksler für Grünschnitt und Äste.',
  'Motorhacken & Bodenfräsen': 'Motorhacken und Bodenfräsen für Beet und Gemüsegarten.',
  'Einachser': 'Einachser mit Anbaugeräten für Garten, Hof und Landwirtschaft.',
  'Spritzgeräte': 'Spritzen und Sprühgeräte für Pflanzenschutz und Pflege.',
  'Kombigeräte': 'Kombigeräte mit einem Motor und wechselbaren Werkzeugen.',
  'Laubbläser & Laubsauger': 'Laubbläser und Laubsauger mit Akku oder Benzin.',
  'Kehrmaschinen': 'Kehrmaschinen für Hof, Einfahrt und Gewerbeflächen.',
  'Radialbesen': 'Radialbesen für Rasen, Pflaster und Kunstrasen.',
  'Wildkrautentfernung': 'Geräte zur mechanischen Wildkrautentfernung auf Pflaster und Wegen.',
  'Schneefräsen & Räumschilder': 'Schneefräsen und Räumschilder für den Winterdienst.',
  'Hochdruckreiniger': 'Hochdruckreiniger für Haus, Hof, Fahrzeug und Gewerbe.',
  'Sauger': 'Nass- und Trockensauger für Werkstatt, Haushalt und Gewerbe.',
  'Boden- & Dampfreiniger': 'Bodenreiniger und Dampfreiniger für Zuhause und Gewerbe.',
  'Trennschleifer': 'Trennschleifer für Stein, Beton und Metall.',
  'Rüttelplatten': 'Rüttelplatten zum Verdichten von Pflaster und Untergrund.',
  'Kompressoren': 'Kompressoren für Werkstatt und Baustelle.',
  'Stromerzeuger': 'Stromerzeuger für Baustelle, Freizeit und Notstrom.',
  'Pumpen': 'Pumpen für Wasser, Garten und Baustelle.',
  'Erdbohrer': 'Erdbohrer für Pfähle, Zäune und Pflanzlöcher.',
  'E-Bikes': 'E-Bikes mit Probefahrt auf unserer Teststrecke und Service in der eigenen Zweiradwerkstatt.',
  'Mountainbikes': 'Mountainbikes mit Beratung und Probefahrt.',
  'Zubehör & Sonstiges': 'Zubehör und Verbrauchsmaterial für Ihre Geräte.',
};

// Short texts for brand pages (only well-known, verifiable facts)
const BRAND = {
  STIHL: 'STIHL-Geräte gibt es nur im Fachhandel. Bei uns bekommen Sie dazu die Beratung, die einsatzbereite Übergabe mit Einweisung und den Service in unserer Motorgeräte-Werkstatt.',
  'Kärcher': 'Als autorisierter Kärcher-Händler führen wir die gesamte Palette, vom Hochdruckreiniger bis zur Scheuersaugmaschine, mit eigener Kärcher-Werkstatt und Monteur im Außendienst.',
  Kalkhoff: 'E-Bikes von Kalkhoff mit Probefahrt auf unserer Teststrecke und Service in unserer Zweiradwerkstatt.',
};

// Services (all from the old website)
const SERVICES = [
  ['chat', 'Individuelle Beratung', 'Fachkundig und ehrlich. Wir nehmen uns Zeit und finden gemeinsam das passende Gerät, ob für Privat oder Profi.'],
  ['check', 'Betriebsbereite Übergabe', 'Ihr Gerät wird montiert, eingestellt und einsatzbereit an Sie übergeben.'],
  ['hand', 'Persönliche Einweisung', 'Wir zeigen Ihnen Bedienung, Pflege und sichere Handhabung direkt am Gerät.'],
  ['truck', 'Hol- und Bringdienst', 'Auf Wunsch holen wir Geräte zur Wartung oder Reparatur ab und bringen sie wieder zu Ihnen.'],
  ['calendar', 'Wartung und Inspektion', 'Regelmäßige Pflege sorgt dafür, dass Ihre Geräte lange zuverlässig und sicher laufen.'],
  ['wrench', 'Reparatur', 'Unsere Werkstätten für Zweirad, Motorgeräte und Kärcher reparieren schnell und fachgerecht.'],
  ['box', 'Ersatzteillager', 'Viele Teile sind sofort da, alle anderen bestellen wir für Sie. Wir wählen Hersteller, deren Teile es noch lange gibt.'],
  ['euro', 'Finanzierung', 'Größere Anschaffungen lassen sich bei uns auch finanzieren. Sprechen Sie uns im Verkaufsgespräch an.'],
];

const WORKSHOPS = [
  { id: 'zweirad', icon: 'bike', title: 'Zweiradwerkstatt', text: 'Inspektion, Reparatur und Wartung von Fahrrädern und E-Bikes, von Zweiradmechatronikern und einer Zweiradmechanikermeisterin.', points: ['Inspektion und Verschleißteile', 'E-Bike-Service', 'Eigene Serviceannahme'], departments: ['Werkstatt Zweirad'] },
  { id: 'motorgeraete', icon: 'saw', title: 'Motorgeräte-Werkstatt', text: 'Unter eigener Werkstattleitung warten und reparieren wir Rasenmäher, Rasentraktoren, Motorsägen, Freischneider und mehr.', points: ['Wartung vor der Saison', 'Reparatur und Ersatzteile', 'QMF-zertifiziert'], departments: ['Werkstatt Motorgeraete'] },
  { id: 'kaercher', icon: 'drop', title: 'Kärcher-Werkstatt', text: 'Service für Hochdruckreiniger, Sauger und Reinigungsmaschinen, mit eigener Werkstattleitung und Monteur im Außendienst.', points: ['Wartung und Reparatur', 'Monteur im Außendienst', 'Original-Ersatzteile'], departments: ['Kaercher'] },
  { id: 'maehroboter', icon: 'robot', title: 'Mähroboter', text: 'Unsere Mähroboter-Experten beraten Sie zu Ihrem Garten und betreuen Ihr Gerät über viele Saisons.', points: ['Beratung und Grundstücksbesichtigung', 'Wartung und Inspektion', 'Reparatur'], departments: ['Maehroboter'] },
];

const REPAIR_STEPS = [
  ['Annahme', 'Sie bringen Ihr Gerät vorbei, oder wir holen es mit unserem Hol- und Bringdienst ab.'],
  ['Prüfung und Kostenvoranschlag', 'Wir sehen uns das Gerät an und stimmen den Umfang mit Ihnen ab.'],
  ['Ersatzteile', 'Benötigte Teile kommen aus unserem Lager oder werden für Sie bestellt.'],
  ['Reparatur', 'Unsere Fachwerkstatt setzt Ihr Gerät instand.'],
  ['Abholbereit', 'Sie werden benachrichtigt, sobald Ihr Gerät fertig ist, in der App sogar per Push-Nachricht.'],
];

const LEASING_PARTNERS = ['JobRad', 'Lease a Bike', 'Bikeleasing', 'Businessbike', 'Eurorad / AGL'];
const LEASING_STEPS = [
  ['Arbeitgeber fragen', 'Klären Sie, ob und über welchen Anbieter Ihr Arbeitgeber Dienstrad-Leasing anbietet.'],
  ['Rad aussuchen', 'Lassen Sie sich bei uns beraten und fahren Sie Ihr Wunschrad auf unserer Teststrecke Probe.'],
  ['Abwicklung', 'Die weiteren Schritte laufen über Ihren Arbeitgeber und den Leasing-Anbieter. Wir unterstützen Sie dabei.'],
  ['Übergabe und Service', 'Wir übergeben Ihr Rad fahrbereit und kümmern uns um Inspektion und Reparatur.'],
];

const QMF_ITEMS = ['Rasenmäher', 'Rasentraktoren und Aufsitzmäher', 'Motorsensen und Freischneider', 'Motorsägen', 'Kehrmaschinen'];
const KAERCHER_ITEMS = ['Hochdruckreiniger', 'Nass- und Trockensauger', 'Kehrmaschinen', 'Scheuersaugmaschinen', 'Reinigungsmittel'];

const JOBS = [
  ['Verkäufer Motorgeräte (m/w/d)', 'Beratung und Verkauf von Garten-, Forst- und Motortechnik.'],
  ['Motorgerätemechaniker (m/w/d)', 'Wartung und Reparatur in unserer Motorgeräte-Werkstatt.'],
  ['Zweiradmechaniker (m/w/d)', 'Service rund um Fahrräder und E-Bikes in unserer Zweiradwerkstatt.'],
];

// App features (the app is for customers; the website itself has no login)
const APP_FEATURES = [
  ['reparaturen', 'wrench', 'Reparaturstatus', 'Sehen Sie in der App, in welchem Schritt Ihre Reparatur ist.'],
  ['abholbereit', 'bell', 'Abholbereit-Nachricht', 'Push-Nachricht, sobald Ihr Gerät fertig ist.'],
  ['termine', 'calendar', 'Termine anfragen', 'Lieferung, Inspektion, Reparatur oder Grundstücksbesichtigung.'],
  ['chat', 'chat', 'Service-Chat', 'Anfrage mit Foto, Antwort direkt von unserem Team.'],
  ['start', 'sparkle', 'Neuigkeiten und Angebote', 'Aktionen, Neuheiten und die aktuellen Öffnungszeiten.'],
];

// Contact form topics (same keys as the backend, inquiryController TOPICS)
const TOPICS = [
  ['allgemein', 'Allgemeine Frage'],
  ['werkstatt', 'Werkstatt und Reparatur'],
  ['ersatzteile', 'Ersatzteile'],
  ['fahrrad', 'Fahrrad, E-Bike, Leasing'],
  ['kaercher', 'Kärcher und Reinigung'],
  ['maehroboter', 'Mähroboter'],
  ['rueckruf', 'Rückruf'],
];

function faqs(hoursText) {
  return [
    ['Kann ich auf dieser Website bestellen?', 'Nein, wir sind kein Onlineshop und versenden keine Ware. Beratung und Kauf finden persönlich bei uns in Ostrhauderfehn statt. Sie können Produkte unverbindlich anfragen, uns anrufen oder eine E-Mail schreiben. Auf Wunsch liefern wir im Umkreis.'],
    ['Wann haben Sie geöffnet?', hoursText],
    ['Kann ich Geräte und E-Bikes vor dem Kauf ausprobieren?', 'Ja. Auf unserer rund 2.500\u00a0m² großen Outdoor-Teststrecke können Sie Geräte und Räder in Ruhe testen. Unsere Fachberater zeigen Ihnen die Unterschiede direkt am Produkt.'],
    ['Sind Preise und Verfügbarkeit aktuell?', 'Preise und Verfügbarkeit kommen direkt aus unserem Warenwirtschaftssystem, so wie in unserer App. Alle Preise verstehen sich inklusive Mehrwertsteuer. Möchten Sie sichergehen, dass ein Gerät für Sie da ist, rufen Sie uns kurz an.'],
    ['Reparieren und warten Sie auch nach dem Kauf?', 'Selbstverständlich. Wir haben eigene Werkstätten für Zweiräder, Motorgeräte und Kärcher-Technik sowie ein umfangreiches Ersatzteillager. Auf Wunsch holen wir Geräte mit unserem Hol- und Bringdienst ab.'],
    ['Woher weiß ich, wann meine Reparatur fertig ist?', 'Mit der Wilken-Poelker-App sehen Sie den Status Ihrer Reparatur und bekommen eine Push-Nachricht, sobald Ihr Gerät abholbereit ist. Natürlich erreichen Sie uns auch telefonisch unter 04952 5304.'],
    ['Bieten Sie E-Bike-Leasing an?', 'Ja, wir arbeiten mit JobRad, Lease a Bike, Bikeleasing, Businessbike und Eurorad / AGL zusammen. Fragen Sie bei Ihrem Arbeitgeber, welcher Anbieter genutzt wird. Den Rest erklären wir Ihnen gern vor Ort.'],
    ['Gibt es Finanzierungsmöglichkeiten?', 'Ja, wir bieten Finanzierungsmöglichkeiten an. Sprechen Sie uns im Verkaufsgespräch darauf an.'],
  ];
}

// Old addresses of www.wilkenpoelker.de (CMS until 2026) -> new pages. Used
// for the 301 rules in .htaccess when the new site goes live there.
// Category slugs are matched in any folder and with any page number.
const OLD_PAGES = [
  ['home\\.html', '/'],
  ['startseite\\.11b4\\.de\\.html', '/'],
  ['kontakt\\.11cc\\.de\\.html', '/kontakt.html'],
  ['ueber-uns\\.11c2\\.de\\.html', '/ueber-uns.html'],
  ['ueber-uns/unser-team\\.11c3\\.de\\.html', '/ueber-uns.html#team'],
  ['ueber-uns_unser-team\\.11c3\\.de\\.html', '/ueber-uns.html#team'],
  ['ueber-uns/unser-ladengeschaeft\\.11c6\\.de\\.html', '/ueber-uns.html#standort'],
  ['ueber-uns_unser-ladengeschaeft\\.11c6\\.de\\.html', '/ueber-uns.html#standort'],
  ['ueber-uns/autorisierter-kaercher-haendler\\.11c9\\.de\\.html', '/service.html#zertifikate'],
  ['ueber-uns/wir-sind-qmf-zertifizierter-fachhaendler\\.11c7\\.de\\.html', '/service.html#zertifikate'],
  ['ueber-uns/stellenangebote(/.*)?', '/karriere.html'],
  ['aktuelles\\.10\\.de\\.html', '/angebote.html'],
  ['aktuelles/.*', '/angebote.html'],
  ['service\\.14\\.de\\.html', '/service.html'],
  ['service/unsere-services.*', '/service.html#leistungen'],
  ['service/ratgeber.*', '/service.html'],
  ['service/impressum\\.11cf\\.de\\.html', '/impressum.html'],
  ['service/datenschutzerklaerung\\.11cd\\.de\\.html', '/datenschutz.html'],
  ['produkte\\.11\\.de\\.html', '/produkte/'],
  ['marken\\.13\\.de\\.html', '/marken/'],
  ['fahrradshop\\.343a\\.de\\.html', '/fahrraeder.html'],
  ['produkte/fahrraeder\\.11c8\\.de\\.html', '/fahrraeder.html'],
  ['e-bike-leasing\\.2795\\.de\\.html', '/e-bike-leasing.html'],
  ['sortiment\\.html', '/produkte/'],
];
// old category slug -> [main, device]; resolved to existing pages at build time
const OLD_CATEGORIES = {
  forsttechnik: ['Sägen & Holz'],
  motorsaegen: ['Sägen & Holz', 'Motorsägen'],
  hochentaster: ['Sägen & Holz', 'Hochentaster'],
  'gras-strauch-und-heckenscheren': ['Hecke & Garten', 'Heckenscheren'],
  haecksler: ['Hecke & Garten', 'Häcksler'],
  'kombi-systeme': ['Hecke & Garten', 'Kombigeräte'],
  'tragbare-laubsauger-blaeser': ['Laub, Kehren & Winter', 'Laubbläser & Laubsauger'],
  'fahrbare-laubsauger-blaeser': ['Laub, Kehren & Winter', 'Laubbläser & Laubsauger'],
  rasenpflege: ['Rasen & Wiese'],
  rasenmaeher: ['Rasen & Wiese', 'Rasenmäher & Balkenmäher'],
  'hochgras-rasenmaeher': ['Rasen & Wiese', 'Rasenmäher & Balkenmäher'],
  frontmaeher: ['Rasen & Wiese', 'Rasenmäher & Balkenmäher'],
  nullwendekreismaeher: ['Rasen & Wiese', 'Rasentraktoren'],
  maehroboter: ['Rasen & Wiese', 'Mähroboter'],
  'motorsensen-freischneider': ['Rasen & Wiese', 'Freischneider & Motorsensen'],
  rasentrimmer: ['Rasen & Wiese', 'Rasentrimmer'],
  rasentraktoren: ['Rasen & Wiese', 'Rasentraktoren'],
  'rasentraktor-anbaugeraete': ['Rasen & Wiese', 'Rasentraktoren'],
  'vertikutierer-rasenluefter-aerifizierer': ['Rasen & Wiese', 'Vertikutierer & Lüfter'],
  bodenbearbeitung: ['Hecke & Garten'],
  motorhacken: ['Hecke & Garten', 'Motorhacken & Bodenfräsen'],
  erdbohrer: ['Bau & Werkstatt', 'Erdbohrer'],
  reinigungstechnik: ['Reinigen'],
  hochdruckreiniger: ['Reinigen', 'Hochdruckreiniger'],
  'nass-trockensauger': ['Reinigen', 'Sauger'],
  kehrsaugmaschinen: ['Laub, Kehren & Winter', 'Kehrmaschinen'],
  'handgefuehrte-kehrmaschinen': ['Laub, Kehren & Winter', 'Kehrmaschinen'],
  scheuersaugmaschinen: ['Reinigen'],
  'haushalts-gewerbereiniger': ['Reinigen', 'Boden- & Dampfreiniger'],
  spruehgeraete: ['Hecke & Garten', 'Spritzgeräte'],
  'spritzen-spruehgeraete': ['Hecke & Garten', 'Spritzgeräte'],
  wildkrautbeseitigung: ['Laub, Kehren & Winter', 'Wildkrautentfernung'],
  'mechanischen-wildkrautentfernung': ['Laub, Kehren & Winter', 'Wildkrautentfernung'],
  pumpen: ['Bau & Werkstatt', 'Pumpen'],
  'automatische-bewaesserung': ['Hecke & Garten'],
};

// ── English ───────────────────────────────────────────
const MAIN_TEXT_EN = {
  'Sägen & Holz': {
    title: 'Chainsaws, pole pruners and log splitters',
    intro: 'For firewood, tree care and forestry: petrol and battery chainsaws, pole pruners for high branches, pruners and log splitters. We help you choose the right bar length, hand over your saw assembled and adjusted and show you how to use it safely, right on the saw. For chainsaws we are a QMF-certified specialist dealer.',
  },
  'Rasen & Wiese': {
    title: 'Lawn mowers, robotic mowers and brushcutters',
    intro: 'From the battery mower for a small garden to the brushcutter for the meadow. On request our robotic mower experts look at your property and look after your mower for many seasons. For lawn mowers, lawn tractors and brushcutters we are QMF-certified.',
  },
  'Hecke & Garten': {
    title: 'Hedge trimmers, shredders and garden tools',
    intro: 'Battery and petrol hedge trimmers, shredders for green waste, tillers, two-wheel tractors, sprayers and multi-tool systems with interchangeable attachments. We show you which tool suits your garden and keep spare and wear parts in stock.',
  },
  'Laub, Kehren & Winter': {
    title: 'Leaf blowers, sweepers and snow blowers',
    intro: 'Leaf blowers and leaf vacuums, sweepers and power brooms for yards and driveways, tools for removing weeds and snow blowers for the winter. For sweepers we are a QMF-certified specialist dealer.',
  },
  Reinigen: {
    title: 'Pressure washers and vacuum cleaners',
    intro: 'Pressure washers, wet and dry vacuum cleaners and cleaning machines for home, trade and business. As an authorised Kärcher dealer we carry the entire Kärcher range, with our own Kärcher workshop and a field service technician.',
  },
  'Bau & Werkstatt': {
    title: 'Generators, cut-off saws and construction equipment',
    intro: 'Cut-off saws, plate compactors, compressors, generators, pumps and earth augers for building sites, yards and workshops. We advise trade and private customers and take care of maintenance and repairs in our workshop.',
  },
  Fahrräder: {
    title: 'E-bikes and bicycles',
    intro: 'E-bikes and bicycles from our stock, with a test ride on our 2,500 m² test track and service in our own bicycle workshop. Our complete range of bicycles with sizes and equipment is in the bike catalogue.',
  },
  'Zubehör': {
    title: 'Accessories',
    intro: 'Accessories and consumables for your equipment. We order spare parts for you; our spare parts service will be glad to help.',
  },
};

const DEVICE_TEXT_EN = {
  'Motorsägen': 'Petrol and battery chainsaws for firewood, tree care and forestry.',
  'Hochentaster': 'Pole pruners for branches high up, without a ladder.',
  'Gehölzschneider & Astscheren': 'Battery pruning shears and pruners for fruit trees, hedges and shrubs.',
  'Holzspalter': 'Log splitters for firewood, horizontal and vertical.',
  'Rasenmäher & Balkenmäher': 'Petrol, battery and corded lawn mowers, and sickle bar mowers for long grass.',
  'Mähroboter': 'Robotic mowers with advice and a site visit by our experts.',
  'Rasentraktoren': 'Lawn tractors and ride-on mowers for large areas.',
  'Rasentrimmer': 'Grass trimmers for edges, corners and small areas.',
  'Freischneider & Motorsensen': 'Brushcutters and clearing saws for meadows, slopes and undergrowth.',
  'Vertikutierer & Lüfter': 'Scarifiers and lawn aerators for a dense, healthy lawn.',
  'Heckenscheren': 'Battery, petrol and corded hedge trimmers, also as long-reach hedge trimmers.',
  'Häcksler': 'Shredders for green waste and branches.',
  'Motorhacken & Bodenfräsen': 'Tillers and cultivators for flower beds and vegetable gardens.',
  'Einachser': 'Two-wheel tractors with attachments for garden, yard and farm.',
  'Spritzgeräte': 'Sprayers for plant protection and care.',
  'Kombigeräte': 'Multi-tool systems with one motor and interchangeable attachments.',
  'Laubbläser & Laubsauger': 'Battery and petrol leaf blowers and leaf vacuums.',
  'Kehrmaschinen': 'Sweepers for yards, driveways and commercial areas.',
  'Radialbesen': 'Power brooms for lawns, paving and artificial turf.',
  'Wildkrautentfernung': 'Tools for removing weeds mechanically from paving and paths.',
  'Schneefräsen & Räumschilder': 'Snow blowers and snow blades for clearing snow.',
  'Hochdruckreiniger': 'Pressure washers for house, yard, vehicles and business.',
  'Sauger': 'Wet and dry vacuum cleaners for workshop, home and business.',
  'Boden- & Dampfreiniger': 'Floor cleaners and steam cleaners for home and business.',
  'Trennschleifer': 'Cut-off saws for stone, concrete and metal.',
  'Rüttelplatten': 'Plate compactors for paving and subsoil.',
  'Kompressoren': 'Compressors for workshop and building site.',
  'Stromerzeuger': 'Generators for building sites, leisure and emergency power.',
  'Pumpen': 'Pumps for water, garden and building site.',
  'Erdbohrer': 'Earth augers for posts, fences and planting holes.',
  'E-Bikes': 'E-bikes with a test ride on our test track and service in our own bicycle workshop.',
  'Mountainbikes': 'Mountain bikes with advice and a test ride.',
  'Zubehör & Sonstiges': 'Accessories and consumables for your equipment.',
};

const BRAND_EN = {
  STIHL: 'STIHL products are only sold through specialist dealers. With us you also get the advice, a ready-to-use handover with instruction and service in our power tool workshop.',
  'Kärcher': 'As an authorised Kärcher dealer we carry the entire range, from pressure washers to scrubber dryers, with our own Kärcher workshop and a field service technician.',
  Kalkhoff: 'Kalkhoff e-bikes with a test ride on our test track and service in our bicycle workshop.',
};

const SERVICES_EN = [
  ['chat', 'Personal advice', 'Expert and honest. We take our time and find the right equipment with you, for private or professional use.'],
  ['check', 'Ready-to-use handover', 'Your equipment is assembled, adjusted and handed over to you ready for use.'],
  ['hand', 'Personal instruction', 'We show you how to operate, look after and safely handle it, right on the equipment.'],
  ['truck', 'Pick-up and delivery service', 'On request we collect equipment for maintenance or repair and bring it back to you.'],
  ['calendar', 'Maintenance and inspection', 'Regular care keeps your equipment running reliably and safely for a long time.'],
  ['wrench', 'Repairs', 'Our workshops for bicycles, power tools and Kärcher repair quickly and professionally.'],
  ['box', 'Spare parts stock', 'Many parts are in stock, we order everything else for you. We choose manufacturers whose parts will be available for a long time.'],
  ['euro', 'Financing', 'Larger purchases can also be financed with us. Just ask us during your consultation.'],
];

const WORKSHOPS_EN = [
  { id: 'zweirad', icon: 'bike', title: 'Bicycle workshop', text: 'Inspection, repair and maintenance of bicycles and e-bikes by bicycle mechatronics technicians and a master bicycle mechanic.', points: ['Inspection and wear parts', 'E-bike service', 'Own service reception'], departments: ['Werkstatt Zweirad'] },
  { id: 'motorgeraete', icon: 'saw', title: 'Power tool workshop', text: 'Under its own management our workshop maintains and repairs lawn mowers, lawn tractors, chainsaws, brushcutters and more.', points: ['Maintenance before the season', 'Repairs and spare parts', 'QMF-certified'], departments: ['Werkstatt Motorgeraete'] },
  { id: 'kaercher', icon: 'drop', title: 'Kärcher workshop', text: 'Service for pressure washers, vacuum cleaners and cleaning machines, with its own workshop management and a field service technician.', points: ['Maintenance and repair', 'Field service technician', 'Original spare parts'], departments: ['Kaercher'] },
  { id: 'maehroboter', icon: 'robot', title: 'Robotic mowers', text: 'Our robotic mower experts advise you on your garden and look after your mower for many seasons.', points: ['Advice and site visit', 'Maintenance and inspection', 'Repairs'], departments: ['Maehroboter'] },
];

const REPAIR_STEPS_EN = [
  ['Drop-off', 'You bring your equipment to us, or we collect it with our pick-up and delivery service.'],
  ['Check and estimate', 'We look at the equipment and agree the scope of the work with you.'],
  ['Spare parts', 'The parts needed come from our stock or are ordered for you.'],
  ['Repair', 'Our specialist workshop repairs your equipment.'],
  ['Ready for pick-up', 'You are told as soon as your equipment is ready, in the app even by push notification.'],
];

const LEASING_STEPS_EN = [
  ['Ask your employer', 'Find out whether your employer offers bike leasing and through which provider.'],
  ['Choose your bike', 'Get advice from us and take the bike you like for a test ride on our test track.'],
  ['Paperwork', 'The next steps run through your employer and the leasing provider. We help you with them.'],
  ['Handover and service', 'We hand over your bike ready to ride and take care of inspections and repairs.'],
];

const QMF_ITEMS_EN = ['Lawn mowers', 'Lawn tractors and ride-on mowers', 'Brushcutters and clearing saws', 'Chainsaws', 'Sweepers'];
const KAERCHER_ITEMS_EN = ['Pressure washers', 'Wet and dry vacuum cleaners', 'Sweepers', 'Scrubber dryers', 'Cleaning agents'];

const JOBS_EN = [
  ['Sales assistant, power tools (m/f/d)', 'Advice and sales of garden, forestry and power equipment.'],
  ['Power tool mechanic (m/f/d)', 'Maintenance and repair in our power tool workshop.'],
  ['Bicycle mechanic (m/f/d)', 'Service for bicycles and e-bikes in our bicycle workshop.'],
];

const APP_FEATURES_EN = [
  ['reparaturen', 'wrench', 'Repair status', 'See in the app which step your repair is at.'],
  ['abholbereit', 'bell', 'Ready for pick-up', 'A push notification as soon as your equipment is ready.'],
  ['termine', 'calendar', 'Request appointments', 'Delivery, inspection, repair or a site visit.'],
  ['chat', 'chat', 'Service chat', 'Send an inquiry with a photo and get the answer straight from our team.'],
  ['start', 'sparkle', 'News and offers', 'Promotions, new products and the current opening hours.'],
];

const TOPICS_EN = [
  ['allgemein', 'General question'],
  ['werkstatt', 'Workshop and repairs'],
  ['ersatzteile', 'Spare parts'],
  ['fahrrad', 'Bicycle, e-bike, leasing'],
  ['kaercher', 'Kärcher and cleaning'],
  ['maehroboter', 'Robotic mowers'],
  ['rueckruf', 'Call back'],
];

function faqsEn(hoursText) {
  return [
    ['Can I order on this website?', 'No, we are not an online shop and do not ship goods. Advice and purchase take place in person at our shop in Ostrhauderfehn. You can send us a non-binding inquiry about a product, call us or write an email. On request we deliver within the region.'],
    ['When are you open?', hoursText],
    ['Can I try out equipment and e-bikes before buying?', 'Yes. On our outdoor test track of around 2,500 m² you can try equipment and bikes at your leisure. Our specialist advisers show you the differences right on the product.'],
    ['Are prices and availability up to date?', 'Prices and availability come straight from our merchandise management system, just like in our app. All prices include VAT. If you want to be sure that an item is there for you, just give us a quick call.'],
    ['Do you also repair and service after the purchase?', 'Of course. We have our own workshops for bicycles, power tools and Kärcher equipment and a large spare parts stock. On request we collect equipment with our pick-up and delivery service.'],
    ['How do I know when my repair is ready?', 'With the Wilken Poelker app you can see the status of your repair and get a push notification as soon as your equipment is ready for pick-up. You can of course also call us on +49 4952 5304.'],
    ['Do you offer e-bike leasing?', 'Yes, we work with JobRad, Lease a Bike, Bikeleasing, Businessbike and Eurorad / AGL. Ask your employer which provider it uses. We will be glad to explain the rest in person.'],
    ['Are there financing options?', 'Yes, we offer financing. Just ask us about it during your consultation.'],
  ];
}

const DE = {
  MAIN, DEVICE, BRAND, SERVICES, WORKSHOPS, REPAIR_STEPS, LEASING_STEPS, QMF_ITEMS, KAERCHER_ITEMS, JOBS, APP_FEATURES, TOPICS, faqs,
};
const EN = {
  MAIN: Object.fromEntries(Object.entries(MAIN).map(([k, v]) => [k, { ...v, ...(MAIN_TEXT_EN[k] || {}) }])),
  DEVICE: DEVICE_TEXT_EN,
  BRAND: BRAND_EN,
  SERVICES: SERVICES_EN,
  WORKSHOPS: WORKSHOPS_EN,
  REPAIR_STEPS: REPAIR_STEPS_EN,
  LEASING_STEPS: LEASING_STEPS_EN,
  QMF_ITEMS: QMF_ITEMS_EN,
  KAERCHER_ITEMS: KAERCHER_ITEMS_EN,
  JOBS: JOBS_EN,
  APP_FEATURES: APP_FEATURES_EN,
  TOPICS: TOPICS_EN,
  faqs: faqsEn,
};
// The texts of the language being built: const { SERVICES } = txt();
const txt = () => (isEn() ? EN : DE);

module.exports = {
  COMPANY, ADDRESS_LINE, MAPS, MAIN, LEASING_PARTNERS, OLD_PAGES, OLD_CATEGORIES, txt,
};
