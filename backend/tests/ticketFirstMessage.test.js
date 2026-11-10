const serviceService = require('../src/services/serviceService');

function makeModels() {
  const created = [];
  return {
    created,
    Ticket: {
      create: jest.fn(async (data) => ({ id: 't1', ...data })),
      findByPk: jest.fn(async (id) => ({ id })),
    },
    ChatMessage: { create: jest.fn(async (data) => { created.push(data); return data; }) },
    User: { findAll: jest.fn(async () => []) },
    Notification: { bulkCreate: jest.fn(async () => []) },
  };
}

describe('createTicket first chat message', () => {
  it('stores the customer text and photos as the first chat message', async () => {
    const models = makeModels();
    const attachments = [{ url: 'https://x/a.jpg' }];
    await serviceService.createTicket(
      { type: 'repair', department: 'fahrrad', description: 'Kette springt ab', attachments },
      'u1',
      models,
    );
    expect(models.created).toEqual([
      { ticketId: 't1', userId: 'u1', message: 'Kette springt ab', attachments },
    ]);
  });

  it('creates no message for an empty description', async () => {
    const models = makeModels();
    await serviceService.createTicket({ type: 'other', description: '   ' }, 'u1', models);
    expect(models.ChatMessage.create).not.toHaveBeenCalled();
  });
});
