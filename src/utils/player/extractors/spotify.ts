import { isUrl } from '#utils/helpers';
import { Player, type PlayerSearchSource } from '#utils/player';
import { SpotifyAPI } from '#utils/player/extractors/internal/spotify';
import {
	BaseExtractor,
	ExtractorExecutionContext,
	GuildQueueHistory,
	Track,
	type ExtractorInfo,
	type ExtractorSearchContext,
	type ExtractorStreamable,
} from 'discord-player';
import type { ApplicationCommandOptionChoiceData } from 'discord.js';
import type { Readable } from 'stream';

// INTERFACES
interface SpotifyExtractorInit {
	clientId?: string;
	clientSecret?: string;
	market?: string;
	createStream?: (ext: SpotifyExtractor, url: string, track: Track) => Promise<Readable | string>;
}

// VARIABLES
const spotifyUrlRegex =
	/^(?:https:\/\/open\.spotify\.com\/(intl-([a-z]|[A-Z]){0,3}\/)?(?:user\/[A-Za-z0-9]+\/)?|spotify:)(album|playlist|track)(?:[/:])([A-Za-z0-9]+).*$/;

const spotifySongRegex =
	/^https?:\/\/(?:embed\.|open\.)(?:spotify\.com\/)(intl-([a-z]|[A-Z])+\/)?(?:track\/|\?uri=spotify:track:)((\w|-){22})(\?si=.+)?$/;

const spotifyPlaylistRegex =
	/^https?:\/\/(?:embed\.|open\.)(?:spotify\.com\/)(intl-([a-z]|[A-Z])+\/)?(?:playlist\/|\?uri=spotify:playlist:)((\w|-){22})(\?si=.+)?$/;

const spotifyAlbumRegex =
	/^https?:\/\/(?:embed\.|open\.)(?:spotify\.com\/)(intl-([a-z]|[A-Z])+\/)?(?:album\/|\?uri=spotify:album:)((\w|-){22})(\?si=.+)?$/;

// CLASSES
export class SpotifyExtractor extends BaseExtractor<SpotifyExtractorInit> {
	public static identifier = 'com.krkleinberg.spotifyextractor' as const;
	private _stream?: (url: string, track: Track) => Promise<Readable | string>;
	public internal: SpotifyAPI;
	public priority = 30;
	public searchSource: PlayerSearchSource = {
		id: this.identifier,
		streamable: false,
	};

	constructor(context: ExtractorExecutionContext, options: SpotifyExtractorInit) {
		super(context, options);

		this.internal = new SpotifyAPI();

		Player.searchSources.push(this.searchSource);
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	public async activate(): Promise<void> {
		if (!this.options.clientId) {
			throw new Error('SpotifyExtractor Error: Client ID not set!');
		}

		if (!this.options.clientSecret) {
			throw new Error('SpotifyExtractor Error: Client Secret not set!');
		}

		this.protocols = ['spotify', 'sp', 'album', 'playlist'];
		const createStream = this.options.createStream;

		if (typeof createStream === 'function') {
			this._stream = async (query: string, track: Track) => {
				return await createStream(this, query, track);
			};
		}
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	public async deactivate(): Promise<void> {
		this.protocols = [];
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	public async validate(query: string): Promise<boolean> {
		return (
			!isUrl(query) ||
			[spotifyAlbumRegex, spotifyPlaylistRegex, spotifySongRegex].some((regex) => regex.test(query))
		);
	}

	public async handle(query: string, context: ExtractorSearchContext): Promise<ExtractorInfo> {
		const { id } = this.parse(query);

		if (spotifySongRegex.test(query)) {
			const spotifyTrack = await this.internal.getTrack(id);
			if (!spotifyTrack) {
				return this.createResponse();
			}

			const track = this.internal.buildTrack({ spotifyTrack }, context);
			track.extractor = this;

			return this.createResponse(null, [track]);
		}

		if (spotifyPlaylistRegex.test(query)) {
			const spotifyPlaylist = await this.internal.getPlaylist(id);
			if (!spotifyPlaylist) {
				return this.createResponse();
			}

			const playlist = this.internal.buildPlaylist(context, spotifyPlaylist);
			return this.createResponse(playlist, playlist.tracks);
		}

		if (spotifyAlbumRegex.test(query)) {
			const spotifyAlbum = await this.internal.getAlbum(id);
			if (!spotifyAlbum) {
				return this.createResponse();
			}

			const playlist = this.internal.buildAlbum(context, spotifyAlbum);
			return this.createResponse(playlist, playlist.tracks);
		}

		switch (context.protocol) {
			case 'album': {
				const { queryType, id } = this.parse(query);

				if (queryType === 'album' && id) {
					const spotifyAlbum = await this.internal.getAlbum(id);

					if (!spotifyAlbum) {
						return this.createResponse();
					}

					const album = this.internal.buildAlbum(context, spotifyAlbum);

					return this.createResponse(album, album.tracks);
				} else {
					const spotifyAlbums = await this.internal.searchAlbums(query);

					if (!spotifyAlbums) {
						return this.createResponse();
					}

					const spotifyAlbum = await this.internal.getAlbum(
						spotifyAlbums.items.find((spotifyAlbum) => spotifyAlbum.total_tracks > 1)?.id
					);

					if (!spotifyAlbum) {
						return this.createResponse();
					}

					const album = this.internal.buildAlbum(context, spotifyAlbum);

					return this.createResponse(album, album.tracks);
				}
			}
			case 'playlist': {
				const { queryType, id } = this.parse(query);

				if (queryType === 'playlist' && id) {
					const spotifyPlaylist = await this.internal.getPlaylist(id);

					if (!spotifyPlaylist) {
						return this.createResponse();
					}

					const playlist = this.internal.buildPlaylist(context, spotifyPlaylist);

					return this.createResponse(playlist, playlist.tracks);
				} else {
					const spotifyPlaylists = await this.internal.searchPlaylists(query);

					if (!spotifyPlaylists) {
						return this.createResponse();
					}

					const spotifyPlaylist = await this.internal.getPlaylist(
						spotifyPlaylists.items.find((spotifyPlaylist) => spotifyPlaylist !== null)?.id
					);

					if (!spotifyPlaylist) {
						return this.createResponse();
					}

					const playlist = this.internal.buildPlaylist(context, spotifyPlaylist);

					return this.createResponse(playlist, playlist.tracks);
				}
			}
			default: {
				const spotifyTracks = await this.internal.searchTracks(query);

				if (!spotifyTracks) {
					return this.createResponse();
				}

				const tracks = spotifyTracks.items.map((spotifyTrack) =>
					this.internal.buildTrack({ spotifyTrack }, context)
				);

				return this.createResponse(null, tracks);
			}
		}
	}

	/**
	 * Provides autocomplete suggestions based on the given query and protocol.
	 *
	 * @param query - The search query string used to fetch suggestions.
	 * @param protocol - The type of resource to search for. Supported values are:
	 *   - `'album'`: Searches for Spotify albums.
	 *   - `'playlist'`: Searches for Spotify playlists.
	 * @returns A promise that resolves to an array of `ApplicationCommandOptionChoiceData` objects,
	 *          each representing an autocomplete suggestion. Returns an empty array if no suggestions are found.
	 */
	public async autocomplete(
		query: string,
		protocol: string
	): Promise<ApplicationCommandOptionChoiceData[]> {
		switch (protocol) {
			case 'album': {
				const spotifyAlbums = await this.internal.searchAlbums(query);

				if (spotifyAlbums) {
					const responses: ApplicationCommandOptionChoiceData[] = [];

					for (const item of spotifyAlbums.items) {
						if (responses.length >= 5) {
							break;
						}
						if (item.total_tracks > 1) {
							responses.push(
								Player.buildAutocompleteResponse(
									item.name,
									item.artists.map((artist) => artist.name).join(', '),
									item.external_urls.spotify
								)
							);
						}
					}
					return responses;
				}

				break;
			}
			case 'playlist': {
				const spotifyPlaylists = await this.internal.searchPlaylists(query);

				if (spotifyPlaylists) {
					const responses: ApplicationCommandOptionChoiceData[] = [];

					for (const item of spotifyPlaylists.items) {
						if (responses.length >= 5) {
							break;
						}
						if (item) {
							responses.push(
								Player.buildAutocompleteResponse(
									item.name,
									item.owner.display_name ?? 'Unknown',
									item.external_urls.spotify
								)
							);
						}
					}

					return responses;
				}

				break;
			}
		}

		return [];
	}

	public async getRelatedTracks(track: Track, history: GuildQueueHistory): Promise<ExtractorInfo> {
		let { id } = this.parse(track.url);

		if (!id) {
			const response = await this.internal.searchTracks(`${track.cleanTitle} - ${track.author}`);

			if (response !== null && 'id' in response) {
				id = response.items[0].id;
			}
		}

		const ids = history.tracks
			.toArray()
			.slice(1)
			.reduce(
				(trackIds: string[], track: Track) => {
					const { id } = this.parse(track.url);

					if (id) {
						trackIds.unshift(id);
					}
					if (trackIds.length > 5) {
						trackIds.shift();
					}

					return trackIds;
				},
				[id]
			);
		const spotifyTracks = await this.internal.getRecommendations(ids);
		const tracks = spotifyTracks?.map((spotifyTrack) => this.internal.buildTrack({ spotifyTrack }));

		if (tracks) {
			return this.createResponse(null, tracks);
		}

		return this.createResponse();
	}

	public async stream(track: Track): Promise<ExtractorStreamable> {
		if (this._stream) {
			const stream = await this._stream(track.url, track);

			return stream;
		}

		const stream = await this.context.requestBridge(track, this);

		if (!stream.result) {
			throw new Error('Could not bridge this track');
		}

		return stream.result;
	}

	/**
	 * Parses a Spotify URL or query string and extracts the query type and ID.
	 *
	 * @param q - The Spotify URL or query string to parse.
	 * @returns An object containing the extracted `queryType` and `id`.
	 *          - `queryType`: The type of the query (e.g., track, playlist, album).
	 *          - `id`: The unique identifier associated with the query type.
	 */
	public parse(q: string): {
		queryType: string;
		id: string;
	} {
		const [, , , queryType, id] = spotifyUrlRegex.exec(q) ?? [];
		return { queryType, id };
	}
}

// FUNCTIONS
export async function registerSpotify() {
	if (!process.env.SPOTIFY_CLIENT_ID) {
		throw new Error('Missing SPOTIFY_CLIENT_ID environment variable');
	}
	if (!process.env.SPOTIFY_CLIENT_SECRET) {
		throw new Error('Missing SPOTIFY_CLIENT_SECRET environment variable');
	}

	if (Player.extractors.get(SpotifyExtractor.identifier)) {
		await Player.extractors.unregister(SpotifyExtractor.identifier);
	}

	return await Player.extractors.register(SpotifyExtractor, {
		clientId: process.env.SPOTIFY_CLIENT_ID,
		clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
	});
}
