import { App, type AutocompleteInteractionContext, type CommandContext } from '#utils/app';
import { createNumberedList, trunicate } from '#utils/helpers';
import { AppleMusic } from '#utils/player/extractors/appleMusic';
import { Deezer } from '#utils/player/extractors/deezer';
import { Spotify } from '#utils/player/extractors/spotify';
import {
	Player as DiscordPlayer,
	type GuildNodeCreateOptions,
	type GuildQueue,
	type QueryExtractorSearch,
	QueryType,
	type SearchOptions,
	type SearchQueryType,
	SearchResult,
	type Track,
} from 'discord-player';
import { isUrl } from 'discord-player-deezer';
import { type ApplicationCommandOptionChoiceData, EmbedBuilder } from 'discord.js';

// TYPES
export type PlayerSearchModifier = `-${string}`;

// INTERFACES
export interface PlayerSearchType {
	name: string;
	modifiers: PlayerSearchModifier[];
	searchEngines: (SearchQueryType | QueryExtractorSearch)[];
}

export interface PlayerSearchSource {
	/** Match name with start of QueryType */
	name: string;
	modifiers: PlayerSearchModifier[];
	streamable: boolean;
	searchEngine: SearchQueryType | QueryExtractorSearch;
}

// CLASSES
class PlayerClient extends DiscordPlayer {
	public globalQueueOptions: Omit<GuildNodeCreateOptions, 'metadata' | 'volume'> = {
		selfDeaf: true,
		leaveOnEmpty: true,
		leaveOnEmptyCooldown: 5000,
		leaveOnEnd: true,
		leaveOnEndCooldown: 300_000,
		async onBeforeCreateStream(track) {
			return await Deezer.bridgeTrack(track);
		},
	};
	public searchSources: PlayerSearchSource[] = [];
	public searchTypes: PlayerSearchType[] = [
		{
			name: 'album',
			modifiers: ['-album'],
			searchEngines: [],
		},
		{
			name: 'playlist',
			modifiers: ['-playlist'],
			searchEngines: [],
		},
		{
			name: 'song',
			modifiers: ['-song'],
			searchEngines: [],
		},
	];

	public convertVolume(volume: number, convertTo: 'readable' | 'queue'): number {
		const factor = 0.1;
		const multiplier = convertTo === 'readable' ? 1 / factor : factor;

		return volume * multiplier;
	}

	public createPlayEmbed(queue: GuildQueue, track: Track, lyrics?: string[]) {
		const ctx: CommandContext = queue.metadata as CommandContext;
		const progressBar = queue.node.createProgressBar({
			length: this.getProgressBarLength(track),
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

	public createQueuedEmbed(
		queue: GuildQueue,
		searchResult: SearchResult,
		next?: boolean
	): EmbedBuilder {
		const ctx: CommandContext = queue.metadata as CommandContext;
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

	public getProgressBarLength(track?: Track): number {
		return !track || track.duration.length <= 5 ? 24 : 22;
	}

	public async initializeExtractors() {
		await Spotify.registerExtractor();
		await AppleMusic.registerExtractor();
		await Deezer.registerExtractor();

		if (!this.searchSources.some((searchSource) => searchSource.streamable)) {
			throw new Error('No streamable extractors were registered!');
		}

		console.log('Extractors initialized');
	}
}

export class PlayerSearch {
	private readonly ctx: CommandContext | AutocompleteInteractionContext;
	public readonly input: string;
	private searchType?: string;

	constructor(
		ctx: CommandContext | AutocompleteInteractionContext,
		input: string,
		searchType?: string
	) {
		this.ctx = ctx;
		this.input = input.trim();
		this.searchType = searchType;
	}

	/**
	 * Returns the user input without the requested search engine.
	 */
	get query(): string {
		let query = this.input;

		for (const searchSource of Player.searchSources) {
			for (const modifier of searchSource.modifiers) {
				if (this.input.toLowerCase().includes(modifier)) {
					query = this.input.replaceAll(modifier, '').trim();
				}
			}
		}

		for (const searchType of Player.searchTypes) {
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

		if (!isUrl(this.input)) {
			for (const searchSource of Player.searchSources) {
				for (const modifier of searchSource.modifiers) {
					if (this.input.toLowerCase().includes(modifier)) {
						searchOptions.searchEngine = searchSource.searchEngine;
					}
				}
			}

			for (const searchType of Player.searchTypes) {
				for (const modifier of searchType.modifiers) {
					if (this.input.toLowerCase().includes(modifier)) {
						this.searchType = searchType.name;
					} else if (this.searchType === 'song') {
						return searchOptions;
					}
				}
			}

			for (const searchType of Player.searchTypes) {
				if (this.searchType === searchType.name && searchType.searchEngines.length) {
					for (const searchSource of Player.searchSources) {
						const match = searchType.searchEngines.find((searchEngine) =>
							searchEngine.includes(searchSource.name)
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

			const searchResults = await Player.search(this.query, this.searchOptions);

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

		return await Player.search(this.query, this.searchOptions);
	}
}

// Exports
export const Player = new PlayerClient(App);
