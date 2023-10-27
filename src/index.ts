import {
	DynamoDBClient,
	type DynamoDBDefaultPrefsTable,
	type DynamoDBGuildPrefsTable,
	type DynamoDBUserPrefsTable,
} from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { BridgeProvider, BridgeSource } from '@discord-player/extractor';
import { Player, type QueryType } from 'discord-player';
import { Client, Collection, GatewayIntentBits, type ColorResolvable, type SlashCommandBuilder } from 'discord.js';
import * as dotenv from 'dotenv';
import type EventEmitter from 'events';
import { globby } from 'globby';
import path from 'path';

declare module '@aws-sdk/client-dynamodb' {
	export interface DynamoDBDefaultPrefsTable {
		prefix: string;
		env: 'main' | 'dev';
		color: ColorResolvable;
	}
	export interface DynamoDBGuildPrefsTable {
		prefix?: string;
		env: 'main' | 'dev';
		color?: ColorResolvable;
	}
	export interface DynamoDBUserPrefsTable {
		searchEngine?: (typeof QueryType)[keyof typeof QueryType];
	}
}
declare module 'discord.js' {
	export interface Client {
		commands: Collection<string, Command>;
		dynamoDBClient: DynamoDBClient;
		dynamoDBDocumentClient: DynamoDBDocumentClient;
	}
	export interface Command {
		aliases?: string[];
		data: Omit<SlashCommandBuilder, 'addSubcommand' | 'addSubcommandGroup'>;
		autocomplete?: (interaction: AutocompleteInteraction, userPrefs?: DynamoDBUserPrefsTable) => Promise<void>;
		execute: (options: {
			command: ChatInputCommandInteraction | Message;
			guild: Guild;
			member: GuildMember;
			args: string[];
			defaultPrefs: DynamoDBDefaultPrefsTable;
			guildPrefs?: DynamoDBGuildPrefsTable;
			userPrefs?: DynamoDBUserPrefsTable;
		}) => Promise<Message | EventEmitter>;
	}
	export interface Event {
		execute: (client: Client) => Promise<void>;
	}
}

dotenv.config();

// Check environment variables
if (process.env.AWS_ACCESS_KEY_ID == null) throw new Error('AWS_ACCESS_KEY_ID is not set!');
if (process.env.AWS_SECRET_ACCESS_KEY == null) throw new Error('AWS_SECRET_ACCESS_KEY is not set!');
if (process.env.AWS_REGION == null) throw new Error('AWS_REGION is not set!');
if (process.env.DISCORD_APP_ID == null) throw new Error('DISCORD_APP_ID is not set!');
if (process.env.DISCORD_BOT_TOKEN == null) throw new Error('DISCORD_BOT_TOKEN is not set!');
if (process.env.DYNAMODB_DEFAULT_PREFS == null) throw new Error('DYNAMODB_DEFAULT_PREFS is not set!');
if (process.env.ENV == null) throw new Error('ENV is not set!');
if (process.env.YOUTUBE_COOKIE == null) throw new Error('YOUTUBE_COOKIE is not set!');

// Client
const client = new Client({
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

// DynamoDB
client.dynamoDBClient = new DynamoDBClient();
client.dynamoDBDocumentClient = DynamoDBDocumentClient.from(client.dynamoDBClient);

// Player
const bridgeProvider = new BridgeProvider(BridgeSource.SoundCloud);

const player = new Player(client, {
	bridgeProvider,
	ytdlOptions: {
		requestOptions: {
			headers: {
				cookie: process.env.YOUTUBE_COOKIE,
			},
		},
	},
});

await player.extractors.loadDefault();

// Commands
const commandFiles = await globby('./commands/**/*.js', { cwd: './dist/' });
client.commands = new Collection();

for (const commandFile of commandFiles) {
	const { default: command } = await import(commandFile);

	command.data.name = path.basename(commandFile, '.js').toLowerCase();

	client.commands.set(command.data.name, command);
}

// Events
const eventFiles = await globby('./events/**/*.js', { cwd: './dist/' });

for (const eventFile of eventFiles) {
	const { default: event } = await import(eventFile);

	event.execute(client);
}

// Start
await client.login(process.env.DISCORD_BOT_TOKEN);
