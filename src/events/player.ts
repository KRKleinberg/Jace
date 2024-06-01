import * as App from '@utils/app';
import { GuildQueueEvent, Util } from 'discord-player';
import {
	type AnySelectMenuInteraction,
	type CacheType,
	type ChatInputCommandInteraction,
	type Message,
} from 'discord.js';

export const event: App.Event = {
	async execute() {
		/**
		 * Debug
		 * App.player.events.on(GuildQueueEvent.debug, (_queue, message) => console.log(message));
		 */

		App.player.events.on(GuildQueueEvent.error, async (_queue, error) => {
			console.error(error);
		});

		App.player.events.on(GuildQueueEvent.playerError, async (queue, error, track) => {
			const command:
				| ChatInputCommandInteraction<CacheType>
				| AnySelectMenuInteraction
				| Message<boolean> = queue.metadata;

			console.error(error);

			try {
				if (!queue.isPlaying()) await queue.node.play();
			} catch (error) {
				console.error(error);
			}

			await App.respond(
				command,
				`⚠️ | There was an error playing **${track.cleanTitle}** by **${track.author}**`,
				{ channelSend: true }
			);
		});

		App.player.events.on(GuildQueueEvent.playerStart, async (queue, track) => {
			const command:
				| ChatInputCommandInteraction<CacheType>
				| AnySelectMenuInteraction
				| Message<boolean> = queue.metadata;

			const lyricsResult = (
				await App.player.lyrics.search({
					trackName: track.cleanTitle,
					artistName: track.author,
				})
			)[0];

			if (lyricsResult.syncedLyrics) {
				try {
					const syncedLyrics = queue.syncedLyrics(lyricsResult);
					const syncedVerses = lyricsResult.syncedLyrics
						.split('\n')
						.filter((verse) => verse.slice(11).length !== 0);
					const response = await App.respond(
						command,
						`🎵 | Playing **${track.cleanTitle}** by **${track.author}**\n———\n${syncedVerses[0].slice(11)}\n${syncedVerses[1].slice(11)}`,
						{
							channelSend: true,
						}
					);

					syncedLyrics.onChange(async (currentVerse, timestamp) => {
						try {
							const currentVerseIndex = syncedVerses.findIndex((verse) =>
								verse.includes(`${Util.formatDuration(timestamp)}.${timestamp.toString().slice(-2)}`)
							);

							const lyrics = [
								currentVerseIndex !== syncedVerses.length - 1
									? `**${currentVerse}**`
									: syncedVerses[currentVerseIndex - 1].slice(11),
								currentVerseIndex !== syncedVerses.length - 1
									? syncedVerses[currentVerseIndex + 1].slice(11)
									: `**${currentVerse}**`,
							];

							if (currentVerseIndex === syncedVerses.length - 1)
								setTimeout(
									async () => await response.edit(`🎵 | Playing **${track.cleanTitle}** by **${track.author}**`),
									10_000
								);

							await response.edit(
								`🎵 | Playing **${track.cleanTitle}** by **${track.author}**\n———\n${lyrics.join('\n')}`
							);
						} catch (err) {
							await response.edit(`🎵 | Playing **${track.cleanTitle}** by **${track.author}**`);
						}
					});

					syncedLyrics.subscribe();
				} catch (err) {
					// Do nothing.
				}
			} else
				await App.respond(command, `🎵 | Playing **${track.cleanTitle}** by **${track.author}**`, {
					channelSend: true,
				});
		});
	},
};
