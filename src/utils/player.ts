import { App } from '#utils/app';
import { createNumberedList } from '#utils/helpers';
import {
	AppleMusicExtractor,
	SoundCloudExtractor,
	SpotifyExtractor,
} from '@discord-player/extractor';
import {
	type BaseExtractor,
	type ExtractorResolvable,
	type GuildNodeCreateOptions,
	type GuildQueue,
	Player,
	QueryType,
	type SearchOptions,
	type SearchResult,
	type Track,
	type TrackSource,
	useMainPlayer,
} from 'discord-player';
import { buildTrackFromSearch, DeezerExtractor, searchOneTrack } from 'discord-player-deezer';
import { YoutubeiExtractor } from 'discord-player-youtubei';
import { EmbedBuilder } from 'discord.js';
import { type Readable } from 'stream';

export * as Player from '#utils/player';

interface StreamSource {
	name: string;
	searchQueryType: (typeof QueryType)[keyof typeof QueryType];
	replaceRegExp: string | RegExp;
	trackSource: TrackSource;
}

export const globalQueueOptions: Omit<GuildNodeCreateOptions, 'metadata' | 'volume'> = {
	selfDeaf: true,
	leaveOnEmpty: true,
	leaveOnEmptyCooldown: 5000,
	leaveOnEnd: true,
	leaveOnEndCooldown: 300000,
};
const streamSources = (): StreamSource[] => {
	const player = useMainPlayer();
	const streamSources: StreamSource[] = [
		{
			name: 'Apple Music',
			searchQueryType: QueryType.APPLE_MUSIC_SEARCH,
			replaceRegExp: / apple music/gi,
			trackSource: 'apple_music',
		},
		{
			name: 'SoundCloud',
			searchQueryType: QueryType.SOUNDCLOUD_SEARCH,
			replaceRegExp: / soundcloud/gi,
			trackSource: 'soundcloud',
		},
		{
			name: 'Spotify',
			searchQueryType: QueryType.SPOTIFY_SEARCH,
			replaceRegExp: / spotify/gi,
			trackSource: 'spotify',
		},
	];

	if (player.extractors.get(YoutubeiExtractor.identifier)) {
		streamSources.push({
			name: 'YouTube',
			searchQueryType: QueryType.YOUTUBE_SEARCH,
			replaceRegExp: / youtube/gi,
			trackSource: 'youtube',
		});
	}

	return streamSources;
};

export function createPlayEmbed(queue: GuildQueue, track: Track, lyrics?: string[]) {
	const ctx: App.CommandContext = queue.metadata as App.CommandContext;
	const progressBar = queue.node.createProgressBar({
		length: track.duration.length <= 5 ? 24 : 22,
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
async function initializeExtractors() {
	const player = useMainPlayer();

	if (process.env.DEEZER_KEY) {
		await player.extractors.register(DeezerExtractor, {
			decryptionKey: process.env.DEEZER_KEY,
		});
	}
	/* if (process.env.YOUTUBE_COOKIE && process.env.YOUTUBE_OAUTH) {
		await client.extractors.register(YoutubeiExtractor, {
			authentication: process.env.YOUTUBE_OAUTH,
			cookie: process.env.YOUTUBE_COOKIE,
		});
	} */

	await player.extractors.register(SoundCloudExtractor, {});
	await player.extractors.register(AppleMusicExtractor, {
		async createStream(ext, _url, track) {
			const deezerExtractor = player.extractors.get(DeezerExtractor.identifier);
			const youtubeiExtractor = player.extractors.get(YoutubeiExtractor.identifier);
			const soundcloudExtractor = player.extractors.get(SoundCloudExtractor.identifier);
			const bridgeExtractor = deezerExtractor ?? youtubeiExtractor ?? soundcloudExtractor;

			if (!bridgeExtractor) {
				throw new Error('No suitable extractors are registered to bridge from');
			}

			return requestBridgeFrom(track, ext, bridgeExtractor);
		},
	});
	await player.extractors.register(SpotifyExtractor, {
		async createStream(ext, url) {
			const deezerExtractor = player.extractors.get(DeezerExtractor.identifier);
			const youtubeiExtractor = player.extractors.get(YoutubeiExtractor.identifier);
			const soundcloudExtractor = player.extractors.get(SoundCloudExtractor.identifier);
			const bridgeExtractor = deezerExtractor ?? youtubeiExtractor ?? soundcloudExtractor;

			if (!bridgeExtractor) {
				throw new Error('No suitable extractors are registered to bridge from');
			}

			const searchResults = await player.search(url, { searchEngine: 'spotifySong' });

			return requestBridgeFrom(searchResults.tracks[0], ext, bridgeExtractor);
		},
	});
}
export async function initializePlayer() {
	new Player(App.client);

	await initializeExtractors();
}
async function requestBridgeFrom(
	track: Track,
	sourceExtractor: BaseExtractor | null,
	targetExtractor: ExtractorResolvable
): Promise<Readable | string> {
	const player = useMainPlayer();

	if (
		targetExtractor instanceof DeezerExtractor &&
		player.extractors.get(DeezerExtractor.identifier)
	) {
		const deezerSearchParams = [`track:"${track.cleanTitle}"`, `artist:"${track.author}"`];

		if (track.durationMS) {
			deezerSearchParams.push(
				`dur_min:"${(track.durationMS / 1000 - 2).toString()}"`,
				`dur_max:"${(track.durationMS / 1000 + 2).toString()}"`
			);
		}

		console.log(deezerSearchParams.join(' '));

		const deezerTrack = await searchOneTrack(deezerSearchParams.join(' '));

		if (deezerTrack) {
			const tracks = buildTrackFromSearch(deezerTrack, player, track.requestedBy);

			if (tracks.length) {
				const stream = await player.extractors.requestBridgeFrom(
					tracks[0],
					sourceExtractor,
					targetExtractor
				);

				if (!stream) {
					throw new Error('Failed to create stream');
				}

				track.bridgedExtractor = targetExtractor;
				track.bridgedTrack = tracks[0];

				if (!track.durationMS) {
					track.duration = tracks[0].duration;
				}

				return stream as Readable | string;
			}
		}
	}

	const stream = await player.extractors.requestBridgeFrom(track, sourceExtractor, targetExtractor);

	if (!stream) {
		throw new Error('Failed to create stream');
	}

	return stream as Readable | string;
}

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
	async getResult(): Promise<SearchResult> {
		const player = useMainPlayer();

		return await player.search(this.query, this.searchOptions);
	}
}
