import { Player, type PlayerSearchSource } from '#utils/player';
import type { Track } from 'discord-player';
import {
	DeezerExtractor,
	NodeDecryptor,
	buildTrackFromSearch,
	search,
} from 'discord-player-deezer';
import type { Readable } from 'stream';

export * as Deezer from '#utils/player/extractors/deezer';

// VARIABLES
export let extractor: DeezerExtractor | null;

const priority = 10;

const searchSource: PlayerSearchSource = {
	name: 'deezer',
	modifiers: ['-deezer', '-dz'],
	streamable: true,
	searchEngine: `ext:${DeezerExtractor.identifier}`,
};

// FUNCTIONS
export async function registerExtractor() {
	if (!process.env.DEEZER_ARL) {
		throw new Error('Missing DEEZER_ARL environment variable');
	}
	if (!process.env.DEEZER_KEY) {
		throw new Error('Missing DEEZER_KEY environment variable');
	}

	if (extractor) {
		await Player.extractors.unregister(extractor);
	}

	extractor = await Player.extractors.register(DeezerExtractor, {
		arl: process.env.DEEZER_ARL,
		decryptionKey: process.env.DEEZER_KEY,
		decryptor: NodeDecryptor,
	});

	if (extractor) {
		extractor.priority = priority;

		Player.searchSources.push(searchSource);
	}

	return extractor;
}

export async function bridgeTrack(track: Track) {
	if (track.queryType?.includes('appleMusic') || track.queryType?.includes('spotify')) {
		if (!extractor) {
			throw new Error('Deezer extractor is not registered');
		}

		const trackTitle = track.cleanTitle.split(' (with ')[0];
		let deezerTrack: Track | undefined;

		try {
			const searchParams = [`track:"${trackTitle}"`, `artist:"${track.author}"`];

			if (track.durationMS) {
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
						(searchResult) =>
							searchResult.cleanTitle === trackTitle &&
							searchResult.author.includes(track.author.split(', ')[0].split(' & ')[0])
					) ?? searchResults.find((searchResult) => searchResult.cleanTitle === trackTitle);
			}
		} catch {
			// No results, do nothing
		}
		try {
			if (!deezerTrack) {
				const searchParams = [
					`track:"${trackTitle}"`,
					`artist:"${track.author.split(', ')[0].split(' & ')[0]}"`,
				];
				const searchResults = buildTrackFromSearch(
					await search(searchParams.join(' '), 5),
					Player,
					track.requestedBy
				);

				if (searchParams.length) {
					deezerTrack =
						searchResults.find(
							(searchResult) =>
								searchResult.cleanTitle === trackTitle &&
								searchResult.author.includes(track.author.split(', ')[0].split(' & ')[0])
						) ??
						searchResults.find((searchResult) => searchResult.cleanTitle === trackTitle) ??
						searchResults[0];
				}
			}
		} catch {
			// No results, do nothing
		}
		try {
			if (!deezerTrack) {
				const searchParams = [trackTitle];
				const searchResults = buildTrackFromSearch(
					await search(searchParams.join(' '), 1),
					Player,
					track.requestedBy
				);

				if (searchParams.length) {
					deezerTrack = searchResults[0];
				}
			}
		} catch {
			// No results, do nothing
		}

		if (deezerTrack) {
			const stream = await extractor.stream(deezerTrack);

			track.bridgedExtractor = extractor;
			track.bridgedTrack = deezerTrack;

			if (!track.durationMS) {
				track.duration = deezerTrack.duration;
			}

			return stream as Readable;
		}
	}

	return null;
}
