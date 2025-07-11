import { Player, type PlayerSearchSource } from '#utils/player';
import type { ExtractorExecutionContext } from 'discord-player';
import {
	AppleMusicExtractor as AMExtractor,
	type AppleMusicExtractorInit,
} from 'discord-player-applemusic';

// CLASSES
export class AppleMusicExtractor extends AMExtractor {
	public priority = 30;
	public searchSource: PlayerSearchSource = {
		id: this.identifier,
		streamable: false,
	};

	constructor(context: ExtractorExecutionContext, options?: AppleMusicExtractorInit) {
		super(context, options);

		Player.searchSources.push(this.searchSource);
	}

	public async activate(): Promise<void> {
		await super.activate();

		this.protocols = ['applemusic', 'am'];
	}
}

// FUNCTIONS
export async function registerAppleMusic() {
	if (Player.extractors.get(AppleMusicExtractor.identifier)) {
		await Player.extractors.unregister(AppleMusicExtractor.identifier);
	}

	return await Player.extractors.register(AppleMusicExtractor, {});
}
