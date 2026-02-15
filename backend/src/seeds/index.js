const { sequelize } = require('../config/database');
const { User, Product, OpeningHour, Holiday, Post, Ticket, ChatMessage, ServiceRating, Notification, Appointment, Repair, FAQ } = require('../models');
const { hashPassword } = require('../utils/crypto');

async function seed() {
  const forceReset = process.argv.includes('--reset');

  if (forceReset) {
    console.log('WARNING: RESET MODE - Dropping all tables and re-seeding...');
    await sequelize.sync({ force: true });
    console.log('Tables created (force reset).');
  } else {
    console.log('Seeding database (safe mode - existing data preserved)...');
    await sequelize.sync();
    const existingUsers = await User.count();
    if (existingUsers > 0) {
      console.log(`Database already has ${existingUsers} users. Use --reset flag to wipe and re-seed.`);
      console.log('Seeding skipped - data is preserved.');
      process.exit(0);
    }
    console.log('Empty database detected. Seeding initial data...');
  }

  // --- USERS ---
  const pw = await hashPassword('Test1234!');
  const admin = await User.create({
    username: 'admin',
    email: 'admin@wilkenpoelker.de',
    password: pw,
    firstName: 'Max',
    lastName: 'Wilken',
    role: 'admin',
    customerNumber: '1000',
    dsgvoAcceptedAt: new Date(),
  });
  const bikeManager = await User.create({
    username: 'bikemanager',
    email: 'bike@wilkenpoelker.de',
    password: pw,
    firstName: 'Lisa',
    lastName: 'Müller',
    role: 'bike_manager',
    customerNumber: '1001',
    dsgvoAcceptedAt: new Date(),
  });
  const customer1 = await User.create({
    username: 'jschmidt',
    email: 'julia.schmidt@test.de',
    password: pw,
    firstName: 'Julia',
    lastName: 'Schmidt',
    role: 'customer',
    customerNumber: '2001',
    phone: '+49 541 123456',
    address: { street: 'Bergstraße 12', zip: '49074', city: 'Osnabrück', country: 'Deutschland' },
    dsgvoAcceptedAt: new Date(),
  });
  const customer2 = await User.create({
    username: 'tmeyer',
    email: 'thomas.meyer@test.de',
    password: pw,
    firstName: 'Thomas',
    lastName: 'Meyer',
    role: 'customer',
    customerNumber: '2002',
    phone: '+49 541 987654',
    address: { street: 'Hegerstraße 5', zip: '49078', city: 'Osnabrück', country: 'Deutschland' },
    dsgvoAcceptedAt: new Date(),
  });
  const robbyManager = await User.create({
    username: 'robbymanager',
    email: 'robby@wilkenpoelker.de',
    password: pw,
    firstName: 'Robby',
    lastName: 'Poelker',
    role: 'robby_manager',
    customerNumber: '1002',
    phone: '+49 541 555333',
    dsgvoAcceptedAt: new Date(),
  });
  const superAdmin = await User.create({
    username: 'superadmin',
    email: 'superadmin@wilkenpoelker.de',
    password: pw,
    firstName: 'Karl',
    lastName: 'Wilken',
    role: 'super_admin',
    customerNumber: '1003',
    phone: '+49 541 100100',
    dsgvoAcceptedAt: new Date(),
  });
  const cleaningManager = await User.create({
    username: 'cleaningmanager',
    email: 'cleaning@wilkenpoelker.de',
    password: pw,
    firstName: 'Sabine',
    lastName: 'Reinhardt',
    role: 'cleaning_manager',
    customerNumber: '1004',
    phone: '+49 541 200200',
    dsgvoAcceptedAt: new Date(),
  });
  const motorManager = await User.create({
    username: 'motormanager',
    email: 'motor@wilkenpoelker.de',
    password: pw,
    firstName: 'Jürgen',
    lastName: 'Kraft',
    role: 'motor_manager',
    customerNumber: '1005',
    phone: '+49 541 300300',
    dsgvoAcceptedAt: new Date(),
  });
  const serviceManager = await User.create({
    username: 'servicemanager',
    email: 'service@wilkenpoelker.de',
    password: pw,
    firstName: 'Andrea',
    lastName: 'Brinkmann',
    role: 'service_manager',
    customerNumber: '1006',
    phone: '+49 541 400400',
    dsgvoAcceptedAt: new Date(),
  });

  // --- ADDITIONAL TEST USERS ---
  const customer3 = await User.create({
    username: 'abergmann',
    email: 'anna.bergmann@test.de',
    password: pw,
    firstName: 'Anna',
    lastName: 'Bergmann',
    role: 'customer',
    customerNumber: '2003',
    phone: '+49 541 111222',
    address: { street: 'Lotter Straße 42', zip: '49078', city: 'Osnabrück', country: 'Deutschland' },
    dsgvoAcceptedAt: new Date(),
  });
  const customer4 = await User.create({
    username: 'mweber',
    email: 'markus.weber@test.de',
    password: pw,
    firstName: 'Markus',
    lastName: 'Weber',
    role: 'customer',
    customerNumber: '2004',
    phone: '+49 541 333444',
    address: { street: 'Natruper Straße 88', zip: '49076', city: 'Osnabrück', country: 'Deutschland' },
    dsgvoAcceptedAt: new Date(),
  });
  const customer5 = await User.create({
    username: 'sfischer',
    email: 'sarah.fischer@test.de',
    password: pw,
    firstName: 'Sarah',
    lastName: 'Fischer',
    role: 'customer',
    customerNumber: '2005',
    phone: '+49 541 555666',
    address: { street: 'Bramscher Straße 15', zip: '49090', city: 'Osnabrück', country: 'Deutschland' },
    dsgvoAcceptedAt: new Date(),
  });
  const customer6 = await User.create({
    username: 'pkoch',
    email: 'peter.koch@test.de',
    password: pw,
    firstName: 'Peter',
    lastName: 'Koch',
    role: 'customer',
    customerNumber: '2006',
    phone: '+49 541 777888',
    address: { street: 'Iburger Straße 22', zip: '49082', city: 'Osnabrück', country: 'Deutschland' },
    dsgvoAcceptedAt: new Date(),
  });
  const customer7 = await User.create({
    username: 'lbauer',
    email: 'laura.bauer@test.de',
    password: pw,
    firstName: 'Laura',
    lastName: 'Bauer',
    role: 'customer',
    customerNumber: '2007',
    phone: '+49 541 999000',
    address: { street: 'Martinistraße 7', zip: '49080', city: 'Osnabrück', country: 'Deutschland' },
    dsgvoAcceptedAt: new Date(),
  });
  const customer8 = await User.create({
    username: 'dhoffmann',
    email: 'daniel.hoffmann@test.de',
    password: pw,
    firstName: 'Daniel',
    lastName: 'Hoffmann',
    role: 'customer',
    customerNumber: '2008',
    phone: '+49 541 112233',
    address: { street: 'Große Straße 31', zip: '49074', city: 'Osnabrück', country: 'Deutschland' },
    dsgvoAcceptedAt: new Date(),
  });
  const customer9 = await User.create({
    username: 'kschulz',
    email: 'katharina.schulz@test.de',
    password: pw,
    firstName: 'Katharina',
    lastName: 'Schulz',
    role: 'customer',
    customerNumber: '2009',
    phone: '+49 541 445566',
    address: { street: 'Rheiner Landstraße 50', zip: '49078', city: 'Osnabrück', country: 'Deutschland' },
    dsgvoAcceptedAt: new Date(),
  });
  const customer10 = await User.create({
    username: 'fmueller',
    email: 'frank.mueller@test.de',
    password: pw,
    firstName: 'Frank',
    lastName: 'Müller',
    role: 'customer',
    customerNumber: '2010',
    phone: '+49 541 778899',
    address: { street: 'Pagenstecherstraße 14', zip: '49090', city: 'Osnabrück', country: 'Deutschland' },
    dsgvoAcceptedAt: new Date(),
  });
  console.log('Users seeded (19 total: 4 staff + 5 manager + 10 customers).');

  // --- PRODUCTS: Bikes ---
  const bikes = [
    { name: 'Cube Touring Hybrid ONE 500', brand: 'Cube', category: 'bike', subcategory: 'E-Bike Trekking', price: 2599, description: 'Vielseitiges E-Trekkingrad mit Bosch Performance Line Motor und 500Wh Akku. Perfekt für Pendler und Tourenfahrer.', specifications: { motor: 'Bosch Performance Line CX', battery: '500Wh', gears: 'Shimano Deore 10-fach', brakes: 'Shimano hydraulische Scheibenbremsen', weight: '23.5 kg', frame: 'Aluminium 6061' }, stock: 5, images: ['bike_cube_touring.jpg'], leasingAvailable: true },
    { name: 'KTM Macina Sport 630', brand: 'KTM', category: 'bike', subcategory: 'E-Bike Sport', price: 3299, salePrice: 2899, saleEndsAt: new Date('2026-03-15'), description: 'Sportliches E-Bike mit kraftvollem Bosch Performance Line CX Motor. Für ambitionierte Fahrer.', specifications: { motor: 'Bosch Performance Line CX', battery: '625Wh', gears: 'Shimano XT 12-fach', brakes: 'Shimano MT420 4-Kolben', weight: '24.2 kg', frame: 'Aluminium' }, stock: 3, images: ['bike_ktm_macina.jpg'], leasingAvailable: true },
    { name: 'Diamant Beryll Deluxe+', brand: 'Diamant', category: 'bike', subcategory: 'E-Bike City', price: 3499, description: 'Elegantes City E-Bike mit tiefem Einstieg und komfortabler Ausstattung. Ideal für den Stadtverkehr.', specifications: { motor: 'Bosch Active Line Plus', battery: '500Wh', gears: 'Shimano Nexus 8-Gang', brakes: 'Magura hydraulisch', weight: '26.1 kg', frame: 'Aluminium Wave' }, stock: 4, images: ['bike_diamant_beryll.jpg'], leasingAvailable: true },
    { name: 'Cube Aim SL 29', brand: 'Cube', category: 'bike', subcategory: 'Mountainbike', price: 749, description: 'Einsteiger-Mountainbike mit solidem Aluminium-Rahmen und zuverlässigen Komponenten.', specifications: { gears: 'Shimano Deore 2x10', brakes: 'Shimano hydraulische Scheibenbremsen', suspension: 'SR Suntour XCR 100mm', weight: '13.8 kg', frame: 'Aluminium Superlite', wheelSize: '29 Zoll' }, stock: 8, images: ['bike_cube_aim.jpg'] },
    { name: 'Pegasus Piazza 21', brand: 'Pegasus', category: 'bike', subcategory: 'Citybike', price: 499, description: 'Klassisches Citybike mit kompletter Ausstattung für den Alltag.', specifications: { gears: 'Shimano Tourney 21-Gang', brakes: 'V-Brake', light: 'LED-Beleuchtung', weight: '15.2 kg', frame: 'Stahl' }, stock: 12, images: ['bike_pegasus_piazza.jpg'] },
    { name: 'Puky Cyke 20-3', brand: 'Puky', category: 'bike', subcategory: 'Kinderfahrrad', price: 389, description: 'Hochwertiges Kinderfahrrad für Kinder ab 6 Jahren. Leicht und sicher.', specifications: { gears: 'Shimano Nexus 3-Gang', brakes: 'V-Brake + Rücktritt', weight: '10.5 kg', frame: 'Aluminium', wheelSize: '20 Zoll' }, stock: 6, images: ['bike_puky_cyke.jpg'] },
    { name: 'Gazelle Chamonix C7', brand: 'Gazelle', category: 'bike', subcategory: 'Hollandrad', price: 899, description: 'Premium Hollandrad mit Nabenschaltung und Vollausstattung für komfortables Radfahren.', specifications: { gears: 'Shimano Nexus 7-Gang', brakes: 'Shimano Rollenbremse', light: 'Busch & Müller IQ-X', weight: '19.8 kg', frame: 'Aluminium' }, stock: 3, images: ['bike_gazelle_chamonix.jpg'] },
    { name: 'Stevens E-Courier Plus', brand: 'Stevens', category: 'bike', subcategory: 'E-Bike Cargo', price: 4299, description: 'E-Lastenrad mit großem Frontkorb und stabilem Rahmen. Perfekt für Einkäufe und Kindertransport.', specifications: { motor: 'Bosch Cargo Line', battery: '500Wh', gears: 'Shimano Deore 10-fach', payload: '200 kg', weight: '32 kg', frame: 'Aluminium verstärkt' }, stock: 2, images: ['bike_stevens_cargo.jpg'], leasingAvailable: true },
    { name: 'Raymon TourRay 3.0', brand: 'Raymon', category: 'bike', subcategory: 'Trekkingrad', price: 649, salePrice: 549, saleEndsAt: new Date('2026-02-28'), description: 'Solides Trekkingrad für Touren und Alltag mit kompletter Ausstattung.', specifications: { gears: 'Shimano Alivio 27-Gang', brakes: 'Shimano hydraulische Scheibenbremsen', weight: '15.5 kg', frame: 'Aluminium', wheelSize: '28 Zoll' }, stock: 7, images: ['bike_raymon_tourray.jpg'] },
    { name: 'Haibike AllMtn 6', brand: 'Haibike', category: 'bike', subcategory: 'E-MTB', price: 5499, description: 'Vollgefedertes E-Mountainbike für anspruchsvolle Trails mit Yamaha PW-X3 Motor.', specifications: { motor: 'Yamaha PW-X3', battery: '720Wh', gears: 'Shimano XT 12-fach', suspension: '160mm/150mm', weight: '25.8 kg', frame: 'Aluminium 6061' }, stock: 2, images: ['bike_haibike_allmtn.jpg'], leasingAvailable: true },
  ];

  // --- PRODUCTS: Cleaning ---
  const cleaningDevices = [
    { name: 'Kärcher K5 Premium Full Control', brand: 'Kärcher', category: 'cleaning', subcategory: 'Hochdruckreiniger', price: 449, description: 'Leistungsstarker Hochdruckreiniger mit wassergekühltem Motor und Full Control Handspritzpistole.', specifications: { pressure: '145 bar', flow: '500 l/h', power: '2100W', hoseLength: '8m', weight: '13.1 kg' }, stock: 10, images: ['clean_karcher_k5.jpg'] },
    { name: 'Kärcher K2 Universal Edition', brand: 'Kärcher', category: 'cleaning', subcategory: 'Hochdruckreiniger', price: 119, salePrice: 99, saleEndsAt: new Date('2026-03-01'), description: 'Kompakter Hochdruckreiniger für gelegentliche Reinigungsarbeiten rund ums Haus.', specifications: { pressure: '110 bar', flow: '360 l/h', power: '1400W', hoseLength: '4m', weight: '4 kg' }, stock: 15, images: ['clean_karcher_k2.jpg'] },
    { name: 'Kärcher SC 3 EasyFix', brand: 'Kärcher', category: 'cleaning', subcategory: 'Dampfreiniger', price: 199, description: 'Dampfreiniger mit Aufheizzeit von nur 30 Sekunden und EasyFix Bodendüse.', specifications: { steamPressure: '3.5 bar', tankSize: '1L', heatingTime: '30s', power: '1900W', weight: '3.1 kg' }, stock: 8, images: ['clean_karcher_sc3.jpg'] },
    { name: 'Kärcher WD 5 P Premium', brand: 'Kärcher', category: 'cleaning', subcategory: 'Nass-/Trockensauger', price: 229, description: 'Leistungsstarker Nass- und Trockensauger mit Einschaltautomatik für Elektrowerkzeuge.', specifications: { containerSize: '25L', power: '1100W', suction: '240 mbar', cableLength: '7m', weight: '8.3 kg' }, stock: 6, images: ['clean_karcher_wd5.jpg'] },
    { name: 'Stihl RE 130 Plus', brand: 'Stihl', category: 'cleaning', subcategory: 'Hochdruckreiniger', price: 549, description: 'Professioneller Hochdruckreiniger mit langlebigem Aluminium-Druckkolben.', specifications: { pressure: '150 bar', flow: '500 l/h', power: '2300W', hoseLength: '9m', weight: '24.5 kg' }, stock: 4, images: ['clean_stihl_re130.jpg'] },
    { name: 'Kärcher FC 7 Cordless', brand: 'Kärcher', category: 'cleaning', subcategory: 'Hartbodenreiniger', price: 399, salePrice: 349, saleEndsAt: new Date('2026-03-10'), description: 'Kabelloser 2-in-1 Hartbodenreiniger mit selbstreinigenden Walzen.', specifications: { runtime: '45 min', tankSize: '0.4L dirty / 0.4L clean', rollerSpeed: '500 rpm', weight: '4.3 kg' }, stock: 5, images: ['clean_karcher_fc7.jpg'] },
    { name: 'Nilfisk Core 140 PowerControl', brand: 'Nilfisk', category: 'cleaning', subcategory: 'Hochdruckreiniger', price: 299, description: 'Vielseitiger Hochdruckreiniger mit PowerControl Düse für optimale Reinigungsergebnisse.', specifications: { pressure: '140 bar', flow: '500 l/h', power: '1800W', hoseLength: '8m', weight: '8.2 kg' }, stock: 7, images: ['clean_nilfisk_core.jpg'] },
    { name: 'Kärcher WV 5 Plus', brand: 'Kärcher', category: 'cleaning', subcategory: 'Fenstersauger', price: 79, description: 'Akku-Fenstersauger für streifenfreie Fensterreinigung.', specifications: { runtime: '35 min', tankSize: '100ml', width: '280mm', weight: '0.6 kg' }, stock: 20, images: ['clean_karcher_wv5.jpg'] },
  ];

  // --- PRODUCTS: Motor ---
  const motorDevices = [
    { name: 'Stihl MS 181 C-BE', brand: 'Stihl', category: 'motor', subcategory: 'Motorsäge', price: 399, description: 'Leichte Benzin-Motorsäge mit ErgoStart für komfortables Starten. Ideal für Brennholz.', specifications: { displacement: '31.8 cm³', power: '1.5 kW', barLength: '35 cm', weight: '4.3 kg', fuel: 'Benzin-Öl-Gemisch' }, stock: 6, images: ['motor_stihl_ms181.jpg'] },
    { name: 'Stihl MSA 220 C-B', brand: 'Stihl', category: 'motor', subcategory: 'Akku-Motorsäge', price: 599, description: 'Profi-Akku-Motorsäge mit bürstenlosem Motor. Leistung wie ein Benzingerät.', specifications: { barLength: '35 cm', voltage: '36V', weight: '3.9 kg (ohne Akku)', chain: 'STIHL PICCO Micro' }, stock: 4, images: ['motor_stihl_msa220.jpg'] },
    { name: 'Husqvarna 135 Mark II', brand: 'Husqvarna', category: 'motor', subcategory: 'Motorsäge', price: 289, salePrice: 249, saleEndsAt: new Date('2026-02-28'), description: 'Einstiegs-Motorsäge mit X-Torq Motor für geringeren Kraftstoffverbrauch.', specifications: { displacement: '38 cm³', power: '1.6 kW', barLength: '36 cm', weight: '4.7 kg' }, stock: 8, images: ['motor_husqvarna_135.jpg'] },
    { name: 'Stihl FS 131', brand: 'Stihl', category: 'motor', subcategory: 'Freischneider', price: 669, description: 'Professioneller Freischneider mit 4-MIX Motor. Für anspruchsvolle Mäharbeiten.', specifications: { displacement: '36.3 cm³', power: '1.4 kW', cuttingWidth: '420mm', weight: '5.8 kg' }, stock: 3, images: ['motor_stihl_fs131.jpg'] },
    { name: 'Honda HRX 537 VY', brand: 'Honda', category: 'motor', subcategory: 'Rasenmäher', price: 899, description: 'Premium-Rasenmäher mit Versamow-System und Radantrieb. Für große Gärten.', specifications: { displacement: '187 cm³', cuttingWidth: '53 cm', cuttingHeight: '17-102mm', catcherVolume: '88L', weight: '38 kg' }, stock: 5, images: ['motor_honda_hrx537.jpg'] },
    { name: 'Stihl RMA 339 C', brand: 'Stihl', category: 'motor', subcategory: 'Akku-Rasenmäher', price: 329, description: 'Kompakter Akku-Rasenmäher für kleine bis mittlere Gärten. Leise und emissionsfrei.', specifications: { cuttingWidth: '37 cm', voltage: '36V', cuttingHeight: '25-75mm', weight: '16 kg (ohne Akku)' }, stock: 10, images: ['motor_stihl_rma339.jpg'] },
    { name: 'Stihl BGA 57', brand: 'Stihl', category: 'motor', subcategory: 'Akku-Laubbläser', price: 179, description: 'Leichter Akku-Laubbläser für die schnelle Reinigung rund ums Haus.', specifications: { airSpeed: '177 km/h', airVolume: '620 m³/h', voltage: '36V', weight: '2.3 kg (ohne Akku)' }, stock: 12, images: ['motor_stihl_bga57.jpg'] },
    { name: 'Husqvarna Automower 305', brand: 'Husqvarna', category: 'motor', subcategory: 'Mähroboter', price: 999, salePrice: 849, saleEndsAt: new Date('2026-03-15'), description: 'Mähroboter für Rasenflächen bis 600m². Leise, zuverlässig und wetterfest.', specifications: { area: 'bis 600 m²', cuttingWidth: '22 cm', cuttingHeight: '20-50mm', weight: '7.3 kg', noise: '58 dB' }, stock: 4, images: ['motor_husqvarna_automower.jpg'] },
    { name: 'Stihl HSA 56', brand: 'Stihl', category: 'motor', subcategory: 'Akku-Heckenschere', price: 199, description: 'Akku-Heckenschere mit 45cm Schnittlänge für gepflegte Hecken.', specifications: { bladeLength: '45 cm', voltage: '36V', toothSpacing: '30mm', weight: '2.9 kg (ohne Akku)', cutCapacity: '30mm' }, stock: 7, images: ['motor_stihl_hsa56.jpg'] },
    { name: 'Makita DUH523Z', brand: 'Makita', category: 'motor', subcategory: 'Akku-Heckenschere', price: 139, description: 'Kompakte 18V Akku-Heckenschere. Leicht und handlich.', specifications: { bladeLength: '52 cm', voltage: '18V', cutCapacity: '15mm', weight: '3.3 kg (ohne Akku)' }, stock: 9, images: ['motor_makita_duh523.jpg'] },
  ];

  const allProducts = [...bikes, ...cleaningDevices, ...motorDevices];
  for (const p of allProducts) {
    await Product.create(p);
  }
  console.log(`${allProducts.length} products seeded.`);

  // --- OPENING HOURS ---
  const standardHours = [
    { dayOfWeek: 1, season: 'standard', periods: [{ open: '08:00', close: '13:00' }, { open: '14:00', close: '18:00' }] },
    { dayOfWeek: 2, season: 'standard', periods: [{ open: '08:00', close: '13:00' }, { open: '14:00', close: '18:00' }] },
    { dayOfWeek: 3, season: 'standard', periods: [{ open: '08:00', close: '13:00' }, { open: '14:00', close: '18:00' }] },
    { dayOfWeek: 4, season: 'standard', periods: [{ open: '08:00', close: '13:00' }, { open: '14:00', close: '18:00' }] },
    { dayOfWeek: 5, season: 'standard', periods: [{ open: '08:00', close: '13:00' }, { open: '14:00', close: '18:00' }] },
    { dayOfWeek: 6, season: 'standard', periods: [{ open: '09:00', close: '13:00' }] },
    { dayOfWeek: 0, season: 'standard', isClosed: true, periods: [] },
  ];
  const winterHours = [
    { dayOfWeek: 1, season: 'winter', periods: [{ open: '08:00', close: '13:00' }, { open: '14:00', close: '17:00' }] },
    { dayOfWeek: 2, season: 'winter', periods: [{ open: '08:00', close: '13:00' }, { open: '14:00', close: '17:00' }] },
    { dayOfWeek: 3, season: 'winter', periods: [{ open: '08:00', close: '13:00' }, { open: '14:00', close: '17:00' }] },
    { dayOfWeek: 4, season: 'winter', periods: [{ open: '08:00', close: '13:00' }, { open: '14:00', close: '17:00' }] },
    { dayOfWeek: 5, season: 'winter', periods: [{ open: '08:00', close: '13:00' }, { open: '14:00', close: '17:00' }] },
    { dayOfWeek: 6, season: 'winter', periods: [{ open: '09:00', close: '13:00' }] },
    { dayOfWeek: 0, season: 'winter', isClosed: true, periods: [] },
  ];
  for (const h of [...standardHours, ...winterHours]) {
    await OpeningHour.create(h);
  }
  console.log('Opening hours seeded.');

  // --- HOLIDAYS ---
  const holidays = [
    { date: '2026-01-01', name: 'Neujahr', isClosed: true, isRecurring: true },
    { date: '2026-04-03', name: 'Karfreitag', isClosed: true },
    { date: '2026-04-06', name: 'Ostermontag', isClosed: true },
    { date: '2026-05-01', name: 'Tag der Arbeit', isClosed: true, isRecurring: true },
    { date: '2026-05-14', name: 'Christi Himmelfahrt', isClosed: true },
    { date: '2026-05-25', name: 'Pfingstmontag', isClosed: true },
    { date: '2026-10-03', name: 'Tag der Deutschen Einheit', isClosed: true, isRecurring: true },
    { date: '2026-12-25', name: '1. Weihnachtstag', isClosed: true, isRecurring: true },
    { date: '2026-12-26', name: '2. Weihnachtstag', isClosed: true, isRecurring: true },
    { date: '2026-12-31', name: 'Silvester', isClosed: false, specialHours: [{ open: '08:00', close: '12:00' }] },
  ];
  for (const h of holidays) {
    await Holiday.create(h);
  }
  console.log('Holidays seeded.');

  // --- SAMPLE POSTS ---
  const posts = [
    { userId: admin.id, content: 'Willkommen bei WilkenPoelker! Wir freuen uns, Sie in unserer Community begrüßen zu dürfen. Besuchen Sie uns im Geschäft oder stöbern Sie durch unsere Produkte.', type: 'text' },
    { userId: bikeManager.id, content: 'Neue E-Bikes eingetroffen! Die KTM Macina Sport 630 ist jetzt mit 12% Rabatt erhältlich. Kommen Sie vorbei für eine Probefahrt!', type: 'offer' },
    { userId: customer1.id, content: 'Mein neues Cube Touring Hybrid ist einfach fantastisch! Vielen Dank an das Team für die tolle Beratung. 🚲', type: 'text' },
    { userId: admin.id, content: 'Frühjahrs-Check für Ihr Fahrrad! Ab März bieten wir unseren Komplett-Check zum Sonderpreis von 39€ an. Jetzt Termin buchen!', type: 'offer' },
  ];
  for (const p of posts) {
    await Post.create(p);
  }
  console.log('Posts seeded.');

  // --- SAMPLE REPAIRS (inkl. Taifun-Simulation) ---
  const repairs = [
    // ROT = in_repair (In Arbeit)
    { userId: customer1.id, repairNumber: 'REP-2026-00001', deviceName: 'Cube Touring Hybrid ONE 500', status: 'in_repair', statusHistory: [{ status: 'in_repair', timestamp: '2026-01-15T10:00:00Z', note: 'Reparatur gestartet' }], estimatedCompletion: '2026-01-20', taifunRepairId: 'TAI-80001' },
    { userId: customer3.id, repairNumber: 'REP-2026-00003', deviceName: 'Stihl MS 181 C-BE Motorsäge', status: 'in_repair', taifunRepairId: 'TAI-80003', problemDescription: 'Startschwierigkeiten, Vergaser verstopft', statusHistory: [{ status: 'in_repair', timestamp: '2026-02-01T08:30:00Z', note: 'Vergaser wird gereinigt und Zündkerze getauscht' }], estimatedCompletion: '2026-02-07', technicianName: 'Max Wilken' },

    // ROT = quote_created (KVA erstellt)
    { userId: customer5.id, repairNumber: 'REP-2026-00005', deviceName: 'KTM Macina Sport 630 E-Bike', status: 'quote_created', taifunRepairId: 'TAI-80005', problemDescription: 'Display zeigt Fehlermeldung, Motor unterstützt nicht mehr', statusHistory: [{ status: 'in_repair', timestamp: '2026-02-05T10:00:00Z', note: 'E-Bike angenommen' }, { status: 'quote_created', timestamp: '2026-02-06T09:00:00Z', note: 'KVA erstellt und an Kunden gesendet' }], estimatedCompletion: '2026-02-14', technicianName: 'Lisa Müller' },

    // ROT = parts_ordered (Teile bestellt)
    { userId: customer8.id, repairNumber: 'REP-2026-00008', deviceName: 'Honda HRX 537 Rasenmäher', status: 'parts_ordered', taifunRepairId: 'TAI-80008', problemDescription: 'Motor springt nicht an nach Winterpause', statusHistory: [{ status: 'in_repair', timestamp: '2026-02-10T09:00:00Z', note: 'Diagnose durchgeführt' }, { status: 'quote_created', timestamp: '2026-02-10T15:00:00Z', note: 'KVA erstellt' }, { status: 'parts_ordered', timestamp: '2026-02-12T09:00:00Z', note: 'Ersatzteile bestellt' }], estimatedCompletion: '2026-02-17', technicianName: 'Robby Poelker' },
    { userId: customer2.id, repairNumber: 'REP-2026-00002', deviceName: 'Kärcher K5 Premium', status: 'parts_ordered', taifunRepairId: 'TAI-80002', problemDescription: 'Pumpe defekt', statusHistory: [{ status: 'in_repair', timestamp: '2026-01-10T09:00:00Z' }, { status: 'quote_created', timestamp: '2026-01-10T15:00:00Z', note: 'Pumpe defekt - KVA erstellt' }, { status: 'parts_ordered', timestamp: '2026-01-11T10:00:00Z', note: 'Ersatzpumpe bestellt' }], taifunRepairId: 'TAI-80002' },

    // GELB = repair_done (Reparatur fertig)
    { userId: customer4.id, repairNumber: 'REP-2026-00004', deviceName: 'Cube Aim SL 29 Mountainbike', status: 'repair_done', taifunRepairId: 'TAI-80004', problemDescription: 'Hinterrad eiert, Speichen gebrochen', statusHistory: [{ status: 'in_repair', timestamp: '2026-01-28T11:00:00Z', note: 'Reparatur gestartet' }, { status: 'parts_ordered', timestamp: '2026-01-28T16:00:00Z', note: 'Speichen bestellt' }, { status: 'repair_done', timestamp: '2026-01-30T09:00:00Z', note: 'Speichen getauscht und Rad zentriert' }], technicianName: 'Lisa Müller' },
    { userId: customer7.id, repairNumber: 'REP-2026-00007', deviceName: 'Diamant Beryll Deluxe+ E-Bike', status: 'repair_done', taifunRepairId: 'TAI-80007', problemDescription: 'Akku hält nur noch 20km statt 80km', statusHistory: [{ status: 'in_repair', timestamp: '2026-01-20T09:00:00Z' }, { status: 'quote_created', timestamp: '2026-01-20T14:00:00Z', note: 'KVA für Akku-Tausch erstellt' }, { status: 'parts_ordered', timestamp: '2026-01-21T09:00:00Z', note: 'Bosch PowerPack 500Wh bestellt' }, { status: 'repair_done', timestamp: '2026-01-29T09:00:00Z', note: 'Neuer Akku eingebaut, Software-Update durchgeführt' }], technicianName: 'Lisa Müller' },

    // GELB = ready (Abholbereit)
    { userId: customer6.id, repairNumber: 'REP-2026-00006', deviceName: 'Kärcher SC 3 EasyFix Dampfreiniger', status: 'ready', taifunRepairId: 'TAI-80006', problemDescription: 'Kein Dampf mehr, Heizung defekt', statusHistory: [{ status: 'in_repair', timestamp: '2026-02-03T08:00:00Z' }, { status: 'parts_ordered', timestamp: '2026-02-04T09:00:00Z', note: 'Ersatz-Heizelement bestellt' }, { status: 'repair_done', timestamp: '2026-02-07T16:00:00Z', note: 'Heizelement eingebaut' }, { status: 'ready', timestamp: '2026-02-08T09:00:00Z', note: 'Abholbereit' }], technicianName: 'Robby Poelker' },
    { userId: customer9.id, repairNumber: 'REP-2026-00009', deviceName: 'Husqvarna Automower 305 Mähroboter', status: 'ready', taifunRepairId: 'TAI-80009', problemDescription: 'Messer verschlissen, Ladestation erkennt Mäher nicht', statusHistory: [{ status: 'in_repair', timestamp: '2026-02-06T10:00:00Z' }, { status: 'repair_done', timestamp: '2026-02-07T09:00:00Z', note: 'Neue Messer montiert, Kontakte gereinigt' }, { status: 'ready', timestamp: '2026-02-08T14:00:00Z', note: 'Mähroboter einsatzbereit' }], technicianName: 'Max Wilken' },
    { userId: customer10.id, repairNumber: 'REP-2026-00010', deviceName: 'Stihl HSA 56 Akku-Heckenschere', status: 'ready', taifunRepairId: 'TAI-80010', problemDescription: 'Messer blockiert, Schutzschalter löst aus', statusHistory: [{ status: 'in_repair', timestamp: '2026-01-25T09:00:00Z' }, { status: 'repair_done', timestamp: '2026-01-27T16:00:00Z', note: 'Messerführung gerichtet, Motor geprüft' }, { status: 'ready', timestamp: '2026-01-28T11:00:00Z', note: 'Abholbereit' }], technicianName: 'Robby Poelker' },
  ];
  for (const r of repairs) {
    await Repair.create(r);
  }
  console.log(`${repairs.length} repairs seeded (inkl. Taifun-Simulation).`);

  // --- SAMPLE APPOINTMENTS (alle Kunden haben mindestens 1 Termin) ---
  const wpWerkstatt = { name: 'WilkenPoelker Werkstatt', address: 'Musterstraße 1, 49000 Osnabrück' };
  const wpShowroom = { name: 'WilkenPoelker Showroom', address: 'Musterstraße 1, 49000 Osnabrück' };
  const appointments = [
    // Customer 1 - Julia Schmidt
    { userId: customer1.id, title: 'E-Bike Inspektion', type: 'inspection', date: '2026-02-16', startTime: '10:00', endTime: '10:30', status: 'confirmed', location: wpWerkstatt },
    { userId: customer1.id, title: 'Fahrrad Reparatur Gangschaltung', type: 'repair', date: '2026-02-20', startTime: '09:00', endTime: '09:30', status: 'pending', description: 'Meine Gangschaltung funktioniert nicht richtig.', location: wpWerkstatt },
    // Customer 2 - Thomas Meyer
    { userId: customer2.id, title: 'Probefahrt KTM Macina', type: 'consultation', date: '2026-02-12', startTime: '14:00', endTime: '14:30', status: 'pending', location: wpShowroom },
    { userId: customer2.id, title: 'E-Bike Abholung', type: 'pickup', date: '2026-02-18', startTime: '11:00', endTime: '11:30', status: 'confirmed', description: 'Abholung des bestellten E-Bikes.', location: wpShowroom },
    // Customer 3 - Anna Bergmann
    { userId: customer3.id, title: 'Motorsägen-Reparatur Abgabe', type: 'repair', date: '2026-02-02', startTime: '08:30', endTime: '09:00', status: 'completed', description: 'Stihl MS 181 zur Reparatur abgeben.', location: wpWerkstatt },
    { userId: customer3.id, title: 'Motorsäge Abholung', type: 'pickup', date: '2026-02-10', startTime: '14:00', endTime: '14:30', status: 'confirmed', description: 'Reparierte Motorsäge abholen.', location: wpWerkstatt },
    // Customer 4 - Markus Weber
    { userId: customer4.id, title: 'MTB Speichenreparatur Abholung', type: 'pickup', date: '2026-02-03', startTime: '10:00', endTime: '10:30', status: 'confirmed', description: 'Repariertes Mountainbike abholen.', location: wpWerkstatt },
    { userId: customer4.id, title: 'Beratung E-Bike Kauf', type: 'consultation', date: '2026-03-02', startTime: '15:00', endTime: '15:45', status: 'pending', description: 'Möchte mich zu E-Bikes beraten lassen.', location: wpShowroom },
    // Customer 5 - Sarah Fischer
    { userId: customer5.id, title: 'E-Bike Reparatur-Status', type: 'consultation', date: '2026-02-12', startTime: '10:00', endTime: '10:15', status: 'completed', description: 'Besprechung zum Reparaturstatus des KTM Macina.', location: wpWerkstatt },
    { userId: customer5.id, title: 'E-Bike Inspektion Frühjahr', type: 'inspection', date: '2026-03-10', startTime: '09:00', endTime: '09:30', status: 'pending', description: 'Frühjahrs-Check für E-Bike.', location: wpWerkstatt },
    // Customer 6 - Peter Koch
    { userId: customer6.id, title: 'Dampfreiniger Abholung', type: 'pickup', date: '2026-02-10', startTime: '16:00', endTime: '16:30', status: 'confirmed', description: 'Reparierten Kärcher SC 3 abholen.', location: wpWerkstatt },
    { userId: customer6.id, title: 'Hochdruckreiniger Beratung', type: 'consultation', date: '2026-03-05', startTime: '11:00', endTime: '11:30', status: 'pending', description: 'Beratung zum Kauf eines neuen Hochdruckreinigers.', location: wpShowroom },
    // Customer 7 - Laura Bauer
    { userId: customer7.id, title: 'E-Bike Akku-Tausch Abholung', type: 'pickup', date: '2026-01-30', startTime: '10:00', endTime: '10:30', status: 'completed', description: 'Abholung des E-Bikes nach Akku-Tausch.', location: wpWerkstatt },
    { userId: customer7.id, title: 'Fahrrad-Leasing Beratung', type: 'consultation', date: '2026-03-16', startTime: '14:00', endTime: '14:45', status: 'pending', description: 'Beratung zum Dienstrad-Leasing.', location: wpShowroom },
    // Customer 8 - Daniel Hoffmann
    { userId: customer8.id, title: 'Rasenmäher Frühjahrscheck', type: 'service', date: '2026-02-10', startTime: '09:00', endTime: '09:30', status: 'confirmed', description: 'Honda HRX 537 zum Frühjahrscheck abgeben.', location: wpWerkstatt },
    { userId: customer8.id, title: 'Rasenmäher Abholung', type: 'pickup', date: '2026-02-19', startTime: '15:00', endTime: '15:30', status: 'pending', description: 'Rasenmäher nach Service abholen.', location: wpWerkstatt },
    // Customer 9 - Katharina Schulz
    { userId: customer9.id, title: 'Mähroboter Abholung', type: 'pickup', date: '2026-02-11', startTime: '10:00', endTime: '10:30', status: 'confirmed', description: 'Reparierten Husqvarna Automower abholen.', location: wpWerkstatt },
    { userId: customer9.id, title: 'Gartenpflege-Beratung', type: 'consultation', date: '2026-03-09', startTime: '13:00', endTime: '13:30', status: 'pending', description: 'Welche Geräte brauche ich für einen großen Garten?', location: wpShowroom },
    // Customer 10 - Frank Müller
    { userId: customer10.id, title: 'Heckenschere Abholung', type: 'pickup', date: '2026-01-28', startTime: '11:00', endTime: '11:30', status: 'completed', description: 'Reparierte Stihl HSA 56 abholen.', location: wpWerkstatt },
    { userId: customer10.id, title: 'Kettensäge Inspektion', type: 'inspection', date: '2026-03-12', startTime: '08:30', endTime: '09:00', status: 'pending', description: 'Jährliche Inspektion der Motorsäge.', location: wpWerkstatt },
  ];
  for (const a of appointments) {
    await Appointment.create(a);
  }
  console.log(`${appointments.length} appointments seeded (alle Kunden).`);

  // --- SERVICE TICKETS ---
  // Helper: generate ticket number
  let ticketCounter = 1;
  const nextTicketNum = () => `TK-2026-${String(ticketCounter++).padStart(5, '0')}`;

  // Ticket 1: CLOSED bike ticket - customer1 → bikeManager (rated)
  const ticket1 = await Ticket.create({
    ticketNumber: nextTicketNum(),
    userId: customer1.id,
    title: 'Reparaturanfrage',
    type: 'repair',
    category: 'bike',
    description: 'Mein E-Bike macht komische Geräusche beim Treten. Es knirscht im Tretlager und die Kette springt gelegentlich.',
    urgency: 'normal',
    status: 'closed',
    assignedTo: bikeManager.id,
    closedAt: new Date('2026-02-01T16:00:00Z'),
    closedBy: bikeManager.id,
  });

  // Ticket 2: IN_PROGRESS bike ticket - customer2 → bikeManager (active chat)
  const ticket2 = await Ticket.create({
    ticketNumber: nextTicketNum(),
    userId: customer2.id,
    title: 'Beratung',
    type: 'consultation',
    category: 'bike',
    description: 'Ich möchte mich zum Thema E-Bike Leasing beraten lassen. Welche Modelle kommen in Frage?',
    urgency: 'normal',
    status: 'in_progress',
    assignedTo: bikeManager.id,
  });

  // Ticket 3: OPEN cleaning ticket - customer3 (unassigned)
  const ticket3 = await Ticket.create({
    ticketNumber: nextTicketNum(),
    userId: customer3.id,
    title: 'Gerätereparatur',
    type: 'repair',
    category: 'cleaning',
    description: 'Mein Kärcher K5 baut keinen Druck mehr auf. Wasser kommt raus, aber ohne Druck.',
    urgency: 'urgent',
    status: 'open',
  });

  // Ticket 4: IN_PROGRESS motor ticket - customer4 → motorManager (active chat)
  const ticket4 = await Ticket.create({
    ticketNumber: nextTicketNum(),
    userId: customer4.id,
    title: 'Inspektion',
    type: 'maintenance',
    category: 'motor',
    description: 'Meine Stihl Motorsäge muss zur jährlichen Inspektion. Wann kann ich vorbeikommen?',
    urgency: 'normal',
    status: 'in_progress',
    assignedTo: motorManager.id,
  });

  // Ticket 5: CLOSED service ticket - customer5 → serviceManager (rated)
  const ticket5 = await Ticket.create({
    ticketNumber: nextTicketNum(),
    userId: customer5.id,
    title: 'Allgemeine Frage',
    type: 'other',
    category: 'service',
    description: 'Haben Sie Samstags auch für Reparaturannahme geöffnet? Ich arbeite unter der Woche bis 18 Uhr.',
    urgency: 'normal',
    status: 'closed',
    assignedTo: serviceManager.id,
    closedAt: new Date('2026-01-28T14:00:00Z'),
    closedBy: serviceManager.id,
  });

  // Ticket 6: IN_PROGRESS cleaning ticket - customer6 → cleaningManager (active chat)
  const ticket6 = await Ticket.create({
    ticketNumber: nextTicketNum(),
    userId: customer6.id,
    title: 'Ersatzteil',
    type: 'repair',
    category: 'cleaning',
    description: 'Ich brauche eine neue Düse für meinen Kärcher SC 3 Dampfreiniger. Haben Sie die auf Lager?',
    urgency: 'normal',
    status: 'in_progress',
    assignedTo: cleaningManager.id,
  });

  // Ticket 7: CLOSED bike ticket - customer7 → bikeManager (forwarded from serviceManager, rated)
  const ticket7 = await Ticket.create({
    ticketNumber: nextTicketNum(),
    userId: customer7.id,
    title: 'Garantiefall',
    type: 'repair',
    category: 'bike',
    description: 'Mein E-Bike Akku (gekauft vor 8 Monaten) hält nur noch 15km statt 80km. Ist das ein Garantiefall?',
    urgency: 'urgent',
    status: 'closed',
    assignedTo: bikeManager.id,
    forwardedFrom: serviceManager.id,
    closedAt: new Date('2026-02-05T11:00:00Z'),
    closedBy: bikeManager.id,
  });

  // Ticket 8: OPEN motor ticket - customer8 (unassigned)
  const ticket8 = await Ticket.create({
    ticketNumber: nextTicketNum(),
    userId: customer8.id,
    title: 'Ersatzteil bestellen',
    type: 'motor_question',
    category: 'motor',
    description: 'Ich benötige ein neues Messer für meinen Husqvarna Automower 305. Können Sie das bestellen?',
    urgency: 'normal',
    status: 'open',
  });

  // Ticket 9: IN_PROGRESS service ticket - customer9 → serviceManager (active chat)
  const ticket9 = await Ticket.create({
    ticketNumber: nextTicketNum(),
    userId: customer9.id,
    title: 'Reklamation',
    type: 'other',
    category: 'service',
    description: 'Die letzte Reparatur meines Mähroboters war leider nicht erfolgreich. Das Problem besteht weiterhin.',
    urgency: 'urgent',
    status: 'in_progress',
    assignedTo: serviceManager.id,
  });

  // Ticket 10: CLOSED motor ticket - customer10 → motorManager (rated)
  const ticket10 = await Ticket.create({
    ticketNumber: nextTicketNum(),
    userId: customer10.id,
    title: 'Reparatur',
    type: 'repair',
    category: 'motor',
    description: 'Meine Stihl Heckenschere blockiert nach 5 Minuten Betrieb. Der Motor wird sehr heiß.',
    urgency: 'normal',
    status: 'closed',
    assignedTo: motorManager.id,
    closedAt: new Date('2026-01-25T15:00:00Z'),
    closedBy: motorManager.id,
  });

  // Ticket 11: OPEN bike ticket - customer3 (second ticket, unassigned)
  const ticket11 = await Ticket.create({
    ticketNumber: nextTicketNum(),
    userId: customer3.id,
    title: 'Beratung',
    type: 'consultation',
    category: 'bike',
    description: 'Ich suche ein E-Bike für meine tägliche Pendlerstrecke von 25km. Was empfehlen Sie?',
    urgency: 'normal',
    status: 'open',
  });

  // Ticket 12: IN_PROGRESS bike ticket - customer5 → bikeManager (active)
  const ticket12 = await Ticket.create({
    ticketNumber: nextTicketNum(),
    userId: customer5.id,
    title: 'Ersatzteil bestellen',
    type: 'bike_question',
    category: 'bike',
    description: 'Ich brauche einen neuen Sattel für mein KTM Macina Sport. Haben Sie komfortable Optionen?',
    urgency: 'normal',
    status: 'in_progress',
    assignedTo: bikeManager.id,
  });

  console.log('12 tickets seeded.');

  // --- CHAT MESSAGES ---
  // Ticket 1 (closed bike repair) - full conversation
  await ChatMessage.bulkCreate([
    { ticketId: ticket1.id, userId: customer1.id, message: 'Hallo, mein E-Bike macht seit einer Woche komische Geräusche beim Treten. Es knirscht im Tretlager.', createdAt: new Date('2026-01-28T09:00:00Z') },
    { ticketId: ticket1.id, userId: bikeManager.id, message: 'Hallo Frau Schmidt, das klingt nach einem Problem mit dem Tretlager oder der Kette. Können Sie das Geräusch genauer beschreiben? Tritt es nur unter Last auf?', createdAt: new Date('2026-01-28T09:15:00Z') },
    { ticketId: ticket1.id, userId: customer1.id, message: 'Ja, hauptsächlich wenn ich stärker in die Pedale trete. Und manchmal springt die Kette auf dem kleinen Ritzel.', createdAt: new Date('2026-01-28T09:22:00Z') },
    { ticketId: ticket1.id, userId: bikeManager.id, message: 'Das klingt nach verschlissenem Tretlager und eventuell einer gelängten Kette. Ich würde empfehlen, das Rad bei uns vorbeizubringen. Können Sie diese Woche vorbeikommen?', createdAt: new Date('2026-01-28T09:30:00Z') },
    { ticketId: ticket1.id, userId: customer1.id, message: 'Ja, ich kann morgen Mittwoch gegen 10 Uhr kommen. Passt das?', createdAt: new Date('2026-01-28T09:35:00Z') },
    { ticketId: ticket1.id, userId: bikeManager.id, message: 'Perfekt, Mittwoch 10 Uhr passt! Bringen Sie bitte auch den Kaufbeleg mit, falls noch Garantie besteht.', createdAt: new Date('2026-01-28T09:40:00Z') },
    { ticketId: ticket1.id, userId: customer1.id, message: 'Super, mache ich! Bis morgen dann.', createdAt: new Date('2026-01-28T09:45:00Z') },
    { ticketId: ticket1.id, userId: bikeManager.id, message: 'Frau Schmidt, ich habe Ihr Rad untersucht. Das Tretlager ist tatsächlich verschlissen und die Kette ist 0.75mm gelängt. Ich empfehle Tretlager + Kette + Kassette zu tauschen. Kosten: ca. 120€ inkl. Einbau.', createdAt: new Date('2026-01-29T14:00:00Z') },
    { ticketId: ticket1.id, userId: customer1.id, message: 'Okay, bitte machen Sie das. Wann ist es fertig?', createdAt: new Date('2026-01-29T14:15:00Z') },
    { ticketId: ticket1.id, userId: bikeManager.id, message: 'Die Teile sind auf Lager. Ich kann das Rad morgen fertig haben. Sie können es ab Freitag 10 Uhr abholen.', createdAt: new Date('2026-01-29T14:20:00Z') },
    { ticketId: ticket1.id, userId: customer1.id, message: 'Perfekt, vielen Dank! Dann hole ich es Freitag ab.', createdAt: new Date('2026-01-29T14:25:00Z') },
    { ticketId: ticket1.id, userId: bikeManager.id, message: 'Ihr E-Bike ist fertig! Tretlager, Kette und Kassette wurden getauscht. Alles läuft wieder einwandfrei. Sie können es jederzeit abholen.', createdAt: new Date('2026-01-31T10:00:00Z') },
    { ticketId: ticket1.id, userId: customer1.id, message: 'Toll, ich komme heute Nachmittag vorbei! Danke für den schnellen Service! 👍', createdAt: new Date('2026-01-31T10:10:00Z') },
    { ticketId: ticket1.id, userId: bikeManager.id, message: 'Gerne! Ich schließe dann das Ticket. Viel Spaß beim Fahren!', isSystemMessage: false, createdAt: new Date('2026-02-01T16:00:00Z') },
    { ticketId: ticket1.id, userId: bikeManager.id, message: 'Ticket wurde geschlossen von Lisa Müller', isSystemMessage: true, createdAt: new Date('2026-02-01T16:00:01Z') },
  ]);

  // Ticket 2 (active bike consultation) - ongoing chat
  await ChatMessage.bulkCreate([
    { ticketId: ticket2.id, userId: customer2.id, message: 'Guten Tag! Ich interessiere mich für E-Bike Leasing über meinen Arbeitgeber. Welche Modelle bieten Sie an?', createdAt: new Date('2026-02-10T08:00:00Z') },
    { ticketId: ticket2.id, userId: bikeManager.id, message: 'Guten Tag Herr Meyer! Wir bieten Leasing über JobRad, BusinessBike und Eurorad an. Grundsätzlich können Sie jedes E-Bike aus unserem Sortiment leasen. Haben Sie schon eine Preisvorstellung?', createdAt: new Date('2026-02-10T08:20:00Z') },
    { ticketId: ticket2.id, userId: customer2.id, message: 'Mein Arbeitgeber unterstützt JobRad. Budget liegt bei ca. 3000-4000€. Ich brauche etwas Sportliches für 20km Pendelstrecke.', createdAt: new Date('2026-02-10T08:30:00Z') },
    { ticketId: ticket2.id, userId: bikeManager.id, message: 'Super, da hätte ich zwei tolle Optionen:\n\n1. KTM Macina Sport 630 (3.299€, aktuell 2.899€ im Angebot!) - Sportliches E-Bike mit starkem CX Motor\n2. Cube Touring Hybrid ONE 500 (2.599€) - Komfortabler Allrounder\n\nBeide sind für Pendler perfekt geeignet. Möchten Sie eine Probefahrt machen?', createdAt: new Date('2026-02-10T08:45:00Z') },
    { ticketId: ticket2.id, userId: customer2.id, message: 'Das KTM klingt super! Ja, eine Probefahrt wäre toll. Wann hätten Sie Zeit?', createdAt: new Date('2026-02-10T09:00:00Z') },
    { ticketId: ticket2.id, userId: bikeManager.id, message: 'Wie wäre es Samstag Vormittag? Wir haben von 9-13 Uhr geöffnet. Dann haben Sie genug Zeit für eine ausgiebige Probefahrt.', createdAt: new Date('2026-02-10T09:10:00Z') },
    { ticketId: ticket2.id, userId: customer2.id, message: 'Samstag 10 Uhr passt perfekt! Bis dann!', createdAt: new Date('2026-02-10T09:15:00Z') },
  ]);

  // Ticket 3 (open cleaning repair) - only initial message, unassigned
  // No chat messages yet (nobody assigned)

  // Ticket 4 (active motor inspection) - ongoing
  await ChatMessage.bulkCreate([
    { ticketId: ticket4.id, userId: customer4.id, message: 'Hallo, meine Stihl Motorsäge muss zur jährlichen Inspektion. Wann kann ich vorbeikommen?', createdAt: new Date('2026-02-08T10:00:00Z') },
    { ticketId: ticket4.id, userId: motorManager.id, message: 'Hallo Herr Weber! Kein Problem. Welches Modell haben Sie genau? Und wann wurde die letzte Inspektion gemacht?', createdAt: new Date('2026-02-08T10:30:00Z') },
    { ticketId: ticket4.id, userId: customer4.id, message: 'Es ist eine Stihl MS 181 C-BE, gekauft vor ca. 2 Jahren. Letzte Inspektion war letztes Frühjahr.', createdAt: new Date('2026-02-08T10:40:00Z') },
    { ticketId: ticket4.id, userId: motorManager.id, message: 'Perfekt, dann ist ein Jahrescheck genau richtig. Wir machen:\n- Luftfilter reinigen/tauschen\n- Zündkerze prüfen\n- Kette schärfen\n- Vergaser einstellen\n- Sicherheitscheck\n\nKosten: ca. 45€. Können Sie nächste Woche Dienstag vorbeikommen?', createdAt: new Date('2026-02-08T11:00:00Z') },
    { ticketId: ticket4.id, userId: customer4.id, message: 'Dienstag passt mir gut. Muss ich die Säge morgens abgeben oder kann ich warten?', createdAt: new Date('2026-02-08T11:10:00Z') },
  ]);

  // Ticket 5 (closed service question) - short conversation
  await ChatMessage.bulkCreate([
    { ticketId: ticket5.id, userId: customer5.id, message: 'Haben Sie Samstags auch für Reparaturannahme geöffnet? Ich arbeite unter der Woche bis 18 Uhr.', createdAt: new Date('2026-01-27T18:00:00Z') },
    { ticketId: ticket5.id, userId: serviceManager.id, message: 'Hallo Frau Fischer! Ja, Samstags haben wir von 9-13 Uhr geöffnet. Sie können da gerne Geräte zur Reparatur abgeben. Unter der Woche sind wir bis 18 Uhr (im Winter bis 17 Uhr) da.', createdAt: new Date('2026-01-28T08:00:00Z') },
    { ticketId: ticket5.id, userId: customer5.id, message: 'Super, dann komme ich Samstag vorbei. Vielen Dank!', createdAt: new Date('2026-01-28T08:15:00Z') },
    { ticketId: ticket5.id, userId: serviceManager.id, message: 'Gerne! Bis Samstag. Ich schließe dann das Ticket.', createdAt: new Date('2026-01-28T13:50:00Z') },
    { ticketId: ticket5.id, userId: serviceManager.id, message: 'Ticket wurde geschlossen von Andrea Brinkmann', isSystemMessage: true, createdAt: new Date('2026-01-28T14:00:00Z') },
  ]);

  // Ticket 6 (active cleaning spare part) - ongoing
  await ChatMessage.bulkCreate([
    { ticketId: ticket6.id, userId: customer6.id, message: 'Ich brauche eine neue Bodendüse für meinen Kärcher SC 3 EasyFix. Die alte ist gebrochen.', createdAt: new Date('2026-02-11T09:00:00Z') },
    { ticketId: ticket6.id, userId: cleaningManager.id, message: 'Guten Tag Herr Koch! Die EasyFix Bodendüse ist ein häufiges Verschleißteil. Wir haben die aktuell auf Lager. Preis: 29,99€. Soll ich eine für Sie reservieren?', createdAt: new Date('2026-02-11T09:30:00Z') },
    { ticketId: ticket6.id, userId: customer6.id, message: 'Ja bitte! Kann ich die auch einfach abholen ohne Termin?', createdAt: new Date('2026-02-11T09:40:00Z') },
    { ticketId: ticket6.id, userId: cleaningManager.id, message: 'Natürlich! Ich lege die für Sie an die Kasse. Sie können jederzeit während der Öffnungszeiten vorbeikommen. Name Koch ist notiert.', createdAt: new Date('2026-02-11T09:50:00Z') },
  ]);

  // Ticket 7 (closed, forwarded bike warranty) - conversation with forwarding
  await ChatMessage.bulkCreate([
    { ticketId: ticket7.id, userId: customer7.id, message: 'Mein E-Bike Akku hält nur noch 15km statt 80km. Das Rad ist erst 8 Monate alt! Ist das ein Garantiefall?', createdAt: new Date('2026-02-01T10:00:00Z') },
    { ticketId: ticket7.id, userId: serviceManager.id, message: 'Hallo Frau Bauer, das klingt definitiv nach einem Garantiefall. Ich leite Sie an unsere Fahrrad-Abteilung weiter, die können das am besten beurteilen.', createdAt: new Date('2026-02-01T10:15:00Z') },
    { ticketId: ticket7.id, userId: serviceManager.id, message: 'Ticket wurde weitergeleitet an Lisa Müller (Fahrrad-Abteilung)', isSystemMessage: true, createdAt: new Date('2026-02-01T10:16:00Z') },
    { ticketId: ticket7.id, userId: bikeManager.id, message: 'Hallo Frau Bauer, hier Lisa Müller aus der Fahrrad-Abteilung. Bei einem Akku-Kapazitätsverlust von über 50% innerhalb der Garantiezeit haben Sie Anspruch auf einen kostenfreien Austausch. Bitte bringen Sie das Rad und den Kaufbeleg vorbei.', createdAt: new Date('2026-02-01T11:00:00Z') },
    { ticketId: ticket7.id, userId: customer7.id, message: 'Oh das freut mich! Ich komme morgen mit dem Rad vorbei. Muss ich vorher noch etwas machen?', createdAt: new Date('2026-02-01T11:15:00Z') },
    { ticketId: ticket7.id, userId: bikeManager.id, message: 'Nein, bringen Sie einfach das Rad und den Kaufbeleg mit. Wir machen dann einen Akku-Diagnosetest und bestellen ggf. den Ersatzakku. Das dauert meist 3-5 Werktage.', createdAt: new Date('2026-02-01T11:20:00Z') },
    { ticketId: ticket7.id, userId: customer7.id, message: 'Alles klar, bis morgen! Vielen Dank für die schnelle Hilfe!', createdAt: new Date('2026-02-01T11:25:00Z') },
    { ticketId: ticket7.id, userId: bikeManager.id, message: 'Frau Bauer, der Akku-Test hat den Defekt bestätigt. Der Ersatzakku ist bestellt und sollte Freitag da sein. Wir melden uns!', createdAt: new Date('2026-02-02T14:00:00Z') },
    { ticketId: ticket7.id, userId: bikeManager.id, message: 'Gute Neuigkeiten! Der neue Akku ist da. Ihr E-Bike ist abholbereit. Software-Update wurde auch gleich mitgemacht.', createdAt: new Date('2026-02-05T09:00:00Z') },
    { ticketId: ticket7.id, userId: customer7.id, message: 'Super! Ich hole es heute noch ab. Vielen Dank für den tollen Service! 🎉', createdAt: new Date('2026-02-05T09:30:00Z') },
    { ticketId: ticket7.id, userId: bikeManager.id, message: 'Ticket wurde geschlossen von Lisa Müller', isSystemMessage: true, createdAt: new Date('2026-02-05T11:00:00Z') },
  ]);

  // Ticket 9 (active service complaint) - ongoing
  await ChatMessage.bulkCreate([
    { ticketId: ticket9.id, userId: customer9.id, message: 'Hallo, die letzte Reparatur meines Husqvarna Automower 305 war leider nicht erfolgreich. Die Ladestation erkennt den Mäher immer noch nicht zuverlässig.', createdAt: new Date('2026-02-12T09:00:00Z') },
    { ticketId: ticket9.id, userId: serviceManager.id, message: 'Das tut mir sehr leid, Frau Schulz! Haben Sie die Kontakte an der Ladestation mal mit einem trockenen Tuch gereinigt? Manchmal hilft das.', createdAt: new Date('2026-02-12T09:20:00Z') },
    { ticketId: ticket9.id, userId: customer9.id, message: 'Ja, das habe ich gemacht. Funktioniert trotzdem nur sporadisch. Vielleicht liegt es an der Ladestation selbst?', createdAt: new Date('2026-02-12T09:30:00Z') },
    { ticketId: ticket9.id, userId: serviceManager.id, message: 'Das kann gut sein. Bringen Sie bitte den Mäher UND die Ladestation vorbei. Wir testen beides zusammen. Selbstverständlich entstehen Ihnen keine Kosten, da die vorherige Reparatur das Problem nicht gelöst hat.', createdAt: new Date('2026-02-12T09:45:00Z') },
    { ticketId: ticket9.id, userId: customer9.id, message: 'Danke, das ist fair. Ich bringe beides morgen Vormittag vorbei.', createdAt: new Date('2026-02-12T10:00:00Z') },
  ]);

  // Ticket 10 (closed motor repair) - short conversation
  await ChatMessage.bulkCreate([
    { ticketId: ticket10.id, userId: customer10.id, message: 'Meine Stihl Heckenschere blockiert nach 5 Minuten Betrieb und wird sehr heiß.', createdAt: new Date('2026-01-20T10:00:00Z') },
    { ticketId: ticket10.id, userId: motorManager.id, message: 'Hallo Herr Müller, das klingt nach einem Problem mit der Messerführung oder dem Motor. Bringen Sie die Schere bitte vorbei, wir schauen uns das an.', createdAt: new Date('2026-01-20T10:30:00Z') },
    { ticketId: ticket10.id, userId: customer10.id, message: 'Ich komme morgen, 11 Uhr. Geht das?', createdAt: new Date('2026-01-20T10:40:00Z') },
    { ticketId: ticket10.id, userId: motorManager.id, message: 'Passt perfekt!', createdAt: new Date('2026-01-20T10:45:00Z') },
    { ticketId: ticket10.id, userId: motorManager.id, message: 'Herr Müller, die Messerführung war verbogen. Wir haben sie gerichtet und den Motor geprüft - alles wieder in Ordnung. Sie können die Schere abholen.', createdAt: new Date('2026-01-24T15:00:00Z') },
    { ticketId: ticket10.id, userId: customer10.id, message: 'Toll, vielen Dank! Komme morgen zum Abholen.', createdAt: new Date('2026-01-24T15:15:00Z') },
    { ticketId: ticket10.id, userId: motorManager.id, message: 'Ticket wurde geschlossen von Jürgen Kraft', isSystemMessage: true, createdAt: new Date('2026-01-25T15:00:00Z') },
  ]);

  // Ticket 12 (active bike spare part) - ongoing
  await ChatMessage.bulkCreate([
    { ticketId: ticket12.id, userId: customer5.id, message: 'Hallo, ich suche einen bequemeren Sattel für mein KTM Macina Sport 630. Der Originalsattel ist mir zu hart für lange Strecken.', createdAt: new Date('2026-02-13T11:00:00Z') },
    { ticketId: ticket12.id, userId: bikeManager.id, message: 'Hallo Frau Fischer! Für Langstrecken empfehle ich den SQlab 602 Ergolux (89€) oder den Selle Royal Respiro (59€). Beide sind deutlich komfortabler als der Standard-Sattel. Wollen Sie mal probesitzen?', createdAt: new Date('2026-02-13T11:30:00Z') },
    { ticketId: ticket12.id, userId: customer5.id, message: 'Der SQlab klingt interessant! Haben Sie den in der Filiale zum Probesitzen?', createdAt: new Date('2026-02-13T11:45:00Z') },
  ]);

  console.log('Chat messages seeded (for 10 of 12 tickets).');

  // --- SERVICE RATINGS (for closed tickets) ---
  await ServiceRating.bulkCreate([
    // Rating for Ticket 1 - customer1 rates bikeManager
    {
      userId: customer1.id,
      staffId: bikeManager.id,
      ticketId: ticket1.id,
      type: 'repair',
      overallRating: 5,
      qualityRating: 5,
      friendlinessRating: 5,
      waitTimeRating: 4,
      valueRating: 4,
      text: 'Sehr schnelle und professionelle Reparatur! Frau Müller hat mir alles genau erklärt. Mein E-Bike läuft wieder wie neu.',
    },
    // Rating for Ticket 5 - customer5 rates serviceManager
    {
      userId: customer5.id,
      staffId: serviceManager.id,
      ticketId: ticket5.id,
      type: 'service',
      overallRating: 4,
      friendlinessRating: 5,
      text: 'Schnelle und freundliche Antwort auf meine Frage. Danke!',
    },
    // Rating for Ticket 7 - customer7 rates bikeManager
    {
      userId: customer7.id,
      staffId: bikeManager.id,
      ticketId: ticket7.id,
      type: 'repair',
      overallRating: 5,
      qualityRating: 5,
      friendlinessRating: 5,
      waitTimeRating: 5,
      valueRating: 5,
      text: 'Hervorragender Service! Garantiefall wurde unkompliziert und schnell abgewickelt. Neuer Akku funktioniert einwandfrei. Absolut empfehlenswert!',
    },
    // Rating for Ticket 10 - customer10 rates motorManager
    {
      userId: customer10.id,
      staffId: motorManager.id,
      ticketId: ticket10.id,
      type: 'repair',
      overallRating: 4,
      qualityRating: 5,
      friendlinessRating: 4,
      waitTimeRating: 3,
      valueRating: 4,
      text: 'Gute Reparatur, Heckenschere funktioniert wieder einwandfrei. Hätte nur gerne etwas schneller eine Rückmeldung bekommen.',
    },
  ]);

  console.log('4 service ratings seeded.');

  // --- FAQs ---
  const faqData = [
    // Service FAQs (general)
    { question: 'Wie oft sollte mein Fahrrad zur Inspektion?', answer: 'Wir empfehlen eine jährliche Inspektion oder nach ca. 2.000 km. Bei intensiver Nutzung auch häufiger.', category: 'service', order: 1, createdBy: admin.id },
    { question: 'Wie lange dauert eine Reparatur?', answer: 'Kleinere Reparaturen erledigen wir oft am selben Tag. Größere Arbeiten dauern in der Regel 2-5 Werktage.', category: 'service', order: 2, createdBy: admin.id },
    { question: 'Welche Garantie gibt es auf Reparaturen?', answer: 'Auf unsere Reparaturarbeiten geben wir 6 Monate Garantie. Auf eingebaute Ersatzteile gilt die jeweilige Herstellergarantie.', category: 'service', order: 3, createdBy: admin.id },
    { question: 'Wann haben Sie geöffnet?', answer: 'Montag bis Freitag 08:00\u201313:00 und 14:00\u201318:00 Uhr, Samstag 09:00\u201313:00 Uhr. Im Winter (01.11.\u201301.02.) schließen wir unter der Woche bereits um 17:00 Uhr.', category: 'service', order: 4, createdBy: admin.id },
    { question: 'Was kostet eine Inspektion?', answer: 'Eine Standard-Inspektion kostet ab 49,- Euro inkl. MwSt. Den genauen Preis erfahren Sie nach einer Einschätzung vor Ort.', category: 'service', order: 5, createdBy: admin.id },
    // Bike FAQs
    { question: 'Wie oft sollte mein Fahrrad zur Inspektion?', answer: 'Wir empfehlen eine jährliche Inspektion oder nach ca. 2.000 km. Bei E-Bikes und intensiver Nutzung auch häufiger.', category: 'bike', order: 1, createdBy: admin.id },
    { question: 'Bieten Sie auch E-Bike-Service an?', answer: 'Ja, wir sind auf alle gängigen E-Bike-Systeme spezialisiert (Bosch, Shimano, Brose). Akku-Diagnose und Software-Updates gehören zu unserem Standard-Service.', category: 'bike', order: 2, createdBy: admin.id },
    { question: 'Wie lange dauert eine Fahrrad-Reparatur?', answer: 'Kleinere Reparaturen wie Reifenwechsel erledigen wir oft am selben Tag. Größere Arbeiten dauern 2\u20135 Werktage.', category: 'bike', order: 3, createdBy: admin.id },
    { question: 'Bieten Sie Fahrrad-Leasing an?', answer: 'Ja, wir bieten Dienstrad-Leasing über verschiedene Anbieter an. Sprechen Sie uns gerne an für ein individuelles Angebot.', category: 'bike', order: 4, createdBy: admin.id },
    // Cleaning FAQs
    { question: 'Wie oft sollte ein Hochdruckreiniger gewartet werden?', answer: 'Wir empfehlen eine jährliche Wartung bei regelmäßiger Nutzung. Bei gewerblichem Einsatz alle 6 Monate.', category: 'cleaning', order: 1, createdBy: admin.id },
    { question: 'Reparieren Sie alle Marken?', answer: 'Ja, wir reparieren Reinigungsgeräte aller gängigen Marken wie Kärcher, Nilfisk, Stihl und viele mehr.', category: 'cleaning', order: 2, createdBy: admin.id },
    { question: 'Haben Sie Zubehör und Ersatzteile?', answer: 'Wir führen ein umfangreiches Sortiment an Originalzubehör und Ersatzteilen. Nicht vorrätige Teile bestellen wir innerhalb von 2-3 Werktagen.', category: 'cleaning', order: 3, createdBy: admin.id },
    { question: 'Welche Garantie gibt es auf Reparaturen?', answer: 'Auf unsere Reparaturarbeiten geben wir 6 Monate Garantie. Eingebaute Ersatzteile unterliegen der Herstellergarantie.', category: 'cleaning', order: 4, createdBy: admin.id },
    // Motor FAQs
    { question: 'Wann sollte ich meinen Rasenmäher warten lassen?', answer: 'Idealerweise zu Saisonbeginn im Frühjahr. Wir bieten einen kompletten Frühjahrscheck inkl. Ölwechsel, Zündkerze und Messerschärfung.', category: 'motor', order: 1, createdBy: admin.id },
    { question: 'Bieten Sie Einwinterungsservice an?', answer: 'Ja, wir bieten einen Einwinterungsservice für alle Motorgeräte an \u2014 inkl. Kraftstoffsystem-Pflege und sachgerechter Lagerung.', category: 'motor', order: 2, createdBy: admin.id },
    { question: 'Wie lange dauert eine Motorsägen-Reparatur?', answer: 'Standardreparaturen wie Kettenwechsel oder Vergasereinstellung erledigen wir oft am selben Tag. Größere Reparaturen dauern 3\u20137 Werktage.', category: 'motor', order: 3, createdBy: admin.id },
    { question: 'Bieten Sie Sicherheitschecks an?', answer: 'Ja, wir prüfen alle sicherheitsrelevanten Teile und stellen sicher, dass Ihr Gerät den aktuellen Sicherheitsstandards entspricht.', category: 'motor', order: 4, createdBy: admin.id },
  ];
  for (const f of faqData) {
    await FAQ.create(f);
  }
  console.log(`${faqData.length} FAQs seeded.`);

  console.log('Seeding complete!');
}

// Export seed function for programmatic use (auto-seed on first deploy)
module.exports = seed;

// Run directly if called as script (npm run seed)
if (require.main === module) {
  seed()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Seed error:', err);
      process.exit(1);
    });
}
