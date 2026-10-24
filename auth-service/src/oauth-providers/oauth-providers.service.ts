import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { OAuthProviderType } from '../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { UpdateOAuthProviderDto } from './dto/update-oauth-provider.dto.js';

export interface SanitizedOAuthProvider {
  id: string;
  provider: OAuthProviderType;
  name: string;
  isEnabled: boolean;
  clientId: string | null;
  callbackUrl: string | null;
  hasSecret: boolean;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class OAuthProvidersService implements OnModuleInit {
  private readonly logger = new Logger(OAuthProvidersService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Tự động khởi tạo 2 bản ghi mặc định (GOOGLE, FACEBOOK) nếu chưa có trong DB.
   */
  async onModuleInit() {
    try {
      await this.ensureDefaultProviders();
    } catch (err: any) {
      this.logger.warn(`Lỗi khi khởi tạo OAuth providers mặc định: ${err.message}`);
    }
  }

  /**
   * Helper chuẩn hóa chuỗi provider (ví dụ: 'google' -> GOOGLE, 'facebook' -> FACEBOOK)
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
   * Khởi tạo cấu hình mặc định từ Database hoặc Biến Môi Trường (nếu có)
   */
  async ensureDefaultProviders() {
    const providers = [
      {
        provider: OAuthProviderType.GOOGLE,
        name: 'Google',
        clientId: process.env.GOOGLE_CLIENT_ID || null,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET || null,
        callbackUrl:
          process.env.GOOGLE_CALLBACK_URL ||
          'http://localhost:3000/auth/oauth/google/callback',
        isEnabled: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
      },
      {
        provider: OAuthProviderType.FACEBOOK,
        name: 'Facebook',
        clientId: process.env.FACEBOOK_APP_ID || null,
        clientSecret: process.env.FACEBOOK_APP_SECRET || null,
        callbackUrl:
          process.env.FACEBOOK_CALLBACK_URL ||
          'http://localhost:3000/auth/oauth/facebook/callback',
        isEnabled: Boolean(process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET),
      },
    ];

    for (const p of providers) {
      const existing = await this.prisma.oAuthProvider.findUnique({
        where: { provider: p.provider },
      });

      if (!existing) {
        await this.prisma.oAuthProvider.create({
          data: p,
        });
        this.logger.log(`Đã khởi tạo OAuth Provider mặc định: ${p.name}`);
      }
    }
  }

  /**
   * Loại bỏ clientSecret trước khi trả kết quả ra ngoài API.
   * Tuyệt đối không log và không trả clientSecret cho frontend.
   */
  private sanitize(provider: {
    id: string;
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
   * Lấy danh sách tất cả các OAuth Providers đã cấu hình (dành cho Admin).
   */
  async findAll(): Promise<SanitizedOAuthProvider[]> {
    const list = await this.prisma.oAuthProvider.findMany({
      orderBy: { provider: 'asc' },
    });
    return list.map((p) => this.sanitize(p));
  }

  /**
   * Lấy thông tin chi tiết một Provider theo tên (Google / Facebook).
   */
  async findByProvider(providerInput: string): Promise<SanitizedOAuthProvider> {
    const provider = this.normalizeProvider(providerInput);
    const found = await this.prisma.oAuthProvider.findUnique({
      where: { provider },
    });

    if (!found) {
      throw new NotFoundException(`Không tìm thấy cấu hình OAuth Provider: ${provider}`);
    }

    return this.sanitize(found);
  }

  /**
   * Phương thức nội bộ server-side dùng cho OAuth Strategy / Flow (Phase D).
   * Trả về toàn bộ thông tin kể cả clientSecret để trao đổi token.
   */
  async getInternalConfig(provider: OAuthProviderType) {
    const found = await this.prisma.oAuthProvider.findUnique({
      where: { provider },
    });
    if (!found) {
      throw new NotFoundException(`OAuth Provider ${provider} chưa được khởi tạo.`);
    }
    return found;
  }

  /**
   * Cập nhật thông tin cấu hình Provider (Chỉ ADMIN).
   */
  async update(
    providerInput: string,
    dto: UpdateOAuthProviderDto,
  ): Promise<SanitizedOAuthProvider> {
    const provider = this.normalizeProvider(providerInput);

    const existing = await this.prisma.oAuthProvider.findUnique({
      where: { provider },
    });

    if (!existing) {
      throw new NotFoundException(`Không tìm thấy cấu hình OAuth Provider: ${provider}`);
    }

    const dataToUpdate: any = {};
    if (dto.isEnabled !== undefined) dataToUpdate.isEnabled = dto.isEnabled;
    if (dto.clientId !== undefined) dataToUpdate.clientId = dto.clientId.trim() || null;
    if (dto.callbackUrl !== undefined) dataToUpdate.callbackUrl = dto.callbackUrl.trim() || null;

    // Chỉ cập nhật clientSecret nếu người dùng truyền chuỗi không rỗng
    if (dto.clientSecret !== undefined && dto.clientSecret.trim().length > 0) {
      dataToUpdate.clientSecret = dto.clientSecret.trim();
    }

    const updated = await this.prisma.oAuthProvider.update({
      where: { provider },
      data: dataToUpdate,
    });

    this.logger.log(`ADMIN đã cập nhật cấu hình OAuth Provider: ${provider}`);
    return this.sanitize(updated);
  }

  /**
   * Đổi trạng thái Bật / Tắt (Enable / Disable) nhanh cho một Provider.
   */
  async toggle(providerInput: string): Promise<SanitizedOAuthProvider> {
    const provider = this.normalizeProvider(providerInput);

    const existing = await this.prisma.oAuthProvider.findUnique({
      where: { provider },
    });

    if (!existing) {
      throw new NotFoundException(`Không tìm thấy cấu hình OAuth Provider: ${provider}`);
    }

    // Nếu muốn bật (enable), yêu cầu phải có clientId và clientSecret
    const newStatus = !existing.isEnabled;
    if (newStatus && (!existing.clientId || !existing.clientSecret)) {
      throw new BadRequestException(
        `Không thể bật "${existing.name}" khi chưa cấu hình đầy đủ Client ID và Client Secret.`,
      );
    }

    const updated = await this.prisma.oAuthProvider.update({
      where: { provider },
      data: { isEnabled: newStatus },
    });

    this.logger.log(`Trạng thái OAuth Provider ${provider} đã đổi sang: ${newStatus ? 'ENABLED' : 'DISABLED'}`);
    return this.sanitize(updated);
  }
}
