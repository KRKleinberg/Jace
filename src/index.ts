import { App } from '#utils/app';
import { getFilePaths } from '#utils/helpers';
import { Player } from '#utils/player';
import {
	AppleMusicExtractor,
	SoundCloudExtractor,
	SpotifyExtractor,
} from '@discord-player/extractor';
import { DeezerExtractor } from 'discord-player-deezer';
import { YoutubeiExtractor } from 'discord-player-youtubei';
import { basename } from 'path';
import { type Readable } from 'stream';

if (!process.env.DISCORD_BOT_TOKEN) {
	throw new Error('Environment variable "DISCORD_BOT_TOKEN" is not set!');
}

// Load player extractors
if (process.env.DEEZER_KEY) {
	await Player.client.extractors.register(DeezerExtractor, {
		decryptionKey: process.env.DEEZER_KEY,
	});
}
if (process.env.YOUTUBE_COOKIE != null /* && process.env.YOUTUBE_OAUTH*/) {
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
		const soundcloudExtractor = Player.client.extractors.get(SoundCloudExtractor.identifier);
		const bridgeExtractor = deezerExtractor ?? youtubeiExtractor ?? soundcloudExtractor;

		if (!bridgeExtractor) {
			throw new Error('No suitable extractors are registered to bridge from');
		}

		const stream = await Player.client.extractors.requestBridgeFrom(track, ext, bridgeExtractor);

		if (!stream) {
			throw new Error('Failed to create stream');
		}

		return stream as Readable | string;
	},
});
await Player.client.extractors.register(SpotifyExtractor, {
	async createStream(ext, url) {
		const deezerExtractor = Player.client.extractors.get(DeezerExtractor.identifier);
		const youtubeiExtractor = Player.client.extractors.get(YoutubeiExtractor.identifier);
		const soundcloudExtractor = Player.client.extractors.get(SoundCloudExtractor.identifier);
		const bridgeExtractor = deezerExtractor ?? youtubeiExtractor ?? soundcloudExtractor;

		if (!bridgeExtractor) {
			throw new Error('No suitable extractors are registered to bridge from');
		}

		const searchResults = await Player.client.search(url, { searchEngine: 'spotifySong' });
		const stream = await Player.client.extractors.requestBridgeFrom(
			searchResults.tracks[0],
			ext,
			bridgeExtractor
		);

		if (!stream) {
			throw new Error('Failed to create stream');
		}

		return stream as Readable | string;
	},
});

// Load commands
{
	const commandFiles = getFilePaths('./dist/commands/', '.js', './dist/');

	for (const commandFile of commandFiles) {
		const { command } = (await import(commandFile)) as { command: App.Command };

		const commandName =
			command.data.name || command.data.setName(basename(commandFile, '.js').toLowerCase()).name;

		App.commands.set(commandName, command);
	}
}

// Load events
{
	const eventFiles = getFilePaths('./dist/events', '.js', './dist/');

	for (const eventFile of eventFiles) {
		const { event } = (await import(eventFile)) as { event: App.Event };

		await event.run();
	}
}

await App.client.login(process.env.DISCORD_BOT_TOKEN);
