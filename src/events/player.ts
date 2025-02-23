import { App } from '#utils/app';
import { Player } from '#utils/player';
import { GuildQueueEvent, type Track, Util } from 'discord-player';
import { ChannelType, InteractionType } from 'discord.js';

export const event: App.Event = {
	run() {
		/* Player.client.events.on(GuildQueueEvent.Debug, (_queue, message) => {
			console.log(message);
		}); */

		let queueErrorCount = 0;
		Player.client.events.on(GuildQueueEvent.Error, async (queue, error) => {
			const ctx: App.CommandContext = queue.metadata as App.CommandContext;

			console.error('Queue Error -', error);

			if (ctx.command.channel?.type === ChannelType.GuildText) {
				try {
					await ctx.command.channel.sendTyping();
				} catch (error) {
					console.error('Channel Send Typing Error -', error);
				}
			}

			try {
				if (queueErrorCount < 3) {
					queueErrorCount++;

					console.log('Queue Error Count:', queueErrorCount);

					let currentTrack = queue.currentTrack;
					const queuedTracks = queue.tracks.toArray();

					queue.delete();

					await Player.initializeExtractors();

					queue.revive();

					if (!currentTrack) {
						const search = new Player.Search(
							ctx,
							ctx.command.type === InteractionType.ApplicationCommand
								? ctx.command.options.getString('query', true)
								: ctx.args.join(' ')
						);

						const searchResult = await search.getResult();

						currentTrack = searchResult.tracks[0];
					}

					const tracks: Track[] = [currentTrack, ...queuedTracks];

					try {
						await queue.tasksQueue.acquire().getTask();

						if (!queue.connection) {
							if (ctx.member.voice.channel) {
								await queue.connect(ctx.member.voice.channel);
							}
						}

						if (tracks.length) {
							queue.addTrack(tracks);
						}

						if (!queue.isPlaying()) {
							await queue.node.play();
						}
					} catch (error) {
						console.error('Queue Recover Error -', error);

						await App.respond(ctx, `There was an error with the queue`, App.ResponseType.PlayerError);
					} finally {
						queue.tasksQueue.release();
					}

					queueErrorCount = 0;
				} else {
					console.log('Queue Error Count:', queueErrorCount);

					await App.respond(ctx, `There was an error with the queue`, App.ResponseType.PlayerError);
				}
			} catch (error) {
				console.error('Queue Recover Error -', error);

				await App.respond(ctx, `There was an error with the queue`, App.ResponseType.PlayerError);
			}
		});

		Player.client.events.on(GuildQueueEvent.PlayerError, async (queue, error, track) => {
			const ctx: App.CommandContext = queue.metadata as App.CommandContext;

			console.error('Player Error -', error);

			if (ctx.command.channel?.type === ChannelType.GuildText) {
				await ctx.command.channel.sendTyping();
			}

			if (!queue.isPlaying()) {
				try {
					queue.node.resume();
				} catch (error) {
					console.error('Queue Resume Error -', error);
				}
			}

			await App.respond(
				ctx,
				`There was an error playing _${track.cleanTitle}_ by _${track.author}_`,
				App.ResponseType.PlayerError
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
					let lyrics: string[] | undefined = [waitLyricBold, syncedVerses[0].slice(11)];
					const embed = Player.createPlayEmbed(queue, track, lyrics);
					const response = await App.respond(ctx, { embeds: [embed] }, App.ResponseType.Channel);

					let index = 1;
					const interval = setInterval(
						async () => {
							if (queue.currentTrack != track) {
								clearInterval(interval);

								const embed = Player.createPlayEmbed(queue, track);

								await response.edit({ embeds: [embed] });
							} else {
								const timestamp = queue.node.getTimestamp();

								if (timestamp) {
									const progressBarIndex = Math.round(
										(timestamp.current.value / timestamp.total.value) * Player.progressBarLength(track)
									);

									if (progressBarIndex > index && progressBarIndex <= Player.progressBarLength(track)) {
										index = progressBarIndex;

										const embed = Player.createPlayEmbed(queue, track, lyrics);

										await response.edit({
											embeds: [embed],
										});
									}
								} else {
									const embed = Player.createPlayEmbed(queue, track, lyrics);

									await response.edit({
										embeds: [embed],
									});
								}
							}
						},
						track.durationMS / Player.progressBarLength(track) > 5000
							? track.durationMS / Player.progressBarLength(track)
							: 5000
					);

					syncedLyrics.load(syncedVerses.join('\n'));
					syncedLyrics.onChange(async (currentVerse, timestamp) => {
						try {
							const currentVerseIndex = syncedVerses.findIndex((verse) =>
								verse.includes(`${Util.formatDuration(timestamp)}.${timestamp.toString().slice(-2)}`)
							);

							if (syncedVerses[currentVerseIndex + 1]?.includes(endLyric)) {
								lyrics = [syncedVerses[currentVerseIndex - 1].slice(11), `**${currentVerse}**`];
							} else if (currentVerse.includes(endLyric)) {
								lyrics = [
									syncedVerses[currentVerseIndex - 2].slice(11),
									syncedVerses[currentVerseIndex - 1].slice(11),
								];

								setTimeout(() => {
									if (queue.currentTrack === track) {
										syncedLyrics.unsubscribe();
									}
								}, 5000);
							} else if (currentVerse && syncedVerses[currentVerseIndex + 1]) {
								lyrics = [
									`**${currentVerse === waitLyric ? waitLyricBold : currentVerse}**`,
									syncedVerses[currentVerseIndex + 1].slice(11),
								];
							} else {
								lyrics = undefined;
							}

							const embed = Player.createPlayEmbed(queue, track, lyrics);

							await response.edit({
								embeds: [embed],
							});
						} catch (error) {
							console.error('Synced Lyrics Change Error -', error);

							const embed = Player.createPlayEmbed(queue, track);

							await response.edit({ embeds: [embed] });
						}
					});
					syncedLyrics.onUnsubscribe(async () => {
						lyrics = undefined;

						const embed = Player.createPlayEmbed(queue, track);

						await response.edit({ embeds: [embed] });
					});
					syncedLyrics.subscribe();
				} catch (error) {
					console.error('Synced Lyrics Error -', error);
				}
			} else {
				const embed = Player.createPlayEmbed(queue, track);
				const response = await App.respond(ctx, { embeds: [embed] }, App.ResponseType.Channel);

				let index = 1;
				const interval = setInterval(
					async () => {
						if (queue.currentTrack != track) {
							clearInterval(interval);
						}

						const timestamp = queue.node.getTimestamp();

						if (timestamp) {
							const progressBarIndex = Math.round(
								(timestamp.current.value / timestamp.total.value) * Player.progressBarLength(track)
							);

							if (progressBarIndex > index && progressBarIndex <= Player.progressBarLength(track)) {
								index = progressBarIndex;

								const embed = Player.createPlayEmbed(queue, track);

								await response.edit({
									embeds: [embed],
								});
							}
						} else {
							const embed = Player.createPlayEmbed(queue, track);

							await response.edit({
								embeds: [embed],
							});
						}
					},
					track.durationMS / Player.progressBarLength(track) > 1000
						? track.durationMS / Player.progressBarLength(track)
						: 1000
				);
			}
		});
	},
};
