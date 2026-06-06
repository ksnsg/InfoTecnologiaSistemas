import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { createTestApp } from './helpers/app-test-bootstrapper';

/**
 * E2E smoke tests — validates that:
 *  1. The full DI tree compiles and the application initialises.
 *  2. The global ValidationPipe rejects structurally invalid payloads (400).
 *  3. JwtAuthGuard protects every write/read route (401 without token).
 *
 * No real infrastructure is required; all external I/O is replaced by
 * test doubles in AppTestBootstrapper.  These tests run in any environment.
 */
describe('Application (E2E)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  // ─── DI tree assembly ────────────────────────────────────────────────────

  describe('Module bootstrap', () => {
    it('should compile and initialise the full dependency injection tree', () => {
      expect(app).toBeDefined();
    });
  });

  // ─── ValidationPipe — POST /auth/login ──────────────────────────────────

  describe('POST /auth/login', () => {
    it('should return 400 when the request body is empty', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({})
        .expect(400);
    });

    it('should return 400 when the nickname field is missing', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({ password: 'secret123' })
        .expect(400);
    });

    it('should return 400 when the password field is missing', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({ nickname: 'aivacol' })
        .expect(400);
    });
  });

  // ─── JwtAuthGuard — protected routes ─────────────────────────────────────

  describe('GET /vehicles', () => {
    it('should return 401 when no Authorization header is provided', () => {
      return request(app.getHttpServer())
        .get('/vehicles')
        .expect(401);
    });
  });

  describe('GET /brands', () => {
    it('should return 401 when no Authorization header is provided', () => {
      return request(app.getHttpServer())
        .get('/brands')
        .expect(401);
    });
  });

  describe('GET /models', () => {
    it('should return 401 when no Authorization header is provided', () => {
      return request(app.getHttpServer())
        .get('/models')
        .expect(401);
    });
  });

  describe('GET /users', () => {
    it('should return 401 when no Authorization header is provided', () => {
      return request(app.getHttpServer())
        .get('/users')
        .expect(401);
    });
  });

  describe('POST /users', () => {
    it('should return 401 when no Authorization header is provided', () => {
      return request(app.getHttpServer())
        .post('/users')
        .send({ name: 'Test', nickname: 'test', email: 'test@test.com', password: 'password1' })
        .expect(401);
    });
  });
});
