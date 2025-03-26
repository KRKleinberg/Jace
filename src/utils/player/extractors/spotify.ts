import { SpotifyAPI, type SpotifyAlbum, type SpotifyPlaylist } from '#utils/api/spotify';
import { Player, type PlayerSearchSource } from '#utils/player';
import {
	BaseExtractor,
	ExtractorExecutionContext,
	QueryType,
	Track,
	type ExtractorInfo,
	type ExtractorSearchContext,
	type ExtractorStreamable,
	type SearchQueryType,
} from 'discord-player';
import type { Readable } from 'stream';

// INTERFACES
interface SpotifyExtractorInit {
	clientId: string;
	clientSecret: string;
	createStream?: (ext: SpotifyExtractor, url: string, track: Track) => Promise<Readable | string>;
}

// CLASSES
export class SpotifyExtractor extends BaseExtractor<SpotifyExtractorInit> {
	public static identifier = 'com.krkleinberg.spotifyextractor' as const;
	private _stream?: (url: string, track: Track) => Promise<Readable | string>;
	public internal: SpotifyAPI;
	public priority = 30;
	public searchSource: PlayerSearchSource = {
		name: 'spotify',
		modifiers: ['-spotify', '-sp'],
		streamable: false,
		searchEngine: QueryType.SPOTIFY_SEARCH,
	};

	constructor(context: ExtractorExecutionContext, options: SpotifyExtractorInit) {
		super(context, options);

		this.internal = new SpotifyAPI({
			clientId: options.clientId,
			clientSecret: options.clientSecret,
		});

		Player.searchSources.push(this.searchSource);
		Player.searchTypes.map((searchType) => {
			if (searchType.name === 'album') {
				return searchType.searchEngines.push(QueryType.SPOTIFY_ALBUM);
			}
			if (searchType.name === 'playlist') {
				return searchType.searchEngines.push(QueryType.SPOTIFY_PLAYLIST);
			}
			if (searchType.name === 'song') {
				return searchType.searchEngines.push(QueryType.SPOTIFY_SONG);
			}
		});
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	public async activate(): Promise<void> {
		if (!this.options.clientId) {
			throw new Error('SpotifyExtractor Error: Client ID not set!');
		}

		if (!this.options.clientSecret) {
			throw new Error('SpotifyExtractor Error: Client Secret not set!');
		}

		this.protocols = ['spsearch', 'spotify'];
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
	public async validate(query: string, type?: SearchQueryType | null): Promise<boolean> {
		return (
			[
				QueryType.SPOTIFY_ALBUM,
				QueryType.SPOTIFY_PLAYLIST,
				QueryType.SPOTIFY_SONG,
				QueryType.SPOTIFY_SEARCH,
				QueryType.AUTO,
				QueryType.AUTO_SEARCH,
			] as SearchQueryType[]
		).some((t) => t === type);
	}

	public async handle(query: string, context: ExtractorSearchContext): Promise<ExtractorInfo> {
		if (context.protocol === 'spsearch') {
			context.type = QueryType.SPOTIFY_SEARCH;
		}

		switch (context.type) {
			case QueryType.AUTO:
			case QueryType.AUTO_SEARCH:
			case QueryType.SPOTIFY_SONG:
			case QueryType.SPOTIFY_SEARCH: {
				const spotifyTracks = await this.internal.searchTracks(query);

				if (!spotifyTracks) {
					return this.createResponse();
				}

				const tracks = spotifyTracks.items.map((spotifyTrack) =>
					Player.buildTrack(this.internal.buildTrackData(spotifyTrack, spotifyTrack.album), this, context)
				);

				return this.createResponse(null, tracks);
			}
			case QueryType.SPOTIFY_ALBUM: {
				const { queryType, id } = this.parse(query);
				let spotifyAlbum: SpotifyAlbum | undefined | null;

				if (queryType !== 'album') {
					const spotifyAlbums = await this.internal.searchAlbums(query);

					if (!spotifyAlbums) {
						return this.createResponse();
					}

					const spotifyAlbumId = spotifyAlbums.items.find(
						(spotifyAlbum) => spotifyAlbum.total_tracks > 1
					)?.id;

					if (!spotifyAlbumId) {
						return this.createResponse();
					}

					spotifyAlbum = await this.internal.getAlbum(spotifyAlbumId);
				} else if (id) {
					spotifyAlbum = await this.internal.getAlbum(id);
				} else {
					return this.createResponse();
				}

				if (!spotifyAlbum) {
					return this.createResponse();
				}

				const playlist = Player.buildPlaylist(this.internal.buildAlbumData(spotifyAlbum), this, context);
				return this.createResponse(playlist, playlist.tracks);
			}
			case QueryType.SPOTIFY_PLAYLIST: {
				const { queryType, id } = this.parse(query);
				let spotifyPlaylist: SpotifyPlaylist | undefined | null;

				if (queryType !== 'playlist') {
					const spotifyPlaylists = await this.internal.searchPlaylists(query);

					if (!spotifyPlaylists) {
						return this.createResponse();
					}

					const spotifyPlaylistId = spotifyPlaylists.items.find(
						(spotifyPlaylist) => spotifyPlaylist !== null
					)?.id;

					if (!spotifyPlaylistId) {
						return this.createResponse();
					}

					spotifyPlaylist = await this.internal.getPlaylist(spotifyPlaylistId);
				} else if (id) {
					spotifyPlaylist = await this.internal.getPlaylist(id);
				} else {
					return this.createResponse();
				}

				if (!spotifyPlaylist) {
					return this.createResponse();
				}

				const playlist = Player.buildPlaylist(
					this.internal.buildPlaylistData(spotifyPlaylist),
					this,
					context
				);

				return this.createResponse(playlist, playlist.tracks);
			}
			default:
				return this.createResponse();
		}
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

	public parse(query: string) {
		const regEx =
			/^(?:https:\/\/open\.spotify\.com\/(intl-([a-z]|[A-Z]){0,3}\/)?(?:user\/[A-Za-z0-9]+\/)?|spotify:)(album|playlist|track)(?:[/:])([A-Za-z0-9]+).*$/;
		const [, , , queryType, id] = regEx.exec(query) ?? [];

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
