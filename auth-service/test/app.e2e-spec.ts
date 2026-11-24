import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AppModule } from './../src/app.module.js';

describe('AppController (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('Hello World!');
  });

  it('/console (GET) serves SPA index.html', () => {
    return request(app.getHttpServer())
      .get('/console')
      .expect(200)
      .expect('Content-Type', /html/);
  });

  it('/console/* (GET) serves SPA index.html on deep links', () => {
    return request(app.getHttpServer())
      .get('/console/applications/demo-app-id/settings')
      .expect(200)
      .expect('Content-Type', /html/);
  });

  afterEach(async () => {
    await app.close();
  });
});
