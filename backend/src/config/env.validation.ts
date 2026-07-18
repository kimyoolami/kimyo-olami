export function validateEnvironment(config: Record<string, unknown>) {
  const jwtSecret =
    typeof config.JWT_SECRET === 'string' ? config.JWT_SECRET : '';
  if (config.NODE_ENV !== 'test' && jwtSecret.length < 32) {
    throw new Error('JWT_SECRET kamida 32 belgidan iborat bo‘lishi kerak');
  }

  if (config.NODE_ENV === 'production') {
    for (const key of ['DATABASE_URL', 'TELEGRAM_BOT_TOKEN', 'FRONTEND_URL']) {
      if (!config[key]) throw new Error(`${key} production muhitida majburiy`);
    }
  }
  return config;
}
