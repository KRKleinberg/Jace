import { isUrl } from '#utils/helpers';
import { Player, type PlayerSearchSource, type TrackMetadata } from '#utils/player';
import { SpotifyAPI } from '#utils/player/extractors/internal/spotify';
import {
	BaseExtractor,
	ExtractorExecutionContext,
	GuildQueueHistory,
	Track,
	useHistory,
	type ExtractorExecutionResult,
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

		this.internal = new SpotifyAPI(
			{ clientId: options.clientId, clientSecret: options.clientSecret },
			options.market
		);

		Player.searchSources.push(this.searchSource);
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	public async activate(): Promise<void> {
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

	/**
	 * @deprecated Spotify API no longer supports the recommendations endpoint.
	 *
	 * Retrieves related tracks based on the provided track and the guild's queue history.
	 * This method uses Spotify's recommendation system to fetch similar tracks.
	 *
	 * @param _track - The current track for which related tracks are being fetched.
	 * @param history - The guild's queue history containing previously played tracks.
	 * @returns A promise that resolves to an `ExtractorInfo` object containing the related tracks.
	 *
	 * @throws Will log an error if there is an issue with fetching recommendations from Spotify.
	 */
	public async getRelatedTracks(_track: Track, history: GuildQueueHistory): Promise<ExtractorInfo> {
		try {
			const ids = history.tracks.toArray().reduce((trackIds: string[], track: Track) => {
				const { id } = this.parse(track.url);

				if (!(track.metadata as TrackMetadata | null | undefined)?.skipped && id && trackIds.length < 5) {
					trackIds.push(id);
				}

				return trackIds;
			}, []);

			// eslint-disable-next-line @typescript-eslint/no-deprecated
			const spotifyTracks = await this.internal.getRecommendations(ids, 1);

			if (spotifyTracks?.length) {
				const track = this.internal.buildTrack({ spotifyTrack: spotifyTracks[0] });
				const trackMetadata = track.metadata as TrackMetadata | null | undefined;

				track.setMetadata({ ...trackMetadata, isAutoplay: true });

				return this.createResponse(null, [track]);
			}
		} catch (error) {
			console.error('Spotify Autoplay Error:', error);
		}

		return this.createResponse();
	}

	public async stream(track: Track): Promise<ExtractorStreamable> {
		if (this._stream) {
			const stream = await this._stream(track.url, track);

			return stream;
		}

		let bridge: ExtractorExecutionResult<ExtractorStreamable> | undefined;

		try {
			bridge = await this.context.requestBridge(track);
		} catch {
			const trackMetadata = track.metadata as TrackMetadata | null | undefined;

			if (trackMetadata?.isAutoplay) {
				for (let attempt = 0; attempt < 3; attempt++) {
					try {
						const history = useHistory(track.queue);

						if (!history) {
							throw new Error('No track history available');
						}

						// eslint-disable-next-line @typescript-eslint/no-deprecated
						const recommendations = await this.getRelatedTracks(track, history);

						if (recommendations.tracks.length > 0) {
							bridge = await this.context.requestBridge(recommendations.tracks[0]);
						}

						break;
					} catch (error) {
						if (attempt === 2) {
							console.error('Spotify Autoplay Error -', error);
						}
					}
				}
			}
		}

		if (!bridge?.result) {
			throw new Error(`No stream found for "${track.cleanTitle}" by "${track.author}"`);
		}

		return bridge.result;
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
	if (Player.extractors.get(SpotifyExtractor.identifier)) {
		await Player.extractors.unregister(SpotifyExtractor.identifier);
	}

	return await Player.extractors.register(SpotifyExtractor, {
		clientId: process.env.SPOTIFY_CLIENT_ID,
		clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
	});
}
