import { Player } from 'discord-player';
import {
	APIInteractionGuildMember,
	AutocompleteInteraction,
	ChatInputCommandInteraction,
	Client,
	Collection,
	GatewayIntentBits,
	Guild,
	GuildMember,
	Message,
	SlashCommandBuilder,
} from 'discord.js';
import * as dotenv from 'dotenv';
import { globby } from 'globby';
import path from 'path';
import play, { getFreeClientID } from 'play-dl';

dotenv.config();

// Check environment variables
if (!process.env.DISCORD_APP_ID) throw new Error('DISCORD_APP_ID is not set!');
if (!process.env.DISCORD_BOT_TOKEN) throw new Error('DISCORD_BOT_TOKEN is not set!');
if (!process.env.PREFIX) throw new Error('PREFIX is not set!');
if (!process.env.SPOTIFY_CLIENT_ID) throw new Error('SPOTIFY_CLIENT_ID is not set!');
if (!process.env.SPOTIFY_CLIENT_SECRET) throw new Error('SPOTIFY_CLIENT_SECRET is not set!');
if (!process.env.SPOTIFY_REFRESH_TOKEN) throw new Error('SPOTIFY_REFRESH_TOKEN is not set!');
if (!process.env.YOUTUBE_COOKIE) throw new Error('YOUTUBE_COOKIE is not set!');
if (!process.env.YOUTUBE_ID_TOKEN) throw new Error('YOUTUBE_ID_TOKEN is not set!');

// Client
export const client = new Client({
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

// Play-dl
await play.setToken({
	soundcloud: {
		client_id: await getFreeClientID(),
	},
	spotify: {
		client_id: process.env.SPOTIFY_CLIENT_ID,
		client_secret: process.env.SPOTIFY_CLIENT_SECRET,
		refresh_token: process.env.SPOTIFY_REFRESH_TOKEN,
		market: 'US',
	},
	youtube: {
		cookie: process.env.YOUTUBE_COOKIE,
	},
});

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
export const commands: Collection<
	string,
	{
		aliases?: string[];
		data: SlashCommandBuilder;
		autocomplete(interaction: AutocompleteInteraction): Promise<void>;
		execute(
			command: ChatInputCommandInteraction | Message,
			guild: Guild,
			member: GuildMember,
			args?: string[]
		): Promise<Message<boolean>>;
	}
> = new Collection();
export const commandData: SlashCommandBuilder[] = [];

const commandFiles = await globby('./commands/**/*.js', { cwd: './dist/' });
commandFiles.forEach(async (value) => {
	const { default: command } = await import(value);
	command.data.name = path.basename(value, '.js').toLowerCase();

	commands.set(command.data.name, command);

	commandData.push(command.data);
});

// Events
const eventFiles = await globby('./events/**/*.js', { cwd: './dist/' });
eventFiles.forEach((value) => import(value));

// Start
client.login(process.env.DISCORD_BOT_TOKEN);
