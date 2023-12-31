import { Bot } from '@utils/bot';
import * as dotenv from 'dotenv';
import { globby } from 'globby';

// Load environment variables
dotenv.config();

// Check environment variables
for (const envKey of Object.keys(new Bot.EnvKeys()))
	if (process.env[envKey] == null) throw new Error(`${envKey} is not set!`);

// Load YouTube cookie
Bot.player.options.ytdlOptions = {
	requestOptions: {
		headers: {
			cookie: process.env.YOUTUBE_COOKIE,
		},
	},
};

// Load player extractors
await Bot.player.extractors.loadDefault();

// Load commands
const commandFiles = await globby('./commands/**/*.js', { cwd: './dist/' });
for (const commandFile of commandFiles) {
	const { command }: { command: Bot.Command } = await import(commandFile);

	Bot.commands.set(command.data.name, command);
}

// Load events
const eventFiles = await globby('./events/**/*.js', { cwd: './dist/' });
for (const eventFile of eventFiles) {
	const { event }: { event: Bot.Event } = await import(eventFile);

	await event.execute();
}

// Start
await Bot.client.login(process.env.DISCORD_BOT_TOKEN);
