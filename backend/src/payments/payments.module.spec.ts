import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { PaymentsModule } from './payments.module';

describe('PaymentsModule', () => {
  const originalDatabaseUrl = process.env.DATABASE_URL;

  beforeAll(() => {
    process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
  });

  afterAll(() => {
    if (originalDatabaseUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = originalDatabaseUrl;
  });

  it('resolves all payment dependencies', async () => {
    const module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          load: [
            () => ({
              JWT_SECRET: 'test-secret',
              DATABASE_URL: 'postgresql://test',
            }),
          ],
        }),
        PaymentsModule,
      ],
    }).compile();

    expect(module).toBeDefined();
    await module.close();
  });
});
