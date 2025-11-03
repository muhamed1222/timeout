import postgres from 'postgres';
import * as dotenv from 'dotenv';

dotenv.config();

const url = process.env.DATABASE_URL!;
console.log('🧪 Тестирую pooler подключение...');
console.log('URL:', url.replace(/:[^:@]*@/, ':***@'));

const client = postgres(url, {
  ssl: { rejectUnauthorized: false },
  connect_timeout: 15,
  max: 1,
});

(async () => {
  try {
    const result = await Promise.race([
      client`SELECT 1 as test, NOW() as time`,
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Timeout after 12 seconds')), 12000)
      ),
    ]);

    console.log('✅ УСПЕХ! Pooler работает!');
    console.log('Результат:', result);
    await client.end();
    process.exit(0);
  } catch (e) {
    console.log(
      '❌ Ошибка:',
      e instanceof Error ? e.message : String(e)
    );
    try {
      await client.end();
    } catch {
      // Ignore
    }
    process.exit(1);
  }
})();

