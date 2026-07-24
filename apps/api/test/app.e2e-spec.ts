import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import request from 'supertest';
import { AppModule } from '../src/app.module';

// End-to-end tests against a real PostgreSQL (run inside the DB-connected
// container via scripts/run-e2e.sh, which db-pushes + seeds first).
describe('FitCore API (e2e)', () => {
  let app: INestApplication;
  let http: any;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );

    await app.init();
    await (app as NestFastifyApplication).getHttpAdapter().getInstance().ready();
    http = app.getHttpServer();
  });

  afterAll(async () => {
    await app?.close();
  });

  const login = async (email: string, password: string) => {
    const res = await request(http)
      .post('/api/v1/auth/login')
      .send({ email, password });
    return res;
  };

  it('GET /health is public and healthy', async () => {
    const res = await request(http).get('/api/v1/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('POST /auth/login rejects wrong credentials (401)', async () => {
    const res = await login('owner@fitnessworld.in', 'wrong-password');
    expect(res.status).toBe(401);
  });

  it('POST /auth/login rejects invalid payload (400)', async () => {
    const res = await request(http).post('/api/v1/auth/login').send({ email: 'not-an-email' });
    expect(res.status).toBe(400);
  });

  describe('as owner', () => {
    let token: string;

    it('logs in and receives a JWT', async () => {
      const res = await login('owner@fitnessworld.in', 'Owner@123');
      expect(res.status).toBe(200);
      expect(res.body.accessToken).toBeDefined();
      expect(res.body.user.role).toBe('owner');
      token = res.body.accessToken;
    });

    it('GET /auth/me returns profile with allBranches=true', async () => {
      const res = await request(http).get('/api/v1/auth/me').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.role).toBe('owner');
      expect(res.body.allBranches).toBe(true);
    });

    it('GET /branches returns all 4 branches', async () => {
      const res = await request(http).get('/api/v1/branches').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.length).toBeGreaterThanOrEqual(4);
    });

    it('POST /branches creates a branch (201)', async () => {
      const code = `T${Math.floor(Math.random() * 9000 + 1000)}`;
      const res = await request(http)
        .post('/api/v1/branches')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Test Branch', code });
      expect(res.status).toBe(201);
      expect(res.body.code).toBe(code);
    });
  });

  describe('as manager (branch-scoped)', () => {
    let token: string;

    beforeAll(async () => {
      const res = await login('manager.kochi@fitnessworld.in', 'Staff@123');
      token = res.body.accessToken;
    });

    it('GET /branches returns only the assigned branch', async () => {
      const res = await request(http).get('/api/v1/branches').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].code).toBe('KCH');
    });

    it('POST /branches is forbidden (403)', async () => {
      const res = await request(http)
        .post('/api/v1/branches')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Nope', code: 'NOPE' });
      expect(res.status).toBe(403);
    });
  });

  it('GET /branches without a token is unauthorized (401)', async () => {
    const res = await request(http).get('/api/v1/branches');
    expect(res.status).toBe(401);
  });
});
