interface SpotifyAccessToken {
	access_token: string;
	token_type: string;
	expires_in: number;
}

interface BaseSearchResponse {
	href: string;
	limit: number;
	next?: string;
	offset: number;
	previous?: string;
	total: number;
}

export interface SpotifyTracks extends BaseSearchResponse {
	items: SpotifySimplifiedTrack[];
}

export interface SpotifyTrackSearch extends BaseSearchResponse {
	items: SpotifyTrack[];
}

export interface SpotifyAlbumSearch extends BaseSearchResponse {
	items: SpotifySimplifiedAlbum[];
}

export interface SpotifyPlaylistSearch extends BaseSearchResponse {
	items: (SpotifySimplifiedPlaylist | null)[];
}

export interface SpotifyAlbumTracks extends BaseSearchResponse {
	items: SpotifySimplifiedTrack[];
}

export interface SpotifyPlaylistTracks extends BaseSearchResponse {
	items: SpotifyPlaylistTrack[];
}

export interface SpotifyPlaylistTrack {
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

export interface SpotifyAlbum extends SpotifySimplifiedAlbum {
	tracks: SpotifyTracks;
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

export interface SpotifyPlaylist extends SpotifySimplifiedPlaylist {
	followers: {
		href?: string;
		total: number;
	};
	tracks: {
		href: string;
		limit: number;
		next?: string;
		offset: number;
		previous?: string;
		total: number;
		items: SpotifyPlaylistTrack[];
	};
}

export interface SpotifyTrack extends SpotifySimplifiedTrack {
	album: SpotifySimplifiedAlbum;
	external_ids: {
		isrc: string;
		ean: string;
		upc: string;
	};
	popularity: number;
}

export interface SpotifySimplifiedTrack {
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

export interface SpotifySimplifiedAlbum {
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

export interface SpotifySimplifiedPlaylist {
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

export interface SpotifySimplifiedArtist {
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

	public async searchAlbums(query: string): Promise<SpotifyAlbumSearch | null> {
		try {
			const response = await this._search(query, 'album');

			if (!response.ok) {
				return null;
			}

			const data = (await response.json()) as { albums: SpotifyAlbumSearch };

			return data.albums;
		} catch {
			return null;
		}
	}

	public async searchPlaylists(query: string): Promise<SpotifyPlaylistSearch | null> {
		try {
			const response = await this._search(query, 'playlist');

			if (!response.ok) {
				return null;
			}

			const data = (await response.json()) as { playlists: SpotifyPlaylistSearch };

			return data.playlists;
		} catch {
			return null;
		}
	}

	public async searchTracks(query: string): Promise<SpotifyTrackSearch | null> {
		try {
			const response = await this._search(query, 'track');

			if (!response.ok) {
				return null;
			}

			const data = (await response.json()) as { tracks: SpotifyTrackSearch };

			return data.tracks;
		} catch {
			return null;
		}
	}

	public async getAlbum(id: string) {
		try {
			if (this._isTokenExpired()) {
				await this._requestAccessToken();
			}

			if (!this._accessToken) {
				throw new Error('Spotify API Error: No Access Token');
			}

			const response = await fetch(`${apiBaseUrl}/albums/${id}?market=US`, {
				headers: {
					'Authorization': `${this._accessToken.token_type} ${this._accessToken.access_token}`,
				},
			});

			if (!response.ok) {
				return null;
			}

			const data = (await response.json()) as SpotifyAlbum;

			return data;
		} catch {
			return null;
		}
	}

	public async getPlaylist(id: string): Promise<SpotifyPlaylist | null> {
		try {
			if (this._isTokenExpired()) {
				await this._requestAccessToken();
			}

			if (!this._accessToken) {
				throw new Error('Spotify API Error: No Access Token');
			}

			const response = await fetch(`${apiBaseUrl}/playlists/${id}?market=US`, {
				headers: {
					'Authorization': `${this._accessToken.token_type} ${this._accessToken.access_token}`,
				},
			});

			if (!response.ok) {
				return null;
			}

			const data = (await response.json()) as SpotifyPlaylist;

			return data;
		} catch {
			return null;
		}
	}
}
