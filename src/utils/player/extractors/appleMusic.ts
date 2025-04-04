import { Player, type PlayerSearchSource } from '#utils/player';
import { ExtractorExecutionContext, QueryType } from 'discord-player';
import {
	AppleMusicExtractor as AMExtractor,
	type AppleMusicExtractorInit,
} from 'discord-player-applemusic';

// CLASSES
export class AppleMusicExtractor extends AMExtractor {
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

// FUNCTIONS
export async function registerAppleMusic() {
	if (Player.extractors.get(AppleMusicExtractor.identifier)) {
		await Player.extractors.unregister(AppleMusicExtractor.identifier);
	}

	return await Player.extractors.register(AppleMusicExtractor, {});
}
