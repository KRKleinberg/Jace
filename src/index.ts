import { globby } from 'globby';
import { Player } from 'discord-player';
import { Client, Collection, GatewayIntentBits } from 'discord.js';
import pm2 from 'pm2';

export const client: Client = new Client({
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

export const player: Player = new Player(client);

// Events
(async () => {
	const eventFiles: string[] = await globby('./events/**/*.js', { cwd: './dist/' });

	eventFiles.forEach((value) => import(value));
})();

// Prefix Commands
export const prefixCommands: Collection<string, any> = new Collection();

(async () => {
	const prefixCommandFiles: string[] = await globby('./commands/prefix/**/*.js', { cwd: './dist/' });

	prefixCommandFiles.forEach(async (value) => {
		const { default: prefixCommand } = await import(value);
		const splitted: string[] = value.split('/');
		const directory: string = splitted[splitted.length - 2];
		const properties: object = { directory, ...prefixCommand };

		prefixCommands.set(prefixCommand.data.name, properties);
	});
})();

// Slash Commands
export const slashCommands: Collection<string, any> = new Collection();
export const slashCommandArray: JSON[] = [];

(async () => {
	const slashCommandFiles: string[] = await globby('./commands/slash/**/*.js', { cwd: './dist/' });

	slashCommandFiles.forEach(async (value) => {
		const { default: slashCommand } = await import(value);

		slashCommands.set(slashCommand.data.name, slashCommand);
		slashCommandArray.push(slashCommand.data.toJSON());
	});
})();

// JaceDevBot Timeout
if (process.env.HEROKU_BRANCH === 'dev') {
	setTimeout(() => {
		pm2.stop('jace-bot', (err) => {
			if (err) throw err;
		});
	}, 300000);
}

client.login(process.env.DJS_TOKEN);
