import { Player } from '#utils/player';
import { AppleMusicExtractor } from '@discord-player/extractor';
import { QueryType } from 'discord-player';

export * as AppleMusic from '#utils/player/extractors/appleMusic';

// VARIABLES
export let extractor: AppleMusicExtractor | null;

const priority = 20;

const searchSource: Player.SearchSource = {
	name: 'appleMusic',
	modifiers: [' -applemusic', ' -am'],
	streamable: false,
	searchEngine: QueryType.APPLE_MUSIC_SEARCH,
};

// FUNCTIONS
export async function registerExtractor() {
	if (extractor) {
		await Player.client.extractors.unregister(extractor);
	}

	extractor = await Player.client.extractors.register(AppleMusicExtractor, {});

	if (extractor) {
		extractor.priority = priority;

		Player.searchSources.push(searchSource);
		Player.searchTypes.map((searchType) => {
			if (searchType.name === 'Album') {
				return searchType.searchEngines.push(QueryType.APPLE_MUSIC_ALBUM);
			}
			if (searchType.name === 'Playlist') {
				return searchType.searchEngines.push(QueryType.APPLE_MUSIC_PLAYLIST);
			}
			if (searchType.name === 'Song') {
				return searchType.searchEngines.push(QueryType.APPLE_MUSIC_SONG);
			}
		});
	}

	return extractor;
}
