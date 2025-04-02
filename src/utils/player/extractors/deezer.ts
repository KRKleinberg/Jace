import { Player, type PlayerSearchSource, type TrackMetadata } from '#utils/player';
import type { ExtractorExecutionContext, ExtractorStreamable, Track } from 'discord-player';
import {
	DeezerExtractor as DZExtractor,
	NodeDecryptor,
	buildTrackFromSearch,
	search,
	type DeezerExtractorOptions,
} from 'discord-player-deezer';

interface DeezerExtractorInit extends DeezerExtractorOptions {
	decryptionKey: string;
	arl: string;
}

// CLASSES
export class DeezerExtractor extends DZExtractor {
	public priority = 10;
	public searchSource: PlayerSearchSource = {
		name: 'deezer',
		modifiers: ['-deezer', '-dz'],
		streamable: true,
		searchEngine: `ext:${DeezerExtractor.identifier}`,
	};

	constructor(context: ExtractorExecutionContext, options: DeezerExtractorInit) {
		super(context, options);

		Player.searchSources.push(this.searchSource);
	}

	public async bridge(track: Track): Promise<ExtractorStreamable | null> {
		const title = track.cleanTitle.split(' (with ')[0];
		const album = (track.metadata as TrackMetadata | undefined)?.album;
		const artist = track.author.split(', ')[0].split(' & ')[0];
		let deezerTrack: Track | undefined;

		try {
			const searchParams = [`track:"${title}"`, `artist:"${artist}"`];

			if (album?.name) {
				searchParams.push(`album:"${album.name}"`);
			} else if (track.durationMS) {
				searchParams.push(
					`dur_min:"${(track.durationMS / 1_000 - 2).toString()}"`,
					`dur_max:"${(track.durationMS / 1_000 + 2).toString()}"`
				);
			}

			const searchResults = buildTrackFromSearch(
				await search(searchParams.join(' '), 5),
				Player,
				track.requestedBy
			);

			if (searchResults.length) {
				deezerTrack =
					searchResults.find(
						(searchResult) => searchResult.cleanTitle === title && searchResult.author.includes(artist)
					) ??
					searchResults.find((searchResult) => searchResult.cleanTitle === title) ??
					(searchResults[0] || buildTrackFromSearch(await search(title, 1), Player, track.requestedBy)[0]);
			}
		} catch {
			return null;
		}

		if (deezerTrack) {
			const stream = await this.stream(deezerTrack);

			track.bridgedExtractor = this;
			track.bridgedTrack = deezerTrack;

			if (!track.durationMS) {
				track.duration = deezerTrack.duration;
			}

			return stream;
		}

		return null;
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
