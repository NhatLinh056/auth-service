import 'dotenv/config';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

describe('Tenant ownership and authorization on isolated PostgreSQL', () => {
  let app: INestApplication;
  let db: PrismaService;
  let jwt: JwtService;
  const user = async (role: 'ADMIN' | 'USER' = 'USER') => {
    const row = await db.user.create({ data: { email: `tenant-${randomUUID()}@test.invalid`, role } });
    const token = jwt.sign({ sub: row.id, type: 'platform', role });
    return { ...row, token };
  };
  const create = async (actor: { token: string }, name = 'Test Company') =>
    (await request(app.getHttpServer()).post('/tenants').auth(actor.token, { type: 'bearer' }).send({ name }).expect(201)).body;

  beforeAll(async () => {
    if (!new URL(process.env.DATABASE_URL!).pathname.startsWith('/identity_task5_')) throw new Error('Isolated database required');
    const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();
    db = app.get(PrismaService);
    jwt = app.get(JwtService);
  });
  afterAll(async () => { await app?.close(); });

  it('lets an ordinary user create a tenant and becomes its sole owner/member', async () => {
    const owner = await user();
    const tenant = await create(owner);
    expect(tenant.ownerUserId).toBe(owner.id);
    expect((await db.user.findUniqueOrThrow({ where: { id: owner.id } })).tenantId).toBe(tenant.id);
    const me = await request(app.getHttpServer()).get('/tenants/me').auth(owner.token, { type: 'bearer' }).expect(200);
    expect(me.body).toMatchObject({ canCreate: false, isSystemAdmin: false, tenant: { isOwner: true, canManage: true } });
  });

  it('prevents creating another tenant when already a member', async () => {
    const owner = await user();
    await create(owner);
    await request(app.getHttpServer()).post('/tenants').auth(owner.token, { type: 'bearer' }).send({ name: 'Second' }).expect(409);
    expect(await db.tenant.count({ where: { ownerUserId: owner.id } })).toBe(1);
  });

  it('does not allow two concurrent tenant creations for the same user', async () => {
    const owner = await user();
    const responses = await Promise.all([1, 2].map(() => request(app.getHttpServer()).post('/tenants').auth(owner.token, { type: 'bearer' }).send({ name: 'Concurrent' })));
    expect(responses.map(item => item.status).sort()).toEqual([201, 409]);
    expect(await db.tenant.count({ where: { ownerUserId: owner.id } })).toBe(1);
  });

  it('allows members to read only their own tenant and keeps member management private', async () => {
    const owner = await user();
    const tenant = await create(owner);
    const member = await user();
    await db.user.update({ where: { id: member.id }, data: { tenantId: tenant.id } });
    const detail = await request(app.getHttpServer()).get(`/tenants/${tenant.id}`).auth(member.token, { type: 'bearer' }).expect(200);
    expect(detail.body.canManage).toBe(false);
    expect(detail.body.members).toEqual([]);
    const outsider = await user();
    await request(app.getHttpServer()).get(`/tenants/${tenant.id}`).auth(outsider.token, { type: 'bearer' }).expect(403);
    const list = await request(app.getHttpServer()).get('/tenants').auth(outsider.token, { type: 'bearer' }).expect(200);
    expect(list.body).toEqual([]);
  });

  it('allows the owner to edit and rejects regular members', async () => {
    const owner = await user();
    const tenant = await create(owner);
    const member = await user();
    await db.user.update({ where: { id: member.id }, data: { tenantId: tenant.id } });
    await request(app.getHttpServer()).patch(`/tenants/${tenant.id}`).auth(member.token, { type: 'bearer' }).send({ name: 'Denied' }).expect(403);
    await request(app.getHttpServer()).patch(`/tenants/${tenant.id}`).auth(owner.token, { type: 'bearer' }).send({ name: '  Updated Company  ', description: 'Description' }).expect(200);
    expect((await db.tenant.findUniqueOrThrow({ where: { id: tenant.id } })).name).toBe('Updated Company');
  });

  it('rejects blank names, null fields and forged ownership on create/update', async () => {
    const owner = await user();
    for (const payload of [{ name: '  ' }, { name: 'A', ownerUserId: randomUUID() }, { name: null }]) {
      await request(app.getHttpServer()).post('/tenants').auth(owner.token, { type: 'bearer' }).send(payload).expect(400);
    }
    const tenant = await create(owner);
    await request(app.getHttpServer()).patch(`/tenants/${tenant.id}`).auth(owner.token, { type: 'bearer' }).send({ ownerUserId: randomUUID() }).expect(400);
    await request(app.getHttpServer()).patch(`/tenants/${tenant.id}`).auth(owner.token, { type: 'bearer' }).send({ name: null }).expect(400);
  });

  it('transfers to an existing member and revokes the old owner immediately', async () => {
    const owner = await user();
    const next = await user();
    const tenant = await create(owner);
    await db.user.update({ where: { id: next.id }, data: { tenantId: tenant.id } });
    await request(app.getHttpServer()).post(`/tenants/${tenant.id}/transfer`).auth(owner.token, { type: 'bearer' }).send({ userId: next.id }).expect(201);
    expect((await db.user.findUniqueOrThrow({ where: { id: owner.id } })).tenantId).toBe(tenant.id);
    await request(app.getHttpServer()).patch(`/tenants/${tenant.id}`).auth(owner.token, { type: 'bearer' }).send({ name: 'Denied' }).expect(403);
    await request(app.getHttpServer()).patch(`/tenants/${tenant.id}`).auth(next.token, { type: 'bearer' }).send({ name: 'New owner edit' }).expect(200);
    expect(await db.tenantAuditLog.count({ where: { tenantId: tenant.id, action: 'OWNERSHIP_TRANSFERRED', fromOwnerId: owner.id, toOwnerId: next.id } })).toBe(1);
  });

  it('does not let the owner appoint an outsider or someone from another tenant', async () => {
    const owner = await user();
    const outsider = await user();
    const tenant = await create(owner);
    await request(app.getHttpServer()).post(`/tenants/${tenant.id}/transfer`).auth(owner.token, { type: 'bearer' }).send({ userId: outsider.id }).expect(409);
    await create(outsider);
    await request(app.getHttpServer()).post(`/tenants/${tenant.id}/transfer`).auth(owner.token, { type: 'bearer' }).send({ userId: outsider.id }).expect(409);
  });

  it('allows Super Admin intervention only with a reason and preserves an audit record', async () => {
    const owner = await user();
    const admin = await user('ADMIN');
    const next = await user();
    const tenant = await create(owner);
    await db.user.update({ where: { id: next.id }, data: { tenantId: tenant.id } });
    await request(app.getHttpServer()).post(`/tenants/${tenant.id}/transfer`).auth(admin.token, { type: 'bearer' }).send({ userId: next.id }).expect(400);
    await request(app.getHttpServer()).post(`/tenants/${tenant.id}/transfer`).auth(admin.token, { type: 'bearer' }).send({ userId: next.id, reason: 'Verified ownership dispute' }).expect(201);
    expect((await db.user.findUniqueOrThrow({ where: { id: next.id } })).tenantId).toBe(tenant.id);
    const audit = await request(app.getHttpServer()).get(`/tenants/${tenant.id}/audit`).auth(admin.token, { type: 'bearer' }).expect(200);
    expect(audit.body).toContainEqual(expect.objectContaining({ action: 'ADMIN_OWNERSHIP_TRANSFERRED', actorUserId: admin.id, reason: 'Verified ownership dispute' }));
  });

  it('never lets Super Admin move an existing member out of another company implicitly', async () => {
    const owner = await user();
    const other = await user();
    const admin = await user('ADMIN');
    const tenant = await create(owner);
    await create(other);
    await request(app.getHttpServer()).post(`/tenants/${tenant.id}/transfer`).auth(admin.token, { type: 'bearer' }).send({ userId: other.id, reason: 'Review' }).expect(409);
  });

  it('blocks deleting a tenant that still has members', async () => {
    const owner = await user();
    const tenant = await create(owner);
    const member = await user();
    await db.user.update({ where: { id: member.id }, data: { tenantId: tenant.id } });
    await request(app.getHttpServer()).delete(`/tenants/${tenant.id}`).auth(owner.token, { type: 'bearer' }).expect(409);
  });

  it('deletes a tenant without deleting its owner or audit trail', async () => {
    const owner = await user();
    const admin = await user('ADMIN');
    const tenant = await create(owner);
    await request(app.getHttpServer()).delete(`/tenants/${tenant.id}`).auth(owner.token, { type: 'bearer' }).expect(200);
    expect(await db.tenant.findUnique({ where: { id: tenant.id } })).toBeNull();
    expect((await db.user.findUniqueOrThrow({ where: { id: owner.id } })).tenantId).toBeNull();
    const audit = await request(app.getHttpServer()).get('/tenants/audit').auth(admin.token, { type: 'bearer' }).expect(200);
    expect(audit.body).toContainEqual(expect.objectContaining({ tenantId: tenant.id, action: 'DELETED' }));
  });

  it('blocks account deletion while the user owns a tenant (and user deletion is disabled in V2)', async () => {
    const owner = await user();
    await create(owner);
    await request(app.getHttpServer()).delete(`/users/${owner.id}`).auth(owner.token, { type: 'bearer' }).expect(400);
    expect(await db.user.findUnique({ where: { id: owner.id } })).not.toBeNull();
  });

  it('accepts an OAuth member as tenant creator but never trusts app ADMIN for Super Admin privileges', async () => {
    const canonical = await user();
    const otherOwner = await user();
    const otherTenant = await create(otherOwner);
    const product = await db.application.create({ data: { name: 'Tenant Test App', appId: randomUUID(), appToken: 'test', userId: canonical.id } });
    const membership = await db.appUser.create({ data: { userId: canonical.id, applicationId: product.id, email: canonical.email, role: 'ADMIN' } });
    const token = jwt.sign({ sub: membership.id, type: 'app_user', role: 'ADMIN', appId: product.appId });
    const response = await request(app.getHttpServer()).post('/tenants').auth(token, { type: 'bearer' }).send({ name: 'OAuth Company' }).expect(201);
    expect(response.body.ownerUserId).toBe(canonical.id);
    await request(app.getHttpServer()).get(`/tenants/${otherTenant.id}`).auth(token, { type: 'bearer' }).expect(403);
    await request(app.getHttpServer()).get('/tenants/audit').auth(token, { type: 'bearer' }).expect(403);
    await db.application.update({ where: { id: product.id }, data: { status: 'INACTIVE' } });
    await request(app.getHttpServer()).get('/tenants/me').auth(token, { type: 'bearer' }).expect(403);
  });

  it('prevents a user from being approved into two tenants concurrently (atomic serializable transaction)', async () => {
    const ownerA = await user();
    const ownerB = await user();
    const tenantA = await create(ownerA, 'Tenant A');
    const tenantB = await create(ownerB, 'Tenant B');
    const applicant = await user();

    // Create two PENDING join requests for the same applicant directly in DB
    const reqA = await db.tenantJoinRequest.create({
      data: {
        userId: applicant.id,
        tenantId: tenantA.id,
        status: 'PENDING',
      },
    });
    const reqB = await db.tenantJoinRequest.create({
      data: {
        userId: applicant.id,
        tenantId: tenantB.id,
        status: 'PENDING',
      },
    });

    // Both owners send approve concurrently
    const [resA, resB] = await Promise.all([
      request(app.getHttpServer()).post(`/tenants/join-requests/${reqA.id}/approve`).auth(ownerA.token, { type: 'bearer' }),
      request(app.getHttpServer()).post(`/tenants/join-requests/${reqB.id}/approve`).auth(ownerB.token, { type: 'bearer' }),
    ]);

    const statuses = [resA.status, resB.status].sort();
    // Exactly one should succeed (200/201), the other should fail with 409 Conflict
    expect(statuses).toEqual([201, 409]);

    // Check request statuses in DB: exactly one APPROVED, one CANCELLED
    const updatedReqA = await db.tenantJoinRequest.findUniqueOrThrow({ where: { id: reqA.id } });
    const updatedReqB = await db.tenantJoinRequest.findUniqueOrThrow({ where: { id: reqB.id } });
    const requestStatuses = [updatedReqA.status, updatedReqB.status].sort();
    expect(requestStatuses).toEqual(['APPROVED', 'CANCELLED']);

    // Check user tenantId matches the winning tenant
    const updatedUser = await db.user.findUniqueOrThrow({ where: { id: applicant.id } });
    const winningTenantId = updatedReqA.status === 'APPROVED' ? tenantA.id : tenantB.id;
    expect(updatedUser.tenantId).toBe(winningTenantId);
  });

  it('handles race between applyJoin and approveJoinRequest safely', async () => {
    const ownerA = await user();
    const ownerB = await user();
    const tenantA = await create(ownerA, 'Tenant Race A');
    const tenantB = await create(ownerB, 'Tenant Race B');
    const applicant = await user();

    // Applicant has pending request to Tenant A
    const reqA = await db.tenantJoinRequest.create({
      data: {
        userId: applicant.id,
        tenantId: tenantA.id,
        status: 'PENDING',
      },
    });

    // Concurrently: Owner A approves reqA, and Applicant tries to apply to Tenant B
    const [approveRes, applyRes] = await Promise.all([
      request(app.getHttpServer()).post(`/tenants/join-requests/${reqA.id}/approve`).auth(ownerA.token, { type: 'bearer' }),
      request(app.getHttpServer()).post('/tenants/join').auth(applicant.token, { type: 'bearer' }).send({ tenantId: tenantB.id }),
    ]);

    // Assert exact HTTP statuses: approve succeeds (201), apply is rejected with 409 Conflict (no 500)
    expect(approveRes.status).toBe(201);
    expect(applyRes.status).toBe(409);

    // Check that applicant ends up in Tenant A and never joins Tenant B
    const updatedUser = await db.user.findUniqueOrThrow({ where: { id: applicant.id } });
    expect(updatedUser.tenantId).toBe(tenantA.id);

    // Verify reqA is APPROVED
    const updatedReqA = await db.tenantJoinRequest.findUniqueOrThrow({ where: { id: reqA.id } });
    expect(updatedReqA.status).toBe('APPROVED');

    // Request B must not remain PENDING or APPROVED
    const reqB = await db.tenantJoinRequest.findUnique({
      where: { userId_tenantId: { userId: applicant.id, tenantId: tenantB.id } },
    });
    expect(reqB?.status).not.toBe('PENDING');
    expect(reqB?.status).not.toBe('APPROVED');
  });

  it('blocks app_user token from platform admin endpoints even when canonical User has Role ADMIN', async () => {
    // Canonical user has Role.ADMIN in DB
    const adminUser = await user('ADMIN');
    expect(adminUser.role).toBe('ADMIN');

    const otherOwner = await user();
    const otherTenant = await create(otherOwner, 'Other Company');

    // Create an Application owned by adminUser and create an AppUser membership
    const product = await db.application.create({
      data: { name: 'Admin App', appId: randomUUID(), appToken: 'token_secret', userId: adminUser.id },
    });
    const membership = await db.appUser.create({
      data: { userId: adminUser.id, applicationId: product.id, email: adminUser.email, role: 'ADMIN' },
    });

    // Issue app-scoped JWT with userId of canonical ADMIN user
    const appToken = jwt.sign({
      sub: membership.id,
      type: 'app_user',
      role: 'ADMIN',
      appId: product.appId,
      userId: adminUser.id,
    });

    // 1. GET /tenants/me returns isSystemAdmin: false (not platform admin!)
    const meRes = await request(app.getHttpServer()).get('/tenants/me').auth(appToken, { type: 'bearer' }).expect(200);
    expect(meRes.body.isSystemAdmin).toBe(false);

    // 2. GET /tenants/audit (global audit) is rejected with 403 Forbidden
    await request(app.getHttpServer()).get('/tenants/audit').auth(appToken, { type: 'bearer' }).expect(403);

    // 3. POST /tenants/:id/transfer (Super Admin intervention) is rejected with 403 Forbidden
    const newOwnerCandidate = await user();
    await request(app.getHttpServer())
      .post(`/tenants/${otherTenant.id}/transfer`)
      .auth(appToken, { type: 'bearer' })
      .send({ userId: newOwnerCandidate.id, reason: 'Attempted intervention by app_user token' })
      .expect(403);
  });

  it('rejects deleted accounts and requests without authentication', async () => {
    const actor = await user();
    await db.user.delete({ where: { id: actor.id } });
    await request(app.getHttpServer()).post('/tenants').auth(actor.token, { type: 'bearer' }).send({ name: 'Denied' }).expect(401);
    await request(app.getHttpServer()).get('/tenants').expect(401);
  });
});
