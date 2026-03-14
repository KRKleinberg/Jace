import { env } from '#utils/env';
import { log } from '#utils/log';
import { createClient } from 'redis';

class RedisClient {
	public readonly client: ReturnType<typeof createClient>;
	public readonly instanceId = crypto.randomUUID();
	public isNewInstance = false;

	private constructor() {
		this.client = createClient({
			url: `redis://:${env.REDIS_PASSWORD}@redis:6379`,
		});

		this.client.on('error', (error) => log.error('[Redis] Error:', error));
	}

	public static async create(): Promise<RedisClient> {
		const instance = new RedisClient();

		await instance.client.connect();

		const previousInstance = await instance.client.get('jace:instance');
		instance.isNewInstance = !previousInstance;

		log.info(`[Redis] Connected (Instance: ${instance.instanceId})`);
		log.debug(`[Redis] New instance: ${instance.isNewInstance}`);

		return instance;
	}
}

export const Redis = await RedisClient.create();
