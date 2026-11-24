// Impressum, Datenschutz, Barrierefreiheit, 404 and forwarding pages.
// The English legal pages are translations; the German texts are binding.
const { esc } = require('../util');
const { page, icon } = require('../layout');
const C = require('../components');
const { COMPANY } = require('../content');
const { L, isEn } = require('../i18n');
const seo = require('../seo');

const HOME = () => [L('Start', 'Home'), '/'];
const BINDING = '<p class="note" style="margin-bottom:24px">This is an English translation for your convenience. Only the <a href="@de:/impressum.html" hreflang="de">German version</a> is legally binding.</p>';
// @de: keeps the German address (layout.js, not localised)
const bindingFor = (dePath) => BINDING.replace('@de:/impressum.html', `@de:${dePath}`);

// ── Impressum ─────────────────────────────────────────
const IMPRESSUM_DE = `
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
<p>Wir sind seit 08.02.2022 Mitglied der Initiative „FairCommerce“.<br>Nähere Informationen hierzu finden Sie unter <a href="https://www.haendlerbund.de/faircommerce" target="_blank" rel="noopener">www.haendlerbund.de/faircommerce</a>.</p>`;

const IMPRESSUM_EN = `
<h2>Information pursuant to § 5 DDG (German Digital Services Act)</h2>
<p>Wilken Poelker GmbH &amp; Co. KG<br>Langholter Straße 43<br>26842 Ostrhauderfehn<br>Germany</p>
<p>Phone: +49 4952 5304<br>Fax: +49 4952 5096<br>E-mail: <a href="mailto:info@wilkenpoelker.de">info@wilkenpoelker.de</a></p>
<p>VAT identification number: DE219329923<br>Registered in the commercial register of the local court (Amtsgericht) of Aurich<br>Commercial register number HRA 110634</p>
<p>Represented by its general partner<br>Wilken Poelker Verwaltungs- und Beteiligungs GmbH<br>represented by its managing director Clemens Poelker<br>Langholter Straße 43, 26842 Ostrhauderfehn, Germany<br>Registered in the commercial register of the local court (Amtsgericht) of Aurich<br>Commercial register number HRB 110649</p>
<h2>Responsible for the content pursuant to § 18 (2) MStV (German Interstate Media Treaty)</h2>
<p>Mr Clemens Poelker<br>Langholter Straße 43<br>26842 Ostrhauderfehn<br>Germany</p>
<h2>Supervisory authority for audiovisual media services</h2>
<p>Niedersächsische Landesmedienanstalt (NLM)<br>Seelhorststraße 18<br>30175 Hannover, Germany<br>Website: <a href="https://www.nlm.de/" target="_blank" rel="noopener">https://www.nlm.de/</a></p>
<h2>Consumer dispute resolution</h2>
<p>We are neither willing nor obliged to take part in dispute resolution proceedings before a consumer arbitration board.</p>
<h2>Picture credits</h2>
<p>Product pictures and technical data: © the respective manufacturers (including ANDREAS STIHL AG &amp; Co. KG, Alfred Kärcher SE &amp; Co. KG, STIGA, Honda, Kress/Positec, Remarc, Kalkhoff). Brand names are the property of their respective owners. Photos of our shop and our team: Wilken Poelker GmbH &amp; Co. KG.</p>
<h2>Liability for content and links</h2>
<p>The content of this website has been prepared with care. Prices and availability come from our merchandise management system, technical data and pictures from the manufacturers; subject to change and errors. The operators of external websites we link to are solely responsible for their content. If we become aware of any legal infringement, we will remove the content concerned immediately.</p>
<h2>Memberships</h2>
<p>We have been a member of the “FairCommerce” initiative since 8 February 2022.<br>More information: <a href="https://www.haendlerbund.de/faircommerce" target="_blank" rel="noopener">www.haendlerbund.de/faircommerce</a>.</p>`;

function impressum(ctx) {
  const title = L('Impressum', 'Legal notice');
  const trail = [HOME(), [title, '/impressum.html']];
  const body = `
<section class="phead"><div class="wrap">${C.crumbs(trail)}<h1>${isEn() ? 'Legal notice <span lang="de">(Impressum)</span>' : 'Impressum'}</h1></div></section>
<section class="sec-tight"><div class="wrap"><div class="prose-card prose">
${isEn() ? bindingFor('/impressum.html') + IMPRESSUM_EN : IMPRESSUM_DE}
</div></div></section>`;
  return page(ctx, {
    path: '/impressum.html',
    title: L('Impressum | Wilken Poelker', 'Legal notice | Wilken Poelker'),
    description: L('Impressum der Wilken Poelker GmbH & Co. KG, Langholter Straße 43, 26842 Ostrhauderfehn.', 'Legal notice of Wilken Poelker GmbH & Co. KG, Langholter Straße 43, 26842 Ostrhauderfehn, Germany.'),
    jsonLd: [seo.breadcrumbs(ctx, trail)],
    body,
  });
}

// ── Datenschutz ───────────────────────────────────────
const DATENSCHUTZ_DE = `
<h2>1. Verantwortlicher</h2>
<p>Wilken Poelker GmbH &amp; Co. KG<br>Langholter Straße 43, 26842 Ostrhauderfehn, Deutschland<br>Telefon: 04952 - 5304, E-Mail: <a href="mailto:info@wilkenpoelker.de">info@wilkenpoelker.de</a><br>Weitere Angaben finden Sie in unserem <a href="/impressum.html">Impressum</a>.</p>
<h2>2. Datenschutzbeauftragter</h2>
<p>Dr. Sebastian Kraska<br>IITR Datenschutz GmbH<br>Marienplatz 2, 80331 München<br>Telefon: 089 – 18917360, E-Mail: <a href="mailto:datenschutz@wilkenpoelker.de">datenschutz@wilkenpoelker.de</a></p>
<h2>3. Charakter dieser Website</h2>
<p>Diese Website ist eine Informationsseite und kein Onlineshop. Es gibt keine Anmeldung und kein Kundenkonto. Sie setzt <strong>keine Cookies</strong> ein und verwendet <strong>keine Analyse- oder Tracking-Dienste</strong>. Die Schriftarten sind <strong>lokal auf unserem Webspace</strong> eingebunden; beim Aufruf wird keine Verbindung zu Servern Dritter (z.&nbsp;B. Google Fonts) aufgebaut. Die Website gibt es auf Deutsch und auf Englisch.</p>
<p>Im Speicher Ihres Browsers (Local Storage bzw. Session Storage) legen wir nur ab, was Sie selbst auswählen: das helle oder dunkle Design, die Produkte auf Ihrem Merkzettel, Ihre Einwilligung zur Kartenanzeige (Abschnitt 9) und zum Fahrradkatalog (Abschnitt 10). Diese Angaben verlassen Ihr Gerät nicht, es sei denn, Sie schicken uns Ihren Merkzettel mit einer Anfrage (Abschnitt 7). Die Daten für den Vergleich lädt der Merkzettel von dieser Website, nicht einzeln je Produkt. Rechtsgrundlage ist § 25 Abs. 2 Nr. 2 TDDDG (vom Nutzer ausdrücklich gewünschte Funktion).</p>
<h2>4. Server-Logfiles</h2>
<p>Beim Aufruf dieser Website werden durch den Hosting-Anbieter automatisch Informationen erfasst und in sogenannten Server-Logfiles gespeichert, die Ihr Browser übermittelt. Dies sind:</p>
<ul><li>IP-Adresse des anfragenden Geräts,</li><li>Datum und Uhrzeit des Zugriffs,</li><li>Name und URL der abgerufenen Datei,</li><li>verwendeter Browser und ggf. Betriebssystem,</li><li>die Website, von der aus der Zugriff erfolgt (Referrer-URL).</li></ul>
<p>Die Verarbeitung erfolgt zur Gewährleistung eines störungsfreien Verbindungsaufbaus, der Systemsicherheit und -stabilität. Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an einem sicheren und funktionsfähigen Internetauftritt). Die Logfiles werden nach kurzer Zeit gelöscht, soweit sie nicht zu Beweiszwecken bei sicherheitsrelevanten Vorfällen benötigt werden.</p>
<h2>5. Hosting</h2>
<p>Diese Website wird bei der STRATO GmbH, Otto-Ostrowski-Straße 7, 10249 Berlin, gehostet. Der Hoster verarbeitet die vorstehend genannten Server-Logfiles in unserem Auftrag; hierzu besteht ein Vertrag zur Auftragsverarbeitung gemäß Art. 28 DSGVO.</p>
<h2>6. Kontaktaufnahme</h2>
<p>Wenn Sie uns per Telefon oder E-Mail kontaktieren, verarbeiten wir Ihre Angaben ausschließlich zur Bearbeitung Ihrer Anfrage. Rechtsgrundlage ist Art. 6 Abs. 1 lit. b bzw. lit. f DSGVO. Die Daten werden gelöscht, sobald sie für den Zweck nicht mehr erforderlich sind und keine gesetzlichen Aufbewahrungspflichten entgegenstehen.</p>
<h2 id="anfragen">7. Kontaktformular und Produktanfragen</h2>
<p>Über das Kontaktformular, auf der Werkstatt-Seite, auf dem Merkzettel und auf den Produktseiten können Sie uns unverbindlich schreiben oder um Rückruf bitten. Dabei verarbeiten wir Ihren Namen, Ihre Telefonnummer, Ihre E-Mail-Adresse (bei einer Rückrufbitte freiwillig), Ihre Nachricht, das gewählte Thema, gegebenenfalls das angefragte Produkt oder die Produkte auf Ihrem Merkzettel sowie die Adresse der Seite, von der Sie geschrieben haben (daran erkennen wir auch, ob wir Ihnen auf Englisch antworten sollen). Die Anfrage wird an unseren Server übertragen, dort in unserem Anfrage-System der zuständigen Abteilung angezeigt und zusätzlich per E-Mail an unser Postfach bei der STRATO GmbH gesendet. Eine Anfrage ist keine Bestellung; über diese Website werden keine Kaufverträge geschlossen.</p>
<p>Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO (vorvertragliche Maßnahmen) bzw. lit. f DSGVO (Beantwortung allgemeiner Anfragen). Anfragen löschen wir spätestens nach 6 Monaten, soweit daraus kein Auftrag entstanden ist und keine gesetzlichen Aufbewahrungspflichten bestehen.</p>
<h2 id="server">8. Aktuelle Daten von unserem Server</h2>
<p>Damit Sie aktuelle Angaben sehen, ruft Ihr Browser beim Laden einzelner Seiten Daten von unserem Server <em>api.wilkenpoelker.de</em> ab: den Öffnungsstatus und abweichende Öffnungszeiten, auf Produktseiten Preis und Verfügbarkeit und, sobald Sie den Bereich mit den Bewertungen erreichen, die Google-Bewertungen (Abschnitt 11). Dabei wird technisch bedingt Ihre IP-Adresse übertragen. Unser Server protokolliert zur Sicherheit des Servers und zur Fehlersuche Ihre IP-Adresse, den Zeitpunkt und die aufgerufene Adresse; diese Protokolle werden automatisch gelöscht, in der Regel nach etwa zwei Wochen, spätestens nach 90 Tagen. In den Fehlerprotokollen der Anwendung speichern wir E-Mail- und IP-Adressen nur gekürzt; sie werden nach 14 Tagen gelöscht. Die Daten werden nicht mit anderen Daten zusammengeführt. Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an korrekten, aktuellen Angaben und einem sicheren Betrieb).</p>
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
<p class="muted" style="margin-top:30px">Stand: November 2026</p>`;

const DATENSCHUTZ_EN = `
<h2>1. Controller</h2>
<p>Wilken Poelker GmbH &amp; Co. KG<br>Langholter Straße 43, 26842 Ostrhauderfehn, Germany<br>Phone: +49 4952 5304, e-mail: <a href="mailto:info@wilkenpoelker.de">info@wilkenpoelker.de</a><br>For further details see our <a href="/impressum.html">legal notice</a>.</p>
<h2>2. Data protection officer</h2>
<p>Dr. Sebastian Kraska<br>IITR Datenschutz GmbH<br>Marienplatz 2, 80331 München, Germany<br>Phone: +49 89 18917360, e-mail: <a href="mailto:datenschutz@wilkenpoelker.de">datenschutz@wilkenpoelker.de</a></p>
<h2>3. Nature of this website</h2>
<p>This website is an information site, not an online shop. There is no login and no customer account. It uses <strong>no cookies</strong> and <strong>no analytics or tracking services</strong>. The fonts are <strong>hosted locally on our web space</strong>; no connection to third-party servers (such as Google Fonts) is made when you visit. The website is available in German and in English.</p>
<p>In your browser’s storage (local storage or session storage) we only keep what you choose yourself: the light or dark design, the products on your wishlist, and your consent to showing the map (section 9) and the bicycle catalogue (section 10). This information does not leave your device unless you send us your wishlist with an inquiry (section 7). The wishlist loads the data for the comparison from this website, not individually for each product. The legal basis is § 25 (2) no. 2 TDDDG (a function expressly requested by the user).</p>
<h2>4. Server log files</h2>
<p>When you visit this website, the hosting provider automatically collects information transmitted by your browser and stores it in server log files. This is:</p>
<ul><li>the IP address of the requesting device,</li><li>the date and time of access,</li><li>the name and URL of the file accessed,</li><li>the browser used and, where applicable, the operating system,</li><li>the website from which the access was made (referrer URL).</li></ul>
<p>This processing ensures a smooth connection and the security and stability of the system. The legal basis is Art. 6 (1) (f) GDPR (legitimate interest in a secure and functioning website). The log files are deleted after a short time unless they are needed as evidence in security incidents.</p>
<h2>5. Hosting</h2>
<p>This website is hosted by STRATO GmbH, Otto-Ostrowski-Straße 7, 10249 Berlin, Germany. The host processes the server log files mentioned above on our behalf; a data processing agreement pursuant to Art. 28 GDPR is in place.</p>
<h2>6. Contacting us</h2>
<p>If you contact us by phone or e-mail, we process your details solely to handle your request. The legal basis is Art. 6 (1) (b) or (f) GDPR. The data is deleted as soon as it is no longer needed for this purpose and no statutory retention obligations apply.</p>
<h2 id="anfragen">7. Contact form and product inquiries</h2>
<p>Using the contact form, on the workshop page, on the wishlist and on the product pages you can write to us without obligation or ask for a call back. We process your name, your phone number, your e-mail address (optional for a call-back request), your message, the topic you chose, where applicable the product you asked about or the products on your wishlist, and the address of the page from which you wrote (this also tells us whether to reply in English). The inquiry is transmitted to our server, shown to the responsible department in our inquiry system and also sent by e-mail to our mailbox at STRATO GmbH. An inquiry is not an order; no purchase contracts are concluded via this website.</p>
<p>The legal basis is Art. 6 (1) (b) GDPR (pre-contractual measures) or (f) GDPR (answering general inquiries). We delete inquiries after 6 months at the latest unless they have led to an order or statutory retention obligations apply.</p>
<h2 id="server">8. Current data from our server</h2>
<p>To show you up-to-date information, your browser fetches data from our server <em>api.wilkenpoelker.de</em> when some pages load: whether we are open and any changed opening hours, price and availability on product pages and, once you reach the reviews section, the Google reviews (section 11). For technical reasons your IP address is transmitted. For the security of the server and for troubleshooting, our server logs your IP address, the time and the address requested; these logs are deleted automatically, usually after about two weeks and after 90 days at the latest. In the application’s error logs we only store shortened e-mail and IP addresses; they are deleted after 14 days. The data is not combined with other data. The legal basis is Art. 6 (1) (f) GDPR (legitimate interest in correct, up-to-date information and secure operation).</p>
<p>This server and the inquiry form are operated for us by Hetzner Online GmbH, Industriestr. 25, 91710 Gunzenhausen, Germany, in data centres in Germany; a data processing agreement pursuant to Art. 28 GDPR is in place.</p>
<h2 id="karte">9. Map (Google Maps) – only with your consent</h2>
<p>On some pages you can display a map of our location. It is provided by Google Maps (Google Ireland Limited, Gordon House, Barrow Street, Dublin 4, Ireland). The map is <strong>only loaded when you click “Load map”</strong>. Your IP address, browser information and the page visited are then transmitted to Google; Google may set cookies. Data may be transferred to Google LLC in the USA, which is certified under the EU-US Data Privacy Framework.</p>
<p>The legal basis is your consent (Art. 6 (1) (a) GDPR, § 25 (1) TDDDG). Your consent applies to the current visit, and with “Remember for this browser” beyond it. You can withdraw it at any time by deleting the website data in your browser. Links such as “Get directions” only open Google Maps or Apple Maps when you click them. More information: <a href="https://policies.google.com/privacy?hl=en" target="_blank" rel="noopener">Google’s privacy policy</a>.</p>
<h2 id="fahrradkatalog">10. Bicycle catalogue (BIDEX) – only with your consent</h2>
<p>On the “Bicycles” page you can display our bicycle catalogue. It is provided by <strong>BIDEX GmbH</strong>, Talsperrenweg 72, 58256 Ennepetal, Germany. The catalogue is <strong>only loaded when you click “Load catalogue”</strong>. Your IP address, browser information and your selection in the catalogue are then transmitted to BIDEX and its technical service providers (including for delivering the product pictures). Your last catalogue view is saved in your browser’s storage, as well as your consent for the current session (session storage) and, only if you choose “Remember my choice”, permanently (local storage).</p>
<p>In the detail view of a bike the following may also be loaded:</p>
<ul><li>an instalment calculator from <strong>easyCredit</strong> (TeamBank AG, Beuthener Straße 25, 90471 Nürnberg, Germany),</li><li>a size advisor from <strong>Smartfit</strong> (Radlabor GmbH, Heinrich-von-Stephan-Straße 5c, 79100 Freiburg, Germany).</li></ul>
<p>Here too your IP address and technical data are transmitted to the provider concerned.</p>
<p><strong>Reservation:</strong> If you reserve a bike in the catalogue, the data you enter (such as your name, contact details and preferred date) is sent to us via BIDEX and used by us to handle your reservation. BIDEX processes this data on our behalf (Art. 28 GDPR).</p>
<p>The legal basis for loading the catalogue is your consent (Art. 6 (1) (a) GDPR, § 25 (1) TDDDG), and for the reservation Art. 6 (1) (b) GDPR. You can withdraw your consent at any time with effect for the future, using the “Withdraw consent” link below the catalogue or by deleting the website data in your browser. More information: <a href="https://www.bidex.bike/datenschutz" target="_blank" rel="noopener">privacy policy of BIDEX GmbH</a> (in German).</p>
<h2 id="bewertungen">11. Google reviews</h2>
<p>On our home page we show reviews that customers have published about us on Google. Once you reach this section, <strong>our server</strong> fetches the current reviews via the Google Places API (Google Ireland Limited, Gordon House, Barrow Street, Dublin 4, Ireland). Your browser does not connect to Google for this; the reviewers’ profile pictures are also loaded via our server. Only our server’s request is sent to Google, not your IP address. The reviews are not stored but fetched again each time. Only when you click a link to Google (for example “Write a review” or a reviewer’s name) are you taken to Google; Google’s privacy information then applies. The legal basis is Art. 6 (1) (f) GDPR (legitimate interest in showing customer opinions).</p>
<h2>12. External links</h2>
<p>This website contains links to external third-party websites (such as the App Store, Google Play, Facebook, Instagram and manufacturers’ websites). Data is only transmitted to the provider concerned when you click such a link. We have no influence on their content and data processing; the privacy information of the provider concerned applies.</p>
<h2>13. Your rights</h2>
<p>Under the GDPR you have the right of access (Art. 15), rectification (Art. 16), erasure (Art. 17), restriction of processing (Art. 18), data portability (Art. 20) and the right to object (Art. 21). You can withdraw consent you have given at any time with effect for the future (Art. 7 (3)). To exercise these rights, please use the contact details above.</p>
<h2>14. Right to lodge a complaint</h2>
<p>You have the right to lodge a complaint with a data protection supervisory authority. The competent authority is:</p>
<p>Die Landesbeauftragte für den Datenschutz Niedersachsen<br>Prinzenstraße 5, 30159 Hannover, Germany<br>Phone: +49 511 1204500, e-mail: <a href="mailto:poststelle@lfd.niedersachsen.de">poststelle@lfd.niedersachsen.de</a><br><a href="https://lfd.niedersachsen.de/" target="_blank" rel="noopener">https://lfd.niedersachsen.de/</a></p>
<p class="muted" style="margin-top:30px">Last updated: November 2026</p>`;

function datenschutz(ctx) {
  const title = L('Datenschutzerklärung', 'Privacy policy');
  const trail = [HOME(), [L('Datenschutz', 'Privacy'), '/datenschutz.html']];
  const body = `
<section class="phead"><div class="wrap">${C.crumbs(trail)}<h1>${title}</h1><p class="lead">${L('Wir freuen uns über Ihren Besuch auf dieser Website. Nachfolgend informieren wir Sie darüber, welche Daten beim Besuch verarbeitet werden. Die Datenschutzhinweise unserer App finden Sie in der App unter „Mehr“ und „Datenschutz“.',
    'Thank you for visiting this website. Below we explain which data is processed when you visit it. You will find the privacy information for our app in the app under “More” and “Privacy Policy”.')}</p></div></section>
<section class="sec-tight"><div class="wrap"><div class="prose-card prose">
${isEn() ? bindingFor('/datenschutz.html') + DATENSCHUTZ_EN : DATENSCHUTZ_DE}
</div></div></section>`;
  return page(ctx, {
    path: '/datenschutz.html',
    title: L('Datenschutzerklärung | Wilken Poelker', 'Privacy policy | Wilken Poelker'),
    description: L('Datenschutzerklärung der Website von Wilken Poelker: keine Cookies, kein Tracking, Kontaktformular, Karte und Fahrradkatalog nur mit Einwilligung.', 'Privacy policy of the Wilken Poelker website: no cookies, no tracking, contact form, map and bicycle catalogue only with your consent.'),
    jsonLd: [seo.breadcrumbs(ctx, trail)],
    body,
  });
}

// ── Barrierefreiheit (voluntary statement) ────────────
const MLBF = 'Marktüberwachungsstelle der Länder für die Barrierefreiheit von Produkten und Dienstleistungen (MLBF AöR)<br>Carl-Miller-Straße 6, 39112 Magdeburg<br>E-Mail: <a href="mailto:kontakt@mlbf-barrierefrei.de">kontakt@mlbf-barrierefrei.de</a><br><a href="https://www.mlbf-barrierefrei.de/" target="_blank" rel="noopener">www.mlbf-barrierefrei.de</a>';

const BARRIEREFREI_DE = `
<h2>Unser Ziel</h2>
<p>Wir möchten, dass alle Menschen diese Website gut nutzen können, auch mit Screenreader, Tastatur oder Vergrößerung. Diese Erklärung geben wir freiwillig ab. Sie beruht auf unserer eigenen Prüfung; eine Prüfung durch eine externe Stelle hat nicht stattgefunden.</p>
<h2>Was wir dafür tun</h2>
<ul>
<li>Die Seiten sind für die Bedienung mit der Tastatur ausgelegt. Der Link „Zum Inhalt springen“ führt direkt zum Hauptinhalt, der Tastaturfokus ist sichtbar.</li>
<li>Überschriften, Listen, Navigation und Formulare sind im Code ausgezeichnet, damit Screenreader die Struktur wiedergeben können. Formularfelder haben sichtbare Beschriftungen.</li>
<li>Bilder haben Alternativtexte, rein schmückende Bilder werden von Screenreadern übersprungen.</li>
<li>Die Sprache jeder Seite ist ausgezeichnet, auf den englischen Seiten auch die Textteile, die nur auf Deutsch vorliegen.</li>
<li>Die Website hat ein helles und ein dunkles Design. Sie richtet sich nach der Einstellung Ihres Geräts und lässt sich umschalten.</li>
<li>Mit der Zoomfunktion Ihres Browsers können Sie die Schrift vergrößern, das Layout passt sich an.</li>
<li>Haben Sie auf Ihrem Gerät „Bewegung reduzieren“ eingestellt, verzichtet die Website auf Animationen.</li>
<li>Uns erreichen Sie auf mehreren Wegen: Telefon, E-Mail, Kontaktformular oder persönlich im Laden.</li>
</ul>
<h2>Bekannte Einschränkungen</h2>
<ul>
<li>Der Fahrradkatalog wird von der BIDEX GmbH bereitgestellt. Auf seine Gestaltung und Bedienbarkeit haben wir keinen Einfluss. Gern beraten wir Sie zu unseren Fahrrädern auch telefonisch.</li>
<li>Die Karte von Google Maps ist nicht vollständig barrierefrei. Adresse und Anfahrt stehen deshalb auch als Text auf der <a href="/kontakt.html#anfahrt">Kontaktseite</a>.</li>
<li>Auf den englischen Seiten erscheinen die Google-Bewertungen auf Deutsch, so wie Google sie liefert.</li>
<li>Auf den englischen Seiten liegen einige Ausstattungsangaben aus unserer Warenwirtschaft nur auf Deutsch vor.</li>
</ul>
<h2>Barrieren melden</h2>
<p>Ist Ihnen eine Barriere aufgefallen, oder brauchen Sie Informationen in einer anderen Form? Schreiben Sie uns an <a href="mailto:info@wilkenpoelker.de">info@wilkenpoelker.de</a>, rufen Sie uns an unter <a href="tel:+4949525304">04952 5304</a> oder nutzen Sie das <a href="/kontakt.html">Kontaktformular</a>. Wir melden uns so schnell wie möglich.</p>
<h2>Marktüberwachung</h2>
<p>Für die Überwachung der Barrierefreiheit von Produkten und Dienstleistungen nach dem Barrierefreiheitsstärkungsgesetz (BFSG) ist in Deutschland zuständig:</p>
<p>${MLBF}</p>
<p class="muted" style="margin-top:30px">Stand: November 2026</p>`;

const BARRIEREFREI_EN = `
<h2>Our aim</h2>
<p>We want everyone to be able to use this website well, including with a screen reader, a keyboard or magnification. We make this statement voluntarily. It is based on our own review; no external body has tested the website.</p>
<h2>What we do</h2>
<ul>
<li>The pages are designed to be used with a keyboard. The “Skip to content” link leads straight to the main content, and the keyboard focus is visible.</li>
<li>Headings, lists, navigation and forms are marked up in the code so that screen readers can convey the structure. Form fields have visible labels.</li>
<li>Pictures have text alternatives; purely decorative pictures are skipped by screen readers.</li>
<li>The language of every page is marked up, and on the English pages also the passages that are only available in German.</li>
<li>The website has a light and a dark design. It follows the setting of your device and can be switched.</li>
<li>You can enlarge the text with your browser’s zoom, and the layout adapts.</li>
<li>If you have set “reduce motion” on your device, the website does without animations.</li>
<li>You can reach us in several ways: by phone, e-mail, the contact form or in person in our shop.</li>
</ul>
<h2>Known limitations</h2>
<ul>
<li>The bicycle catalogue is provided by BIDEX GmbH. We have no influence on its design and usability, and its content may only be available in German. We are happy to advise you about our bicycles by phone.</li>
<li>The Google Maps map is not fully accessible. Our address and directions are therefore also available as text on the <a href="/kontakt.html#anfahrt">contact page</a>.</li>
<li>On the English pages the Google reviews are shown in German, as Google provides them.</li>
<li>On the English pages some equipment details from our merchandise management system are only available in German.</li>
</ul>
<h2>Reporting barriers</h2>
<p>Have you come across a barrier, or do you need information in a different format? Write to us at <a href="mailto:info@wilkenpoelker.de">info@wilkenpoelker.de</a>, call us on <a href="tel:+4949525304">+49 4952 5304</a> or use the <a href="/kontakt.html">contact form</a>. We will get back to you as soon as possible.</p>
<h2>Market surveillance</h2>
<p>In Germany, the authority responsible for monitoring the accessibility of products and services under the Barrierefreiheitsstärkungsgesetz (BFSG, German Accessibility Act) is:</p>
<p lang="de">${MLBF}</p>
<p class="muted" style="margin-top:30px">Last updated: November 2026</p>`;

function barrierefreiheit(ctx) {
  const title = L('Barrierefreiheit', 'Accessibility');
  const trail = [HOME(), [title, '/barrierefreiheit.html']];
  const body = `
<section class="phead"><div class="wrap">${C.crumbs(trail)}<h1>${L('Erklärung zur Barrierefreiheit', 'Accessibility statement')}</h1><p class="lead">${L('Was wir tun, damit alle diese Website nutzen können, wo es noch Einschränkungen gibt und wie Sie uns Barrieren melden.', 'What we do so that everyone can use this website, where there are still limitations and how you can report barriers to us.')}</p></div></section>
<section class="sec-tight"><div class="wrap"><div class="prose-card prose">
${isEn() ? bindingFor('/barrierefreiheit.html') + BARRIEREFREI_EN : BARRIEREFREI_DE}
</div></div></section>`;
  return page(ctx, {
    path: '/barrierefreiheit.html',
    title: L('Barrierefreiheit | Wilken Poelker', 'Accessibility | Wilken Poelker'),
    description: L('Erklärung zur Barrierefreiheit der Website von Wilken Poelker: umgesetzte Maßnahmen, bekannte Einschränkungen und wie Sie uns Barrieren melden.', 'Accessibility statement of the Wilken Poelker website: what we do, known limitations and how to report barriers to us.'),
    jsonLd: [seo.breadcrumbs(ctx, trail)],
    body,
  });
}

// ── 404 ───────────────────────────────────────────────
function notFound(ctx) {
  const body = `
<section class="phead"><div class="wrap narrow">
<h1>${L('Diese Seite gibt es nicht (mehr)', 'This page does not exist (any more)')}</h1>
<p class="lead">${L('Vielleicht wurde die Seite verschoben, oder ein Produkt ist nicht mehr im Sortiment. Suchen Sie direkt nach einem Produkt oder starten Sie auf einer dieser Seiten.', 'The page may have moved, or a product is no longer in our range. Search for a product directly or start on one of these pages.')}</p>
<div class="btns" style="margin-top:24px"><button class="btn" type="button" data-open="search-sheet">${icon('search')}${L('Produkt suchen', 'Search products')}</button><a class="btn btn-quiet" href="/">${icon('home')}${L('Zur Startseite', 'Home page')}</a><a class="btn btn-quiet" href="/produkte/">${icon('grid')}${L('Alle Kategorien', 'All categories')}</a><a class="btn btn-quiet" href="/kontakt.html">${icon('pin')}${L('Kontakt', 'Contact')}</a></div>
</div></section>`;
  return page(ctx, {
    path: '/404.html', title: L('Seite nicht gefunden | Wilken Poelker', 'Page not found | Wilken Poelker'), description: L('Diese Seite gibt es nicht mehr.', 'This page no longer exists.'), noindex: true, noAlternates: true, body,
  });
}

// Old page addresses (earlier versions of this website, products that are no
// longer in the range): forward. target is the final path of the language.
function forward(ctx, target, title) {
  const url = `${ctx.base}${target}`;
  return `<!doctype html>
<html lang="${isEn() ? 'en' : 'de'}">
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
<p>${L('Diese Seite ist umgezogen:', 'This page has moved:')} <a href="${esc(target)}">${esc(title)}</a>.</p>
</body>
</html>
`;
}

module.exports = { impressum, datenschutz, barrierefreiheit, notFound, forward, COMPANY };
