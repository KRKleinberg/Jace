import { App } from '#utils/app';
import { Player } from '#utils/player';
import { type Track, useQueue } from 'discord-player';
import { InteractionType, SlashCommandBuilder } from 'discord.js';

export const command: App.Command = {
	aliases: ['rec'],
	data: new SlashCommandBuilder().setDescription(`Attempts to recover the queue if there's an error`),
	async run(ctx) {
		const queue = useQueue();

		if (queue) {
			const queueCtx: App.CommandContext = queue.metadata as App.CommandContext;
			let currentTrack = queue.currentTrack;

			if (ctx.member.voice.channel !== queueCtx.member.voice.channel) {
				return await App.respond(
					ctx,
					'You are not in the same voice channel as the app',
					App.ResponseType.UserError
				);
			}

			const queuedTracks = queue.tracks.toArray();

			queue.delete();

			await Player.initializeExtractors();

			queue.revive();

			if (!currentTrack) {
				const search = new Player.Search(
					queueCtx,
					queueCtx.command.type === InteractionType.ApplicationCommand
						? queueCtx.command.options.getString('query', true)
						: queueCtx.args.join(' ')
				);
				try {
					const searchResult = await search.getResult();

					currentTrack = searchResult.tracks[0];
				} catch (error) {
					throw new Error(`Player Search Error - ${String(error)}`);
				}
			}

			const tracks: Track[] = [currentTrack, ...queuedTracks];

			await queue.tasksQueue.acquire().getTask();

			if (!queue.connection) {
				try {
					if (queueCtx.member.voice.channel) {
						await queue.connect(queueCtx.member.voice.channel);
					}
				} catch (error) {
					console.error('Queue Connect Error -', error);

					queue.tasksQueue.release();

					return App.respond(ctx, 'Could not join your voice channel', App.ResponseType.AppError);
				}
			}

			try {
				if (tracks.length) {
					queue.addTrack(tracks);
				}
			} catch (error) {
				console.error('Queue Add Error', error);

				queue.tasksQueue.release();

				return await App.respond(ctx, 'Could not add that track', App.ResponseType.AppError);
			}

			try {
				if (!queue.isPlaying()) {
					await queue.node.play();
				}
			} catch (error) {
				console.error('Queue Play Error', error);

				return await App.respond(ctx, 'Could not play this track', App.ResponseType.AppError);
			} finally {
				queue.tasksQueue.release();
			}

			return await App.respond(ctx, '🔄️\u2002Attempted to recover the queue');
		} else {
			return await App.respond(ctx, 'Queue does not exist', App.ResponseType.UserError);
		}
	},
};
