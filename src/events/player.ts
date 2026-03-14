import { App } from '#utils/app';
import { log } from '#utils/log';
import { Player, PlayerClient } from '#utils/player';
import { Redis } from '#utils/redis';

interface LavalinkReadyPayload {
	op: 'ready';
	resumed: boolean;
	sessionId: string;
}

function isReadyPayload(payload: unknown): payload is LavalinkReadyPayload {
	return typeof payload === 'object' && payload !== null && 'op' in payload && payload.op === 'ready';
}

Player.nodeManager.on('raw', async (node, payload) => {
	if (isReadyPayload(payload) && !payload.resumed) {
		node.sessionId = payload.sessionId;

		await node.updateSession(true, 60);
		await PlayerClient.saveSession(node, 0);

		log.debug(`[Lavalink] Node ${node.options.id} session configured`);
	}
});

Player.nodeManager.on('resumed', async (node, _payload, fetchedPlayers) => {
	if (!Array.isArray(fetchedPlayers)) {
		log.error(`[Lavalink] Failed to fetch players on resume:`, fetchedPlayers);

		return;
	}

	for (const fetchedPlayer of fetchedPlayers) {
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

		log.debug(`[Lavalink] Resumed player for guild ${fetchedPlayer.guildId}`);
	}
});

Player.on('trackStart', async (player, track) => {
	log.info(`[Player] Track started: ${track?.info.title}`);

	if (player.textChannelId) {
		await Redis.client.set(`jace:player:${player.guildId}:text-channel`, player.textChannelId, {
			EX: 60 * 60 * 6,
		});
	}
});

Player.on('playerDestroy', async (player) => {
	await Redis.client.del(`jace:player:${player.guildId}:text-channel`);
});
