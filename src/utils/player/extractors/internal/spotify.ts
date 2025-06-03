import { Player, type TrackMetadata } from '#utils/player';
import { Playlist, Track, Util, type ExtractorSearchContext } from 'discord-player';
import { parse } from 'node-html-parser';
import { Secret, TOTP } from 'otpauth';

// INTERFACES
interface SpotifyAccessToken {
	token: string;
	expiresAfter: number;
	type: 'Bearer';
}

interface SpotifyItems<
	T extends
		| SpotifySimplifiedTrack
		| SpotifySimplifiedAlbum
		| SpotifySimplifiedPlaylist
		| SpotifyPlaylistTrack
		| null,
> {
	href: string;
	limit: number;
	next?: string | null;
	offset: number;
	previous?: string;
	total: number;
	items: T[];
}

interface SpotifyPlaylistTrack {
	added_at: string;
	added_by: {
		external_urls: {
			spotify: string;
		};
		followers: {
			href?: string;
			total: number;
		};
		href: string;
		id: string;
		type: 'user';
		uri: string;
	};
	is_local: boolean;
	track: SpotifyTrack;
}

interface SpotifySimplifiedTrack {
	artists: SpotifySimplifiedArtist[];
	available_markets: string[];
	disc_number: number;
	duration_ms: number;
	explicit: boolean;
	external_urls: { spotify: string };
	href: string;
	id: string;
	is_playable: string;
	linked_from: {
		external_urls: {
			spotify: string;
		};
		href: string;
		id: string;
		type: string;
		uri: string;
	};
	restrictions: {
		reason: string;
	};
	name: string;
	preview_url?: string | null;
	track_number: number;
	type: 'track';
	uri: string;
	is_local: boolean;
}

interface SpotifyTrack extends SpotifySimplifiedTrack {
	album: SpotifySimplifiedAlbum;
	external_ids: {
		isrc: string;
		ean: string;
		upc: string;
	};
	popularity: number;
}

interface SpotifySimplifiedAlbum {
	album_type: 'album' | 'single' | 'compilation';
	total_tracks: number;
	available_markets: string[];
	external_urls: {
		spotify: string;
	};
	href: string;
	id: string;
	images: {
		url: string;
		height: number;
		width: number;
	}[];
	name: string;
	release_date: string;
	release_date_precision: 'year' | 'month' | 'day';
	restrictions: {
		reason: string;
	};
	type: 'album';
	uri: string;
	artists: SpotifySimplifiedArtist[];
}

interface SpotifyAlbum extends SpotifySimplifiedAlbum {
	tracks: SpotifyItems<SpotifySimplifiedTrack>;
	copyrights: {
		text: string;
		type: string;
	}[];
	external_ids: {
		isrc: string;
		ean: string;
		upc: string;
	};
	genres: string[];
	label: string;
	popularity: number;
}

interface SpotifySimplifiedPlaylist {
	collaborative: boolean;
	description: string;
	external_urls: {
		spotify: string;
	};
	href: string;
	id: string;
	images: {
		url: string;
		height?: number;
		width?: number;
	}[];
	name: string;
	owner: {
		external_urls: {
			spotify: string;
		};
		followers: {
			href?: string;
			total: number;
		};
		href: string;
		id: string;
		type: 'user';
		uri: string;
		display_name?: string;
	};
	public: boolean;
	snapshot_id: string;
	tracks: {
		href: string;
		total: number;
	};
	type: string;
	uri: string;
}

interface SpotifyPlaylist extends SpotifySimplifiedPlaylist {
	followers: {
		href?: string;
		total: number;
	};
	tracks: SpotifyItems<SpotifyPlaylistTrack>;
}

interface SpotifySimplifiedArtist {
	external_urls: {
		spotify: string;
	};
	href: string;
	id: string;
	name: string;
	type: string;
	uri: string;
}

export class SpotifyAPI {
	private readonly base = 'https://api.spotify.com/v1';
	private readonly userAgent =
		'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36 Edg/109.0.1518.49';
	private accessToken: SpotifyAccessToken | null = null;
	private credentials?: {
		clientId?: string | undefined;
		clientSecret?: string | undefined;
	};
	private market = 'US';

	constructor(credentials?: { clientId?: string; clientSecret?: string }, market?: string) {
		if (credentials?.clientId && credentials.clientSecret) {
			this.credentials = credentials;
		}

		if (market) {
			this.market = market;
		}
	}

	/**
	 * Generates the Base64-encoded authorization key using the client ID and client secret
	 * from the credentials. This key is typically used for authentication purposes.
	 *
	 * @returns {string} The Base64-encoded authorization key if both client ID and client secret
	 * are available; otherwise, an empty string.
	 */
	private get authorizationKey(): string {
		if (this.credentials?.clientId && this.credentials.clientSecret) {
			return Buffer.from(`${this.credentials.clientId}:${this.credentials.clientSecret}`).toString(
				'base64'
			);
		} else {
			return '';
		}
	}

	/**
	 * Requests an access token from Spotify's API.
	 *
	 * Depending on whether credentials are provided, this method will either:
	 * - Fetch a token using a simple GET request (no credentials).
	 * - Fetch a token using a POST request with client credentials.
	 *
	 * The retrieved token and its expiration time are stored in the `accessToken` property.
	 *
	 * @throws {Error} If the access token cannot be retrieved.
	 */
	public async requestToken() {
		const accessTokenUrl = await this.getAccessTokenUrl();
		const fetchOptions: RequestInit = !this.credentials
			? {
					headers: {
						Referer: 'https://open.spotify.com/',
						Origin: 'https://open.spotify.com',
					},
				}
			: {
					method: 'POST',
					headers: {
						'User-Agent': this.userAgent,
						Authorization: `Basic ${this.authorizationKey}`,
						'Content-Type': 'application/x-www-form-urlencoded',
					},
					body: 'grant_type=client_credentials',
				};
		const tokenData = (await (await fetch(accessTokenUrl, fetchOptions)).json()) as {
			accessToken?: string;
			accessTokenExpirationTimestampMs?: number;
			access_token?: string;
			expires_in?: number;
		} | null;

		if (!tokenData) {
			throw new Error('SpotifyAPI Error: Failed to retrieve access token.');
		}

		this.accessToken = {
			token: (!this.credentials ? tokenData.accessToken : tokenData.access_token) ?? '',
			expiresAfter: !this.credentials
				? (tokenData.accessTokenExpirationTimestampMs ?? 0)
				: Date.now() + (tokenData.expires_in ?? 0) * 1000,
			type: 'Bearer',
		};
	}

	/**
	 * Constructs the URL used to retrieve an access token from Spotify.
	 * The URL includes query parameters specifying the reason for the request
	 * and the product type.
	 *
	 * @returns {URL} The fully constructed URL for fetching the access token.
	 */
	private buildTokenUrl(): URL {
		const baseUrl = new URL('https://open.spotify.com/get_access_token');
		baseUrl.searchParams.set('reason', 'init');
		baseUrl.searchParams.set('productType', 'web-player');
		return baseUrl;
	}

	/**
	 * Calculates a token by applying a transformation to the input hexadecimal array.
	 * Each element in the array is XORed with a value derived from its index, and the
	 * resulting array is converted into a hexadecimal string.
	 *
	 * @param hex - An array of numbers representing the hexadecimal input.
	 * @returns A `Secret` object created from the transformed hexadecimal string.
	 */
	private calculateToken(hex: number[]): Secret {
		const token = hex.map((v, i) => v ^ ((i % 33) + 9));
		const bufferToken = Buffer.from(token.join(''), 'utf8').toString('hex');
		return Secret.fromHex(bufferToken);
	}

	/**
	 * Retrieves the Spotify access token URL, either using stored credentials or by dynamically
	 * generating the required parameters through a series of network requests and calculations.
	 *
	 * @returns {Promise<string | URL>} A promise that resolves to the Spotify access token URL.
	 *
	 * @throws {Error} If the player script source cannot be found or if any network request fails.
	 *
	 * @remarks
	 * - If `this.credentials` is available, a static token URL is returned.
	 * - Otherwise, the method performs the following steps:
	 *   1. Fetches the Spotify homepage to extract the player script source.
	 *   2. Downloads the player script to parse the build version and build date.
	 *   3. Fetches the server time from Spotify's server.
	 *   4. Generates TOTP (Time-based One-Time Password) values for both client and server times.
	 *   5. Constructs a dynamic token URL with all the required query parameters.
	 *
	 * @example
	 * ```typescript
	 * const tokenUrl = await getAccessTokenUrl();
	 * console.log(tokenUrl.toString());
	 * ```
	 */
	private async getAccessTokenUrl(): Promise<string | URL> {
		if (this.credentials) {
			return 'https://accounts.spotify.com/api/token?grant_type=client_credentials';
		}

		const token = this.calculateToken([
			12, 56, 76, 33, 88, 44, 88, 33, 78, 78, 11, 66, 22, 22, 55, 69, 54,
		]);

		const spotifyHtml = await (
			await fetch('https://open.spotify.com', {
				headers: {
					'User-Agent':
						'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36',
				},
			})
		).text();
		const root = parse(spotifyHtml);
		const scriptTags = root.querySelectorAll('script');
		const playerSrc = scriptTags
			.find((v) => v.getAttribute('src')?.includes('web-player/web-player.'))
			?.getAttribute('src');
		if (!playerSrc) {
			throw new Error('SpotifyAPI Error: Could not find player script source');
		}
		const playerScript = await (
			await fetch(playerSrc, {
				headers: {
					Dnt: '1',
					Referer: 'https://open.spotify.com/',
					'User-Agent':
						'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36',
				},
			})
		).text();

		const playerVerSplit = playerScript.split('buildVer');
		const versionString = `{"buildVer"${playerVerSplit[1].split('}')[0].replace('buildDate', '"buildDate"')}}`;
		const version = JSON.parse(versionString) as { buildVer: string; buildDate: string };

		const url = this.buildTokenUrl();
		const { searchParams } = url;

		const cTime = Date.now();
		const sTime = (
			(await (
				await fetch('https://open.spotify.com/server-time', {
					headers: {
						Referer: 'https://open.spotify.com/',
						Origin: 'https://open.spotify.com',
					},
				})
			).json()) as { serverTime: number }
		).serverTime;

		const totp = new TOTP({
			secret: token,
			period: 30,
			digits: 6,
			algorithm: 'SHA1',
		});

		const totpServer = totp.generate({
			timestamp: sTime * 1e3,
		});
		const totpClient = totp.generate({
			timestamp: cTime,
		});

		searchParams.set('sTime', String(sTime));
		searchParams.set('cTime', String(cTime));
		searchParams.set('totp', totpClient);
		searchParams.set('totpServer', totpServer);
		searchParams.set('totpVer', '5');
		searchParams.set('buildVer', version.buildVer);
		searchParams.set('buildDate', version.buildDate);

		return url;
	}

	/**
	 * Checks if the current access token is expired.
	 *
	 * @returns {boolean} `true` if the access token is either not present or has expired, otherwise `false`.
	 */
	private isTokenExpired(): boolean {
		return !this.accessToken || Date.now() > this.accessToken.expiresAfter;
	}

	/**
	 * Ensures that the current token is valid by checking its expiration status.
	 * If the token is expired, it will request a new token to maintain validity.
	 *
	 * @private
	 * @async
	 * @returns {Promise<void>} A promise that resolves once the token is validated or refreshed.
	 */
	private async ensureValidToken(): Promise<void> {
		if (this.isTokenExpired()) {
			await this.requestToken();
		}
	}

	/**
	 * Fetches data from the specified Spotify API URL.
	 * Ensures that a valid access token is available before making the request.
	 *
	 * @param apiUrl - The URL of the Spotify API endpoint to fetch data from.
	 * @returns A promise that resolves to the response object from the fetch request.
	 * @throws An error if the response status is not OK or if the fetch operation fails.
	 */
	private async fetchData(apiUrl: string) {
		await this.ensureValidToken();

		const response = await fetch(apiUrl, {
			headers: {
				Authorization: `Bearer ${this.accessToken?.token ?? ''}`,
				Referer: 'https://open.spotify.com/',
				Origin: 'https://open.spotify.com',
			},
		});

		if (!response.ok) {
			throw new Error(`Spotify API Error: ${response.status.toString()} ${response.statusText}`);
		}

		return response;
	}

	/**
	 * Searches the Spotify API for the specified query and type (album, playlist, or track).
	 * Automatically refreshes the access token if it is expired before making the request.
	 *
	 * @param query - The search query string to look for.
	 * @param type - The type of item to search for ('album', 'playlist', or 'track').
	 * @returns A promise that resolves with the search results from the Spotify API.
	 * @throws An error if the access token is unavailable or invalid.
	 */
	private async search(query: string, type: 'album' | 'playlist' | 'track') {
		if (this.isTokenExpired()) {
			await this.requestToken();
		}

		if (!this.accessToken) {
			throw new Error('Spotify API Error: No Access Token');
		}

		return await this.fetchData(
			`${this.base}/search?q=${encodeURIComponent(query)}&type=${type}${this.market ? `&market=${this.market}` : ''}`
		);
	}

	/**
	 * Searches for albums on Spotify based on the provided query string.
	 *
	 * @param query - The search query string used to find albums.
	 * @returns A promise that resolves to a `SpotifyItems<SpotifySimplifiedAlbum>` object containing the search results,
	 *          or `null` if the search fails or no results are found.
	 */
	public async searchAlbums(query: string): Promise<SpotifyItems<SpotifySimplifiedAlbum> | null> {
		try {
			const response = await this.search(query, 'album');

			const data = (await response.json()) as { albums: SpotifyItems<SpotifySimplifiedAlbum> };

			return data.albums;
		} catch (error) {
			console.error('Spotify Album Search Error -', error);

			return null;
		}
	}

	/**
	 * Searches for playlists on Spotify based on the provided query string.
	 *
	 * @param query - The search query string used to find playlists.
	 * @returns A promise that resolves to a `SpotifyItems` object containing
	 *          `SpotifySimplifiedPlaylist` items or `null` if the search fails
	 *          or no playlists are found.
	 *
	 * @throws This method does not throw errors directly; it catches and handles
	 *         any exceptions internally, returning `null` in case of failure.
	 */
	public async searchPlaylists(
		query: string
	): Promise<SpotifyItems<SpotifySimplifiedPlaylist | null> | null> {
		try {
			const response = await this.search(query, 'playlist');

			const data = (await response.json()) as {
				playlists: SpotifyItems<SpotifySimplifiedPlaylist | null>;
			};

			return data.playlists;
		} catch (error) {
			console.error('Spotify Playlist Search Error -', error);

			return null;
		}
	}

	/**
	 * Searches for tracks on Spotify based on the provided query string.
	 *
	 * @param query - The search query string to look for tracks.
	 * @returns A promise that resolves to a `SpotifyItems<SpotifyTrack>` object containing the search results,
	 *          or `null` if the search fails or no results are found.
	 */
	public async searchTracks(query: string): Promise<SpotifyItems<SpotifyTrack> | null> {
		try {
			const response = await this.search(query, 'track');

			const data = (await response.json()) as { tracks: SpotifyItems<SpotifyTrack> };

			return data.tracks;
		} catch (error) {
			console.error('Spotify Track Search Error -', error);

			return null;
		}
	}

	/**
	 * Retrieves a Spotify album by its ID.
	 *
	 * @param id - The unique identifier of the Spotify album. If not provided, the method returns `null`.
	 * @returns A `Promise` that resolves to a `SpotifyAlbum` object if the album is successfully retrieved,
	 *          or `null` if the album does not exist, the ID is not provided, or an error occurs.
	 *
	 * @remarks
	 * - If the access token is expired, the method will attempt to request a new token before proceeding.
	 * - The method fetches all tracks in the album, including those on subsequent pages, by following the `next` links.
	 * - If any error occurs during the process, the method will return `null`.
	 *
	 * @throws An error if the access token is missing and cannot be retrieved.
	 */
	public async getAlbum(id?: string): Promise<SpotifyAlbum | null> {
		if (!id) {
			return null;
		}

		try {
			if (this.isTokenExpired()) {
				await this.requestToken();
			}

			if (!this.accessToken) {
				throw new Error('Spotify API Error: No Access Token');
			}

			const albumResponse = await this.fetchData(
				`${this.base}/albums/${id}${this.market ? `?market=${this.market}` : ''}`
			);

			const album = (await albumResponse.json()) as SpotifyAlbum;

			if (!album.tracks.items.length) {
				return null;
			}

			let next = album.tracks.next;

			while (typeof next === 'string') {
				try {
					const nextResponse = await this.fetchData(next);
					const nextPage = (await nextResponse.json()) as SpotifyItems<SpotifySimplifiedTrack>;

					album.tracks.items.push(...nextPage.items);

					next = nextPage.next;

					if (!next) {
						break;
					}
				} catch {
					break;
				}
			}

			return album;
		} catch (error) {
			console.error('Spotify Album Error -', error);

			return null;
		}
	}

	/**
	 * Retrieves a Spotify playlist by its ID.
	 *
	 * @param id - The unique identifier of the Spotify playlist. If not provided, the method returns `null`.
	 * @returns A `Promise` that resolves to a `SpotifyPlaylist` object if the playlist is successfully retrieved,
	 *          or `null` if the playlist does not exist, the ID is not provided, or an error occurs.
	 *
	 * @remarks
	 * - If the access token is expired, the method will attempt to request a new token before proceeding.
	 * - The method fetches all tracks in the playlist, including those on subsequent pages, by following the `next` links.
	 * - If any error occurs during the process, the method will return `null`.
	 *
	 * @throws An error if the access token is missing and cannot be retrieved.
	 */
	public async getPlaylist(id?: string): Promise<SpotifyPlaylist | null> {
		if (!id) {
			return null;
		}

		try {
			if (this.isTokenExpired()) {
				await this.requestToken();
			}

			if (!this.accessToken) {
				throw new Error('Spotify API Error: No Access Token');
			}

			const playlistResponse = await this.fetchData(
				`${this.base}/playlists/${id}${this.market ? `?market=${this.market}` : ''}`
			);

			const playlist = (await playlistResponse.json()) as SpotifyPlaylist;

			if (!playlist.tracks.items.length) {
				return null;
			}

			let next = playlist.tracks.next;

			while (typeof next === 'string') {
				try {
					const nextResponse = await this.fetchData(next);
					const nextPage = (await nextResponse.json()) as SpotifyItems<SpotifyPlaylistTrack>;

					playlist.tracks.items.push(...nextPage.items);

					next = nextPage.next;

					if (!next) {
						break;
					}
				} catch {
					break;
				}
			}

			return playlist;
		} catch (error) {
			console.error('Spotify Playlist Error -', error);

			return null;
		}
	}

	/**
	 * Retrieves a Spotify track by its ID.
	 *
	 * @param id - The unique identifier of the Spotify track. If not provided, the method returns `null`.
	 * @returns A promise that resolves to a `SpotifyTrack` object if the track is found, or `null` if the track
	 *          is not found, the ID is not provided, or an error occurs.
	 * @throws An error if the Spotify API access token is unavailable and cannot be refreshed.
	 */
	public async getTrack(id?: string): Promise<SpotifyTrack | null> {
		if (!id) {
			return null;
		}

		try {
			if (this.isTokenExpired()) {
				await this.requestToken();
			}

			if (!this.accessToken) {
				throw new Error('Spotify API Error: No Access Token');
			}

			const trackResponse = await this.fetchData(
				`${this.base}/tracks/${id}${this.market ? `?market=${this.market}` : ''}`
			);

			const track = (await trackResponse.json()) as SpotifyTrack;

			return track;
		} catch (error) {
			console.error('Spotify Track Error -', error);

			return null;
		}
	}

	/**
	 * Builds a `Playlist` object from a Spotify album.
	 *
	 * @param context - The context for the extractor search, providing additional metadata or configuration.
	 * @param spotifyAlbum - The Spotify album object containing album details such as name, artists, images, tracks, and URLs.
	 * @returns A `Playlist` object representing the Spotify album, including its metadata and tracks.
	 */
	public buildAlbum(context: ExtractorSearchContext, spotifyAlbum: SpotifyAlbum): Playlist {
		const artists = spotifyAlbum.artists.map((artist) => artist.name).join(', ');
		const playlist = new Playlist(Player, {
			title: spotifyAlbum.name,
			description: `${spotifyAlbum.name} by ${artists}`,
			thumbnail: spotifyAlbum.images[0].url || 'https://www.scdn.co/i/_global/twitter_card-default.jpg',
			type: 'album',
			source: 'spotify',
			author: {
				name: artists,
				url: spotifyAlbum.artists[0].external_urls.spotify,
			},
			tracks: [],
			id: spotifyAlbum.id,
			url: spotifyAlbum.external_urls.spotify,
			rawPlaylist: spotifyAlbum,
		});

		playlist.tracks = spotifyAlbum.tracks.items.map((track) => {
			const playlistTrack = this.buildTrack({ spotifyTrack: track, playlist }, context);

			playlistTrack.playlist = playlist;

			return playlistTrack;
		});

		return playlist;
	}

	/**
	 * Builds a `Playlist` object from the provided Spotify playlist data.
	 *
	 * @param context - The context for the extractor search, providing additional metadata or configuration.
	 * @param spotifyPlaylist - The Spotify playlist data to be transformed into a `Playlist` object.
	 * @returns A `Playlist` object containing metadata, tracks, and other relevant information derived from the Spotify playlist.
	 */
	public buildPlaylist(context: ExtractorSearchContext, spotifyPlaylist: SpotifyPlaylist): Playlist {
		const playlist = new Playlist(Player, {
			title: spotifyPlaylist.name,
			description: `${spotifyPlaylist.name} by ${spotifyPlaylist.owner.display_name ?? 'Unknown'}`,
			thumbnail:
				spotifyPlaylist.images[0].url || 'https://www.scdn.co/i/_global/twitter_card-default.jpg',
			type: 'playlist',
			source: 'spotify',
			author: {
				name: spotifyPlaylist.owner.display_name ?? 'Unknown',
				url: spotifyPlaylist.owner.external_urls.spotify,
			},
			tracks: [],
			id: spotifyPlaylist.id,
			url: spotifyPlaylist.external_urls.spotify,
			rawPlaylist: spotifyPlaylist,
		});

		playlist.tracks = spotifyPlaylist.tracks.items.map(({ track }) => {
			const playlistTrack = this.buildTrack({ spotifyTrack: track }, context);

			playlistTrack.playlist = playlist;

			return playlistTrack;
		});

		return playlist;
	}

	/**
	 * Builds a `Track` object using the provided Spotify track information and optional context.
	 *
	 * @param trackInfo - An object containing the Spotify track information and optional playlist details.
	 * @param trackInfo.spotifyTrack - The Spotify track, which can be either a full `SpotifyTrack` or a simplified `SpotifySimplifiedTrack`.
	 * @param trackInfo.playlist - (Optional) The playlist containing the track, used for additional metadata like title or thumbnail.
	 * @param context - (Optional) The search context, which may include the user who requested the track.
	 * @returns A `Track` object populated with metadata derived from the Spotify track and playlist information.
	 */
	public buildTrack(
		trackInfo:
			| { spotifyTrack: SpotifyTrack }
			| {
					spotifyTrack: SpotifySimplifiedTrack;
					playlist: Playlist;
			  },
		context?: ExtractorSearchContext
	): Track;
	public buildTrack(
		trackInfo: {
			spotifyTrack: SpotifyTrack | SpotifySimplifiedTrack;
			playlist?: Playlist;
		},
		context?: ExtractorSearchContext
	): Track {
		const artists = trackInfo.spotifyTrack.artists.map((artist) => artist.name).join(', ');
		const metadata: TrackMetadata = {
			album: {
				name:
					'album' in trackInfo.spotifyTrack ? trackInfo.spotifyTrack.album.name : trackInfo.playlist?.title,
			},
		};
		const track: Track = new Track(Player, {
			title: trackInfo.spotifyTrack.name,
			description: `${trackInfo.spotifyTrack.name} by ${artists}`,
			author: artists,
			url: trackInfo.spotifyTrack.external_urls.spotify,
			thumbnail:
				('album' in trackInfo.spotifyTrack
					? trackInfo.spotifyTrack.album.images[0].url
					: trackInfo.playlist?.thumbnail) ?? 'https://www.scdn.co/i/_global/twitter_card-default.jpg',
			duration: Util.formatDuration(trackInfo.spotifyTrack.duration_ms),
			requestedBy: context?.requestedBy,
			source: 'spotify',
			metadata,
			// eslint-disable-next-line @typescript-eslint/require-await
			requestMetadata: async () => metadata,
		});

		return track;
	}
}
