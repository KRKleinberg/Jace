import { App } from '#utils/app';
import { createNumberedList } from '#utils/helpers';
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
} from 'discord-player';
import { buildTrackFromSearch, DeezerExtractor, searchOneTrack } from 'discord-player-deezer';
import { YoutubeiExtractor } from 'discord-player-youtubei';
import { EmbedBuilder } from 'discord.js';
import { type Readable } from 'stream';

export * as Player from '#utils/player';

export interface StreamSource {
	name: string;
	searchQueryType: (typeof QueryType)[keyof typeof QueryType];
	replaceRegExp: string | RegExp;
	/** Icon name matches TrackSource. */
	trackSource: TrackSource;
}

export const client = new Player(App.client);
export const queueOptions: Omit<GuildNodeCreateOptions, 'metadata'> = {
	selfDeaf: true,
	leaveOnEmpty: true,
	leaveOnEmptyCooldown: 5000,
	leaveOnEnd: true,
	leaveOnEndCooldown: 300000,
	volume: 50,
};
export const streamSources = (): StreamSource[] => {
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
export async function requestBridgeFrom(
	track: Track,
	sourceExtractor: BaseExtractor | null,
	targetExtractor: ExtractorResolvable
): Promise<Readable | string> {
	if (
		targetExtractor instanceof DeezerExtractor &&
		client.extractors.get(DeezerExtractor.identifier)
	) {
		const deezerSearchParams = [`track:"${track.cleanTitle}"`, `artist:"${track.author}"`];

		if (track.durationMS) {
			deezerSearchParams.push(
				`dur_min:"${(track.durationMS / 1000 - 1).toString()}"`,
				`dur_max:"${(track.durationMS / 1000 + 1).toString()}"`
			);
		}

		const deezerTrack = await searchOneTrack(deezerSearchParams.join(' '));

		if (deezerTrack) {
			const tracks = buildTrackFromSearch(deezerTrack, client, track.requestedBy);

			if (tracks.length) {
				const stream = await client.extractors.requestBridgeFrom(
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

	const stream = await client.extractors.requestBridgeFrom(track, sourceExtractor, targetExtractor);

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
		return await client.search(this.query, this.searchOptions);
	}
}
