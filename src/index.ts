import { Bot } from '@utils/bot';
import { Player } from 'discord-player';
import { Client, GatewayIntentBits } from 'discord.js';
import * as dotenv from 'dotenv';
import { globby } from 'globby';

dotenv.config();

// Check environment variables
if (process.env.AWS_ACCESS_KEY_ID == null) throw new Error('AWS_ACCESS_KEY_ID is not set!');
if (process.env.AWS_SECRET_ACCESS_KEY == null) throw new Error('AWS_SECRET_ACCESS_KEY is not set!');
if (process.env.AWS_REGION == null) throw new Error('AWS_REGION is not set!');
if (process.env.DISCORD_APP_ID == null) throw new Error('DISCORD_APP_ID is not set!');
if (process.env.DISCORD_BOT_TOKEN == null) throw new Error('DISCORD_BOT_TOKEN is not set!');
if (process.env.DYNAMODB_DEFAULT_PREFS == null)
	throw new Error('DYNAMODB_DEFAULT_PREFS is not set!');
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

// Player
const player = new Player(client, {
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

for (const commandFile of commandFiles) {
	const { command }: { command: Bot.Command } = await import(commandFile);

	Bot.commands.set(command.data.name, command);
}

// Events
const eventFiles = await globby('./events/**/*.js', { cwd: './dist/' });

for (const eventFile of eventFiles) {
	const { event }: { event: Bot.Event } = await import(eventFile);

	await event.execute(client);
}

// Start
await client.login(process.env.DISCORD_BOT_TOKEN);
