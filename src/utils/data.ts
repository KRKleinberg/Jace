import { type QueryType } from 'discord-player';
import { type ColorResolvable } from 'discord.js';
import { MongoClient, ServerApiVersion } from 'mongodb';

export * as Data from '#utils/data';

export interface Preferences {
	/** The prefix to use with prefix commands. */
	prefix?: string;
	/** The color to use on embeds. */
	color?: ColorResolvable;
	/** The search engine to search for tracks with. */
	searchEngine?: (typeof QueryType)[keyof typeof QueryType];
}
export interface Document {
	/** The User ID or Guild ID. Use '0' for master. */
	discordId: string;
	/** The preferences set for this ID. */
	preferences: Preferences;
}

if (!process.env.ENV) {
	throw new Error('Environment variable "ENV" is not set!');
}
if (!process.env.MONGODB_COLLECTION_NAME) {
	throw new Error('Environment variable "MONGODB_COLLECTION_NAME" is not set!');
}
if (!process.env.MONGODB_URL) {
	throw new Error('Environment variable "MONGODB_URL" is not set!');
}

const client = new MongoClient(process.env.MONGODB_URL, {
	serverApi: {
		version: ServerApiVersion.v1,
		strict: true,
		deprecationErrors: true,
	},
});
export const collection = client
	.db(process.env.MONGODB_COLLECTION_NAME)
	.collection<Document>(process.env.ENV);

export async function getPreferences(discordId?: {
	userId?: string;
	guildId?: string;
}): Promise<Required<Preferences>> {
	const user = await collection.findOne({ discordId: discordId?.userId ?? '' });
	const guild = await collection.findOne({ discordId: discordId?.guildId ?? '' });
	const master = await collection.findOne({ discordId: '0' });

	if (!master?.preferences.prefix) {
		throw new Error('Master prefix is not set in database!');
	}
	if (!master.preferences.color) {
		throw new Error('Master color is not set in database!');
	}
	if (!master.preferences.searchEngine) {
		throw new Error('Master searchEngine is not set in database!');
	}

	return {
		prefix: user?.preferences.prefix ?? guild?.preferences.prefix ?? master.preferences.prefix,
		color: user?.preferences.color ?? guild?.preferences.color ?? master.preferences.color,
		searchEngine:
			user?.preferences.searchEngine ??
			guild?.preferences.searchEngine ??
			master.preferences.searchEngine,
	};
}
