import { App, initializeEvents } from '#utils/app';
import { createNumberedList } from '#utils/helpers';
import {
	AppleMusicExtractor,
	SoundCloudExtractor,
	SpotifyExtractor,
} from '@discord-player/extractor';
import {
	type BaseExtractor,
	type ExtractorResolvable,
	type ExtractorStreamable,
	type GuildNodeCreateOptions,
	type GuildQueue,
	Player,
	QueryType,
	type SearchOptions,
	type SearchResult,
	type Track,
	type TrackSource,
} from 'discord-player';
import { buildTrackFromSearch, DeezerExtractor, isUrl, search } from 'discord-player-deezer';
import { YoutubeiExtractor } from 'discord-player-youtubei';
import { EmbedBuilder } from 'discord.js';
import { type Readable } from 'stream';

export * as Player from '#utils/player';

// INTERFACES
interface StreamSource {
	name: string;
	searchQueryType: (typeof QueryType)[keyof typeof QueryType];
	replaceRegExp: string | RegExp;
	trackSource: TrackSource;
}

// VARIABLES
const bridgeExtractors = [DeezerExtractor, YoutubeiExtractor, SoundCloudExtractor];

export const globalQueueOptions: Omit<GuildNodeCreateOptions, 'metadata' | 'volume'> = {
	selfDeaf: true,
	leaveOnEmpty: true,
	leaveOnEmptyCooldown: 5000,
	leaveOnEnd: true,
	leaveOnEndCooldown: 300000,
};

export let client: Player;
export const progressBarLength = (track?: Track): number =>
	!track || track.duration.length <= 5 ? 24 : 22;

export const streamSources = (): StreamSource[] => {
	const streamSources: StreamSource[] = [
		{
			name: 'Apple Music',
			searchQueryType: QueryType.APPLE_MUSIC_SEARCH,
			replaceRegExp: / apple music/gi,
			trackSource: 'apple_music',
		},

		{
			name: 'Spotify',
			searchQueryType: QueryType.SPOTIFY_SEARCH,
			replaceRegExp: / spotify/gi,
			trackSource: 'spotify',
		},
	];

	if (client.extractors.get(SoundCloudExtractor.identifier)) {
		streamSources.push({
			name: 'SoundCloud',
			searchQueryType: QueryType.SOUNDCLOUD_SEARCH,
			replaceRegExp: / soundcloud/gi,
			trackSource: 'soundcloud',
		});
	}
	if (client.extractors.get(YoutubeiExtractor.identifier)) {
		streamSources.push({
			name: 'YouTube',
			searchQueryType: QueryType.YOUTUBE_SEARCH,
			replaceRegExp: / youtube/gi,
			trackSource: 'youtube',
		});
	}

	return streamSources;
};

// FUNCTIONS
export function createPlayEmbed(queue: GuildQueue, track: Track, lyrics?: string[]) {
	const ctx: App.CommandContext = queue.metadata as App.CommandContext;
	const progressBar = queue.node.createProgressBar({
		length: progressBarLength(track),
		timecodes: false,
	});

	if (queue.isPlaying() && queue.currentTrack === track) {
		return new EmbedBuilder()
			.setColor(ctx.preferences.color)
			.setAuthor({ name: 'Now Playing', iconURL: track.requestedBy?.avatarURL() ?? undefined })
			.setTitle(track.cleanTitle)
			.setURL(track.url)
			.setDescription(
				track.durationMS && progressBar
					? `${progressBar} **\`${track.duration}\`**\n\n${lyrics?.join('\n') ?? ''}`
					: (lyrics?.join('\n') ?? null)
			)
			.setThumbnail(track.thumbnail)
			.setFooter({ text: lyrics ? `\u200b\n${track.author}` : track.author });
	} else {
		return new EmbedBuilder()
			.setColor(ctx.preferences.color)
			.setAuthor({ name: 'Played', iconURL: track.requestedBy?.avatarURL() ?? undefined })
			.setTitle(track.cleanTitle)
			.setURL(track.url)
			.setDescription(`**${track.author}**`)
			.setThumbnail(track.thumbnail);
	}
}

export function createQueuedEmbed(
	queue: GuildQueue,
	searchResult: SearchResult,
	next?: boolean
): EmbedBuilder {
	const ctx: App.CommandContext = queue.metadata as App.CommandContext;
	const track = searchResult.tracks[0];
	const playlist = searchResult.playlist;
	const position = next ? (queue.size === 0 ? 0 : 1) : queue.tracks.size;

	return new EmbedBuilder()
		.setColor(ctx.preferences.color)
		.setAuthor({
			name: playlist ? 'Queued Tracks' : 'Queued Track',
			iconURL: track.requestedBy?.avatarURL() ?? undefined,
		})
		.setTitle(playlist ? playlist.title : track.cleanTitle)
		.setURL(playlist ? playlist.url : track.url)
		.setDescription(
			playlist
				? createNumberedList(
						playlist.tracks.map((track) => `[**${track.cleanTitle}**](${track.url}) by **${track.author}**`),
						4096
					)
				: `**${track.author}**`
		)
		.setThumbnail(playlist ? playlist.thumbnail : track.thumbnail)
		.setFooter(
			playlist
				? playlist.author.name
					? { text: playlist.author.name }
					: null
				: position === 0
					? { text: `▶\u2002|\u2002${track.durationMS ? track.duration : '--:--'}` }
					: { text: `${position.toString()}\u2002|\u2002${track.durationMS ? track.duration : '--:--'}` }
		);
}

export function convertVolume(volume: number, convertTo: 'readable' | 'queue'): number {
	const multiplier = convertTo === 'readable' ? 10 : 0.1;

	return volume * multiplier;
}

async function bridgeFromDeezer(
	track: Track,
	sourceExtractor: BaseExtractor | null
): Promise<ExtractorStreamable | null> {
	let deezerExtractor = client.extractors.get(DeezerExtractor.identifier);

	if (!deezerExtractor) {
		await initializeExtractors();

		deezerExtractor = client.extractors.get(DeezerExtractor.identifier);

		if (!deezerExtractor) {
			throw new Error('Deezer extractor is not registered');
		}
	}

	const deezerSearchParams = [`track:"${track.cleanTitle}"`, `artist:"${track.author}"`];

	console.log('deezerSearchParams:', deezerSearchParams);

	const deezerFallbackSearchParams = [
		`track:"${track.cleanTitle}"`,
		`artist:"${track.author.split(', ')[0].split(' & ')[0]}"`,
	];

	console.log('deezerFallbackSearchParams:', deezerFallbackSearchParams);

	if (track.durationMS) {
		deezerSearchParams.push(
			`dur_min:"${(track.durationMS / 1000 - 2).toString()}"`,
			`dur_max:"${(track.durationMS / 1000 + 2).toString()}"`
		);
	}

	console.log('deezerSearchParams:', deezerSearchParams);

	const deezerSearch = await search(deezerSearchParams.join(' '), 1);

	console.log('deezerSearch:', deezerSearch);

	const deezerTrack =
		deezerSearch.data.length &&
		deezerSearch.data[0].title === track.cleanTitle &&
		deezerSearch.data[0].artist.name.split(', ')[0].split(' & ')[0] ===
			track.author.split(', ')[0].split(' & ')[0]
			? deezerSearch
			: await search(deezerFallbackSearchParams.join(' '), 1);
	console.log('deezerTrack:', deezerTrack);

	const tracks = buildTrackFromSearch(deezerTrack, client, track.requestedBy);

	console.log('tracks:', tracks);

	if (tracks.length) {
		const stream = await client.extractors.requestBridgeFrom(
			tracks[0],
			sourceExtractor,
			deezerExtractor
		);

		console.log('stream:', stream);

		track.bridgedExtractor = deezerExtractor;
		track.bridgedTrack = tracks[0];

		if (!track.durationMS) {
			track.duration = tracks[0].duration;
		}

		console.log('track:', track);

		return stream;
	}

	return null;
}

function getBridgeExtractor() {
	const bridgeExtractor = bridgeExtractors
		.map((bridgeExtractor) => client.extractors.get(bridgeExtractor.identifier))
		.find((bridgeExtractor) => bridgeExtractor !== undefined);

	if (!bridgeExtractor) {
		throw new Error('No suitable extractors are registered to bridge from');
	}

	return bridgeExtractor;
}

export async function initializeExtractors() {
	await client.extractors.unregisterAll();

	if (process.env.DEEZER_KEY) {
		const deezerExt = await client.extractors.register(DeezerExtractor, {
			decryptionKey: process.env.DEEZER_KEY,
		});

		if (deezerExt) {
			deezerExt.priority = 0;
		}
	}
	/* if (process.env.YOUTUBE_COOKIE && process.env.YOUTUBE_OAUTH) {
		await client.extractors.register(YoutubeiExtractor, {
			authentication: process.env.YOUTUBE_OAUTH,
			cookie: process.env.YOUTUBE_COOKIE,
		});
	} */

	// await client.extractors.register(SoundCloudExtractor, {});
	const appleMusicExt = await client.extractors.register(AppleMusicExtractor, {
		async createStream(ext, _url, track) {
			const bridgeExtractor = getBridgeExtractor();

			return requestBridgeFrom(track, ext, bridgeExtractor);
		},
	});

	if (appleMusicExt) {
		appleMusicExt.priority = 1;
	}

	const spotifyExt = await client.extractors.register(SpotifyExtractor, {
		async createStream(ext, url) {
			const bridgeExtractor = getBridgeExtractor();
			const searchResults = await client.search(url, { searchEngine: 'spotifySong' });

			return requestBridgeFrom(searchResults.tracks[0], ext, bridgeExtractor);
		},
	});

	if (spotifyExt) {
		spotifyExt.priority = 2;
	}

	console.log('Extractors initialized');
}

export async function initializePlayer() {
	client = new Player(App.client);

	console.log('Player initialized');

	await initializeExtractors();

	if (App.client.isReady()) {
		await initializeEvents();
	}
}

async function requestBridgeFrom(
	track: Track,
	sourceExtractor: BaseExtractor | null,
	targetExtractor: ExtractorResolvable
): Promise<Readable | string> {
	if (targetExtractor instanceof DeezerExtractor) {
		try {
			const stream = await bridgeFromDeezer(track, sourceExtractor);

			if (!stream) {
				throw new Error('Failed to create stream');
			}

			return stream as Readable | string;
		} catch (error) {
			console.error(error);

			await initializeExtractors();

			try {
				const stream = await bridgeFromDeezer(track, sourceExtractor);

				if (!stream) {
					throw new Error('Failed to create stream');
				}

				return stream as Readable | string;
			} catch (error) {
				console.error(error);
			}
		}
	}

	const stream = await client.extractors.requestBridgeFrom(track, sourceExtractor, targetExtractor);

	if (!stream) {
		throw new Error('Failed to create stream');
	}

	return stream as Readable | string;
}

// CLASSES
export class Search {
	private readonly ctx: App.CommandContext | App.AutocompleteInteractionContext;
	private readonly input: string;

	constructor(ctx: App.CommandContext | App.AutocompleteInteractionContext, input: string) {
		this.ctx = ctx;
		this.input = input.trim();
	}

	/**
	 * Returns the user input without the requested search engine.
	 */
	get query(): string {
		for (const streamSource of streamSources()) {
			if (this.input.toLowerCase().endsWith(` ${streamSource.name.toLowerCase()}`)) {
				return this.input.replace(streamSource.replaceRegExp, '').trim();
			}
		}

		return this.input;
	}

	/**
	 * Returns the search engine the user requests.
	 */
	get searchOptions(): SearchOptions {
		for (const streamSource of streamSources()) {
			if (this.input.toLowerCase().endsWith(` ${streamSource.name.toLowerCase()}`)) {
				return {
					requestedBy: this.ctx.member.user,
					searchEngine: streamSource.searchQueryType,
					fallbackSearchEngine: QueryType.AUTO,
				};
			}
		}

		return {
			requestedBy: this.ctx.member.user,
			searchEngine: QueryType.AUTO,
			fallbackSearchEngine: this.ctx.preferences.searchEngine,
		};
	}

	/**
	 * Returns search result
	 */
	async getResult(autocomplete?: boolean): Promise<SearchResult> {
		if (autocomplete) {
			const searchOptions = this.searchOptions;

			searchOptions.searchEngine = `ext:${DeezerExtractor.identifier}`;
			searchOptions.fallbackSearchEngine = QueryType.AUTO;

			if (isUrl(this.query)) {
				searchOptions.searchEngine = QueryType.AUTO;
				searchOptions.fallbackSearchEngine = QueryType.AUTO;
			}

			return await client.search(this.query, searchOptions);
		}

		return await client.search(this.query, this.searchOptions);
	}
}
