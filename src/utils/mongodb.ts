import { env } from '#utils/env';
import { log } from '#utils/log';
import {
	ChangeStream,
	Collection,
	MongoClient,
	ObjectId,
	ServerApiVersion,
	type ChangeStreamDocument,
} from 'mongodb';

export interface Preferences {
	prefix?: string;
	volume?: number;
}

interface PreferencesDocument {
	discordId: string;
	preferences: Preferences;
}

interface MongoDocument extends PreferencesDocument {
	_id: ObjectId;
}

class PreferencesCache {
	private byMongoId = new Map<string, PreferencesDocument>();
	private byDiscordId = new Map<string, string>();
	private changeStream: ChangeStream<MongoDocument, ChangeStreamDocument<MongoDocument>>;

	private constructor(collection: Collection<MongoDocument>) {
		this.changeStream = collection.watch([], {
			fullDocument: 'updateLookup',
		});

		this.changeStream.on('change', (change) => {
			if (change.operationType === 'delete') {
				this.delete(change.documentKey._id.toString());
				return;
			}

			if (
				(change.operationType === 'insert' ||
					change.operationType === 'update' ||
					change.operationType === 'replace') &&
				change.fullDocument
			) {
				this.set(change.fullDocument);
			}
		});

		this.changeStream.on('error', (error) => {
			log.error('[MongoDB] Change Stream Error:', error);
		});
	}

	public static async create(collection: Collection<MongoDocument>): Promise<PreferencesCache> {
		const instance = new PreferencesCache(collection);
		const documents = await collection.find().toArray();

		for (const document of documents) instance.set(document);

		log.info(`[MongoDB] Cache initialized`);

		return instance;
	}

	public set(document: MongoDocument): void {
		const { _id, ...rest } = document;

		this.byMongoId.set(_id.toString(), rest);
		this.byDiscordId.set(rest.discordId, _id.toString());

		log.debug(`[MongoDB] Document with ID ${_id} set in cache`);
	}

	public delete(id: string): void {
		const document = this.byMongoId.get(id);

		// The master document with discordId '0' should never be deleted
		if (document?.discordId === '0') return;

		if (document) this.byDiscordId.delete(document.discordId);

		this.byMongoId.delete(id);

		log.debug(`[MongoDB] Document with ID ${id} deleted from cache`);
	}

	// DatabaseClient.create() guarantees that the master document with discordId '0' always exists, so we can safely return Required<Preferences> for that case
	public get(discordId: '0'): Required<Preferences>;
	public get(discordId: string): Preferences | undefined;
	public get(discordId: string): Preferences | undefined {
		const id = this.byDiscordId.get(discordId);
		const preferences = id ? this.byMongoId.get(id)?.preferences : undefined;

		if (discordId === '0' && !preferences)
			throw new Error('[MongoDB] Master preferences not found in cache!');

		return preferences;
	}

	public async destroy(): Promise<void> {
		await this.changeStream.close();

		log.debug('[MongoDB] Change stream closed');
	}
}

class DatabaseClient {
	private client: MongoClient;
	private collection: Collection<MongoDocument>;
	private cache!: PreferencesCache;

	private constructor() {
		this.client = new MongoClient(env.MONGODB_URL, {
			serverApi: {
				version: ServerApiVersion.v1,
				strict: true,
				deprecationErrors: true,
			},
		});
		this.collection = this.client
			.db(env.MONGODB_COLLECTION_NAME)
			.collection<MongoDocument>(env.INSTANCE);
	}

	public static async create(): Promise<DatabaseClient> {
		const instance = new DatabaseClient();

		instance.cache = await PreferencesCache.create(instance.collection);

		const master = instance.cache.get('0');
		if (!master?.prefix) throw new Error('DB Error: Master prefix is not set');
		if (!master?.volume) throw new Error('DB Error: Master volume is not set');

		return instance;
	}

	public getPreferences(discordId?: { userId?: string; guildId?: string }): Required<Preferences> {
		const user = discordId?.userId ? this.cache.get(discordId.userId) : undefined;
		const guild = discordId?.guildId ? this.cache.get(discordId.guildId) : undefined;
		const master = this.cache.get('0');

		return {
			prefix: user?.prefix ?? guild?.prefix ?? master.prefix,
			volume: user?.volume ?? guild?.volume ?? master.volume,
		};
	}

	public async updatePreferences(
		discordId: string,
		preferences: Partial<Preferences>,
	): Promise<void> {
		const $set = Object.fromEntries(
			Object.entries(preferences).map(([key, value]) => [`preferences.${key}`, value]),
		);

		await this.collection.updateOne({ discordId }, { $set }, { upsert: true });
	}

	public async destroy(): Promise<void> {
		await this.cache.destroy();
		await this.client.close();

		log.debug('[MongoDB] Client connection closed');
	}
}

export const Database = await DatabaseClient.create();
