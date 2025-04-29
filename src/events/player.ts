import { App, type CommandContext } from '#utils/app';
import { Player, type TrackMetadata } from '#utils/player';
import { GuildQueueEvent, Util } from 'discord-player';
import { ChannelType } from 'discord.js';

/* Player.events.on(GuildQueueEvent.Debug, (_queue, message) => {
	console.log(message);
}); */

Player.events.on(GuildQueueEvent.Error, async (queue, error) => {
	console.error('Queue Error -', error);

	const ctx: CommandContext = queue.metadata as CommandContext;

	if (ctx.command.channel?.type === ChannelType.GuildText) {
		try {
			await ctx.command.channel.sendTyping();
		} catch (error) {
			console.error('Channel Send Typing Error -', error);
		}
	}

	await App.respond(ctx, `There was an error with the queue`, 'PLAYER_ERROR');
});

Player.events.on(GuildQueueEvent.PlayerError, async (queue, error, track) => {
	console.error('Player Error -', error);

	const ctx: CommandContext = queue.metadata as CommandContext;

	if (ctx.command.channel?.type === ChannelType.GuildText) {
		try {
			await ctx.command.channel.sendTyping();
		} catch (error) {
			console.error('Channel Send Typing Error -', error);
		}
	}

	const trackMetadata = track.metadata as TrackMetadata | null | undefined;

	track.setMetadata({ ...trackMetadata, skipped: true });

	await App.respond(ctx, `Unable to play _${track.cleanTitle}_ by _${track.author}_`, 'PLAYER_ERROR');
});

Player.events.on(GuildQueueEvent.PlayerStart, async (queue, track) => {
	const ctx: CommandContext = queue.metadata as CommandContext;

	if (ctx.command.channel?.type === ChannelType.GuildText) {
		await ctx.command.channel.sendTyping();
	}

	const lyricsResults = await Player.lyrics.search({
		trackName: track.cleanTitle,
		artistName: track.author,
	});
	const lyricsResult = lyricsResults[0];

	if (lyricsResults.length && lyricsResult.syncedLyrics) {
		try {
			const waitLyric = '○\u2002○\u2002○';
			const waitLyricBold = '●\u2002●\u2002●';
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
			const response = await App.respond(ctx, { embeds: [embed] }, 'CHANNEL');

			let index = 1;
			const interval = setInterval(
				async () => {
					if (queue.currentTrack !== track) {
						clearInterval(interval);

						const embed = Player.createPlayEmbed(queue, track);

						await response.edit({ embeds: [embed] });
					} else {
						const timestamp = queue.node.getTimestamp();

						if (timestamp) {
							const progressBarIndex = Math.round(
								(timestamp.current.value / timestamp.total.value) * Player.getProgressBarLength(track)
							);

							if (progressBarIndex > index && progressBarIndex <= Player.getProgressBarLength(track)) {
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
				Math.max(track.durationMS / Player.getProgressBarLength(track), 1_000)
			);

			syncedLyrics.load(syncedVerses.join('\n'));
			syncedLyrics.onChange(async (currentVerse, timestamp) => {
				try {
					const currentVerseIndex = syncedVerses.findIndex((verse) =>
						verse.includes(`${Util.formatDuration(timestamp)}.${timestamp.toString().slice(-2)}`)
					);

					if (
						currentVerseIndex + 1 < syncedVerses.length &&
						syncedVerses[currentVerseIndex + 1]?.includes(endLyric)
					) {
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
						}, 5_000);
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
		const response = await App.respond(ctx, { embeds: [embed] }, 'CHANNEL');

		let index = 1;
		const interval = setInterval(
			async () => {
				if (queue.currentTrack !== track) {
					clearInterval(interval);

					const embed = Player.createPlayEmbed(queue, track);

					await response.edit({ embeds: [embed] });
				} else {
					const timestamp = queue.node.getTimestamp();

					if (timestamp) {
						const progressBarIndex = Math.round(
							(timestamp.current.value / timestamp.total.value) * Player.getProgressBarLength(track)
						);

						if (progressBarIndex > index && progressBarIndex <= Player.getProgressBarLength(track)) {
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
				}
			},
			Math.max(track.durationMS / Player.getProgressBarLength(track), 1_000)
		);
	}
});
