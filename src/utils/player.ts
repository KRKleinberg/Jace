import { App } from '#utils/app';
import { createNumberedList } from '#utils/helpers';
import { AppleMusicExtractor, SpotifyExtractor } from '@discord-player/extractor';
import {
	type GuildNodeCreateOptions,
	type GuildQueue,
	Player,
	QueryType,
	type SearchOptions,
	type SearchQueryType,
	type SearchResult,
	type Track,
} from 'discord-player';
import {
	buildTrackFromSearch,
	DeezerExtractor,
	NodeDecryptor,
	search,
} from 'discord-player-deezer';
import { EmbedBuilder } from 'discord.js';
import { type Readable } from 'stream';

export * as Player from '#utils/player';

// INTERFACES
interface StreamSource {
	name: string;
	searchQueryType: SearchQueryType | `ext:${string}` | undefined;
	replaceRegExp: RegExp | string;
}

// VARIABLES
export const client = new Player(App.client);

export const globalQueueOptions: Omit<GuildNodeCreateOptions, 'metadata' | 'volume'> = {
	selfDeaf: true,
	leaveOnEmpty: true,
	leaveOnEmptyCooldown: 5000,
	leaveOnEnd: true,
	leaveOnEndCooldown: 300000,
	async onBeforeCreateStream(track, queryType) {
		const deezerExtractor = client.extractors.get(DeezerExtractor.identifier);

		if (queryType.includes('appleMusic') || queryType.includes('spotify')) {
			if (!deezerExtractor) {
				throw new Error('Deezer extractor is not registered');
			}

			const deezerSearchParams = [`track:"${track.cleanTitle}"`, `artist:"${track.author}"`];
			const deezerFallbackSearchParams = [
				`track:"${track.cleanTitle}"`,
				`artist:"${track.author.split(', ')[0].split(' & ')[0]}"`,
			];

			if (track.durationMS) {
				deezerSearchParams.push(
					`dur_min:"${(track.durationMS / 1000 - 2).toString()}"`,
					`dur_max:"${(track.durationMS / 1000 + 2).toString()}"`
				);
			}

			let searchResults: Track[] | undefined;
			let fallbackSearchResults: Track[] | undefined;

			try {
				searchResults = buildTrackFromSearch(
					await search(deezerSearchParams.join(' '), 5),
					client,
					track.requestedBy
				);
			} catch {
				// No results, do nothing
			}
			try {
				fallbackSearchResults = buildTrackFromSearch(
					await search(deezerFallbackSearchParams.join(' '), 5),
					client,
					track.requestedBy
				);
			} catch {
				// No results, do nothing
			}

			const deezerTrack =
				searchResults?.find(
					(searchResult) =>
						searchResult.cleanTitle === track.cleanTitle &&
						searchResult.author.includes(track.author.split(', ')[0].split(' & ')[0])
				) ??
				searchResults?.find((searchResult) => searchResult.cleanTitle === track.cleanTitle) ??
				fallbackSearchResults?.find(
					(searchResult) =>
						searchResult.cleanTitle === track.cleanTitle &&
						searchResult.author.includes(track.author.split(', ')[0].split(' & ')[0])
				) ??
				fallbackSearchResults?.find((searchResult) => searchResult.cleanTitle === track.cleanTitle) ??
				fallbackSearchResults?.[0];

			if (deezerTrack) {
				const stream = await deezerExtractor.stream(deezerTrack);

				track.bridgedExtractor = deezerExtractor;
				track.bridgedTrack = deezerTrack;

				if (!track.durationMS) {
					track.duration = deezerTrack.duration;
				}

				return stream as Readable;
			}
		}

		return null;
	},
};

export const streamSources: StreamSource[] = [
	{
		name: 'Spotify',
		searchQueryType: QueryType.SPOTIFY_SEARCH,
		replaceRegExp: / spotify/gi,
	},
	{
		name: 'Apple Music',
		searchQueryType: QueryType.APPLE_MUSIC_SEARCH,
		replaceRegExp: / apple music/gi,
	},
	{
		name: 'Deezer',
		searchQueryType: `ext:${DeezerExtractor.identifier}`,
		replaceRegExp: / deezer/gi,
	},
];

// FUNCTIONS
export function createPlayEmbed(queue: GuildQueue, track: Track, lyrics?: string[]) {
	const ctx: App.CommandContext = queue.metadata as App.CommandContext;
	const progressBar = queue.node.createProgressBar({
		length: getProgressBarLength(track),
		timecodes: false,
	});

	if (queue.isPlaying() && queue.currentTrack === track) {
		return new EmbedBuilder()
			.setColor(ctx.command.guild?.members.me?.displayHexColor ?? null)
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
			.setColor(ctx.command.guild?.members.me?.displayHexColor ?? null)
			.setAuthor({ name: 'Played', iconURL: track.requestedBy?.avatarURL() ?? undefined })
			.setTitle(track.cleanTitle)
			.setURL(track.url)
			.setDescription(`**${track.author}**`)
			.setThumbnail(track.thumbnail);
	}
}

export function convertVolume(volume: number, convertTo: 'readable' | 'queue'): number {
	const multiplier = convertTo === 'readable' ? 10 : 0.1;

	return volume * multiplier;
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
		.setColor(ctx.command.guild?.members.me?.displayHexColor ?? null)
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

export function getProgressBarLength(track?: Track): number {
	return !track || track.duration.length <= 5 ? 24 : 22;
}

export async function initializeExtractors() {
	if (!process.env.DEEZER_ARL) {
		throw new Error('Missing DEEZER_ARL environment variable');
	}
	if (!process.env.DEEZER_KEY) {
		throw new Error('Missing DEEZER_KEY environment variable');
	}

	const deezerExt = await client.extractors.register(DeezerExtractor, {
		arl: process.env.DEEZER_ARL,
		decryptionKey: process.env.DEEZER_KEY,
		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
		decryptor: NodeDecryptor,
		async createStream(track, ext) {
			console.log(track);

			return await ext.stream(track);
		},
	});
	const appleMusicExt = await client.extractors.register(AppleMusicExtractor, {});
	const spotifyExt = await client.extractors.register(SpotifyExtractor, {});

	if (deezerExt) {
		deezerExt.priority = 1;
	}
	if (appleMusicExt) {
		appleMusicExt.priority = 2;
	}
	if (spotifyExt) {
		spotifyExt.priority = 3;
	}

	console.log('Extractors initialized');
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
		for (const streamSource of streamSources) {
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
		for (const streamSource of streamSources) {
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
		};
	}

	/**
	 * Returns search result
	 */
	async getResult(): Promise<SearchResult> {
		return await client.search(this.query, this.searchOptions);
	}
}
