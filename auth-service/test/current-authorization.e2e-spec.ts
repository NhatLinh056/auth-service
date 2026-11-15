import { INestApplication } from '@nestjs/common';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApplicationsController } from '../src/applications/applications.controller.js';
import { ApplicationsService } from '../src/applications/applications.service.js';
import { getJwtSecret } from '../src/auth/jwt-secret.js';
import { JwtStrategy } from '../src/common/strategies/jwt.strategy.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { UsersController } from '../src/users/users.controller.js';
import { UsersService } from '../src/users/users.service.js';

describe('Current account authorization through HTTP', () => {
  let app: INestApplication;
  let jwt: JwtService;
  let users: Map<string, any>;
  let appUsers: Map<string, any>;
  const applications = { findAll: vi.fn(async () => []) };
  const userService = {
    findAll: vi.fn(async () => [...users.values()]),
    findById: vi.fn(async (id: string, type: string) => {
      if (type === 'app_user') {
        const user = appUsers.get(id);
        return user ? { ...user, appId: user.application.appId } : null;
      }
      return users.get(id) || null;
    }),
    update: vi.fn(async (id: string, data: object) => {
      const user = { ...users.get(id), ...data };
      users.set(id, user);
      return user;
    }),
    delete: vi.fn(async (id: string) => {
      const user = users.get(id);
      users.delete(id);
      return user;
    }),
  };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [PassportModule.register({ defaultStrategy: 'jwt' }), JwtModule.register({ secret: getJwtSecret() })],
      controllers: [UsersController, ApplicationsController],
      providers: [
        JwtStrategy,
        { provide: ApplicationsService, useValue: applications },
        { provide: UsersService, useValue: userService },
        {
          provide: PrismaService,
          useValue: {
            user: { findUnique: async ({ where }: any) => users.get(where.id) || null },
            appUser: { findUnique: async ({ where }: any) => appUsers.get(where.id) || null },
            application: {
              findUnique: async () => ({ appId: 'app-a', appToken: 'test-token', status: 'ACTIVE', userId: 'owner', adminEmails: [] }),
            },
          },
        },
      ],
    }).compile();
    app = module.createNestApplication();
    await app.init();
    jwt = module.get(JwtService);
  });

  beforeEach(() => {
    vi.clearAllMocks();
    users = new Map([
      ['admin', { id: 'admin', email: 'admin@test.invalid', role: 'ADMIN', passwordHash: 'hidden' }],
      ['member', { id: 'member', email: 'member@test.invalid', role: 'USER', passwordHash: 'hidden' }],
      ['other', { id: 'other', email: 'other@test.invalid', role: 'USER', passwordHash: 'hidden' }],
    ]);
    appUsers = new Map([
      ['oauth', { id: 'oauth', email: 'oauth@test.invalid', role: 'USER', user: { id: 'common-user', email: 'oauth@test.invalid' }, application: { appId: 'app-a', status: 'ACTIVE' } }],
    ]);
  });

  afterAll(async () => { await app?.close(); });

  const platformToken = (id: string, role = 'USER') => jwt.sign({ sub: id, email: 'stale@test.invalid', role, type: 'platform' });
  const oauthToken = (appId = 'app-a') => jwt.sign({ sub: 'oauth', email: 'stale@test.invalid', role: 'ADMIN', type: 'app_user', appId });

  it('revokes admin routes immediately after demotion with the same token', async () => {
    const token = platformToken('admin', 'ADMIN');
    await request(app.getHttpServer()).get('/users').auth(token, { type: 'bearer' }).expect(200);
    users.get('admin').role = 'USER';
    await request(app.getHttpServer()).get('/users').auth(token, { type: 'bearer' }).expect(403);
    await request(app.getHttpServer()).patch('/users/other').auth(token, { type: 'bearer' }).send({ name: 'Denied' }).expect(403);
    await request(app.getHttpServer()).delete('/users/other').auth(token, { type: 'bearer' }).expect(403);
    expect(userService.update).not.toHaveBeenCalled();
    expect(userService.delete).not.toHaveBeenCalled();
  });

  it('passes the current role and email to application authorization', async () => {
    const token = platformToken('admin', 'ADMIN');
    users.get('admin').role = 'USER';
    await request(app.getHttpServer()).get('/applications').auth(token, { type: 'bearer' }).expect(200);
    expect(applications.findAll).toHaveBeenCalledWith(expect.objectContaining({ role: 'USER', email: 'admin@test.invalid' }));
  });

  it('rejects deleted platform accounts even while their token is unexpired', async () => {
    const token = platformToken('admin', 'ADMIN');
    users.delete('admin');
    await request(app.getHttpServer()).get('/users').auth(token, { type: 'bearer' }).expect(401);
    await request(app.getHttpServer()).get('/applications').auth(token, { type: 'bearer' }).expect(401);
  });

  it('allows members to read their own profile without returning a password hash', async () => {
    const response = await request(app.getHttpServer()).get('/users/member').auth(platformToken('member'), { type: 'bearer' }).expect(200);
    expect(response.body.email).toBe('member@test.invalid');
    expect(response.body).not.toHaveProperty('passwordHash');
    expect(userService.findById).toHaveBeenCalledWith('member', 'platform');
  });

  it('denies reading another profile before looking it up', async () => {
    await request(app.getHttpServer()).get('/users/other').auth(platformToken('member'), { type: 'bearer' }).expect(403);
    expect(userService.findById).not.toHaveBeenCalled();
  });

  it('allows a current platform admin to read another profile', async () => {
    await request(app.getHttpServer()).get('/users/other').auth(platformToken('admin', 'ADMIN'), { type: 'bearer' }).expect(200);
  });

  it('denies app identities access to the platform even when their token claims ADMIN', async () => {
    await request(app.getHttpServer()).get('/users/member').auth(oauthToken(), { type: 'bearer' }).expect(403);
    await request(app.getHttpServer()).get('/applications').auth(oauthToken(), { type: 'bearer' }).expect(403);
  });

  it('keeps valid OAuth verification working with current app rights', async () => {
    const response = await request(app.getHttpServer()).get('/users/verify-app-user')
      .auth(oauthToken(), { type: 'bearer' }).set('x-app-id', 'app-a').set('x-app-token', 'test-token').expect(200);
    expect(response.body.appRole).toBe('USER');
  });

  it('rejects deleted OAuth accounts', async () => {
    const token = oauthToken();
    appUsers.delete('oauth');
    await request(app.getHttpServer()).get('/users/verify-app-user')
      .auth(token, { type: 'bearer' }).set('x-app-id', 'app-a').set('x-app-token', 'test-token').expect(401);
  });

  it('rejects an OAuth identity whose stored application differs from its token', async () => {
    await request(app.getHttpServer()).get('/users/verify-app-user')
      .auth(oauthToken('app-b'), { type: 'bearer' }).set('x-app-id', 'app-a').set('x-app-token', 'test-token').expect(401);
  });

  it('rejects missing and expired tokens', async () => {
    await request(app.getHttpServer()).get('/users/member').expect(401);
    const expired = jwt.sign({ sub: 'member', type: 'platform' }, { expiresIn: -1 });
    await request(app.getHttpServer()).get('/users/member').auth(expired, { type: 'bearer' }).expect(401);
  });
});
