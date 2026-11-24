const request = require('supertest');
const app = require('../src/server');

describe('Auth reset', () => {
  it('deve solicitar reset', async () => {
    await request(app).post('/api/v1/auth/esqueci-senha').send({ email: 'a@b.com' }).expect(200);
  });
  it('deve confirmar reset com token válido', async () => {});
});
