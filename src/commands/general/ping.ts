import { App } from '#utils/app';
import { Player } from '#utils/player';
import { type Track, useQueue } from 'discord-player';
import { SlashCommandBuilder } from 'discord.js';

export const command: App.Command = {
	data: new SlashCommandBuilder().setDescription('Displays app network latency'),
	async run(ctx) {
		// REMOVE LATER
		{
			const queue = useQueue();
			const currentTrack = queue?.currentTrack;
			const tracks: Track[] =
				currentTrack && queue.tracks.toArray().length ? [currentTrack, ...queue.tracks.toArray()] : [];

			queue?.delete();

			await Player.initializeExtractors();

			queue?.revive();

			await queue?.tasksQueue.acquire().getTask();

			if (!queue?.connection) {
				try {
					if (ctx.member.voice.channel) {
						await queue?.connect(ctx.member.voice.channel);
					}
				} catch (error) {
					console.error(error);

					queue?.tasksQueue.release();

					return await App.respond(ctx, 'Could not join your voice channel', App.ResponseType.AppError);
				}
			}

			try {
				if (tracks.length) {
					queue?.addTrack(tracks);
				}
			} catch (error) {
				console.error(error);

				queue?.tasksQueue.release();

				return await App.respond(ctx, 'Could not add that track', App.ResponseType.AppError);
			}

			try {
				if (!queue?.isPlaying()) {
					await queue?.node.play();
				}
			} catch (error) {
				console.error(error);

				return await App.respond(ctx, 'Could not play this track', App.ResponseType.AppError);
			} finally {
				queue?.tasksQueue.release();
			}
		}

		return await App.respond(ctx, `📶\u2002${ctx.command.client.ws.ping.toString()} ms`);
	},
};
