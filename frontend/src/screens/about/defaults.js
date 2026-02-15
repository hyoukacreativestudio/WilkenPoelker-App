export const DEFAULTS = {
  // ─── TEAM ──────────────────────────────────────────────────────────────────
  team: {
    departments: [
      {
        key: 'Geschaeftsfuehrung',
        label: 'Geschäftsführung',
        color: '#1565C0',
        icon: 'account-tie',
        members: [
          { name: 'Clemens Poelker Junior', position: 'Geschäftsführer', phone: '04952/82673843', image: 'clemens-poelker-junior' },
        ],
      },
      {
        key: 'Buchhaltung',
        label: 'Buchhaltung',
        color: '#6A1B9A',
        icon: 'calculator-variant',
        members: [
          { name: 'Andrea Poelker', position: 'Buchhaltung', phone: null, image: 'andrea-poelker' },
          { name: 'Eva Müller', position: 'Buchhaltung', phone: null, image: 'eva-mueller' },
          { name: 'Carina Horstmann', position: 'Buchhaltung | Garantie', phone: null, image: 'placeholder-female' },
          { name: 'Nils Poelker', position: 'Buchhaltung', phone: null, image: 'placeholder-male' },
        ],
      },
      {
        key: 'Service / Reparatur',
        label: 'Service / Reparatur',
        color: '#E65100',
        icon: 'headset',
        members: [
          { name: 'Dominik Schmelzer', position: 'Reparatur- und Serviceannahme', phone: '04952/82673845', image: 'dominik-schmelzer' },
          { name: 'Martin Horstmann', position: 'Ersatzteilservice', phone: '04952/82673840', image: 'martin-horstmann' },
          { name: 'Klaus Schulte', position: 'Kundendienst', phone: null, image: 'klaus-schulte' },
          { name: 'Rita Körte', position: 'Die gute Seele des Betriebes', phone: null, image: 'rita-koerte' },
          { name: 'Theda Schmidt', position: 'Die gute Seele des Betriebes', phone: null, image: 'placeholder-female' },
        ],
      },
      {
        key: 'Verkauf E-Bikes',
        label: 'Verkauf E-Bikes',
        color: '#2E7D32',
        icon: 'bicycle',
        members: [
          { name: 'Florian Werner', position: 'Verkauf - Experte E-Bikes', phone: '04952/82673852', image: 'florian-werner' },
          { name: 'Thomas Thoben', position: 'Verkauf - Experte E-Bikes u. Motorgeräte', phone: '04952/82673854', image: 'thomas-thoben' },
          { name: 'Tim Bieker', position: 'Verkauf - Experte E-Bikes', phone: '04952/82673863', image: 'tim-bieker' },
          { name: 'Yannick Möhlmann', position: 'Verkauf - Experte E-Bikes', phone: '04952/82673858', image: 'placeholder-male' },
          { name: 'Frederic Malzahn', position: 'Verkauf - Experte E-Bikes', phone: null, image: 'placeholder-male' },
        ],
      },
      {
        key: 'Verkauf Motorgeraete / Kaercher',
        label: 'Verkauf Motorgeräte / Kärcher',
        color: '#C62828',
        icon: 'engine',
        members: [
          { name: 'Jan Schultka', position: 'Verkauf - Experte Kärcher', phone: '04952/82673848', image: 'jan-schultka' },
          { name: 'Michael Heikens', position: 'Verkauf - Experte Motorgeräte', phone: '04952/82673857', image: 'michael-heikens' },
        ],
      },
      {
        key: 'Werkstatt Zweirad',
        label: 'Werkstatt Zweirad',
        color: '#00838F',
        icon: 'wrench',
        members: [
          { name: 'Patrick Bonn', position: 'Zweiradmechatroniker - Serviceannahme', phone: null, image: 'patrick-bonn' },
          { name: 'Fabian Benker', position: 'Zweiradmechatroniker', phone: null, image: 'fabian-benker' },
          { name: 'Max Breiting', position: 'Zweiradmechatroniker', phone: null, image: 'max-breiting' },
          { name: 'Mirco Tammen', position: 'Zweiradmechatroniker', phone: null, image: 'mirco-tammen' },
          { name: 'Jan Lakeberg', position: 'Zweiradmechatroniker', phone: null, image: 'jan-lakeberg' },
          { name: 'Manuela Scherzer-Brosch', position: 'Zweiradmechanikermeisterin', phone: null, image: 'placeholder-female' },
          { name: 'Ivan Yusyumbeli', position: 'Zweiradmechatroniker', phone: null, image: 'placeholder-male' },
          { name: 'Sven Onken', position: 'Zweiradmechatroniker', phone: null, image: 'placeholder-male' },
          { name: 'Daniel Meister', position: 'Zweiradmechatroniker', phone: null, image: 'placeholder-male' },
          { name: 'Dominik Przybilski', position: 'Zweiradmechatroniker', phone: null, image: 'placeholder-male' },
          { name: 'Sönke Haskamp', position: 'Auszubildender Zweiradmechatroniker', phone: null, image: 'placeholder-male' },
        ],
      },
      {
        key: 'Werkstatt Motorgeraete',
        label: 'Werkstatt Motorgeräte',
        color: '#4E342E',
        icon: 'tools',
        members: [
          { name: 'Hauke Siedentopp', position: 'Werkstattleitung Motorgeräte', phone: '04952/82673847', image: 'hauke-siedentopp' },
          { name: 'Andreas Rohlmann', position: 'Mechaniker Motorgeräte', phone: null, image: 'placeholder-male' },
          { name: 'Martin Middendorf', position: 'Mechaniker Motorgeräte', phone: null, image: 'martin-middendorf' },
          { name: 'Patrick Rotman', position: 'Mechaniker Motorgeräte', phone: null, image: 'placeholder-male' },
        ],
      },
      {
        key: 'Maehroboter',
        label: 'Mähroboter',
        color: '#558B2F',
        icon: 'robot-mower',
        members: [
          { name: 'Rainer Quappe', position: 'Experte - Mähroboter', phone: '04952/82673844', image: 'rainer-quappe' },
          { name: 'Marcel Baumann', position: 'Experte - Mähroboter', phone: null, image: 'marcel-baumann' },
        ],
      },
      {
        key: 'Kaercher',
        label: 'Kärcher',
        color: '#F57C00',
        icon: 'spray-bottle',
        members: [
          { name: 'Alexander Kampen', position: 'Kärcher Werkstattleitung', phone: '04952/82673846', image: 'alexander-kampen' },
          { name: 'Thomas Janssen', position: 'Kärcher Monteur Außendienst', phone: '04952/82673846', image: 'thomas-janssen' },
        ],
      },
      {
        key: 'Hausmeister',
        label: 'Hausmeister',
        color: '#546E7A',
        icon: 'home-city',
        members: [
          { name: 'Stephan Dykhoff', position: 'Hausmeister', phone: null, image: 'stephan-dykhoff' },
          { name: 'Waldemar Wolf', position: 'Hausmeister', phone: null, image: 'waldemar-wolf' },
          { name: 'Hauke Heyen', position: 'Hausmeister', phone: null, image: 'hauke-heyen' },
        ],
      },
    ],
  },

  // ─── STORE ─────────────────────────────────────────────────────────────────
  store: {
    photos: [
      { id: '1', image: 'laden2', label: 'Verkaufsraum' },
      { id: '2', image: 'laden5', label: 'Ausstellung' },
      { id: '3', image: 'bikes-area', label: 'Fahrrad-Bereich' },
      { id: '4', image: 'stihl-area', label: 'STIHL-Bereich' },
      { id: '5', image: 'laden7', label: 'Showroom' },
      { id: '6', image: 'laden8', label: 'Produktwelt' },
    ],
    categories: [
      { key: 'ebikes', icon: 'bicycle', label: 'E-Bikes & Fahrräder' },
      { key: 'motor', icon: 'engine', label: 'Motorgeräte' },
      { key: 'lawn', icon: 'grass', label: 'Rasenpflege' },
      { key: 'cleaning', icon: 'spray-bottle', label: 'Reinigungstechnik' },
      { key: 'forestry', icon: 'tree', label: 'Forsttechnik' },
      { key: 'irrigation', icon: 'water-pump', label: 'Bewässerung' },
    ],
    services: [
      'Abholservice & Lieferung',
      'Gebrauchsfertige Übergabe',
      'Individuelle Beratung',
      'Geräteeinweisung',
      'Wartung & Inspektion',
      'Reparaturservice',
      'Ersatzteillager',
      'Finanzierungsmöglichkeiten',
    ],
    openingHours: {
      standard: [
        { day: 'Mo \u2013 Fr', hours: '08:00\u201313:00 | 14:00\u201318:00' },
        { day: 'Sa', hours: '09:00\u201313:00' },
        { day: 'So', hours: 'Geschlossen' },
      ],
      winter: [
        { day: 'Mo \u2013 Fr', hours: '08:00\u201313:00 | 14:00\u201317:00' },
        { day: 'Sa', hours: '09:00\u201313:00' },
        { day: 'So', hours: 'Geschlossen' },
      ],
    },
    contact: {
      address: 'Langholter Straße 43, 26842 Ostrhauderfehn',
      phone: '04952 / 5304',
      email: 'info@wilkenpoelker.de',
    },
    highlights: [
      { icon: 'ruler-square', text: 'Über 1.500 m² Verkaufsfläche' },
      { icon: 'bike', text: '2.000 m² Outdoor-Teststrecke' },
      { icon: 'tag-multiple', text: 'Umfangreiche Markenauswahl' },
    ],
  },

  // ─── QMF ───────────────────────────────────────────────────────────────────
  qmf: {
    main: {
      title: 'Wir sind QMF-zertifizierter Fachhändler!',
      desc1:
        'QMF ist eine Branchen-Qualifizierungsinitiative der Fachverbände des Landmaschinen- und Motorgerätehandwerks. Die Abkürzung QMF steht für „Qualität mit Fachbetrieb" und richtet sich an Fachhändler, die sich durch besondere Servicequalität und Fachkompetenz auszeichnen.',
      desc2:
        'Ziel ist es, die Verbraucherberatung und den Service im motorisierten Gartengeräte-Fachhandel auf einem konstant hohen Niveau sicherzustellen. QMF-zertifizierte Betriebe müssen strenge Qualitätskriterien erfüllen und werden regelmäßig überprüft.',
      desc3:
        'Mitglieder verpflichten sich zu regelmäßigen Schulungen, fachgerechter Beratung und einem umfassenden Serviceangebot – von der Erstberatung über den Verkauf bis hin zur Wartung und Reparatur.',
      badgeImage: 'qmf-badge',
      logoImage: 'qmf-logo',
    },
    certifiedCategories: [
      'Rasenmäher',
      'Rasentraktoren / Aufsitzmäher',
      'Motorsensen / Freischneider',
      'Motorsägen',
      'Kehrmaschinen',
    ],
    benefits: [
      { icon: 'account-check', title: 'Qualifizierte Beratung' },
      { icon: 'school', title: 'Geschultes Personal' },
      { icon: 'clipboard-check', title: 'Regelmäßige Audits' },
      { icon: 'shield-check', title: 'Verbraucherschutz' },
    ],
  },

  // ─── KÄRCHER ───────────────────────────────────────────────────────────────
  kaercher: {
    main: {
      title: 'Wir sind autorisierter Kärcher-Händler!',
      description:
        'Wir vertreiben die gesamte Palette des weltweit in Qualität und Technologie führenden Anbieters von Reinigungssystemen und Reinigungsprodukten: KÄRCHER.',
      logoImage: 'kaercher-logo',
      logoSmallImage: 'kaercher-logo-small',
    },
    galleryImages: ['kaercher1', 'kaercher2', 'kaercher3'],
    productCategories: [
      { icon: 'water', label: 'Hochdruckreiniger' },
      { icon: 'vacuum', label: 'Naß-/Trockensauger' },
      { icon: 'broom', label: 'Kehrmaschinen' },
      { icon: 'iron', label: 'Dampfbügeleisen' },
      { icon: 'broom', label: 'Akkubesen' },
      { icon: 'home-floor-l', label: 'Terrassenreiniger' },
    ],
    servicePoints: [
      'Umfangreiches Ersatzteillager',
      'Geschultes Fachpersonal',
      'Hauseigene Reparatur & Wartung',
      'Vor-Ort-Service für Gewerbekunden',
    ],
  },
};
