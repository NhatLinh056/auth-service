import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { appConfig } from '../src/config/app.config.js';

describe('Interoperability E2E Test Suite (Project 2 <-> Project 1)', () => {
  let app: INestApplication;
  const authServiceUrl = 'http://localhost:3000';

  let testUserToken: string;
  let testUserEmail: string;
  let testAppId: string;
  let testAppToken: string;
  let testAppUuid: string;

  beforeAll(async () => {
    // 1. Initialize Demo Service NestJS application
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // 2. Setup real test user on running Auth Service
    testUserEmail = `interop_user_${Date.now()}@example.com`;
    const userPass = 'Password123!';

    // Register user on Auth Service
    await fetch(`${authServiceUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testUserEmail,
        password: userPass,
        name: 'Interop Test User',
      }),
    });

    // Login to obtain User JWT
    const loginRes = await fetch(`${authServiceUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testUserEmail, password: userPass }),
    });
    const loginData = await loginRes.json();
    testUserToken = loginData.accessToken;

    // 3. Register client application on Auth Service
    const appRes = await fetch(`${authServiceUrl}/applications`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${testUserToken}`,
      },
      body: JSON.stringify({ name: 'Automated Interop Client App' }),
    });
    const appData = await appRes.json();
    testAppUuid = appData.id;
    testAppId = appData.appId;
    testAppToken = appData.appToken;

    // Set credentials in Demo Service configuration
    appConfig.authServiceUrl = authServiceUrl;
    appConfig.appId = testAppId;
    appConfig.appToken = testAppToken;
  }, 30000);

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  // ═════════════════════════════════════════════════════════════════════════
  // 1. SERVICE-TO-SERVICE HANDSHAKE & CREDENTIAL VALIDATION
  // ═════════════════════════════════════════════════════════════════════════
  describe('Service-to-Service Handshake (GET /status)', () => {
    it('should successfully handshake with Auth Service when AppID and AppToken are valid', async () => {
      const response = await request(app.getHttpServer())
        .get('/status')
        .expect(200);

      expect(response.body.service).toBe('demo-service');
      expect(response.body.status).toBe('ONLINE');
      expect(response.body.handshake.authService).toBe('CONNECTED');
      expect(response.body.handshake.applicationStatus).toBe('ACTIVE');
      expect(response.body.handshake.appId).toBe(testAppId);
      expect(response.body.handshake.appName).toBe('Automated Interop Client App');
    });

    it('should fail with 401 Unauthorized when AppToken is invalid/tampered', async () => {
      // Temporarily change appToken to invalid secret
      const originalToken = appConfig.appToken;
      appConfig.appToken = 'apt_invalid_tampered_secret_token_12345';

      try {
        const response = await request(app.getHttpServer())
          .get('/status')
          .expect(401);

        expect(response.body.message).toContain('Auth Service rejected credentials');
      } finally {
        appConfig.appToken = originalToken;
      }
    });

    it('should fail with 403 Forbidden when client application is marked INACTIVE on Auth Service', async () => {
      // Deactivate application on Auth Service
      await fetch(`${authServiceUrl}/applications/${testAppUuid}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${testUserToken}`,
        },
        body: JSON.stringify({ status: 'INACTIVE' }),
      });

      try {
        const response = await request(app.getHttpServer())
          .get('/status')
          .expect(403);

        expect(response.body.message).toContain('Client application is inactive on Auth Service');
      } finally {
        // Reactivate application
        await fetch(`${authServiceUrl}/applications/${testAppUuid}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${testUserToken}`,
          },
          body: JSON.stringify({ status: 'ACTIVE' }),
        });
      }
    });

    it('should return 502 Bad Gateway when Auth Service is unreachable', async () => {
      const originalUrl = appConfig.authServiceUrl;
      appConfig.authServiceUrl = 'http://localhost:59999'; // unreachable port

      try {
        const response = await request(app.getHttpServer())
          .get('/status')
          .expect(502);

        expect(response.body.message).toContain('Cannot reach Auth Service');
      } finally {
        appConfig.authServiceUrl = originalUrl;
      }
    });
  });

  // ═════════════════════════════════════════════════════════════════════════
  // 2. USER-DELEGATED AUTHENTICATION & BUSINESS API
  // ═════════════════════════════════════════════════════════════════════════
  describe('User-Delegated Protection (GET /orders, POST /orders)', () => {
    it('should reject requests without Authorization header (401)', async () => {
      const response = await request(app.getHttpServer())
        .get('/orders')
        .expect(401);

      expect(response.body.message).toContain('Missing or invalid Authorization header');
    });

    it('should reject requests with forged/tampered Bearer token (401)', async () => {
      const response = await request(app.getHttpServer())
        .get('/orders')
        .set('Authorization', 'Bearer forged.tampered.token.123')
        .expect(401);

      expect(response.body.message).toContain('Invalid or expired user session');
    });

    it('should delegate User JWT verification to Auth Service and return user orders (200 OK)', async () => {
      const response = await request(app.getHttpServer())
        .get('/orders')
        .set('Authorization', `Bearer ${testUserToken}`)
        .expect(200);

      expect(response.body.user).toBeDefined();
      expect(response.body.user.email).toBe(testUserEmail);
      expect(response.body.user.role).toBe('USER');
      expect(Array.isArray(response.body.orders)).toBe(true);
    });

    it('should create new order for authenticated user (201 Created)', async () => {
      const response = await request(app.getHttpServer())
        .post('/orders')
        .set('Authorization', `Bearer ${testUserToken}`)
        .send({
          item: 'Microservice Architecture Book',
          quantity: 2,
          price: 49.99,
        })
        .expect(201);

      expect(response.body.message).toContain('Order created successfully');
      expect(response.body.order.item).toBe('Microservice Architecture Book');
      expect(response.body.order.userEmail).toBe(testUserEmail);
      expect(response.body.order.totalPrice).toBe(99.98);
    });

    it('should retrieve detail of existing order (200 OK)', async () => {
      // First create order
      const createRes = await request(app.getHttpServer())
        .post('/orders')
        .set('Authorization', `Bearer ${testUserToken}`)
        .send({
          item: 'Logitech MX Master 3S',
          quantity: 1,
          price: 99,
        })
        .expect(201);

      const orderId = createRes.body.order.id;

      // Get detail
      const detailRes = await request(app.getHttpServer())
        .get(`/orders/${orderId}`)
        .set('Authorization', `Bearer ${testUserToken}`)
        .expect(200);

      expect(detailRes.body.id).toBe(orderId);
      expect(detailRes.body.item).toBe('Logitech MX Master 3S');
      expect(detailRes.body.userEmail).toBe(testUserEmail);
    });
  });
});
