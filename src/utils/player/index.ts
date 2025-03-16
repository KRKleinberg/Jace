import { App } from '#utils/app';
import { createNumberedList, trunicate } from '#utils/helpers';
import { AppleMusic } from '#utils/player/extractors/appleMusic';
import { Deezer } from '#utils/player/extractors/deezer';
import { Spotify } from '#utils/player/extractors/spotify';
import {
	type GuildNodeCreateOptions,
	type GuildQueue,
	Player,
	type QueryExtractorSearch,
	QueryType,
	type SearchOptions,
	type SearchQueryType,
	SearchResult,
	type Track,
} from 'discord-player';
import { isUrl } from 'discord-player-deezer';
import { type ApplicationCommandOptionChoiceData, EmbedBuilder } from 'discord.js';

export * as Player from '#utils/player';

// TYPES
export type SearchModifier = ` -${string}`;

// INTERFACES
export interface SearchType {
	name: string;
	modifiers: SearchModifier[];
	searchEngines: (SearchQueryType | QueryExtractorSearch)[];
}

export interface SearchSource {
	/** Match name with start of QueryType */
	name: string;
	modifiers: SearchModifier[];
	streamable: boolean;
	searchEngine: SearchQueryType | QueryExtractorSearch;
}

// VARIABLES
export const client = new Player(App.client);

export const globalQueueOptions: Omit<GuildNodeCreateOptions, 'metadata' | 'volume'> = {
	selfDeaf: true,
	leaveOnEmpty: true,
	leaveOnEmptyCooldown: 5000,
	leaveOnEnd: true,
	leaveOnEndCooldown: 300_000,
	async onBeforeCreateStream(track) {
		return await Deezer.bridgeTrack(track);
	},
};

export const searchSources: SearchSource[] = [];

export const searchTypes: SearchType[] = [
	{
		name: 'album',
		modifiers: [' -album'],
		searchEngines: [QueryType.SPOTIFY_ALBUM, QueryType.APPLE_MUSIC_ALBUM],
	},
	{
		name: 'playlist',
		modifiers: [' -playlist'],
		searchEngines: [QueryType.SPOTIFY_PLAYLIST, QueryType.APPLE_MUSIC_PLAYLIST],
	},
	{
		name: 'song',
		modifiers: [' -song'],
		searchEngines: [QueryType.SPOTIFY_SONG, QueryType.APPLE_MUSIC_SONG],
	},
];

// FUNCTIONS
export function convertVolume(volume: number, convertTo: 'readable' | 'queue'): number {
	const factor = 0.1;
	const multiplier = convertTo === 'readable' ? 1 / factor : factor;

	return volume * multiplier;
}

export function createPlayEmbed(queue: GuildQueue, track: Track, lyrics?: string[]) {
	const ctx: App.CommandContext = queue.metadata as App.CommandContext;
	const progressBar = queue.node.createProgressBar({
		length: getProgressBarLength(track),
		timecodes: false,
	});

	if (queue.isPlaying() && queue.currentTrack === track) {
		return new EmbedBuilder()
			.setColor(ctx.command.guild?.members.me?.displayHexColor ?? null)
			.setAuthor({
				name: 'Now Playing',
				iconURL: track.requestedBy?.avatarURL() ?? undefined,
			})
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
			.setAuthor({
				name: 'Played',
				iconURL: track.requestedBy?.avatarURL() ?? undefined,
			})
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
					? {
							text: playlist.type === 'playlist' ? `🔀 | ${playlist.author.name}` : playlist.author.name,
						}
					: null
				: position === 0
					? { text: `▶\u2002|\u2002${track.durationMS ? track.duration : '--:--'}` }
					: {
							text: `${position.toString()}\u2002|\u2002${track.durationMS ? track.duration : '--:--'}`,
						}
		);
}

export function getProgressBarLength(track?: Track): number {
	return !track || track.duration.length <= 5 ? 24 : 22;
}

export async function initializeExtractors() {
	await Spotify.registerExtractor();
	await AppleMusic.registerExtractor();
	await Deezer.registerExtractor();

	if (!searchSources.some((searchSource) => searchSource.streamable)) {
		throw new Error('No streamable extractors were registered!');
	}

	console.log('Extractors initialized');
}

// CLASSES
export class Search {
	private readonly ctx: App.CommandContext | App.AutocompleteInteractionContext;
	private readonly input: string;
	private searchType?: string;

	constructor(
		ctx: App.CommandContext | App.AutocompleteInteractionContext,
		input: string,
		queryType?: string
	) {
		this.ctx = ctx;
		this.input = input.trim();
		this.searchType = queryType;
	}

	/**
	 * Returns the user input without the requested search engine.
	 */
	get query(): string {
		let query = this.input;

		for (const searchSource of searchSources) {
			for (const modifier of searchSource.modifiers) {
				if (this.input.toLowerCase().includes(modifier)) {
					query = this.input.replaceAll(modifier, '').trim();
				}
			}
		}

		for (const searchType of searchTypes) {
			for (const modifier of searchType.modifiers) {
				if (this.input.toLowerCase().includes(modifier)) {
					query = this.input.replaceAll(modifier, '').trim();
				}
			}
		}

		return query;
	}

	/**
	 * Returns the search engine the user requests.
	 */
	get searchOptions(): SearchOptions {
		const searchOptions: SearchOptions = {
			requestedBy: this.ctx.member.user,
			searchEngine: QueryType.AUTO,
			fallbackSearchEngine: QueryType.AUTO,
		};

		for (const searchSource of searchSources) {
			for (const modifier of searchSource.modifiers) {
				if (this.input.toLowerCase().includes(modifier)) {
					searchOptions.searchEngine = searchSource.searchEngine;
				}
			}
		}

		for (const searchType of searchTypes) {
			for (const modifier of searchType.modifiers) {
				if (
					(this.input.toLowerCase().includes(modifier) ||
						this.searchType === searchType.name.toLowerCase()) &&
					searchType.searchEngines.length
				) {
					for (const searchSource of searchSources) {
						const match = searchType.searchEngines.find((searchQueryType) =>
							searchQueryType.includes(searchSource.name)
						);

						if (
							(searchOptions.searchEngine === searchSource.searchEngine ||
								searchOptions.searchEngine === QueryType.AUTO) &&
							match
						) {
							searchOptions.searchEngine = match;

							return searchOptions;
						}
					}
				}
			}
		}

		return searchOptions;
	}

	/**
	 * Returns search result
	 */
	async getResult(autocomplete?: false): Promise<SearchResult>;
	async getResult(autocomplete?: true): Promise<ApplicationCommandOptionChoiceData[]>;
	async getResult(
		autocomplete = false
	): Promise<SearchResult | ApplicationCommandOptionChoiceData[]> {
		if (autocomplete) {
			if (!isUrl(this.query)) {
				switch (this.searchOptions.searchEngine) {
					case QueryType.SPOTIFY_ALBUM: {
						const spotifyAlbums = await Spotify.extractor?.internal.searchAlbums(this.query);

						if (spotifyAlbums) {
							return spotifyAlbums.items.reduce(
								(responses: ApplicationCommandOptionChoiceData[], spotifyAlbum) => {
									if (responses.length < 5 && spotifyAlbum.total_tracks > 1) {
										const name = spotifyAlbum.name;
										const artist = spotifyAlbum.artists.map((artist) => artist.name).join(', ');
										const url = spotifyAlbum.external_urls.spotify;

										responses.push({
											name: trunicate(artist ? `${name} — ${artist}` : name, 100, '...'),
											value: url.length <= 100 ? url : trunicate(artist ? `${name} — ${artist}` : name, 100, '...'),
										});
									}

									return responses;
								},
								[]
							);
						}

						break;
					}
					case QueryType.SPOTIFY_PLAYLIST:
						{
							const spotifyPlaylists = await Spotify.extractor?.internal.searchPlaylists(this.query);

							if (spotifyPlaylists) {
								return spotifyPlaylists.items.reduce(
									(responses: ApplicationCommandOptionChoiceData[], spotifyPlaylist) => {
										if (responses.length < 5 && spotifyPlaylist !== null) {
											const name = spotifyPlaylist.name;
											const owner = spotifyPlaylist.owner.display_name;
											const url = spotifyPlaylist.external_urls.spotify;

											responses.push({
												name: trunicate(owner ? `${name} — ${owner}` : name, 100, '...'),
												value: url.length <= 100 ? url : trunicate(owner ? `${name} — ${owner}` : name, 100, '...'),
											});
										}

										return responses;
									},
									[]
								);
							}
						}

						break;
				}
			}

			const searchResults = await client.search(this.query, this.searchOptions);

			return searchResults.playlist
				? [
						{
							name: trunicate(
								`${searchResults.playlist.title} — ${searchResults.playlist.author.name}`,
								100,
								'...'
							),
							value:
								searchResults.playlist.url.length <= 100
									? searchResults.playlist.url
									: trunicate(`${searchResults.playlist.title} — ${searchResults.playlist.author.name}`, 100),
						},
					]
				: searchResults.tracks.slice(0, 5).map((track) => ({
						name: trunicate(`${track.cleanTitle} — ${track.author}`, 100, '...'),
						value:
							track.url.length <= 100
								? track.url
								: trunicate(`${track.cleanTitle} — ${track.author}`, 100, '...'),
					}));
		}

		return await client.search(this.query, this.searchOptions);
	}
}
