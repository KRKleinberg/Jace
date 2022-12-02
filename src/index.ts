import { globby } from 'globby';
import { Player } from 'discord-player';
import { Client, Collection, GatewayIntentBits } from 'discord.js';
import * as dotenv from 'dotenv';
// import pm2 from 'pm2';
import play from 'play-dl';

dotenv.config();

// Check environment variables
if (!process.env.APP_ID) throw new Error('APP_ID environment variable is not set!');
if (!process.env.COOKIE) throw new Error('COOKIE environment variable is not set!');
if (!process.env.DJS_TOKEN) throw new Error('DJS_TOKEN environment variable is not set!');
// if (!process.env.HEROKU_BRANCH) throw new Error('HEROKU_BRANCH environment variable is not set!');
if (!process.env.ID_TOKEN) throw new Error('ID_TOKEN environment variable is not set!');
if (!process.env.PREFIX) throw new Error('PREFIX environment variable is not set!');

// Client
export const client = new Client({
	intents: [
		GatewayIntentBits.DirectMessageReactions,
		GatewayIntentBits.DirectMessageTyping,
		GatewayIntentBits.DirectMessages,
		GatewayIntentBits.GuildBans,
		GatewayIntentBits.GuildEmojisAndStickers,
		GatewayIntentBits.GuildIntegrations,
		GatewayIntentBits.GuildInvites,
		GatewayIntentBits.GuildMembers,
		GatewayIntentBits.GuildMessageReactions,
		GatewayIntentBits.GuildMessageTyping,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.GuildPresences,
		GatewayIntentBits.GuildScheduledEvents,
		GatewayIntentBits.GuildVoiceStates,
		GatewayIntentBits.GuildWebhooks,
		GatewayIntentBits.Guilds,
		GatewayIntentBits.MessageContent,
	],
});

// Events
(async () => {
	const eventFiles = await globby('./events/**/*.js', { cwd: './dist/' });

	eventFiles.forEach((value) => import(value));
})();

// Prefix Commands
export const prefixCommands: Collection<string, any> = new Collection();

(async () => {
	const prefixCommandFiles = await globby('./commands/prefix/**/*.js', { cwd: './dist/' });

	prefixCommandFiles.forEach(async (value) => {
		const { default: prefixCommand } = await import(value);

		const splitted = value.split('/');

		const directory = splitted[splitted.length - 2];

		const properties = { directory, ...prefixCommand };

		prefixCommands.set(prefixCommand.data.name, properties);
	});
})();

// Slash Commands
export const slashCommands: Collection<string, any> = new Collection();

export const slashCommandArray: any[] = [];

(async () => {
	const slashCommandFiles = await globby('./commands/slash/**/*.js', { cwd: './dist/' });

	slashCommandFiles.forEach(async (value) => {
		const { default: slashCommand } = await import(value);

		slashCommands.set(slashCommand.data.name, slashCommand);

		slashCommandArray.push(slashCommand.data);
	});
})();

// Player
export const player = new Player(client, {
	ytdlOptions: {
		requestOptions: {
			headers: {
				cookie: process.env.COOKIE,
				'x-youtube-identity-token': process.env.ID_TOKEN,
			},
		},
		quality: 'highestaudio',
		filter: 'audioonly',
		highWaterMark: 1 << 25,
		dlChunkSize: 0,
	},
	connectionTimeout: 5000,
});

// Play-dl
play.setToken({
	youtube: {
		cookie: process.env.COOKIE!,
	},
	soundcloud: {
		client_id: await play.getFreeClientID(),
	},
});

// JaceDevBot Timeout
/* if (process.env.HEROKU_BRANCH === 'dev') {
	setTimeout(() => {
		pm2.stop('jace-bot', (err) => {
			if (err) throw err;
		});
	}, 300000);
} */

// Start
client.login(process.env.DJS_TOKEN);

