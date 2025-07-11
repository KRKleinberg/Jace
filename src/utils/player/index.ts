import { App, type AutocompleteInteractionContext, type CommandContext } from '#utils/app';
import { createNumberedList, isUrl, truncate } from '#utils/helpers';
import { registerAppleMusic } from '#utils/player/extractors/appleMusic';
import { registerDeezer } from '#utils/player/extractors/deezer';
import { registerSoundcloud } from '#utils/player/extractors/soundcloud';
import { registerSpotify, SpotifyExtractor } from '#utils/player/extractors/spotify';
import {
	Player as DiscordPlayer,
	type GuildNodeCreateOptions,
	type GuildQueue,
	type SearchOptions,
	SearchResult,
	Track,
} from 'discord-player';
import { type ApplicationCommandOptionChoiceData, EmbedBuilder } from 'discord.js';

// TYPES
export type PlayerSearchModifier = `-${string}`;

// INTERFACES
export interface PlayerSearchSource {
	id: string;
	streamable: boolean;
}

export interface TrackMetadata {
	album?: {
		name?: string;
	};
	skipped?: boolean;
	isAutoplay?: boolean;
}

// CLASSES
class PlayerClient extends DiscordPlayer {
	public globalQueueOptions: Omit<GuildNodeCreateOptions, 'metadata' | 'volume'> = {
		selfDeaf: true,
		leaveOnEmpty: true,
		leaveOnEmptyCooldown: 5000,
		leaveOnEnd: true,
		leaveOnEndCooldown: 300_000,
	};
	public searchSources: PlayerSearchSource[] = [];

	/**
	 * Builds an autocomplete response for an application command option.
	 *
	 * @param title - The title of the item to be displayed in the autocomplete response.
	 * @param artist - The artist associated with the item.
	 * @param url - The URL associated with the item.
	 * @returns An object conforming to `ApplicationCommandOptionChoiceData` containing
	 *          the truncated name and value for the autocomplete response.
	 */
	public buildAutocompleteResponse(
		title: string,
		artist: string,
		url: string
	): ApplicationCommandOptionChoiceData {
		return {
			name: truncate(`${title} — ${artist}`, 100, '...'),
			value: url.length <= 100 ? url : truncate(`${title} — ${artist}`, 100, '...'),
		};
	}

	/**
	 * Converts a volume value between two representations: 'readable' and 'queue'.
	 *
	 * @param volume - The volume value to be converted.
	 * @param convertTo - Specifies the target representation for the conversion.
	 *                     - `'readable'`: Converts the volume to a human-readable format.
	 *                     - `'queue'`: Converts the volume to a queue-compatible format.
	 * @returns The converted volume value.
	 */
	public convertVolume(volume: number, convertTo: 'readable' | 'queue'): number {
		const factor = 0.1;
		const multiplier = convertTo === 'readable' ? 1 / factor : factor;

		return volume * multiplier;
	}

	/**
	 * Creates an embed message for a music player, displaying information about the currently playing
	 * or previously played track, along with optional lyrics and a progress bar.
	 *
	 * @param queue - The guild queue containing the current playback state and metadata.
	 * @param track - The track for which the embed is being created.
	 * @param lyrics - Optional array of strings representing the lyrics of the track.
	 * @returns An instance of `EmbedBuilder` containing the formatted embed message.
	 */
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
				.setFooter({
					text: lyrics ? `\u200b\n${track.author}` : track.author,
				});
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

	/**
	 * Creates an embed message for a queued track or playlist in a Discord guild queue.
	 *
	 * @param queue - The guild queue containing the metadata and tracks.
	 * @param searchResult - The search result containing the track(s) or playlist to be queued.
	 * @param next - Optional. If `true`, the track or playlist will be queued as the next item. Defaults to `false`.
	 * @returns An `EmbedBuilder` instance representing the queued track or playlist.
	 */
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

	/**
	 * Calculates the length of the progress bar based on the provided track's duration.
	 *
	 * @param track - An optional `Track` object. If no track is provided or the track's duration
	 *                length is less than or equal to 5, the progress bar length will be 24.
	 *                Otherwise, it will be 22.
	 * @returns The length of the progress bar as a number.
	 */
	public getProgressBarLength(track?: Track): number {
		return !track || track.duration.length <= 5 ? 24 : 22;
	}

	public async registerExtractors() {
		await registerSpotify();
		await registerAppleMusic();
		await registerSoundcloud();
		await registerDeezer();

		if (!this.searchSources.some((searchSource) => searchSource.streamable)) {
			throw new Error('Player Error: No streamable extractors were registered!');
		}

		console.log('Extractors initialized');
	}
}

export class PlayerSearch {
	public readonly ctx: CommandContext | AutocompleteInteractionContext;
	public readonly input: string;
	public next = false;
	public searchType?: string;
	public searchOptions: SearchOptions;

	constructor(
		ctx: CommandContext | AutocompleteInteractionContext,
		input: string,
		searchType?: string
	) {
		this.ctx = ctx;
		this.input = input.replace('next:', '').trim();
		this.searchType = searchType;
		this.searchOptions = { requestedBy: ctx.member.user };

		if (input.includes('next:')) {
			this.next = true;
		}
	}

	/**
	 * Retrieves the query string based on the input.
	 * If the input is a URL, the entire input is returned.
	 * Otherwise, it attempts to extract and return the portion of the input
	 * after the first colon (`:`), trimming any whitespace. If no colon is
	 * present, the original input is returned.
	 *
	 * @returns {string} The processed query string.
	 */
	get query(): string {
		if (isUrl(this.input)) {
			return this.input;
		}

		return this.input.split(':')[1]?.trim() ?? this.input;
	}

	/**
	 * Retrieves the protocol from the input string if applicable.
	 *
	 * The method determines the protocol based on the following conditions:
	 * - If the input is a valid URL, it returns `undefined`.
	 * - If the input contains a colon (`:`), it extracts and returns the substring
	 *   before the colon, trimmed of any whitespace.
	 * - If a `searchType` is defined, it returns the `searchType`.
	 * - Otherwise, it returns `undefined`.
	 *
	 * @returns {string | undefined} The protocol string, or `undefined` if no protocol is found.
	 */
	get protocol(): string | undefined {
		if (isUrl(this.input)) {
			return undefined;
		} else if (this.input.includes(':')) {
			return this.input.split(':')[0].trim();
		} else if (this.searchType === 'album' || this.searchType === 'playlist') {
			return this.searchType;
		}

		return undefined;
	}

	/**
	 * Retrieves search results based on the provided query and options.
	 *
	 * @param autocomplete - A boolean indicating whether to return autocomplete suggestions.
	 * @returns A promise that resolves to either:
	 * - An array of autocomplete suggestions (`ApplicationCommandOptionChoiceData[]`) if `autocomplete` is true.
	 * - A `SearchResult` object containing detailed search results if `autocomplete` is false.
	 *
	 * The method performs the following:
	 * - If `autocomplete` is true:
	 *   - Checks if the query is not a URL and a protocol is provided, then attempts to fetch autocomplete suggestions
	 *     using the Spotify extractor.
	 *   - If no results are found, performs a search using the query and protocol, returning either playlist suggestions
	 *     or the top 5 track suggestions.
	 * - If `autocomplete` is false:
	 *   - Performs a search using the query and protocol, returning the full search results.
	 */
	async getResult(autocomplete?: false): Promise<SearchResult>;
	async getResult(autocomplete?: true): Promise<ApplicationCommandOptionChoiceData[]>;
	async getResult(
		autocomplete = false
	): Promise<SearchResult | ApplicationCommandOptionChoiceData[]> {
		if (autocomplete) {
			if (!isUrl(this.query) && (this.protocol === 'album' || this.protocol === 'playlist')) {
				const spotifyExtractor = Player.extractors.get(SpotifyExtractor.identifier) as
					| SpotifyExtractor
					| undefined;

				const results = await spotifyExtractor?.autocomplete(this.query, this.protocol);

				if (results?.length) {
					return results;
				}
			}

			const searchResults = await Player.search(
				this.protocol ? `${this.protocol}:${this.query}` : this.query,
				this.searchOptions
			);

			return searchResults.playlist
				? [
						Player.buildAutocompleteResponse(
							searchResults.playlist.title,
							searchResults.playlist.author.name,
							searchResults.playlist.url
						),
					]
				: searchResults.tracks
						.slice(0, 5)
						.map((track) => Player.buildAutocompleteResponse(track.title, track.author, track.url));
		}

		return await Player.search(
			this.protocol ? `${this.protocol}:${this.query}` : this.query,
			this.searchOptions
		);
	}
}

// EXPORTS
export const Player = new PlayerClient(App);
