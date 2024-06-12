import { Player, QueryType, type SearchResult, type TrackSource } from 'discord-player';
import {
	ActivityType,
	Client,
	Collection,
	ColorResolvable,
	GatewayIntentBits,
	InteractionType,
	type AnySelectMenuInteraction,
	type AutocompleteInteraction,
	type BaseMessageOptions,
	type ChatInputCommandInteraction,
	type Guild,
	type GuildMember,
	type InteractionResponse,
	type Message,
	type SlashCommandOptionsOnlyBuilder,
} from 'discord.js';
import type EventEmitter from 'events';
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
export interface Command {
	aliases?: string[];
	data: Omit<SlashCommandOptionsOnlyBuilder, 'addSubcommand' | 'addSubcommandGroup'>;
	autocomplete?: (
		interaction: AutocompleteInteraction,
		preferences: Required<Preferences>
	) => Promise<void>;
	execute: (options: {
		command: ChatInputCommandInteraction | Message;
		guild: Guild;
		member: GuildMember;
		args: string[];
		preferences: Required<Preferences>;
	}) => Promise<Message | InteractionResponse | EventEmitter>;
}
export interface Event {
	execute: () => Promise<void>;
}

export class EnvKeys {
	constructor(
		/** Application ID for Discord. */
		readonly DISCORD_APP_ID?: string,
		/** Bot Token for Discord. */
		readonly DISCORD_BOT_TOKEN?: string,
		/** The environment this instance is running in (ex. 'main', 'dev', 'wip'). */
		readonly ENV?: 'main' | 'dev' | 'wip',
		/** MongoDB URL for login. */
		readonly MONGODB_URL?: string,
		/** YouTube Cookie for music player. */
		readonly YOUTUBE_COOKIE?: string
	) {}
}
export class Search {
	private readonly input;
	private readonly preferences;

	constructor(
		/** User input */
		input: string,
		/** The preferences from the database */
		preferences: Required<Preferences>
	) {
		this.input = input.trim();
		this.preferences = preferences;
	}

	/**
	 * Returns the user input without the requested search engine
	 */
	get query(): string {
		for (const streamSource of streamSources)
			if (this.input.toLowerCase().endsWith(` ${streamSource.name.toLowerCase()}`))
				return this.input.replace(streamSource.replaceRegExp, '').trim();

		return this.input;
	}

	/**
	 * Returns the search engine the user requests. Defaults to YouTube.
	 */
	get engine(): (typeof QueryType)[keyof typeof QueryType] {
		for (const streamSource of streamSources)
			if (this.input.toLowerCase().endsWith(` ${streamSource.name.toLowerCase()}`))
				return streamSource.searchQueryType;

		return this.preferences.searchEngine;
	}

	/**
	 * Returns search result
	 */
	async result(): Promise<SearchResult> {
		return await player.search(this.query, {
			searchEngine: QueryType.AUTO,
			fallbackSearchEngine: this.engine,
		});
	}
}

export const mongoClient = new MongoClient(process.env.MONGODB_URL as string, {
	serverApi: {
		version: ServerApiVersion.v1,
		strict: true,
		deprecationErrors: true,
	},
});
export const client = new Client({
	intents: [
		// GatewayIntentBits.AutoModerationConfiguration,
		GatewayIntentBits.AutoModerationExecution,
		// GatewayIntentBits.DirectMessageReactions,
		// GatewayIntentBits.DirectMessageTyping,
		// GatewayIntentBits.DirectMessages,
		// GatewayIntentBits.GuildBans,
		// GatewayIntentBits.GuildEmojisAndStickers,
		// GatewayIntentBits.GuildIntegrations,
		// GatewayIntentBits.GuildInvites,
		GatewayIntentBits.GuildMembers,
		GatewayIntentBits.GuildMessageReactions,
		GatewayIntentBits.GuildMessageTyping,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.GuildPresences,
		// GatewayIntentBits.GuildScheduledEvents,
		GatewayIntentBits.GuildVoiceStates,
		// GatewayIntentBits.GuildWebhooks,
		GatewayIntentBits.Guilds,
		GatewayIntentBits.MessageContent,
	],
	presence: {
		activities: [
			{
				name: `📻 | ${(await getPreferences()).prefix}help | v${process.env.npm_package_version}`,
				type: ActivityType.Custom,
			},
		],
	},
});
export const commands = new Collection<string, Command>();
export const player = new Player(client, {
	ytdlOptions: {
		requestOptions: {
			headers: {
				cookie: process.env.YOUTUBE_COOKIE,
			},
		},
	},
});
export const streamSources: Array<{
	name: string;
	searchQueryType: (typeof QueryType)[keyof typeof QueryType];
	replaceRegExp: string | RegExp;
	trackSource: TrackSource;
}> = [
	{
		name: 'Apple Music',
		searchQueryType: QueryType.APPLE_MUSIC_SEARCH,
		replaceRegExp: / apple music/gi,
		trackSource: 'apple_music',
	},
	{
		name: 'SoundCloud',
		searchQueryType: QueryType.SOUNDCLOUD_SEARCH,
		replaceRegExp: / soundcloud/gi,
		trackSource: 'soundcloud',
	},
	{
		name: 'Spotify',
		searchQueryType: QueryType.SPOTIFY_SEARCH,
		replaceRegExp: / spotify/gi,
		trackSource: 'spotify',
	},
	{
		name: 'YouTube',
		searchQueryType: QueryType.YOUTUBE_SEARCH,
		replaceRegExp: / youtube/gi,
		trackSource: 'youtube',
	},
];

export async function getPreferences(id?: {
	userId?: string;
	guildId?: string;
}): Promise<Required<Preferences>> {
	const collection = mongoClient
		.db(process.env.npm_package_name)
		.collection<Document>(process.env.ENV!);

	const user = id?.userId ? await collection.findOne({ discordId: id?.userId }) : null;
	const guild = id?.guildId ? await collection.findOne({ discordId: id?.guildId }) : null;
	const master = (await collection.findOne({ discordId: '0' }))!;

	if (!master) throw new Error('Cannot fetch master preferences!');

	return {
		prefix: user?.preferences?.prefix ?? guild?.preferences?.prefix ?? master.preferences.prefix!,
		color: user?.preferences?.color ?? guild?.preferences?.color ?? master.preferences.color!,
		searchEngine:
			user?.preferences?.searchEngine ??
			guild?.preferences?.searchEngine ??
			master.preferences.searchEngine!,
	};
}
export async function respond(
	command: Parameters<Command['execute']>[0]['command'] | AnySelectMenuInteraction,
	response: string | BaseMessageOptions,
	options?: {
		channelSend?: boolean;
		messageReply?: boolean;
	}
): Promise<Message | InteractionResponse> {
	if (options?.channelSend === true && command.channel != null)
		return await command.channel.send(response);
	if (command.type === InteractionType.ApplicationCommand)
		return command.replied ? await command.editReply(response) : await command.followUp(response);
	if (command.type === InteractionType.MessageComponent) return await command.update(response);
	if (options?.messageReply === true) return await command.reply(response);
	else return await command.channel.send(response);
}
