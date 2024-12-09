export * as Player from '#utils/player';
import { App } from '#utils/app';
import { type Data } from '#utils/data';
import {
	Player,
	QueryType,
	type QueryExtractorSearch,
	type SearchOptions,
	type SearchQueryType,
	type SearchResult,
} from 'discord-player';

export class Search {
	private readonly input;
	private readonly preferences;

	constructor(
		/** User input */
		input: string,
		/** The preferences from the database */
		preferences: Required<Data.Preferences>
	) {
		this.input = input.trim();
		this.preferences = preferences;
	}

	/**
	 * Returns the user input without the requested search engine
	 */
	get query(): string {
		for (const streamSource of streamSources)
			if (this.input.toLowerCase().endsWith(` ${streamSource.name.toLowerCase()}`))
				return this.input.replace(streamSource.replaceRegExp, '').trim();

		return this.input;
	}

	/**
	 * Returns the search engine the user requests.
	 */
	get engine(): SearchOptions {
		for (const streamSource of streamSources)
			if (this.input.toLowerCase().endsWith(` ${streamSource.name.toLowerCase()}`))
				return {
					searchEngine: streamSource.searchQueryType,
					fallbackSearchEngine: QueryType.AUTO,
				};

		return {
			searchEngine: QueryType.AUTO,
			fallbackSearchEngine: this.preferences.searchEngine,
		};
	}

	/**
	 * Returns search result
	 */
	async result(): Promise<SearchResult> {
		return await client.search(this.query, this.engine);
	}
}

export const client = new Player(App.client);
export const streamSources: {
	name: string;
	searchQueryType: SearchQueryType | QueryExtractorSearch;
	replaceRegExp: string | RegExp;
	trackSource: string;
}[] = [
	{
		name: 'Apple Music',
		searchQueryType: QueryType.APPLE_MUSIC_SEARCH,
		replaceRegExp: / apple music/gi,
		trackSource: 'apple_music',
	},
	{
		name: 'SoundCloud',
		searchQueryType: QueryType.SOUNDCLOUD_SEARCH,
		replaceRegExp: / soundcloud/gi,
		trackSource: 'soundcloud',
	},
	{
		name: 'Spotify',
		searchQueryType: QueryType.SPOTIFY_SEARCH,
		replaceRegExp: / spotify/gi,
		trackSource: 'spotify',
	},
	{
		name: 'YouTube',
		searchQueryType: QueryType.YOUTUBE_SEARCH,
		replaceRegExp: / youtube/gi,
		trackSource: 'youtube',
	},
];
