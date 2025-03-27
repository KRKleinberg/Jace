import { Player, type TrackMetadata } from '#utils/player';
import { Playlist, QueryType, Track, Util, type ExtractorSearchContext } from 'discord-player';

interface SpotifyAccessToken {
	access_token: string;
	token_type: string;
	expires_in: number;
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

const apiBaseUrl = 'https://api.spotify.com/v1';

export class SpotifyAPI {
	private _accessToken: SpotifyAccessToken | null = null;
	private _credentials: {
		clientId: string;
		clientSecret: string;
	};

	constructor(credentials: { clientId: string; clientSecret: string }) {
		this._credentials = credentials;
	}

	private async _requestAccessToken(): Promise<SpotifyAccessToken | null> {
		const response = await fetch('https://accounts.spotify.com/api/token', {
			method: 'POST',
			body: new URLSearchParams({
				'grant_type': 'client_credentials',
				'client_id': this._credentials.clientId,
				'client_secret': this._credentials.clientSecret,
			}),
		});

		if (!response.ok) {
			return (this._accessToken = null);
		}

		const body = (await response.json()) as SpotifyAccessToken;

		return (this._accessToken = body);
	}

	private _isTokenExpired() {
		if (!this._accessToken) {
			return true;
		}

		return this._accessToken.expires_in > 0;
	}

	private async _search(query: string, type: 'album' | 'playlist' | 'track') {
		if (this._isTokenExpired()) {
			await this._requestAccessToken();
		}

		if (!this._accessToken) {
			throw new Error('Spotify API Error: No Access Token');
		}

		return await fetch(`${apiBaseUrl}/search?q=${encodeURIComponent(query)}&type=${type}&market=US`, {
			headers: {
				'Authorization': `${this._accessToken.token_type} ${this._accessToken.access_token}`,
			},
		});
	}

	public async searchAlbums(query: string): Promise<SpotifyItems<SpotifySimplifiedAlbum> | null> {
		try {
			const response = await this._search(query, 'album');

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
			const response = await this._search(query, 'playlist');

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
			const response = await this._search(query, 'track');

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
			if (this._isTokenExpired()) {
				await this._requestAccessToken();
			}

			if (!this._accessToken) {
				throw new Error('Spotify API Error: No Access Token');
			}

			const albumResponse = await fetch(`${apiBaseUrl}/albums/${id}?market=US`, {
				headers: {
					'Authorization': `${this._accessToken.token_type} ${this._accessToken.access_token}`,
				},
			});

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
					const nextResponse = await fetch(next, {
						headers: {
							'Authorization': `${this._accessToken.token_type} ${this._accessToken.access_token}`,
						},
					});

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
			if (this._isTokenExpired()) {
				await this._requestAccessToken();
			}

			if (!this._accessToken) {
				throw new Error('Spotify API Error: No Access Token');
			}

			const playlistResponse = await fetch(`${apiBaseUrl}/playlists/${id}?market=US`, {
				headers: {
					'Authorization': `${this._accessToken.token_type} ${this._accessToken.access_token}`,
				},
			});

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
					const nextResponse = await fetch(next, {
						headers: {
							'Authorization': `${this._accessToken.token_type} ${this._accessToken.access_token}`,
						},
					});

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
			const playlistTrack = this.buildTrack(context, track, spotifyAlbum);

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
			const playlistTrack = this.buildTrack(context, track, track.album);

			playlistTrack.playlist = playlist;

			return playlistTrack;
		});

		return playlist;
	}

	public buildTrack(
		context: ExtractorSearchContext,
		spotifyTrack: SpotifySimplifiedTrack,
		spotifyAlbum: SpotifySimplifiedAlbum
	): Track {
		const artists = spotifyTrack.artists.map((artist) => artist.name).join(', ');
		const metadata: TrackMetadata = {
			album: {
				name: spotifyAlbum.name,
			},
		};
		const track: Track = new Track(Player, {
			title: spotifyTrack.name,
			description: `${spotifyTrack.name} by ${artists}`,
			author: artists,
			url: spotifyTrack.external_urls.spotify,
			thumbnail: spotifyAlbum.images.length
				? spotifyAlbum.images[0].url
				: 'https://www.scdn.co/i/_global/twitter_card-default.jpg',
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
