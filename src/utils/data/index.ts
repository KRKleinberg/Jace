import { Collection, MongoClient, ServerApiVersion } from 'mongodb';

// INTERFACES
export interface Preferences {
	/** The prefix to use with prefix commands. */
	prefix?: string;
	/** The volume for the Player. */
	volume?: number;
}

interface Document {
	/** The User ID or Guild ID. Use '0' for master. */
	discordId: string;
	/** The preferences set for this ID. */
	preferences: Preferences;
}

// CHECK ENV VARIABLES
if (!process.env.ENV) {
	throw new Error('Environment variable "ENV" is not set!');
}
if (!process.env.MONGODB_COLLECTION_NAME) {
	throw new Error('Environment variable "MONGODB_COLLECTION_NAME" is not set!');
}
if (!process.env.MONGODB_URL) {
	throw new Error('Environment variable "MONGODB_URL" is not set!');
}

class DataClient {
	private client: MongoClient;
	public collection: Collection<Document>;

	constructor() {
		if (!process.env.ENV) {
			throw new Error('Environment variable "ENV" is not set!');
		}
		if (!process.env.MONGODB_COLLECTION_NAME) {
			throw new Error('Environment variable "MONGODB_COLLECTION_NAME" is not set!');
		}
		if (!process.env.MONGODB_URL) {
			throw new Error('Environment variable "MONGODB_URL" is not set!');
		}

		this.client = new MongoClient(process.env.MONGODB_URL, {
			serverApi: {
				version: ServerApiVersion.v1,
				strict: true,
				deprecationErrors: true,
			},
		});
		this.collection = this.client
			.db(process.env.MONGODB_COLLECTION_NAME)
			.collection<Document>(process.env.ENV);
	}

	public async getPreferences(discordId?: {
		userId?: string;
		guildId?: string;
	}): Promise<Required<Preferences>> {
		const user = await this.collection.findOne({ discordId: discordId?.userId ?? '' });
		const guild = await this.collection.findOne({ discordId: discordId?.guildId ?? '' });
		const master = await this.collection.findOne({ discordId: '0' });

		if (!master?.preferences.prefix) {
			throw new Error('Master prefix is not set in database!');
		}
		if (!master.preferences.volume) {
			throw new Error('Master volume is not set in database!');
		}

		return {
			prefix: user?.preferences.prefix ?? guild?.preferences.prefix ?? master.preferences.prefix,
			volume: guild?.preferences.volume ?? master.preferences.volume,
		};
	}
}

// Exports
export const Data = new DataClient();
