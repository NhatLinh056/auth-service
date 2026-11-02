import bcrypt from 'bcrypt';
import 'dotenv/config';
import pg from 'pg';

if (process.env.NODE_ENV === 'production' || process.env.ENABLE_DEMO_SEED !== 'true') {
  throw new Error('Seed requires ENABLE_DEMO_SEED=true and a non-production environment');
}
const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL is required');

const client = new pg.Client({ connectionString });

async function seed() {
  console.log(' Bắt đầu nạp dữ liệu mẫu vào cơ sở dữ liệu (Database Seeding)...');
  await client.connect();

  try {
    // 1. Tạo hoặc cập nhật tài khoản Quản trị viên nền tảng (Platform SuperAdmin)
    const adminEmail = process.env.DEFAULT_ADMIN_EMAIL || 'admin@example.com';
    const adminPassword = process.env.DEFAULT_ADMIN_PASSWORD || 'Admin123!';
    const adminPasswordHash = await bcrypt.hash(adminPassword, 10);

    const adminRes = await client.query(
      `INSERT INTO users (id, email, "passwordHash", name, role, "createdAt", "updatedAt")
       VALUES (gen_random_uuid(), $1, $2, $3, 'ADMIN', NOW(), NOW())
       ON CONFLICT (email) DO UPDATE 
       SET "passwordHash" = $2, name = $3, role = 'ADMIN', "updatedAt" = NOW()
       RETURNING id, email, role;`,
      [adminEmail, adminPasswordHash, 'Administrator']
    );
    console.log(` Platform Admin: ${adminRes.rows[0].email}`);

    // 2. Tạo hoặc cập nhật tài khoản Lập trình viên mẫu (Developer / App Owner)
    const devEmail = 'developer@example.com';
    const devPassword = 'Password123!';
    const devPasswordHash = await bcrypt.hash(devPassword, 10);

    const devRes = await client.query(
      `INSERT INTO users (id, email, "passwordHash", name, role, "createdAt", "updatedAt")
       VALUES (gen_random_uuid(), $1, $2, $3, 'USER', NOW(), NOW())
       ON CONFLICT (email) DO UPDATE 
       SET "passwordHash" = $2, name = $3, role = 'USER', "updatedAt" = NOW()
       RETURNING id, email, role;`,
      [devEmail, devPasswordHash, 'App Developer']
    );
    const devUserId = devRes.rows[0].id;
    console.log(` App Developer: ${devRes.rows[0].email}`);

    // 3. Tạo hoặc cập nhật Ứng dụng mẫu khớp với cấu hình Client (demo-service)
    const sampleAppId = 'app_22c57454b00eb44a55c66bf4';
    const sampleAppToken = process.env.SEED_APP_TOKEN;
    if (!sampleAppToken || !/^apt_[a-f0-9]{64}$/.test(sampleAppToken)) throw new Error('Set SEED_APP_TOKEN to a generated 256-bit app token');
    
    // Đọc từ biến môi trường SEED_ADMIN_EMAILS nếu có, mặc định là mảng rỗng []
    const sampleAdminEmails = process.env.SEED_ADMIN_EMAILS
      ? process.env.SEED_ADMIN_EMAILS.split(',').map((e) => e.trim().toLowerCase()).filter(Boolean)
      : [];

    const appRes = await client.query(
      `INSERT INTO applications (id, name, "appId", "appToken", status, "adminEmails", "userId", "createdAt", "updatedAt")
       VALUES (gen_random_uuid(), 'Demo Order Service', $1, $2, 'ACTIVE', $3, $4, NOW(), NOW())
       ON CONFLICT ("appId") DO UPDATE 
       SET name = 'Demo Order Service', 
           "appToken" = $2, 
           status = 'ACTIVE', 
           "adminEmails" = CASE WHEN array_length($3::text[], 1) > 0 THEN $3 ELSE applications."adminEmails" END, 
           "userId" = $4, 
           "updatedAt" = NOW()
       RETURNING id, name, "appId", "adminEmails";`,
      [sampleAppId, sampleAppToken, sampleAdminEmails, devUserId]
    );
    const appIdInternal = appRes.rows[0].id;
    await client.query('UPDATE applications SET "allowedRedirectUris" = $1 WHERE id = $2',
      [[process.env.SEED_REDIRECT_URI || 'http://localhost:3001/'], appIdInternal]);
    console.log(` Application: "${appRes.rows[0].name}" [${appRes.rows[0].appId}]`);
    console.log(`   Admin Emails: ${appRes.rows[0].adminEmails.join(', ')}`);

    // 4. Cấu hình sẵn các OAuth Provider cho ứng dụng mẫu (Google & Facebook)
    const googleClientId = process.env.GOOGLE_CLIENT_ID || 'sample-google-client-id.apps.googleusercontent.com';
    const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET || 'sample-google-client-secret';
    const fbClientId = process.env.FACEBOOK_CLIENT_ID || 'sample-facebook-app-id';
    const fbClientSecret = process.env.FACEBOOK_CLIENT_SECRET || 'sample-facebook-client-secret';

    await client.query(
      `INSERT INTO oauth_providers (id, "applicationId", provider, name, "isEnabled", "clientId", "clientSecret", "callbackUrl", "createdAt", "updatedAt")
       VALUES 
       (gen_random_uuid(), $1, 'GOOGLE', 'Google', true, $2, $3, 'http://localhost:3000/auth/oauth/google/callback', NOW(), NOW()),
       (gen_random_uuid(), $1, 'FACEBOOK', 'Facebook', true, $4, $5, 'http://localhost:3000/auth/oauth/facebook/callback', NOW(), NOW())
       ON CONFLICT ("applicationId", provider) DO UPDATE 
       SET "isEnabled" = true,
           "clientId" = COALESCE(oauth_providers."clientId", EXCLUDED."clientId"),
           "clientSecret" = COALESCE(oauth_providers."clientSecret", EXCLUDED."clientSecret"),
           "callbackUrl" = EXCLUDED."callbackUrl",
           "updatedAt" = NOW();`,
      [appIdInternal, googleClientId, googleClientSecret, fbClientId, fbClientSecret]
    );
    console.log(' OAuth Providers: Bật sẵn Google & Facebook cho ứng dụng mẫu');

    console.log('\n Nạp dữ liệu mẫu hoàn tất! Hệ thống đã sẵn sàng để demo.');
  } catch (err) {
    console.error(' Lỗi khi nạp dữ liệu mẫu:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

seed();

