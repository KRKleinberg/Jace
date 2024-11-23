import * as App from '@utils/app';
import { YoutubeiExtractor } from 'discord-player-youtubei';
import { globby } from 'globby';

// Check environment variables
for (const envKey of Object.keys(new App.EnvKeys()))
	if (process.env[envKey] == null) throw new Error(`${envKey} is not set!`);

// Load player extractors
await App.player.extractors.loadDefault();
await App.player.extractors.register(YoutubeiExtractor, {
	authentication: process.env.YOUTUBE_COOKIE,
});

// Load commands
const commandFiles = await globby('./commands/**/*.js', { cwd: './dist/' });
for (const commandFile of commandFiles) {
	const { command }: { command: App.Command } = await import(commandFile);

	App.commands.set(command.data.name, command);
}

// Load events
const eventFiles = await globby('./events/**/*.js', { cwd: './dist/' });
for (const eventFile of eventFiles) {
	const { event }: { event: App.Event } = await import(eventFile);

	await event.execute();
}

// Start
await App.client.login(process.env.DISCORD_BOT_TOKEN);
