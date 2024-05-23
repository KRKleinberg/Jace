import * as DynamoDB from '@utils/dynamodb';
import { Player, QueryType, type SearchResult, type TrackSource } from 'discord-player';
import {
	Client,
	Collection,
	GatewayIntentBits,
	InteractionType,
	type SlashCommandOptionsOnlyBuilder,
	type AnySelectMenuInteraction,
	type AutocompleteInteraction,
	type BaseMessageOptions,
	type ChatInputCommandInteraction,
	type Guild,
	type GuildMember,
	type InteractionResponse,
	type Message,
	ActivityType,
} from 'discord.js';
import type EventEmitter from 'events';

const defaultPrefs = await DynamoDB.getDefaultPrefs();

export interface Command {
	aliases?: string[];
	data: Omit<SlashCommandOptionsOnlyBuilder, 'addSubcommand' | 'addSubcommandGroup'>;
	autocomplete?: (
		interaction: AutocompleteInteraction,
		userPrefs?: DynamoDB.UserPrefs
	) => Promise<void>;
	execute: (options: {
		command: ChatInputCommandInteraction | Message;
		guild: Guild;
		member: GuildMember;
		args: string[];
		defaultPrefs: DynamoDB.DefaultPrefs;
		guildPrefs?: DynamoDB.GuildPrefs;
		userPrefs?: DynamoDB.UserPrefs;
	}) => Promise<Message | InteractionResponse | EventEmitter>;
}
export interface Event {
	execute: () => Promise<void>;
}

export class EnvKeys {
	constructor(
		/** Public access key for AWS. */
		readonly AWS_ACCESS_KEY_ID?: string,
		/** Private access key for AWS. */
		readonly AWS_SECRET_ACCESS_KEY?: string,
		/** Region for AWS. */
		readonly AWS_REGION?: string,
		/** Application ID for Discord. */
		readonly DISCORD_APP_ID?: string,
		/** Bot Token for Discord. */
		readonly DISCORD_BOT_TOKEN?: string,
		/** Table name of default preferences for DynamoDB. */
		readonly DYNAMODB_DEFAULT_PREFS?: string,
		/** Table name of guild preferences for DynamoDB. */
		readonly DYNAMODB_GUILD_PREFS?: string,
		/** Table name of user preferences for DynamoDB. */
		readonly DYNAMODB_USER_PREFS?: string,
		/** The environment this instance is running in (ex. 'main', 'dev', 'wip'). */
		readonly ENV?: string,
		/** The port to check the app's connection on. */
		readonly HEALTH_PORT?: string,
		/** YouTube Cookie for music player. */
		readonly YOUTUBE_COOKIE?: string
	) {}
}
export class Search {
	private readonly input;
	private readonly userPrefs;

	constructor(
		/** User input */
		input: string,
		/** The users preferences from the database */
		userPrefs?: DynamoDB.UserPrefs
	) {
		this.input = input.trim();
		this.userPrefs = userPrefs;
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

		return this.userPrefs?.searchEngine ?? QueryType.YOUTUBE_SEARCH;
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
				name: `📻 | ${defaultPrefs.prefix}help | v${process.env.npm_package_version}`,
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

export async function respond(
	command: ChatInputCommandInteraction | AnySelectMenuInteraction | Message,
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