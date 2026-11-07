import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service.js';
import { Prisma, Role } from '../generated/prisma/client.js';
import { isTransactionConflict } from '../prisma/transaction-errors.js';
import { setTimeout as retryDelay } from 'node:timers/promises';
import type { OAuthCallbackResult } from './oauth.service.js';

export interface AccountLinkProof {
  password?: string;
  linkToken?: string;
}

@Injectable()
export class SharedIdentityService {
  constructor(private readonly prisma: PrismaService, private readonly jwt: JwtService) {}

  async membershipForUser(userId: string, appId: string, expectedMembershipId?: string) {
    for (let attempt = 0; ; attempt++) {
      try {
        return await this.prisma.$transaction(async db => {
          const user = await db.user.findUnique({ where: { id: userId } });
          const app = await db.application.findUnique({ where: { appId } });
          if (!user || !app || app.status !== 'ACTIVE') throw new UnauthorizedException('Account or application is no longer available');
          let member = await db.appUser.findUnique({ where: { applicationId_userId: { applicationId: app.id, userId } } });
          if (expectedMembershipId && member?.id !== expectedMembershipId) throw new UnauthorizedException('Application membership no longer exists');
          const role = Role.USER;
          if (!member) {
            const legacy = await db.appUser.findUnique({ where: { applicationId_email: { applicationId: app.id, email: user.email } } });
            if (legacy) throw new ConflictException('Cần đăng nhập bằng phương thức OAuth ban đầu để xác minh thành viên cũ');
            member = await db.appUser.create({ data: { applicationId: app.id, userId, email: user.email, name: user.name, role } });
          } else if (member.role !== Role.USER) {
            member = await db.appUser.update({ where: { id: member.id }, data: { role: Role.USER } });
          }
          return { id: member.id, userId, email: user.email, name: user.name, role: Role.USER, avatarUrl: member.avatarUrl, tenantId: user.tenantId };
        }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
      } catch (error) {
        if (attempt < 3 && (isTransactionConflict(error) || error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002')) {
          await retryDelay(25 * (attempt + 1)); continue;
        }
        throw error;
      }
    }
  }

  private linkRequired(): never {
    throw new ConflictException({
      code: 'ACCOUNT_LINK_REQUIRED',
      message: 'Email đã có tài khoản. Xác nhận bằng mật khẩu hiện tại hoặc phiên đăng nhập trước khi liên kết.',
    });
  }

  async resolve(context: OAuthCallbackResult, proof: AccountLinkProof = {}) {
    if (!context.profile.isEmailVerified) throw new UnauthorizedException('Verified OAuth email required');
    // Retry unique-key/serialization races without creating duplicate accounts.
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        return await this.prisma.$transaction(async tx => {
          const app = await tx.application.findUnique({ where: { id: context.applicationId } });
          if (!app || app.appId !== context.appId || app.status !== 'ACTIVE') {
            throw new UnauthorizedException('Application is no longer available');
          }
          let provenUserId: string | undefined;
          if (proof.linkToken) {
            let payload: any;
            try { payload = await this.jwt.verifyAsync(proof.linkToken); }
            catch { throw new UnauthorizedException('Invalid account-link session'); }
            if (payload.type === 'platform' && typeof payload.sub === 'string') {
              const user = await tx.user.findUnique({ where: { id: payload.sub } });
              provenUserId = user?.id;
            } else if (payload.type === 'app_user' && payload.appId === context.appId) {
              const membership = await tx.appUser.findFirst({
                where: { id: payload.sub, applicationId: context.applicationId },
              });
              provenUserId = membership?.userId || undefined;
            }
            if (!provenUserId) throw new UnauthorizedException('Account-link session no longer exists');
          }

          const { provider, providerScope, profile } = context;
          const email = profile.email.trim().toLowerCase();
          const identityKey = { provider, providerScope, providerUserId: profile.providerUserId };
          const identity = await tx.oAuthIdentity.findUnique({
            where: { provider_providerScope_providerUserId: identityKey }, include: { user: true },
          });
          let user = identity?.user || null;
          if (identity && identity.email !== email) {
            await tx.oAuthIdentity.update({ where: { id: identity.id }, data: { email } });
          }
          if (user && provenUserId && user.id !== provenUserId) {
            throw new ConflictException('Phương thức OAuth này đã liên kết với một tài khoản khác');
          }
          if (user && !user.emailVerifiedAt && user.email.trim().toLowerCase() === email) {
            user = await tx.user.update({ where: { id: user.id }, data: { emailVerifiedAt: new Date() } });
          }

          if (!user) {
            const candidates = provenUserId
              ? await tx.user.findMany({ where: { id: provenUserId } })
              : await tx.user.findMany({ where: { email: { equals: email, mode: 'insensitive' } }, take: 2 });
            if (candidates.length > 1) {
              throw new ConflictException('Có tài khoản cũ trùng email không phân biệt hoa thường; cần quản trị viên xử lý');
            }
            user = candidates[0] || null;
            if (user && provenUserId !== user.id) {
              if (!proof.password) this.linkRequired();
              if (!user.passwordHash || !await bcrypt.compare(proof.password, user.passwordHash)) {
                throw new UnauthorizedException('Không thể xác nhận tài khoản để liên kết');
              }
            }
            if (!user) {
              user = await tx.user.create({
                data: { email, name: profile.name || null, emailVerifiedAt: new Date() },
              });
            } else if (user.email.toLowerCase() === email && !user.emailVerifiedAt) {
              user = await tx.user.update({ where: { id: user.id }, data: { emailVerifiedAt: new Date() } });
            }
            await tx.oAuthIdentity.create({ data: { ...identityKey, email, userId: user.id } });
          }

          let membership = await tx.appUser.findUnique({
            where: { applicationId_userId: { applicationId: app.id, userId: user.id } },
          });
          if (!membership) {
            const existingEmail = await tx.appUser.findUnique({
              where: { applicationId_email: { applicationId: app.id, email } },
            });
            if (existingEmail) {
              throw new ConflictException('Thành viên trùng email chưa được xác minh; hãy đăng nhập bằng phương thức ban đầu');
            }
          }
          const role = Role.USER;
          membership = membership
            ? await tx.appUser.update({ where: { id: membership.id }, data: { userId: user.id, role: Role.USER } })
            : await tx.appUser.create({ data: {
              applicationId: app.id, userId: user.id, email: user.email,
              name: user.name, avatarUrl: profile.avatarUrl, role: Role.USER,
            } });
          return {
            id: membership.id, userId: user.id, email: user.email, name: user.name,
            role, avatarUrl: profile.avatarUrl || membership.avatarUrl, provider,
          };
        }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 15000 });
      } catch (error) {
        if (isTransactionConflict(error)) {
          if (attempt < 4) { await retryDelay(25 * (attempt + 1) + Math.random() * 25); continue; }
          throw new ConflictException('Concurrent account update; please retry');
        }
        if (attempt < 4 && error instanceof Prisma.PrismaClientKnownRequestError &&
            ['P2002', 'P2034'].includes(error.code)) continue;
        throw error;
      }
    }
    throw new ConflictException('Concurrent account update; please retry');
  }
}
