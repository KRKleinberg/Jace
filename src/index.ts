import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { Player, type SearchQueryType } from 'discord-player';
import { Client, Collection, GatewayIntentBits, type SlashCommandBuilder } from 'discord.js';
import * as dotenv from 'dotenv';
import { globby } from 'globby';
import path from 'path';

declare module 'discord.js' {
	export interface Client {
		command: {
			aliases?: string[];
			data: Omit<SlashCommandBuilder, 'addSubcommand' | 'addSubcommandGroup'>;
			autocomplete?: (interaction: AutocompleteInteraction, userPrefs: Client['dynamoDBTableUserPrefs']) => Promise<void>;
			execute: (options: {
				command: ChatInputCommandInteraction | Message;
				guild: Guild;
				member: GuildMember;
				args: string[];
				defaultPrefs: Client['dynamoDBTableDefaultPrefs'];
				guildPrefs: Client['dynamoDBTableGuildPrefs'];
				userPrefs: Client['dynamoDBTableUserPrefs'];
			}) => Promise<Message<boolean>>;
		};
		commands: Collection<string, Client['command']>;
		dynamoDBClient: DynamoDBClient;
		dynamoDBDocumentClient: DynamoDBDocumentClient;
		dynamoDBTableDefaultPrefs: { prefix: string; env: 'main' | 'dev'; color: ColorResolvable };
		dynamoDBTableGuildPrefs: { prefix?: string; env: 'main' | 'dev'; color?: ColorResolvable } | null;
		dynamoDBTableUserPrefs: { searchEngine?: SearchQueryType } | null;
		event: { execute: (client: Client) => Promise<void> };
	}
}

dotenv.config();

// Check environment variables
if (process.env.DISCORD_APP_ID == null) throw new Error('DISCORD_APP_ID is not set!');
if (process.env.DISCORD_BOT_TOKEN == null) throw new Error('DISCORD_BOT_TOKEN is not set!');
if (process.env.YOUTUBE_COOKIE == null) throw new Error('YOUTUBE_COOKIE is not set!');

// Client
const client = new Client({
	intents: [
		// GatewayIntentBits.AutoModerationConfiguration,
		// GatewayIntentBits.AutoModerationExecution,
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
export const player = new Player(client, {
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
