import { App } from '#utils/app';
import { Player } from '#utils/player';
import {
	AppleMusicExtractor,
	SoundCloudExtractor,
	SpotifyExtractor,
} from '@discord-player/extractor';
import { YoutubeiExtractor } from 'discord-player-youtubei';
import { globby } from 'globby';

// Check environment variables
for (const envKey of Object.keys(new App.EnvKeys()))
	if (process.env[envKey] == null) throw new Error(`${envKey} is not set!`);

// Load player extractors
await Player.client.extractors.register(AppleMusicExtractor, {});
await Player.client.extractors.register(SoundCloudExtractor, {});
await Player.client.extractors.register(SpotifyExtractor, {});
await Player.client.extractors.register(YoutubeiExtractor, {
	// authentication: process.env.YOUTUBE_OAUTH,
	cookie: process.env.YOUTUBE_COOKIE,
});

// Load commands
const commandFiles = await globby('./commands/**/*.js', { cwd: './dist/' });
for (const commandFile of commandFiles) {
	const { command } = (await import(commandFile)) as { command: App.Command };

	App.commands.set(command.data.name, command);
}

// Load events
const eventFiles = await globby('./events/**/*.js', { cwd: './dist/' });
for (const eventFile of eventFiles) {
	const { event } = (await import(eventFile)) as { event: App.Event };

	await event.execute();
}

// Start
await App.client.login(process.env.DISCORD_BOT_TOKEN);
