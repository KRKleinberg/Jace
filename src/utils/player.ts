import { App } from '#utils/app';
import { env } from '#utils/env';
import { log } from '#utils/log';
import { Redis } from '#utils/redis';
import {
	LavalinkManager,
	LavalinkNode,
	type QueueStoreManager,
	type StoredQueue,
} from 'lavalink-client';

class RedisQueueStore implements QueueStoreManager {
	private key(guildId: string): string {
		return `jace:queue:${guildId}`;
	}

	public async get(guildId: string): Promise<string | StoredQueue | undefined> {
		return (await Redis.client.get(this.key(guildId))) ?? undefined;
	}

	public async set(guildId: string, value: StoredQueue | string): Promise<void | boolean> {
		const data = await this.stringify(value);

		await Redis.client.set(this.key(guildId), data, { EX: 60 * 60 * 6 });
	}

	public async delete(guildId: string): Promise<void | boolean> {
		await Redis.client.del(this.key(guildId));
	}

	public async stringify(value: StoredQueue | string): Promise<string> {
		return typeof value === 'string' ? value : JSON.stringify(value);
	}

	public async parse(value: StoredQueue | string): Promise<Partial<StoredQueue>> {
		return typeof value === 'string' ? JSON.parse(value) : value;
	}
}

export class PlayerClient extends LavalinkManager {
	private constructor(managerOptions: ConstructorParameters<typeof LavalinkManager>[0]) {
		super(managerOptions);
	}

	public static async create(): Promise<PlayerClient> {
		const sessionId = await PlayerClient.getSession(env.INSTANCE, 0);

		if (sessionId) log.debug('[Lavalink] Resuming session: ${sessionId}');
		else log.debug('[Lavalink] No existing session found, starting fresh');

		const instance = new PlayerClient({
			nodes: [
				{
					id: env.INSTANCE,
					host: 'lavalink',
					port: 2333,
					authorization: env.LAVALINK_PASSWORD,
					...(sessionId && { sessionId }),
					heartBeatInterval: 30_000,
					retryDelay: 10_000,
					retryAmount: 5,
				},
			],
			sendToShard: (guildId, payload) => {
				App.guilds.cache.get(guildId)?.shard.send(payload);
			},
			autoSkip: true,
			autoSkipOnResolveError: true,
			playerOptions: {
				applyVolumeAsFilter: true,
				clientBasedPositionUpdateInterval: 50,
				onDisconnect: {
					autoReconnect: true,
					destroyPlayer: false,
				},
				onEmptyQueue: {
					destroyAfterMs: 30_000,
				},
			},
			queueOptions: {
				maxPreviousTracks: 10,
				queueStore: new RedisQueueStore(),
			},
		});

		instance.nodeManager.on('error', (node, error) => {
			log.error(`[Lavalink] Node ${node.options.id} error:`, error);
		});

		return instance;
	}

	private static sessionKey(nodeId: string, shardId: number): string {
		return `jace:session:${nodeId}:${shardId}`;
	}

	public static async saveSession(node: LavalinkNode, shardId: number): Promise<void> {
		if (!node.sessionId) return;

		await Redis.client.set(this.sessionKey(node.id, shardId), node.sessionId, { EX: 60 * 60 * 24 });
	}

	public static async getSession(nodeId: string, shardId: number): Promise<string | undefined> {
		return (await Redis.client.get(this.sessionKey(nodeId, shardId))) ?? undefined;
	}
}

export const Player = await PlayerClient.create();
