import { App } from '#utils/app';
import {
	buildPlayEmbed,
	getProgressBarLength,
	resolveAvatarUrl,
	resolveEmbedColor,
} from '#utils/embeds';
import { log } from '#utils/log';
import { Player, saveSession } from '#utils/player';
import { Redis } from '#utils/redis';
import type { ColorResolvable, Message } from 'discord.js';
import { Player as LLPlayer, type Track } from 'lavalink-client';

interface LavalinkReadyPayload {
	op: 'ready';
	resumed: boolean;
	sessionId: string;
}

const SILENCE = '○\u2002○\u2002○';
const SILENCE_ACTIVE = '●\u2002●\u2002●';
const INSTRUMENTAL = '♪\u2002♪\u2002♪';
const INSTRUMENTAL_ACTIVE = '♫\u2002♫\u2002♫';

function boldLine(line: string): string {
	if (line === SILENCE) return SILENCE_ACTIVE;
	if (line === INSTRUMENTAL) return INSTRUMENTAL_ACTIVE;

	return `**${line}**`;
}

function isReadyPayload(payload: unknown): payload is LavalinkReadyPayload {
	return typeof payload === 'object' && payload !== null && 'op' in payload && payload.op === 'ready';
}

async function editNowPlaying(player: LLPlayer): Promise<void> {
	const message = player.get<Message>('nowPlayingMessage');
	const track = player.queue.current;
	if (!message || !track) return;

	const color = player.get<ColorResolvable | null>('embedColor');
	const lyrics = player.get<string[] | undefined>('currentLyricsDisplay');

	try {
		await message.edit({
			embeds: [buildPlayEmbed({ player, track, color, avatarUrl: resolveAvatarUrl(track), lyrics })],
		});
	} catch (error) {
		log.error(`[Player] Failed to edit now playing message for guild ${player.guildId}:`, error);

		player.setData('nowPlayingMessage', null);
	}
}

function startProgressBarUpdates(player: LLPlayer, track: typeof player.queue.current): void {
	if (!track?.info.duration) return;

	const barLength = getProgressBarLength(track.info.duration);
	let lastBarIndex = 0;

	const interval = setInterval(
		async () => {
			try {
				if (player.queue.current !== track) {
					clearInterval(interval);

					player.setData('progressInterval', null);

					return;
				}

				const barIndex = Math.round((player.position / track.info.duration) * barLength);

				if (barIndex > lastBarIndex && barIndex <= barLength) {
					lastBarIndex = barIndex;

					const lastLyricsEdit = player.get<number>('lastLyricsEdit') ?? 0;
					if (Date.now() - lastLyricsEdit < 1000) return;

					await editNowPlaying(player);
				}
			} catch (error) {
				log.error(`[Player] Error updating progress bar for guild ${player.guildId}:`, error);

				clearInterval(interval);

				player.setData('progressInterval', null);
			}
		},
		Math.max(track.info.duration / barLength, 1000),
	);

	player.setData('progressInterval', interval);
}

function formatLyricsDisplay(lyricLines: string[], index: number): string[] | undefined {
	if (index < 0 || index >= lyricLines.length) return undefined;

	const currentLine = lyricLines[index] ?? '';
	const previousLine = index > 0 ? (lyricLines[index - 1] ?? '') : '';
	const nextLine = lyricLines[index + 1];

	if (index >= lyricLines.length - 1) {
		return [previousLine ?? '', currentLine];
	}

	if (index === lyricLines.length - 2) {
		return [previousLine ?? '', boldLine(currentLine)];
	}

	if (nextLine !== undefined) {
		return [boldLine(currentLine), nextLine];
	}

	return undefined;
}

async function fetchAndSubscribeLyrics(
	player: LLPlayer,
): Promise<{ lyricLines: string[]; timestamps: number[] } | undefined> {
	try {
		const lyrics = await player.getCurrentLyrics();

		if (!lyrics?.lines?.length) return undefined;

		const lyricLines = lyrics.lines.map((line) => {
			if (line.line === '♪') return INSTRUMENTAL;
			if (line.line.length === 0) return SILENCE;

			return line.line;
		});

		const timestamps = lyrics.lines.map((line) => line.timestamp);

		player.setData('lyricLines', lyricLines);

		await player.subscribeLyrics();

		return { lyricLines, timestamps };
	} catch {
		return undefined;
	}
}

function clearPlayerState(player: LLPlayer): void {
	const interval = player.get<ReturnType<typeof setInterval>>('progressInterval');
	if (interval) clearInterval(interval);

	player.setData('lyricLines', null);
	player.setData('currentLyricsDisplay', null);
	player.setData('nowPlayingMessage', null);
	player.setData('embedColor', null);
	player.setData('progressInterval', null);
	player.setData('lastLyricIndex', null);
	player.setData('lastLyricsEdit', null);
}

async function cleanupRedisKeys(guildId: string, ...keys: string[]): Promise<void> {
	try {
		await Promise.all(keys.map((key) => Redis.client.del(`jace:player:${guildId}:${key}`)));
	} catch (error) {
		log.error(`[Player] Failed to clean up Redis keys for guild ${guildId}:`, error);
	}
}

Player.nodeManager.on('raw', async (node, payload) => {
	if (isReadyPayload(payload) && !payload.resumed) {
		node.sessionId = payload.sessionId;

		try {
			await node.updateSession(true, 60);
			await saveSession(node, 0);

			log.debug(`[Lavalink] Node ${node.options.id} session configured`);
		} catch (error) {
			log.error(`[Lavalink] Failed to configure session for node ${node.options.id}:`, error);
		}
	}
});

Player.nodeManager.on('resumed', async (node, _payload, fetchedPlayers) => {
	if (!Array.isArray(fetchedPlayers)) {
		log.error(`[Lavalink] Failed to fetch players on resume:`, fetchedPlayers);

		return;
	}

	for (const fetchedPlayer of fetchedPlayers) {
		try {
			if (!fetchedPlayer.state.connected) {
				log.debug(`[Lavalink] Skipping disconnected player for ${fetchedPlayer.guildId}`);

				continue;
			}

			if (!fetchedPlayer.voice.channelId) {
				log.debug(`[Lavalink] Skipping player with no voice channel for ${fetchedPlayer.guildId}`);

				continue;
			}

			const textChannelId = await Redis.client.get(`jace:player:${fetchedPlayer.guildId}:text-channel`);

			const player = Player.createPlayer({
				guildId: fetchedPlayer.guildId,
				node: node.id,
				voiceChannelId: fetchedPlayer.voice.channelId,
				...(textChannelId && { textChannelId }),
				selfDeaf: true,
			});

			await player.connect();
			await player.queue.utils.sync(true, false);

			if (fetchedPlayer.track) {
				player.queue.current = Player.utils.buildTrack(
					fetchedPlayer.track,
					player.queue.current?.requester || App.user,
				);
			}

			player.lastPosition = fetchedPlayer.state.position;
			player.lastPositionChange = Date.now();
			player.ping.lavalink = fetchedPlayer.state.ping;
			player.paused = fetchedPlayer.paused;
			player.playing = !fetchedPlayer.paused && !!fetchedPlayer.track;

			if (fetchedPlayer.track && player.textChannelId) {
				const color = resolveEmbedColor(player.textChannelId);
				player.setData('embedColor', color);

				const messageId = await Redis.client.get(`jace:player:${player.guildId}:now-playing`);

				if (messageId) {
					try {
						const channel = App.channels.cache.get(player.textChannelId);
						if (channel?.isTextBased()) {
							const message = await channel.messages.fetch(messageId);

							player.setData('nowPlayingMessage', message);

							startProgressBarUpdates(player, player.queue.current);

							log.debug(`[Lavalink] Recovered now playing message for guild ${fetchedPlayer.guildId}`);
						}
					} catch {
						log.debug(`[Lavalink] Failed to recover now playing message for guild ${fetchedPlayer.guildId}`);
					}
				}

				const result = await fetchAndSubscribeLyrics(player);

				if (result && player.queue.current) {
					const currentIndex = result.timestamps.findLastIndex((timestamp) => timestamp <= player.position);

					if (currentIndex >= 0) {
						const display = formatLyricsDisplay(result.lyricLines, currentIndex);

						player.setData('currentLyricsDisplay', display);
					}

					log.debug(`[Lavalink] Re-subscribed to lyrics for guild ${fetchedPlayer.guildId}`);
				}
			}

			log.debug(`[Lavalink] Resumed player for guild ${fetchedPlayer.guildId}`);
		} catch (error) {
			log.error(`[Lavalink] Failed to resume player for guild ${fetchedPlayer.guildId}:`, error);
		}
	}
});

Player.on('trackStart', async (player, track) => {
	log.debug(`[Player] Track started: ${track?.info.title}`);

	if (!track || !player.textChannelId) return;

	player.setData('currentTrack', track);

	try {
		await Redis.client.set(`jace:player:${player.guildId}:text-channel`, player.textChannelId, {
			EX: 60 * 60 * 6,
		});
	} catch (error) {
		log.error(`[Player] Failed to set text channel in Redis for guild ${player.guildId}:`, error);
	}

	const channel = App.channels.cache.get(player.textChannelId);
	if (!channel?.isTextBased() || !channel.isSendable()) return;

	const color = resolveEmbedColor(player.textChannelId);
	player.setData('embedColor', color);

	const result = await fetchAndSubscribeLyrics(player);
	const initialLyrics = result ? [INSTRUMENTAL_ACTIVE, result.lyricLines[0] ?? ''] : undefined;

	if (result?.lyricLines) {
		log.debug(`[Player] Lyrics found and subscribed for track: ${track.info.title}`);
	}

	player.setData('currentLyricsDisplay', initialLyrics);

	try {
		const embed = buildPlayEmbed({
			player,
			track,
			color,
			avatarUrl: resolveAvatarUrl(track),
			lyrics: initialLyrics,
		});
		const message = await channel.send({ embeds: [embed] });

		player.setData('nowPlayingMessage', message);

		await Redis.client.set(`jace:player:${player.guildId}:now-playing`, message.id, {
			EX: 60 * 60 * 6,
		});
	} catch (error) {
		log.error(`[Player] Failed to send now playing message for guild ${player.guildId}:`, error);
	}

	startProgressBarUpdates(player, track);
});

Player.on('LyricsLine', async (player, _track, payload) => {
	const lyricLines = player.get<string[] | undefined>('lyricLines');
	if (!lyricLines?.length) return;

	if (payload.line.timestamp < player.position - 2000) return;

	const lastIndex = player.get<number>('lastLyricIndex') ?? -1;
	if (payload.lineIndex === lastIndex) return;

	player.setData('lastLyricIndex', payload.lineIndex);

	const lyrics = formatLyricsDisplay(lyricLines, payload.lineIndex);
	player.setData('currentLyricsDisplay', lyrics);

	player.setData('lastLyricsEdit', Date.now());
	await editNowPlaying(player);

	if (payload.lineIndex >= lyricLines.length - 1) {
		setTimeout(async () => {
			try {
				if (player.queue.current) {
					player.setData('currentLyricsDisplay', undefined);

					player.setData('lastLyricsEdit', Date.now());
					await editNowPlaying(player);
				}
			} catch (error) {
				log.error(`[Player] Error clearing lyrics after track end for guild ${player.guildId}:`, error);
			}
		}, 5000);
	}
});

Player.on('trackEnd', async (player, track) => {
	const message = player.get<Message>('nowPlayingMessage');
	const color = player.get<ColorResolvable | null>('embedColor');

	clearPlayerState(player);
	await cleanupRedisKeys(player.guildId, 'now-playing');

	if (message && track) {
		try {
			await message.edit({
				embeds: [
					buildPlayEmbed({ player, track, color, avatarUrl: resolveAvatarUrl(track), isPlaying: false }),
				],
			});
		} catch (error) {
			log.error(
				`[Player] Failed to edit now playing message on track end for guild ${player.guildId}`,
				error,
			);
		}
	}
});

Player.on('playerDestroy', async (player) => {
	const message = player.get<Message>('nowPlayingMessage');
	const color = player.get<ColorResolvable | null>('embedColor');
	const track = player.get<Track>('currentTrack') ?? player.queue.current;

	clearPlayerState(player);
	await cleanupRedisKeys(player.guildId, 'text-channel', 'now-playing');

	if (message && track) {
		try {
			await message.edit({
				embeds: [
					buildPlayEmbed({ player, track, color, avatarUrl: resolveAvatarUrl(track), isPlaying: false }),
				],
			});
		} catch (error) {
			log.error(
				`[Player] Failed to edit now playing message on player destroy for guild ${player.guildId}`,
				error,
			);
		}
	}
});
