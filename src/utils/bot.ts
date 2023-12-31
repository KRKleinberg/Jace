import { DynamoDB } from '@utils/dynamodb';
import { Player, QueryType, TrackSource } from 'discord-player';
import {
	AnySelectMenuInteraction,
	AutocompleteInteraction,
	BaseMessageOptions,
	ChatInputCommandInteraction,
	Client,
	Collection,
	GatewayIntentBits,
	Guild,
	GuildMember,
	InteractionResponse,
	InteractionType,
	Message,
	SlashCommandBuilder,
} from 'discord.js';
import EventEmitter from 'events';

export namespace Bot {
	export interface Command {
		aliases?: string[];
		data: Omit<SlashCommandBuilder, 'addSubcommand' | 'addSubcommandGroup'>;
		autocomplete?: (
			interaction: AutocompleteInteraction,
			userPrefs?: DynamoDB.Tables.UserPrefs
		) => Promise<void>;
		execute: (options: {
			command: ChatInputCommandInteraction | Message;
			guild: Guild;
			member: GuildMember;
			args: string[];
			defaultPrefs: DynamoDB.Tables.DefaultPrefs;
			guildPrefs?: DynamoDB.Tables.GuildPrefs;
			userPrefs?: DynamoDB.Tables.UserPrefs;
		}) => Promise<Message | InteractionResponse | EventEmitter>;
	}
	export interface Event {
		execute: () => Promise<void>;
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
	});

	export class EnvKeys {
		constructor(
			readonly AWS_ACCESS_KEY_ID?: string,
			readonly AWS_SECRET_ACCESS_KEY?: string,
			readonly AWS_REGION?: string,
			readonly DISCORD_APP_ID?: string,
			readonly DISCORD_BOT_TOKEN?: string,
			readonly DYNAMODB_DEFAULT_PREFS?: string,
			readonly ENV?: string,
			readonly YOUTUBE_COOKIE?: string
		) {}
	}

	export const commands = new Collection<string, Command>();
	export const player = new Player(Bot.client);
	export const streamSources: {
		name: string;
		searchQueryType: (typeof QueryType)[keyof typeof QueryType];
		replaceRegExp: string | RegExp;
		trackSource: TrackSource;
	}[] = [
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

	export function getSearchQuery(
		input: string,
		userPrefs?: DynamoDB.Tables.UserPrefs
	): {
		query: string;
		type: (typeof QueryType)[keyof typeof QueryType];
	} {
		for (const streamSource of Bot.streamSources) {
			if (input.toLowerCase().endsWith(` ${streamSource.name.toLowerCase()}`))
				return {
					query: input.replace(streamSource.replaceRegExp, ''),
					type: streamSource.searchQueryType,
				};
		}
		return {
			query: input,
			type: userPrefs?.searchEngine ?? QueryType.YOUTUBE_SEARCH,
		};
	}
	export async function respond(
		command: ChatInputCommandInteraction | AnySelectMenuInteraction | Message,
		response: string | BaseMessageOptions,
		options?: {
			channelSend?: boolean;
			messageReply?: boolean;
		}
	): Promise<Message | InteractionResponse> {
		if (options?.channelSend == true && command.channel != null)
			return await command.channel.send(response);
		if (command.type === InteractionType.ApplicationCommand)
			return command.replied ? await command.editReply(response) : await command.followUp(response);
		if (command.type === InteractionType.MessageComponent) return await command.update(response);
		if (options?.messageReply === true) return await command.reply(response);
		else return await command.channel.send(response);
	}
}
