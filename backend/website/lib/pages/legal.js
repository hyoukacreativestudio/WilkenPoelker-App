// Impressum, Datenschutz, 404 and forwarding pages
const { esc } = require('../util');
const { page, icon } = require('../layout');
const C = require('../components');
const { COMPANY } = require('../content');
const seo = require('../seo');

function impressum(ctx) {
  const trail = [['Start', '/'], ['Impressum', '/impressum.html']];
  const body = `
<section class="phead"><div class="wrap">${C.crumbs(trail)}<h1>Impressum</h1></div></section>
<section class="sec-tight"><div class="wrap"><div class="prose-card prose">
<h2>Angaben gemäß § 5 DDG</h2>
<p>Wilken Poelker GmbH &amp; Co. KG<br>Langholter Straße 43<br>26842 Ostrhauderfehn<br>Deutschland</p>
<p>Telefon: 04952 - 5304<br>Telefax: 04952 - 5096<br>E-Mail: <a href="mailto:info@wilkenpoelker.de">info@wilkenpoelker.de</a></p>
<p>USt-IdNr.: DE219329923<br>eingetragen im Handelsregister des Amtsgerichtes Aurich<br>Handelsregisternummer HRA 110634</p>
<p>vertreten durch die persönlich haftende Gesellschafterin<br>Wilken Poelker Verwaltungs- und Beteiligungs GmbH<br>diese vertreten durch den Geschäftsführer Clemens Poelker<br>Langholter Straße 43, 26842 Ostrhauderfehn, Deutschland<br>eingetragen im Handelsregister des Amtsgerichtes Aurich<br>Handelsregisternummer HRB 110649</p>
<h2>Inhaltlich Verantwortlicher gemäß § 18 Abs. 2 MStV</h2>
<p>Herr Clemens Poelker<br>Langholter Straße 43<br>26842 Ostrhauderfehn<br>Deutschland</p>
<h2>Zuständige Aufsichtsbehörde für audiovisuelle Mediendienste</h2>
<p>Niedersächsische Landesmedienanstalt (NLM)<br>Seelhorststraße 18<br>30175 Hannover<br>Internet: <a href="https://www.nlm.de/" target="_blank" rel="noopener">https://www.nlm.de/</a></p>
<h2>Verbraucherstreitbeilegung</h2>
<p>Wir sind nicht bereit und nicht verpflichtet, an Streitbeilegungsverfahren vor Verbraucherschlichtungsstellen teilzunehmen.</p>
<h2>Bildnachweis</h2>
<p>Produktabbildungen und technische Daten: © der jeweiligen Hersteller (u.&nbsp;a. ANDREAS STIHL AG &amp; Co. KG, Alfred Kärcher SE &amp; Co. KG, STIGA, Honda, Kress/Positec, Remarc, Kalkhoff). Markennamen sind Eigentum der jeweiligen Inhaber. Fotos unseres Geschäfts und unseres Teams: Wilken Poelker GmbH &amp; Co. KG.</p>
<h2>Haftung für Inhalte und Links</h2>
<p>Die Inhalte dieser Website wurden mit Sorgfalt erstellt. Preise und Verfügbarkeiten stammen aus unserem Warenwirtschaftssystem, technische Daten und Abbildungen von den Herstellern; Änderungen und Irrtümer vorbehalten. Für die Inhalte externer Websites, auf die wir verlinken, sind ausschließlich deren Betreiber verantwortlich. Bei Bekanntwerden von Rechtsverletzungen entfernen wir entsprechende Inhalte umgehend.</p>
<h2>Mitgliedschaften</h2>
<p>Wir sind seit 08.02.2022 Mitglied der Initiative „FairCommerce“.<br>Nähere Informationen hierzu finden Sie unter <a href="https://www.haendlerbund.de/faircommerce" target="_blank" rel="noopener">www.haendlerbund.de/faircommerce</a>.</p>
</div></div></section>`;
  return page(ctx, {
    path: '/impressum.html', title: 'Impressum | Wilken Poelker', description: 'Impressum der Wilken Poelker GmbH & Co. KG, Langholter Straße 43, 26842 Ostrhauderfehn.', jsonLd: [seo.breadcrumbs(ctx, trail)], body,
  });
}

function datenschutz(ctx) {
  const trail = [['Start', '/'], ['Datenschutz', '/datenschutz.html']];
  const body = `
<section class="phead"><div class="wrap">${C.crumbs(trail)}<h1>Datenschutzerklärung</h1><p class="lead">Wir freuen uns über Ihren Besuch auf dieser Website. Nachfolgend informieren wir Sie darüber, welche Daten beim Besuch verarbeitet werden. Die Datenschutzhinweise unserer App finden Sie in der App unter „Mehr“ und „Datenschutz“.</p></div></section>
<section class="sec-tight"><div class="wrap"><div class="prose-card prose">
<h2>1. Verantwortlicher</h2>
<p>Wilken Poelker GmbH &amp; Co. KG<br>Langholter Straße 43, 26842 Ostrhauderfehn, Deutschland<br>Telefon: 04952 - 5304, E-Mail: <a href="mailto:info@wilkenpoelker.de">info@wilkenpoelker.de</a><br>Weitere Angaben finden Sie in unserem <a href="/impressum.html">Impressum</a>.</p>
<h2>2. Datenschutzbeauftragter</h2>
<p>Dr. Sebastian Kraska<br>IITR Datenschutz GmbH<br>Marienplatz 2, 80331 München<br>Telefon: 089 – 18917360, E-Mail: <a href="mailto:datenschutz@wilkenpoelker.de">datenschutz@wilkenpoelker.de</a></p>
<h2>3. Charakter dieser Website</h2>
<p>Diese Website ist eine Informationsseite und kein Onlineshop. Es gibt keine Anmeldung und kein Kundenkonto. Sie setzt <strong>keine Cookies</strong> ein und verwendet <strong>keine Analyse- oder Tracking-Dienste</strong>. Die Schriftarten sind <strong>lokal auf unserem Webspace</strong> eingebunden; beim Aufruf wird keine Verbindung zu Servern Dritter (z.&nbsp;B. Google Fonts) aufgebaut.</p>
<p>Im Speicher Ihres Browsers (Local Storage bzw. Session Storage) legen wir nur ab, was Sie selbst auswählen: das helle oder dunkle Design, Ihre Einwilligung zur Kartenanzeige (Abschnitt 9) und zum Fahrradkatalog (Abschnitt 10). Diese Angaben verlassen Ihr Gerät nicht. Rechtsgrundlage ist § 25 Abs. 2 Nr. 2 TDDDG (vom Nutzer ausdrücklich gewünschte Funktion).</p>
<h2>4. Server-Logfiles</h2>
<p>Beim Aufruf dieser Website werden durch den Hosting-Anbieter automatisch Informationen erfasst und in sogenannten Server-Logfiles gespeichert, die Ihr Browser übermittelt. Dies sind:</p>
<ul><li>IP-Adresse des anfragenden Geräts (in der Regel gekürzt/anonymisiert),</li><li>Datum und Uhrzeit des Zugriffs,</li><li>Name und URL der abgerufenen Datei,</li><li>verwendeter Browser und ggf. Betriebssystem,</li><li>die Website, von der aus der Zugriff erfolgt (Referrer-URL).</li></ul>
<p>Die Verarbeitung erfolgt zur Gewährleistung eines störungsfreien Verbindungsaufbaus, der Systemsicherheit und -stabilität. Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an einem sicheren und funktionsfähigen Internetauftritt). Die Logfiles werden nach kurzer Zeit gelöscht, soweit sie nicht zu Beweiszwecken bei sicherheitsrelevanten Vorfällen benötigt werden.</p>
<h2>5. Hosting</h2>
<p>Diese Website wird bei der STRATO GmbH, Otto-Ostrowski-Straße 7, 10249 Berlin, gehostet. Der Hoster verarbeitet die vorstehend genannten Server-Logfiles in unserem Auftrag; hierzu besteht ein Vertrag zur Auftragsverarbeitung gemäß Art. 28 DSGVO.</p>
<h2>6. Kontaktaufnahme</h2>
<p>Wenn Sie uns per Telefon oder E-Mail kontaktieren, verarbeiten wir Ihre Angaben ausschließlich zur Bearbeitung Ihrer Anfrage. Rechtsgrundlage ist Art. 6 Abs. 1 lit. b bzw. lit. f DSGVO. Die Daten werden gelöscht, sobald sie für den Zweck nicht mehr erforderlich sind und keine gesetzlichen Aufbewahrungspflichten entgegenstehen.</p>
<h2 id="anfragen">7. Kontaktformular und Produktanfragen</h2>
<p>Über das Kontaktformular, auf der Werkstatt-Seite und auf den Produktseiten können Sie uns unverbindlich schreiben oder um Rückruf bitten. Dabei verarbeiten wir Ihren Namen, Ihre Telefonnummer, Ihre E-Mail-Adresse (bei einer Rückrufbitte freiwillig), Ihre Nachricht, das gewählte Thema, gegebenenfalls das angefragte Produkt sowie die Adresse der Seite, von der Sie geschrieben haben. Die Anfrage wird an unseren Server übertragen, dort in unserem Anfrage-System der zuständigen Abteilung angezeigt und zusätzlich per E-Mail an unser Postfach bei der STRATO GmbH gesendet. Eine Anfrage ist keine Bestellung; über diese Website werden keine Kaufverträge geschlossen.</p>
<p>Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO (vorvertragliche Maßnahmen) bzw. lit. f DSGVO (Beantwortung allgemeiner Anfragen). Anfragen löschen wir spätestens nach 6 Monaten, soweit daraus kein Auftrag entstanden ist und keine gesetzlichen Aufbewahrungspflichten bestehen.</p>
<h2 id="server">8. Aktuelle Daten von unserem Server</h2>
<p>Damit Sie aktuelle Angaben sehen, ruft Ihr Browser beim Laden einzelner Seiten Daten von unserem Server <em>api.wilkenpoelker.de</em> ab: den Öffnungsstatus und abweichende Öffnungszeiten, auf Produktseiten Preis und Verfügbarkeit und, sobald Sie den Bereich mit den Bewertungen erreichen, die Google-Bewertungen (Abschnitt 11). Dabei wird technisch bedingt Ihre IP-Adresse übertragen; sie wird nur kurzzeitig zur Sicherheit des Servers verarbeitet und nicht mit anderen Daten zusammengeführt. Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an korrekten, aktuellen Angaben).</p>
<p>Diesen Server und das Anfrageformular betreibt für uns die Hetzner Online GmbH, Industriestr. 25, 91710 Gunzenhausen, in Rechenzentren in Deutschland; hierzu besteht ein Vertrag zur Auftragsverarbeitung gemäß Art. 28 DSGVO.</p>
<h2 id="karte">9. Karte (Google Maps) – nur mit Ihrer Einwilligung</h2>
<p>Auf einigen Seiten können Sie eine Karte unseres Standorts anzeigen. Sie wird von Google Maps bereitgestellt (Google Ireland Limited, Gordon House, Barrow Street, Dublin 4, Irland). Die Karte wird <strong>erst geladen, wenn Sie auf „Karte laden“ klicken</strong>. Dann werden Ihre IP-Adresse, Browser-Informationen und die aufgerufene Seite an Google übertragen; Google kann Cookies setzen. Dabei kann es zu einer Übermittlung in die USA an die Google LLC kommen, die unter dem EU-US Data Privacy Framework zertifiziert ist.</p>
<p>Rechtsgrundlage ist Ihre Einwilligung (Art. 6 Abs. 1 lit. a DSGVO, § 25 Abs. 1 TDDDG). Ihre Einwilligung gilt für den aktuellen Besuch, mit „Für diesen Browser merken“ auch darüber hinaus. Sie können sie jederzeit widerrufen, indem Sie die Website-Daten in Ihrem Browser löschen. Links wie „Route planen“ öffnen Google Maps bzw. Apple Karten erst, wenn Sie darauf klicken. Weitere Informationen: <a href="https://policies.google.com/privacy?hl=de" target="_blank" rel="noopener">Datenschutzerklärung von Google</a>.</p>
<h2 id="fahrradkatalog">10. Fahrradkatalog (BIDEX) – nur mit Ihrer Einwilligung</h2>
<p>Auf der Seite „Fahrräder“ können Sie unseren Fahrradkatalog anzeigen. Er wird von der <strong>BIDEX GmbH</strong>, Talsperrenweg 72, 58256 Ennepetal, bereitgestellt. Der Katalog wird <strong>erst geladen, wenn Sie auf „Katalog laden“ klicken</strong>. Dabei werden Ihre IP-Adresse, Browser-Informationen sowie Ihre Auswahl im Katalog an BIDEX und deren technische Dienstleister (u.&nbsp;a. zur Auslieferung der Produktbilder) übertragen. Im Speicher Ihres Browsers wird Ihre zuletzt aufgerufene Katalogansicht abgelegt, außerdem Ihre Einwilligung für die laufende Sitzung (Session Storage) und – nur wenn Sie „Auswahl merken“ wählen – dauerhaft (Local Storage).</p>
<p>In der Detailansicht eines Rades können zusätzlich geladen werden:</p>
<ul><li>ein Ratenkauf-Rechner von <strong>easyCredit</strong> (TeamBank AG, Beuthener Straße 25, 90471 Nürnberg),</li><li>eine Größenberatung von <strong>Smartfit</strong> (Radlabor GmbH, Heinrich-von-Stephan-Straße 5c, 79100 Freiburg).</li></ul>
<p>Auch dabei werden Ihre IP-Adresse und technische Daten an den jeweiligen Anbieter übertragen.</p>
<p><strong>Reservierung:</strong> Wenn Sie im Katalog ein Fahrrad reservieren, werden die von Ihnen eingegebenen Daten (z.&nbsp;B. Name, Kontaktdaten, Wunschtermin) über BIDEX an uns übermittelt und von uns zur Bearbeitung Ihrer Reservierung verwendet. BIDEX verarbeitet diese Daten in unserem Auftrag (Art. 28 DSGVO).</p>
<p>Rechtsgrundlage für das Laden des Katalogs ist Ihre Einwilligung (Art. 6 Abs. 1 lit. a DSGVO, § 25 Abs. 1 TDDDG), für die Reservierung Art. 6 Abs. 1 lit. b DSGVO. Sie können Ihre Einwilligung jederzeit mit Wirkung für die Zukunft widerrufen, über den Link „Einwilligung widerrufen“ unter dem Katalog oder indem Sie die Website-Daten in Ihrem Browser löschen. Weitere Informationen: <a href="https://www.bidex.bike/datenschutz" target="_blank" rel="noopener">Datenschutzerklärung der BIDEX GmbH</a>.</p>
<h2 id="bewertungen">11. Google-Bewertungen</h2>
<p>Auf unserer Startseite zeigen wir Bewertungen, die Kundinnen und Kunden bei Google über uns veröffentlicht haben. Sobald Sie diesen Bereich erreichen, ruft <strong>unser Server</strong> die aktuellen Bewertungen über die Google Places API ab (Google Ireland Limited, Gordon House, Barrow Street, Dublin 4, Irland). Ihr Browser baut dafür keine Verbindung zu Google auf; auch die Profilbilder der Rezensenten werden über unseren Server geladen. An Google wird dabei nur die Anfrage unseres Servers übermittelt, nicht Ihre IP-Adresse. Die Bewertungen werden nicht gespeichert, sondern bei jedem Aufruf neu abgerufen. Erst wenn Sie einen Link zu Google anklicken (zum Beispiel „Bewertung schreiben“ oder den Namen eines Rezensenten), werden Sie zu Google weitergeleitet; dann gelten die Datenschutzhinweise von Google. Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an der Darstellung von Kundenmeinungen).</p>
<h2>12. Externe Links</h2>
<p>Diese Website enthält Links zu externen Websites Dritter (z.&nbsp;B. App Store, Google Play, Facebook, Instagram, Herstellerseiten). Erst wenn Sie einen solchen Link anklicken, werden Daten an den jeweiligen Anbieter übertragen. Auf deren Inhalte und Datenverarbeitung haben wir keinen Einfluss; es gelten die Datenschutzhinweise der jeweiligen Anbieter.</p>
<h2>13. Ihre Rechte</h2>
<p>Sie haben nach der DSGVO das Recht auf Auskunft (Art. 15), Berichtigung (Art. 16), Löschung (Art. 17), Einschränkung der Verarbeitung (Art. 18), Datenübertragbarkeit (Art. 20) sowie ein Widerspruchsrecht (Art. 21). Eine erteilte Einwilligung können Sie jederzeit mit Wirkung für die Zukunft widerrufen (Art. 7 Abs. 3). Zur Ausübung wenden Sie sich bitte an die oben genannten Kontaktdaten.</p>
<h2>14. Beschwerderecht</h2>
<p>Sie haben das Recht, sich bei einer Datenschutz-Aufsichtsbehörde zu beschweren. Zuständig ist:</p>
<p>Die Landesbeauftragte für den Datenschutz Niedersachsen<br>Prinzenstraße 5, 30159 Hannover<br>Telefon: +49 511 1204500, E-Mail: <a href="mailto:poststelle@lfd.niedersachsen.de">poststelle@lfd.niedersachsen.de</a><br><a href="https://lfd.niedersachsen.de/" target="_blank" rel="noopener">https://lfd.niedersachsen.de/</a></p>
<p class="muted" style="margin-top:30px">Stand: November 2026</p>
</div></div></section>`;
  return page(ctx, {
    path: '/datenschutz.html', title: 'Datenschutzerklärung | Wilken Poelker', description: 'Datenschutzerklärung der Website von Wilken Poelker: keine Cookies, kein Tracking, Kontaktformular, Karte und Fahrradkatalog nur mit Einwilligung.', jsonLd: [seo.breadcrumbs(ctx, trail)], body,
  });
}

function notFound(ctx) {
  const body = `
<section class="phead"><div class="wrap narrow">
<h1>Diese Seite gibt es nicht (mehr)</h1>
<p class="lead">Vielleicht wurde die Seite verschoben, oder ein Produkt ist nicht mehr im Sortiment. Suchen Sie direkt nach einem Produkt oder starten Sie auf einer dieser Seiten.</p>
<div class="btns" style="margin-top:24px"><button class="btn" type="button" data-open="search-sheet">${icon('search')}Produkt suchen</button><a class="btn btn-quiet" href="/">${icon('home')}Zur Startseite</a><a class="btn btn-quiet" href="/produkte/">${icon('grid')}Alle Kategorien</a><a class="btn btn-quiet" href="/kontakt.html">${icon('pin')}Kontakt</a></div>
</div></section>`;
  return page(ctx, { path: '/404.html', title: 'Seite nicht gefunden | Wilken Poelker', description: 'Diese Seite gibt es nicht mehr.', noindex: true, body });
}

// Old page addresses of earlier versions of this website: forward
function forward(ctx, target, title) {
  const url = `${ctx.base}${target}`;
  return `<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)} | Wilken Poelker</title>
<meta name="robots" content="noindex, follow">
<link rel="canonical" href="${esc(url)}">
<meta http-equiv="refresh" content="0; url=${esc(target)}">
<script>location.replace(${JSON.stringify(target)}+location.hash);</script>
</head>
<body>
<p>Diese Seite ist umgezogen: <a href="${esc(target)}">${esc(title)}</a>.</p>
</body>
</html>
`;
}

module.exports = { impressum, datenschutz, notFound, forward, COMPANY };
