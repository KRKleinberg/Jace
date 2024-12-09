import { App } from '#utils/app';
import { Player } from '#utils/player';
import { GuildQueueEvent, Util } from 'discord-player';
import {
	ChannelType,
	type AnySelectMenuInteraction,
	type ChatInputCommandInteraction,
	type Message,
} from 'discord.js';

export const event: App.Event = {
	execute() {
		/* Player.client.events.on(GuildQueueEvent.debug, (_queue, message) => {
			console.log(message);
		}); */

		Player.client.events.on(GuildQueueEvent.error, (_queue, error) => {
			console.error(error);
		});

		Player.client.events.on(GuildQueueEvent.playerError, async (queue, error, track) => {
			const command = queue.metadata as Message | ChatInputCommandInteraction | AnySelectMenuInteraction;

			if (command.channel?.type === ChannelType.GuildText) await command.channel.sendTyping();

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

		Player.client.events.on(GuildQueueEvent.playerStart, async (queue, track) => {
			const command = queue.metadata as Message | ChatInputCommandInteraction | AnySelectMenuInteraction;

			if (command.channel?.type === ChannelType.GuildText) await command.channel.sendTyping();

			const lyricsResults = await Player.client.lyrics.search({
				trackName: track.cleanTitle,
				artistName: track.author,
			});
			const lyricsResult = lyricsResults[0];

			if (lyricsResults.length && lyricsResult.syncedLyrics) {
				try {
					const syncedLyrics = queue.syncedLyrics(lyricsResult);
					const syncedVerses = lyricsResult.syncedLyrics
						.split('\n')
						.filter((verse) => verse.slice(11).length !== 0);
					const response = await App.respond(
						command,
						`🎵 | Playing **${track.cleanTitle}** by **${track.author}**\n-—**⁘**—-\n${syncedVerses[0].slice(11)}\n${syncedVerses[1].slice(11)}`,
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
								`🎵 | Playing **${track.cleanTitle}** by **${track.author}**\n-—**⁘**—-\n${lyrics.join('\n')}`
							);
						} catch {
							try {
								await response.edit(`🎵 | Playing **${track.cleanTitle}** by **${track.author}**`);
							} catch (error) {
								console.error(error);
							}
						}
					});

					syncedLyrics.subscribe();

					syncedLyrics.onUnsubscribe(
						async () => await response.edit(`🎵 | Playing **${track.cleanTitle}** by **${track.author}**`)
					);
				} catch {
					// Do nothing.
				}
			} else
				await App.respond(command, `🎵 | Playing **${track.cleanTitle}** by **${track.author}**`, {
					channelSend: true,
				});
		});
	},
};
