import { App } from '#utils/app';
import { useQueue } from 'discord-player';
import { SlashCommandBuilder } from 'discord.js';

export const command: App.Command = {
	data: new SlashCommandBuilder().setDescription('Pauses the player'),
	async run(ctx) {
		const queue = useQueue();
		const currentTrack = queue?.currentTrack;

		if (!ctx.member.voice.channel) {
			return await App.respond(ctx, 'You are not in a voice channel', App.ResponseType.UserError);
		}
		if (!currentTrack) {
			return await App.respond(ctx, 'There are no tracks in the queue', App.ResponseType.UserError);
		}
		if (!queue.isPlaying()) {
			return await App.respond(ctx, 'There are no tracks playing', App.ResponseType.UserError);
		}

		try {
			queue.node.pause();
		} catch (error) {
			console.error('Queue Pause Error -', error);

			return await App.respond(ctx, 'Could not pause the player', App.ResponseType.AppError);
		}

		return await App.respond(
			ctx,
			`⏸️\u2002Paused _${currentTrack.cleanTitle}_ by _${currentTrack.author}_`
		);
	},
};
