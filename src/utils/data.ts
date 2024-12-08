export * as Data from '#utils/data';
import { type QueryType } from 'discord-player';
import { type ColorResolvable } from 'discord.js';
import { MongoClient, ServerApiVersion } from 'mongodb';

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

export const client = new MongoClient(process.env.MONGODB_URL!, {
	serverApi: {
		version: ServerApiVersion.v1,
		strict: true,
		deprecationErrors: true,
	},
});

export async function getPreferences(id?: {
	userId?: string;
	guildId?: string;
}): Promise<Required<Preferences>> {
	const collection = client.db(process.env.npm_package_name).collection<Document>(process.env.ENV!);

	const user = id?.userId ? await collection.findOne({ discordId: id.userId }) : null;
	const guild = id?.guildId ? await collection.findOne({ discordId: id.guildId }) : null;
	const master = (await collection.findOne({ discordId: '0' }))!;

	return {
		prefix: user?.preferences.prefix ?? guild?.preferences.prefix ?? master.preferences.prefix!,
		color: user?.preferences.color ?? guild?.preferences.color ?? master.preferences.color!,
		searchEngine:
			user?.preferences.searchEngine ??
			guild?.preferences.searchEngine ??
			master.preferences.searchEngine!,
	};
}
