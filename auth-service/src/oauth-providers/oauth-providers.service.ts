import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { OAuthProviderType, Role } from '../generated/prisma/enums.js';
import type { JwtPayload } from '../common/strategies/jwt.strategy.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { UpdateOAuthProviderDto } from './dto/update-oauth-provider.dto.js';

export interface SanitizedOAuthProvider {
  id: string;
  applicationId: string;
  provider: OAuthProviderType;
  name: string;
  isEnabled: boolean;
  clientId: string | null;
  callbackUrl: string | null;
  hasSecret: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PublicOAuthProvider {
  provider: string;
  name: string;
  enabled: boolean;
}

@Injectable()
export class OAuthProvidersService implements OnModuleInit {
  private readonly logger = new Logger(OAuthProvidersService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Tự động kiểm tra và khởi tạo 2 providers mặc định (GOOGLE, FACEBOOK) cho tất cả application hiện có.
   */
  async onModuleInit() {
    try {
      const apps = await this.prisma.application.findMany({ select: { id: true } });
      for (const app of apps) {
        await this.createDefaultProviders(app.id);
      }
    } catch (err: any) {
      this.logger.warn(`Lỗi khi khởi tạo OAuth providers cho applications: ${err.message}`);
    }
  }

  /**
   * Chuẩn hóa chuỗi tên provider (ví dụ: 'google' -> GOOGLE, 'facebook' -> FACEBOOK)
   */
  normalizeProvider(input: string): OAuthProviderType {
    const upper = (input || '').trim().toUpperCase();
    if (upper === 'GOOGLE' || upper === OAuthProviderType.GOOGLE) {
      return OAuthProviderType.GOOGLE;
    }
    if (upper === 'FACEBOOK' || upper === OAuthProviderType.FACEBOOK) {
      return OAuthProviderType.FACEBOOK;
    }
    throw new BadRequestException(
      `Nhà cung cấp OAuth không được hỗ trợ: "${input}". Chỉ hỗ trợ "GOOGLE" hoặc "FACEBOOK".`,
    );
  }

  /**
   * Khởi tạo 2 provider mặc định (Google: disabled, Facebook: disabled) cho 1 application cụ thể.
   * Cấu hình của mỗi Application là độc lập hoàn toàn.
   */
  async createDefaultProviders(applicationId: string, tx?: any) {
    const db = tx || this.prisma;
    const defaults = [
      {
        provider: OAuthProviderType.GOOGLE,
        name: 'Google',
        isEnabled: false,
        callbackUrl: 'http://localhost:3000/auth/oauth/google/callback',
      },
      {
        provider: OAuthProviderType.FACEBOOK,
        name: 'Facebook',
        isEnabled: false,
        callbackUrl: 'http://localhost:3000/auth/oauth/facebook/callback',
      },
    ];

    for (const d of defaults) {
      const existing = await db.oAuthProvider.findUnique({
        where: {
          applicationId_provider: {
            applicationId,
            provider: d.provider,
          },
        },
      });

      if (!existing) {
        await db.oAuthProvider.create({
          data: {
            applicationId,
            provider: d.provider,
            name: d.name,
            isEnabled: d.isEnabled,
            callbackUrl: d.callbackUrl,
          },
        });
      }
    }
  }

  /**
   * Kiểm tra quyền truy cập vào Application:
   * - Nếu không tìm thấy Application -> 404 NotFoundException
   * - Nếu là USER thường: chỉ được thao tác trên Application mà mình sở hữu (userId = currentUser.sub) -> 403 ForbiddenException
   * - Nếu là ADMIN: được phép truy cập/sửa bất kỳ Application nào, nhưng chỉ thao tác đúng Application được truyền vào.
   */
  async verifyApplicationAccess(applicationId: string, currentUser?: JwtPayload) {
    const app = await this.prisma.application.findUnique({
      where: { id: applicationId },
    });

    if (!app) {
      throw new NotFoundException('Không tìm thấy ứng dụng với ID này');
    }

    if (currentUser) {
      const isAdmin = currentUser.role === Role.ADMIN;
      const isOwner = app.userId === currentUser.sub;

      if (!isAdmin && !isOwner) {
        throw new ForbiddenException('Bạn không có quyền truy cập cấu hình của ứng dụng này');
      }
    }

    return app;
  }

  /**
   * Loại bỏ clientSecret trước khi trả kết quả ra ngoài API.
   * Tuyệt đối không log và không trả clientSecret cho client/frontend.
   */
  private sanitize(provider: {
    id: string;
    applicationId: string;
    provider: OAuthProviderType;
    name: string;
    isEnabled: boolean;
    clientId: string | null;
    clientSecret: string | null;
    callbackUrl: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): SanitizedOAuthProvider {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { clientSecret, ...rest } = provider;
    return {
      ...rest,
      hasSecret: Boolean(clientSecret && clientSecret.length > 0),
    };
  }

  /**
   * Lấy danh sách cấu hình Sign-in Methods của một Application cụ thể.
   * Xác thực quyền truy cập của currentUser với Application đó.
   */
  async findAllByApplication(
    applicationId: string,
    currentUser: JwtPayload,
  ): Promise<SanitizedOAuthProvider[]> {
    await this.verifyApplicationAccess(applicationId, currentUser);

    let list = await this.prisma.oAuthProvider.findMany({
      where: { applicationId },
      orderBy: { provider: 'asc' },
    });

    if (list.length === 0) {
      await this.createDefaultProviders(applicationId);
      list = await this.prisma.oAuthProvider.findMany({
        where: { applicationId },
        orderBy: { provider: 'asc' },
      });
    }

    return list.map((p) => this.sanitize(p));
  }

  /**
   * Lấy thông tin chi tiết một Provider của Application cụ thể.
   */
  async findByProvider(
    applicationId: string,
    providerInput: string,
    currentUser: JwtPayload,
  ): Promise<SanitizedOAuthProvider> {
    await this.verifyApplicationAccess(applicationId, currentUser);
    const provider = this.normalizeProvider(providerInput);

    const found = await this.prisma.oAuthProvider.findUnique({
      where: {
        applicationId_provider: {
          applicationId,
          provider,
        },
      },
    });

    if (!found) {
      throw new NotFoundException(`Không tìm thấy cấu hình OAuth Provider: ${provider}`);
    }

    return this.sanitize(found);
  }

  /**
   * Cập nhật thông tin cấu hình Provider của một Application cụ thể (chủ sở hữu hoặc ADMIN).
   */
  async update(
    applicationId: string,
    providerInput: string,
    dto: UpdateOAuthProviderDto,
    currentUser: JwtPayload,
  ): Promise<SanitizedOAuthProvider> {
    await this.verifyApplicationAccess(applicationId, currentUser);
    const provider = this.normalizeProvider(providerInput);

    const existing = await this.prisma.oAuthProvider.findUnique({
      where: {
        applicationId_provider: {
          applicationId,
          provider,
        },
      },
    });

    if (!existing) {
      throw new NotFoundException(`Không tìm thấy cấu hình OAuth Provider: ${provider}`);
    }

    const dataToUpdate: any = {};
    if (dto.isEnabled !== undefined) dataToUpdate.isEnabled = dto.isEnabled;
    if (dto.clientId !== undefined) dataToUpdate.clientId = dto.clientId.trim() || null;
    if (dto.callbackUrl !== undefined) dataToUpdate.callbackUrl = dto.callbackUrl.trim() || null;

    if (dto.clientSecret !== undefined && dto.clientSecret.trim().length > 0) {
      dataToUpdate.clientSecret = dto.clientSecret.trim();
    }

    const updated = await this.prisma.oAuthProvider.update({
      where: {
        applicationId_provider: {
          applicationId,
          provider,
        },
      },
      data: dataToUpdate,
    });

    this.logger.log(
      `User ${currentUser.email} (${currentUser.role}) đã cập nhật Provider ${provider} cho Application ${applicationId}`,
    );
    return this.sanitize(updated);
  }

  /**
   * Đổi trạng thái Bật / Tắt (Enable / Disable) nhanh cho một Provider của Application cụ thể.
   */
  async toggle(
    applicationId: string,
    providerInput: string,
    currentUser: JwtPayload,
  ): Promise<SanitizedOAuthProvider> {
    await this.verifyApplicationAccess(applicationId, currentUser);
    const provider = this.normalizeProvider(providerInput);

    const existing = await this.prisma.oAuthProvider.findUnique({
      where: {
        applicationId_provider: {
          applicationId,
          provider,
        },
      },
    });

    if (!existing) {
      throw new NotFoundException(`Không tìm thấy cấu hình OAuth Provider: ${provider}`);
    }

    const newStatus = !existing.isEnabled;
    if (newStatus && (!existing.clientId || !existing.clientSecret)) {
      throw new BadRequestException(
        `Không thể bật "${existing.name}" khi chưa cấu hình đầy đủ Client ID và Client Secret.`,
      );
    }

    const updated = await this.prisma.oAuthProvider.update({
      where: {
        applicationId_provider: {
          applicationId,
          provider,
        },
      },
      data: { isEnabled: newStatus },
    });

    this.logger.log(
      `Trạng thái Provider ${provider} của Application ${applicationId} đã đổi sang: ${newStatus ? 'ENABLED' : 'DISABLED'}`,
    );
    return this.sanitize(updated);
  }

  /**
   * Phương thức nội bộ dùng cho luồng OAuth Strategy (Server-to-Server).
   * Tìm application theo appId (hoặc id), kiểm tra ACTIVE, và trả về cấu hình kèm clientSecret.
   */
  async getInternalConfig(appIdentifier: string, provider: OAuthProviderType) {
    const app = await this.prisma.application.findFirst({
      where: {
        OR: [{ appId: appIdentifier }, { id: appIdentifier }],
      },
    });

    if (!app) {
      throw new BadRequestException(`Ứng dụng với AppID/ID "${appIdentifier}" chưa được đăng ký trong hệ thống.`);
    }

    if (app.status !== 'ACTIVE') {
      throw new BadRequestException(`Ứng dụng "${app.name}" hiện đang bị vô hiệu hóa (INACTIVE).`);
    }

    const found = await this.prisma.oAuthProvider.findUnique({
      where: {
        applicationId_provider: {
          applicationId: app.id,
          provider,
        },
      },
    });

    if (!found) {
      throw new NotFoundException(`OAuth Provider ${provider} chưa được cấu hình cho ứng dụng "${app.name}".`);
    }

    return {
      ...found,
      application: app,
    };
  }

  /**
   * Lấy danh sách provider công khai cho Client/Frontend theo Application (appId).
   * Tuyệt đối không trả clientId, clientSecret, hay ID nội bộ.
   */
  async getPublicProviders(appId?: string): Promise<PublicOAuthProvider[]> {
    if (!appId) {
      return [
        { provider: 'google', name: 'Google', enabled: false },
        { provider: 'facebook', name: 'Facebook', enabled: false },
      ];
    }

    const app = await this.prisma.application.findUnique({
      where: { appId },
    });

    if (!app || app.status !== 'ACTIVE') {
      return [
        { provider: 'google', name: 'Google', enabled: false },
        { provider: 'facebook', name: 'Facebook', enabled: false },
      ];
    }

    let list = await this.prisma.oAuthProvider.findMany({
      where: { applicationId: app.id },
      orderBy: { provider: 'asc' },
    });

    if (list.length === 0) {
      await this.createDefaultProviders(app.id);
      list = await this.prisma.oAuthProvider.findMany({
        where: { applicationId: app.id },
        orderBy: { provider: 'asc' },
      });
    }

    return list.map((p) => ({
      provider: p.provider.toLowerCase(),
      name: p.name,
      enabled: p.isEnabled,
    }));
  }
}
