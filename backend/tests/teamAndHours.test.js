// Team list and opening hours are edited in the app and the PC program and
// shown on the website: the server keeps their shape and rebuilds the site.
jest.mock('../src/models/AboutContent', () => ({ findOrCreate: jest.fn() }));
jest.mock('../src/models', () => ({ OpeningHour: { findOrCreate: jest.fn() }, Holiday: {} }));
jest.mock('../src/services/websiteBuilder', () => ({ schedule: jest.fn() }));

const AboutContent = require('../src/models/AboutContent');
const { OpeningHour } = require('../src/models');
const websiteBuilder = require('../src/services/websiteBuilder');
const { teamProblem, updateContentKey } = require('../src/controllers/aboutController');
const { updateOpeningHours } = require('../src/controllers/settingsController');

const res = () => {
  const r = {};
  r.status = jest.fn(() => r);
  r.json = jest.fn(() => r);
  return r;
};
const team = () => [{
  key: 'Verkauf', label: 'Verkauf', color: '#2E7D32', icon: 'bicycle',
  members: [
    { name: 'Erika Muster', position: 'Verkauf', phone: null, image: 'placeholder-female' },
    { name: 'Max Muster', position: 'Werkstatt', phone: '04952/1', imageUrl: 'https://res.cloudinary.com/x/image/upload/a.jpg' },
    { name: 'Neu', position: '', phone: null, image: '', imageUrl: '/uploads/team-1-ab.jpg' },
  ],
}];

beforeEach(() => jest.clearAllMocks());

describe('team list', () => {
  test('a normal list passes', () => {
    expect(teamProblem(team())).toBeNull();
  });

  test('broken lists are refused', () => {
    expect(teamProblem({})).toBeTruthy();
    const noName = team(); noName[0].members[0].name = ' ';
    expect(teamProblem(noName)).toMatch(/Namen/);
    const noLabel = team(); noLabel[0].label = ''; noLabel[0].department = undefined;
    expect(teamProblem(noLabel)).toMatch(/Abteilung/);
    const script = team(); script[0].members[1].imageUrl = 'javascript:alert(1)';
    expect(teamProblem(script)).toMatch(/Foto/);
    const quote = team(); quote[0].members[1].imageUrl = 'https://x.de/a.jpg" onerror="x';
    expect(teamProblem(quote)).toMatch(/Foto/);
    const long = team(); long[0].members[0].position = 'x'.repeat(121);
    expect(teamProblem(long)).toMatch(/position/);
  });

  test('saving the team rebuilds the website', async () => {
    const row = { content: team(), update: jest.fn() };
    AboutContent.findOrCreate.mockResolvedValue([row, false]);
    const r = res();
    await updateContentKey({ params: { section: 'team', contentKey: 'departments' }, body: { content: team() }, user: { id: 'u1' } }, r);
    expect(row.update).toHaveBeenCalled();
    expect(websiteBuilder.schedule).toHaveBeenCalledWith('Team geändert', 60000);
  });

  test('a broken team list is not saved', async () => {
    const r = res();
    await updateContentKey({ params: { section: 'team', contentKey: 'departments' }, body: { content: [{ label: 'X', members: [{ name: '' }] }] } }, r);
    expect(r.status).toHaveBeenCalledWith(400);
    expect(AboutContent.findOrCreate).not.toHaveBeenCalled();
    expect(websiteBuilder.schedule).not.toHaveBeenCalled();
  });
});

describe('opening hours', () => {
  const put = async (body) => {
    const r = res();
    let error = null;
    await updateOpeningHours({ body }, r, (e) => { error = e; });
    return { r, error };
  };

  test('valid hours are saved and rebuild the website', async () => {
    const record = { save: jest.fn() };
    OpeningHour.findOrCreate.mockResolvedValue([record, false]);
    const { error } = await put({ season: 'winter', dayOfWeek: 1, isClosed: false, periods: [{ open: '08:00', close: '13:00' }, { open: '14:00', close: '17:00' }] });
    expect(error).toBeNull();
    expect(record.periods).toEqual([{ open: '08:00', close: '13:00' }, { open: '14:00', close: '17:00' }]);
    expect(record.save).toHaveBeenCalled();
    expect(websiteBuilder.schedule).toHaveBeenCalled();
  });

  test.each([
    [{ season: 'standard', dayOfWeek: 7, isClosed: true }, 'INVALID_DAY'],
    [{ season: 'standard', dayOfWeek: '1', isClosed: true }, 'INVALID_DAY'],
    [{ season: 'standard', dayOfWeek: 1, isClosed: false, periods: [{ open: '25:00', close: '26:00' }] }, 'INVALID_TIME_FORMAT'],
    [{ season: 'standard', dayOfWeek: 1, isClosed: false, periods: [{ open: '13:00', close: '08:00' }] }, 'INVALID_PERIOD_ORDER'],
    [{ season: 'standard', dayOfWeek: 1, isClosed: false, periods: [{ open: '08:00', close: '13:00' }, { open: '12:00', close: '18:00' }] }, 'INVALID_PERIOD_ORDER'],
    [{ season: 'standard', dayOfWeek: 1, isClosed: false, periods: 'x' }, 'INVALID_PERIOD'],
  ])('refuses %j', async (body, code) => {
    const { error } = await put(body);
    expect(error?.code).toBe(code);
    expect(OpeningHour.findOrCreate).not.toHaveBeenCalled();
  });
});
