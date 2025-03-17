import { Player, type PlayerSearchSource } from '#utils/player';
import {
	AppleMusicExtractor as AMExtractor,
	type AppleMusicExtractorInit,
} from '@discord-player/extractor';
import { ExtractorExecutionContext, QueryType } from 'discord-player';

// CLASSES
class AppleMusicExtractor extends AMExtractor {
	public priority = 20;
	public searchSource: PlayerSearchSource = {
		name: 'appleMusic',
		modifiers: ['-applemusic', '-am'],
		streamable: false,
		searchEngine: QueryType.APPLE_MUSIC_SEARCH,
	};

	constructor(context: ExtractorExecutionContext, options?: AppleMusicExtractorInit) {
		super(context, options);

		Player.searchSources.push(this.searchSource);
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
}

// VARIABLES
export let appleMusicExtractor: AppleMusicExtractor | null;

// FUNCTIONS
export async function registerAppleMusic() {
	if (appleMusicExtractor) {
		await Player.extractors.unregister(appleMusicExtractor);
	}

	appleMusicExtractor = await Player.extractors.register(AppleMusicExtractor, {});

	return appleMusicExtractor;
}
