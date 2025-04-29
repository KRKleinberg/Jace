import { Player, type PlayerSearchSource, type TrackMetadata } from '#utils/player';
import type { ExtractorExecutionContext, ExtractorStreamable, Track } from 'discord-player';
import {
	DeezerExtractor as DZExtractor,
	NodeDecryptor,
	buildTrackFromSearch,
	search,
	type DeezerExtractorOptions,
	type DeezerSearchTrackResponse,
} from 'discord-player-deezer';

interface DeezerExtractorInit extends DeezerExtractorOptions {
	decryptionKey: string;
	arl: string;
}

// CLASSES
export class DeezerExtractor extends DZExtractor {
	public priority = 10;
	public searchSource: PlayerSearchSource = {
		id: this.identifier,
		streamable: true,
	};

	constructor(context: ExtractorExecutionContext, options: DeezerExtractorInit) {
		super(context, options);

		Player.searchSources.push(this.searchSource);
	}

	public async activate(): Promise<void> {
		await super.activate();

		this.protocols = ['deezer', 'dz'];
	}

	/**
	 * Attempts to bridge a given track to a corresponding track on Deezer and retrieves a streamable object.
	 *
	 * @param track - The track to be bridged, containing metadata such as title, author, album, and duration.
	 * @returns A promise that resolves to an `ExtractorStreamable` object if a matching track is found and streamed,
	 *          or `null` if no match is found or an error occurs during the process.
	 *
	 * @remarks
	 * - The method performs a search on Deezer using the track's title, artist, and optionally album or duration.
	 * - It prioritizes exact matches for title and artist, but falls back to other matches if necessary.
	 * - If a matching track is found, it streams the track and updates the original track's metadata with the bridged information.
	 * - If the original track lacks a duration, it is updated with the duration of the bridged track.
	 *
	 * @throws This method does not throw errors directly but will return `null` if an error occurs during the search or streaming process.
	 */
	public async bridge(track: Track): Promise<ExtractorStreamable> {
		const title = track.cleanTitle.split(' (with ')[0];
		const album = (track.metadata as TrackMetadata | null | undefined)?.album;
		const artist = track.author.split(', ')[0].split(' & ')[0];
		let deezerTrack: Track | undefined;

		const searchParams = [`track:"${title}"`, `artist:"${artist}"`];
		let deezerResults: DeezerSearchTrackResponse | undefined;

		if (album?.name) {
			searchParams.push(`album:"${album.name}"`);
		} else if (track.durationMS) {
			searchParams.push(
				`dur_min:"${(track.durationMS / 1_000 - 2).toString()}"`,
				`dur_max:"${(track.durationMS / 1_000 + 2).toString()}"`
			);
		}

		try {
			deezerResults = await search(searchParams.join(' '), 5);
		} catch {
			deezerResults = await search(`${title} ${artist}`, 5);
		}

		const searchResults = buildTrackFromSearch(deezerResults, Player, track.requestedBy);

		if (searchResults.length) {
			deezerTrack =
				searchResults.find(
					(searchResult) => searchResult.cleanTitle === title && searchResult.author.includes(artist)
				) ??
				searchResults.find((searchResult) => searchResult.cleanTitle === title) ??
				(searchResults[0] || buildTrackFromSearch(await search(title, 1), Player, track.requestedBy)[0]);
		}

		if (!deezerTrack) {
			throw new Error(`No Deezer track found for "${track.title}" by ${track.author}`);
		}

		const stream = await this.stream(deezerTrack);

		track.bridgedExtractor = this;
		track.bridgedTrack = deezerTrack;

		if (!track.durationMS) {
			track.duration = deezerTrack.duration;
		}

		return stream;
	}
}

// FUNCTIONS
export async function registerDeezer() {
	if (!process.env.DEEZER_ARL) {
		console.error('Missing DEEZER_ARL environment variable');

		return;
	}
	if (!process.env.DEEZER_KEY) {
		console.error('Missing DEEZER_KEY environment variable');

		return;
	}

	if (Player.extractors.get(DeezerExtractor.identifier)) {
		await Player.extractors.unregister(DeezerExtractor.identifier);
	}

	return await Player.extractors.register(DeezerExtractor, {
		arl: process.env.DEEZER_ARL,
		decryptionKey: process.env.DEEZER_KEY,
		decryptor: NodeDecryptor,
		reloadUserInterval: 1.44e7 /* 4 hours */,
	});
}
