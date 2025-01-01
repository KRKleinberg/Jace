import { App } from '#utils/app';
import { Player } from '#utils/player';
import { GuildQueueEvent, Util } from 'discord-player';
import { ChannelType } from 'discord.js';

export const event: App.Event = {
	run() {
		/* Player.client.events.on(GuildQueueEvent.Debug, (_queue, message) => {
			console.log(message);
		}); */

		Player.client.events.on(GuildQueueEvent.Error, (_queue, error) => {
			console.error(error);
		});

		Player.client.events.on(GuildQueueEvent.PlayerError, async (queue, error, track) => {
			const ctx: App.CommandContext = queue.metadata as App.CommandContext;

			console.error(error);

			if (ctx.command.channel?.type === ChannelType.GuildText) {
				await ctx.command.channel.sendTyping();
			}

			if (!queue.isPlaying()) {
				try {
					await queue.node.play();
				} catch (error) {
					console.error(error);
				}
			}

			await App.respond(
				ctx,
				`There was an error playing _${track.cleanTitle}_ by _${track.author}_`,
				App.ResponseType.AppError
			);
		});

		Player.client.events.on(GuildQueueEvent.PlayerStart, async (queue, track) => {
			const ctx: App.CommandContext = queue.metadata as App.CommandContext;

			if (ctx.command.channel?.type === ChannelType.GuildText) {
				await ctx.command.channel.sendTyping();
			}

			const lyricsResults = await Player.client.lyrics.search({
				trackName: track.cleanTitle,
				artistName: track.author,
			});
			const lyricsResult = lyricsResults[0];

			if (lyricsResults.length && lyricsResult.syncedLyrics) {
				try {
					const waitLyric = '▫\u2002▫\u2002▫';
					const waitLyricBold = '▪\u2002▪\u2002▪';
					const endLyric = 'END_OF_LYRICS';
					const syncedLyrics = queue.syncedLyrics(lyricsResult);
					const syncedVerses = lyricsResult.syncedLyrics.split('\n').map((verse, index, array) => {
						if (index === array.length - 1) {
							return `${verse.slice(0, 11)}${endLyric}`;
						} else if (verse.slice(11).length === 0) {
							return `${verse.slice(0, 11)}${waitLyric}`;
						} else {
							return verse;
						}
					});
					const lyrics = [waitLyricBold, syncedVerses[0].slice(11)];
					const embed = Player.createPlayEmbed(queue, track, lyrics);
					const response = await App.respond(ctx, { embeds: [embed] });
					const interval = setInterval(async () => {
						const embed = Player.createPlayEmbed(queue, track, lyrics);

						await response.edit({
							embeds: [embed],
						});

						if (queue.currentTrack != track) {
							clearInterval(interval);
						}
					}, 5000);

					syncedLyrics.load(syncedVerses.join('\n'));
					syncedLyrics.onChange(async (currentVerse, timestamp) => {
						try {
							const currentVerseIndex = syncedVerses.findIndex((verse) =>
								verse.includes(`${Util.formatDuration(timestamp)}.${timestamp.toString().slice(-2)}`)
							);

							if (currentVerseIndex === syncedVerses.length - 2) {
								lyrics[0] = syncedVerses[currentVerseIndex - 1].slice(11);
								lyrics[1] = `**${currentVerse}**`;
							} else if (currentVerse === endLyric) {
								lyrics[0] = syncedVerses[currentVerseIndex - 2].slice(11);
								lyrics[1] = syncedVerses[currentVerseIndex - 1].slice(11);
							} else {
								lyrics[0] = `**${currentVerse === waitLyric ? waitLyricBold : currentVerse}**`;
								lyrics[1] = syncedVerses[currentVerseIndex + 1].slice(11);
							}

							const embed = Player.createPlayEmbed(queue, track, lyrics);

							await response.edit({
								embeds: [embed],
							});
						} catch {
							try {
								await response.edit(`🎵\u2002Playing **${track.cleanTitle}** by **${track.author}**`);
							} catch (error) {
								console.error(error);
							}
						}
					});
					syncedLyrics.onUnsubscribe(async () => {
						const embed = Player.createPlayEmbed(queue, track);
						await response.edit({ embeds: [embed] });
					});
					syncedLyrics.subscribe();
				} catch (error) {
					console.error(error);
				}
			} else {
				const embed = Player.createPlayEmbed(queue, track);
				const response = await App.respond(ctx, { embeds: [embed] });

				const interval = setInterval(async () => {
					const embed = Player.createPlayEmbed(queue, track);

					await response.edit({
						embeds: [embed],
					});

					if (queue.currentTrack != track) {
						clearInterval(interval);
					}
				}, 5000);
			}
		});
	},
};
