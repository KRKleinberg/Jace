import { App } from '#utils/app';
import { Player } from '#utils/player';
import {
	AppleMusicExtractor,
	SoundCloudExtractor,
	SpotifyExtractor,
} from '@discord-player/extractor';
import { DeezerExtractor } from 'discord-player-deezer';
import { YoutubeiExtractor } from 'discord-player-youtubei';
import { globby } from 'globby';
import { type Readable } from 'stream';

// Check for required environment variables
for (const envKey of Object.keys(new App.ReqEnvKeys()))
	if (process.env[envKey] == null) throw new Error(`${envKey} is not set!`);

// Load player extractors
if (process.env.DEEZER_KEY) {
	await Player.client.extractors.register(DeezerExtractor, {
		decryptionKey: process.env.DEEZER_KEY,
	});
}
if (process.env.YOUTUBE_COOKIE /* && process.env.YOUTUBE_OAUTH*/) {
	await Player.client.extractors.register(YoutubeiExtractor, {
		// authentication: process.env.YOUTUBE_OAUTH,
		cookie: process.env.YOUTUBE_COOKIE,
	});
}
await Player.client.extractors.register(SoundCloudExtractor, {});
await Player.client.extractors.register(AppleMusicExtractor, {
	async createStream(ext, _url, track) {
		const deezerExtractor = Player.client.extractors.get(DeezerExtractor.identifier);
		const youtubeiExtractor = Player.client.extractors.get(YoutubeiExtractor.identifier);
		const soundcloudExtractor = Player.client.extractors.get(SoundCloudExtractor.identifier)!;
		const stream = await Player.client.extractors.requestBridgeFrom(
			track,
			ext,
			deezerExtractor ?? youtubeiExtractor ?? soundcloudExtractor
		);

		if (stream) return stream as Readable | string;

		throw new Error('Failed to create stream');
	},
});
await Player.client.extractors.register(SpotifyExtractor, {
	async createStream(ext, url) {
		const deezerExtractor = Player.client.extractors.get(DeezerExtractor.identifier);
		const youtubeiExtractor = Player.client.extractors.get(YoutubeiExtractor.identifier);
		const soundcloudExtractor = Player.client.extractors.get(SoundCloudExtractor.identifier)!;
		const searchResults = await Player.client.search(url, { searchEngine: 'spotifySong' });
		const stream = await Player.client.extractors.requestBridgeFrom(
			searchResults.tracks[0],
			ext,
			deezerExtractor ?? youtubeiExtractor ?? soundcloudExtractor
		);

		if (stream) return stream as Readable | string;

		throw new Error('Failed to create stream');
	},
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
