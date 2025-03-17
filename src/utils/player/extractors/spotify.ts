import { SpotifyAPI, type SpotifyAlbum, type SpotifyPlaylist } from '#utils/api/spotify';
import { Player, type PlayerSearchSource } from '#utils/player';
import {
	BaseExtractor,
	Playlist,
	QueryType,
	Track,
	Util,
	type ExtractorInfo,
	type ExtractorSearchContext,
	type ExtractorStreamable,
	type SearchQueryType,
} from 'discord-player';
import type { Readable } from 'stream';

export * as Spotify from '#utils/player/extractors/spotify';

// VARIABLES
export let extractor: SpotifyExtractor | null;

const priority = 30;

const searchSource: PlayerSearchSource = {
	name: 'spotify',
	modifiers: ['-spotify', '-sp'],
	streamable: false,
	searchEngine: QueryType.SPOTIFY_SEARCH,
};

// FUNCTIONS
export async function registerExtractor() {
	if (extractor) {
		await Player.extractors.unregister(extractor);
	}

	if (!process.env.SPOTIFY_CLIENT_ID) {
		throw new Error('Missing SPOTIFY_CLIENT_ID environment variable');
	}
	if (!process.env.SPOTIFY_CLIENT_SECRET) {
		throw new Error('Missing SPOTIFY_CLIENT_SECRET environment variable');
	}

	extractor = await Player.extractors.register(SpotifyExtractor, {
		clientId: process.env.SPOTIFY_CLIENT_ID,
		clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
	});

	if (extractor) {
		extractor.priority = priority;

		Player.searchSources.push(searchSource);
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

	return SpotifyExtractor;
}

interface SpotifyExtractorInit {
	clientId: string;
	clientSecret: string;
	createStream?: (ext: SpotifyExtractor, url: string, track: Track) => Promise<Readable | string>;
}

// CLASSES
class SpotifyExtractor extends BaseExtractor<SpotifyExtractorInit> {
	public static identifier = 'com.krkleinberg.spotifyextractor' as const;
	private _stream?: (url: string, track: Track) => Promise<Readable | string>;
	private _credentials = {
		clientId: this.options.clientId,
		clientSecret: this.options.clientSecret,
	};
	public internal = new SpotifyAPI(this._credentials);

	// eslint-disable-next-line @typescript-eslint/require-await
	public async activate(): Promise<void> {
		this.protocols = ['spsearch', 'spotify'];
		const fn = this.options.createStream;

		if (typeof fn === 'function') {
			this._stream = async (query: string, track: Track) => {
				return await fn(this, query, track);
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

				const tracks = spotifyTracks.items.map((spotifyTrack) => {
					const artists = spotifyTrack.artists.map((artist) => artist.name).join(', ');
					const track: Track = new Track(this.context.player, {
						title: spotifyTrack.name,
						description: `${spotifyTrack.name} by ${artists}`,
						author: artists || 'Unkown Artist',
						url: spotifyTrack.external_urls.spotify,
						thumbnail:
							spotifyTrack.album.images[0].url || 'https://www.scdn.co/i/_global/twitter_card-default.jpg',
						duration: Util.buildTimeCode(Util.parseMS(spotifyTrack.duration_ms || 0)),
						requestedBy: context.requestedBy,
						source: 'spotify',
						queryType: QueryType.SPOTIFY_SONG,
						metadata: {
							source: spotifyTrack,
							bridge: null,
						},
						// eslint-disable-next-line @typescript-eslint/require-await
						requestMetadata: async () => {
							return {
								source: spotifyTrack,
								bridge: null,
							};
						},
					});

					track.extractor = this;

					return track;
				});

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
					this.createResponse();
				}

				if (!spotifyAlbum) {
					return this.createResponse();
				}

				const spotifyAlbumTracks = spotifyAlbum.tracks.items;
				const artists = spotifyAlbum.artists.map((artist) => artist.name).join(', ');
				const playlist = new Playlist(this.context.player, {
					title: spotifyAlbum.name,
					description: `${spotifyAlbum.name} by ${artists}`,
					thumbnail: spotifyAlbum.images[0].url || 'https://www.scdn.co/i/_global/twitter_card-default.jpg',
					type: 'album',
					source: 'spotify',
					author: {
						name: artists || 'Unknown Artist',
						url: spotifyAlbum.artists[0].external_urls.spotify,
					},
					tracks: [],
					id: spotifyAlbum.id,
					url: spotifyAlbum.external_urls.spotify,
					rawPlaylist: spotifyAlbum,
				});

				playlist.tracks = spotifyAlbumTracks.map((spotifyTrack) => {
					const artists = spotifyTrack.artists.map((artist) => artist.name).join(', ');
					const track: Track = new Track(this.context.player, {
						title: spotifyTrack.name,
						description: `${spotifyTrack.name} by ${artists}`,
						author: artists || 'Unkown Artist',
						url: spotifyTrack.external_urls.spotify,
						thumbnail: spotifyAlbum.images[0].url || 'https://www.scdn.co/i/_global/twitter_card-default.jpg',
						duration: Util.buildTimeCode(Util.parseMS(spotifyTrack.duration_ms || 0)),
						requestedBy: context.requestedBy,
						source: 'spotify',
						queryType: QueryType.SPOTIFY_SONG,
						metadata: {
							source: spotifyTrack,
							bridge: null,
						},
						// eslint-disable-next-line @typescript-eslint/require-await
						requestMetadata: async () => {
							return {
								source: spotifyTrack,
								bridge: null,
							};
						},
					});

					track.extractor = this;
					track.playlist = playlist;

					return track;
				});

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
					this.createResponse();
				}

				if (!spotifyPlaylist) {
					return this.createResponse();
				}

				const owner = spotifyPlaylist.owner.display_name;
				const playlist = new Playlist(this.context.player, {
					title: spotifyPlaylist.name,
					description: owner ? `${spotifyPlaylist.name} by ${owner}` : spotifyPlaylist.name,
					thumbnail:
						spotifyPlaylist.images[0].url || 'https://www.scdn.co/i/_global/twitter_card-default.jpg',
					type: 'playlist',
					source: 'spotify',
					author: {
						name: owner ?? 'Unknown Artist',
						url: spotifyPlaylist.owner.external_urls.spotify,
					},
					tracks: [],
					id: spotifyPlaylist.id,
					url: spotifyPlaylist.external_urls.spotify,
					rawPlaylist: spotifyPlaylist,
				});

				const spotifyPlaylistTracks = spotifyPlaylist.tracks.items;

				playlist.tracks = spotifyPlaylistTracks.map((spotifyPlaylistTrack) => {
					const artists = spotifyPlaylistTrack.track.artists.map((artist) => artist.name).join(', ');
					const track: Track = new Track(this.context.player, {
						title: spotifyPlaylistTrack.track.name,
						description: `${spotifyPlaylistTrack.track.name} by ${artists}`,
						author: artists || 'Unkown Artist',
						url: spotifyPlaylistTrack.track.external_urls.spotify,
						thumbnail:
							spotifyPlaylist.images[0].url || 'https://www.scdn.co/i/_global/twitter_card-default.jpg',
						duration: Util.buildTimeCode(Util.parseMS(spotifyPlaylistTrack.track.duration_ms || 0)),
						requestedBy: context.requestedBy,
						source: 'spotify',
						queryType: QueryType.SPOTIFY_SONG,
						metadata: {
							source: spotifyPlaylistTrack,
							bridge: null,
						},
						// eslint-disable-next-line @typescript-eslint/require-await
						requestMetadata: async () => {
							return {
								source: spotifyPlaylistTrack,
								bridge: null,
							};
						},
					});

					track.extractor = this;
					track.playlist = playlist;

					return track;
				});

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
