import { Player, type TrackMetadata } from '#utils/player';
import { Playlist, QueryType, Track, Util, type ExtractorSearchContext } from 'discord-player';
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

	private get authorizationKey() {
		if (this.credentials?.clientId && this.credentials.clientSecret) {
			return Buffer.from(`${this.credentials.clientId}:${this.credentials.clientSecret}`).toString(
				'base64'
			);
		} else {
			return '';
		}
	}

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
			throw new Error('Failed to retrieve access token.');
		}

		this.accessToken = {
			token: (!this.credentials ? tokenData.accessToken : tokenData.access_token) ?? '',
			expiresAfter: !this.credentials
				? (tokenData.accessTokenExpirationTimestampMs ?? 0)
				: Date.now() + (tokenData.expires_in ?? 0) * 1000,
			type: 'Bearer',
		};
	}

	private buildTokenUrl() {
		const baseUrl = new URL('https://open.spotify.com/get_access_token');
		baseUrl.searchParams.set('reason', 'init');
		baseUrl.searchParams.set('productType', 'web-player');
		return baseUrl;
	}

	private calculateToken(hex: number[]) {
		const token = hex.map((v, i) => v ^ ((i % 33) + 9));
		const bufferToken = Buffer.from(token.join(''), 'utf8').toString('hex');
		return Secret.fromHex(bufferToken);
	}

	private async getAccessTokenUrl() {
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
			throw new Error('Could not find player script source');
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

	private isTokenExpired() {
		return !this.accessToken || Date.now() > this.accessToken.expiresAfter;
	}

	private async ensureValidToken() {
		if (this.isTokenExpired()) {
			await this.requestToken();
		}
	}

	private async fetchData(apiUrl: string) {
		await this.ensureValidToken();
		const res = await fetch(apiUrl, {
			headers: {
				Authorization: `Bearer ${this.accessToken?.token ?? ''}`,
				Referer: 'https://open.spotify.com/',
				Origin: 'https://open.spotify.com',
			},
		});

		if (!res.ok) {
			throw new Error('Failed to fetch Spotify data.');
		}
		return res;
	}

	private async search(query: string, type: 'album' | 'playlist' | 'track') {
		if (this.isTokenExpired()) {
			await this.requestToken();
		}

		if (!this.accessToken) {
			throw new Error('Spotify API Error: No Access Token');
		}

		return await this.fetchData(
			`${this.base}/search?q=${encodeURIComponent(query)}&type=${type}&market=${this.market}`
		);
	}

	public async searchAlbums(query: string): Promise<SpotifyItems<SpotifySimplifiedAlbum> | null> {
		try {
			const response = await this.search(query, 'album');

			if (!response.ok) {
				return null;
			}

			const data = (await response.json()) as { albums: SpotifyItems<SpotifySimplifiedAlbum> };

			return data.albums;
		} catch {
			return null;
		}
	}

	public async searchPlaylists(
		query: string
	): Promise<SpotifyItems<SpotifySimplifiedPlaylist | null> | null> {
		try {
			const response = await this.search(query, 'playlist');

			if (!response.ok) {
				return null;
			}

			const data = (await response.json()) as {
				playlists: SpotifyItems<SpotifySimplifiedPlaylist | null>;
			};

			return data.playlists;
		} catch {
			return null;
		}
	}

	public async searchTracks(query: string): Promise<SpotifyItems<SpotifyTrack> | null> {
		try {
			const response = await this.search(query, 'track');

			if (!response.ok) {
				return null;
			}

			const data = (await response.json()) as { tracks: SpotifyItems<SpotifyTrack> };

			return data.tracks;
		} catch {
			return null;
		}
	}

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

			const albumResponse = await this.fetchData(`${this.base}/albums/${id}?market=US`);

			if (!albumResponse.ok) {
				return null;
			}

			const album = (await albumResponse.json()) as SpotifyAlbum;

			if (!album.tracks.items.length) {
				return null;
			}

			let next = album.tracks.next;

			while (typeof next === 'string') {
				try {
					const nextResponse = await this.fetchData(next);

					if (!nextResponse.ok) {
						break;
					}

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
		} catch {
			return null;
		}
	}

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

			const playlistResponse = await this.fetchData(`${this.base}/playlists/${id}?market=US`);

			if (!playlistResponse.ok) {
				return null;
			}

			const playlist = (await playlistResponse.json()) as SpotifyPlaylist;

			if (!playlist.tracks.items.length) {
				return null;
			}

			let next = playlist.tracks.next;

			while (typeof next === 'string') {
				try {
					const nextResponse = await this.fetchData(next);

					if (!nextResponse.ok) {
						break;
					}

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
		} catch {
			return null;
		}
	}

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

			const trackResponse = await this.fetchData(`${this.base}/tracks/${id}?market=US`);

			if (!trackResponse.ok) {
				return null;
			}

			const track = (await trackResponse.json()) as SpotifyTrack;

			return track;
		} catch {
			return null;
		}
	}

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
			const playlistTrack = this.buildTrack(context, track, playlist);

			playlistTrack.playlist = playlist;

			return playlistTrack;
		});

		return playlist;
	}

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
			const playlistTrack = this.buildTrack(context, track);

			playlistTrack.playlist = playlist;

			return playlistTrack;
		});

		return playlist;
	}

	public buildTrack(context: ExtractorSearchContext, spotifyTrack: SpotifyTrack): Track;
	public buildTrack(
		context: ExtractorSearchContext,
		spotifyTrack: SpotifySimplifiedTrack,
		playlist: Playlist
	): Track;
	public buildTrack(
		context: ExtractorSearchContext,
		spotifyTrack: SpotifyTrack | SpotifySimplifiedTrack,
		playlist?: Playlist
	): Track {
		const artists = spotifyTrack.artists.map((artist) => artist.name).join(', ');
		const metadata: TrackMetadata = {
			album: {
				name: 'album' in spotifyTrack ? spotifyTrack.album.name : playlist?.title,
			},
		};
		const track: Track = new Track(Player, {
			title: spotifyTrack.name,
			description: `${spotifyTrack.name} by ${artists}`,
			author: artists,
			url: spotifyTrack.external_urls.spotify,
			thumbnail:
				('album' in spotifyTrack ? spotifyTrack.album.images[0].url : playlist?.thumbnail) ??
				'https://www.scdn.co/i/_global/twitter_card-default.jpg',
			duration: Util.formatDuration(spotifyTrack.duration_ms),
			requestedBy: context.requestedBy,
			source: 'spotify',
			queryType: QueryType.SPOTIFY_SONG,
			metadata,
			// eslint-disable-next-line @typescript-eslint/require-await
			requestMetadata: async () => metadata,
		});

		return track;
	}
}
