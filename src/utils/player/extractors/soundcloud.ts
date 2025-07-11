import { Player, type PlayerSearchSource } from '#utils/player/index';
import type { ExtractorExecutionContext } from 'discord-player';
import {
	SoundcloudExtractor as SCExtractor,
	type SoundcloudExtractorInit,
} from 'discord-player-soundcloud';

// CLASSES
export class SoundcloudExtractor extends SCExtractor {
	public priority = 20;
	public searchSource: PlayerSearchSource = {
		id: this.identifier,
		streamable: true,
	};

	constructor(context: ExtractorExecutionContext, options?: SoundcloudExtractorInit) {
		super(context, options);

		Player.searchSources.push(this.searchSource);
	}

	public async activate(): Promise<void> {
		await super.activate();

		this.protocols = ['soundcloud', 'sc'];
	}
}

// FUNCTIONS
export async function registerSoundcloud() {
	if (Player.extractors.get(SoundcloudExtractor.identifier)) {
		await Player.extractors.unregister(SoundcloudExtractor.identifier);
	}

	return await Player.extractors.register(SoundcloudExtractor, {});
}
