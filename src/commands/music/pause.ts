import { App, type Command } from '#utils/app';
import { useQueue } from 'discord-player';
import { SlashCommandBuilder } from 'discord.js';

export const command: Command = {
	data: new SlashCommandBuilder().setDescription('Pauses the player'),
	async run(ctx) {
		const queue = useQueue();
		const currentTrack = queue?.currentTrack;

		if (!ctx.member.voice.channel) {
			return await App.respond(ctx, 'You are not in a voice channel', 'USER_ERROR');
		}
		if (!currentTrack) {
			return await App.respond(ctx, 'There are no tracks in the queue', 'USER_ERROR');
		}
		if (!queue.isPlaying()) {
			return await App.respond(ctx, 'There are no tracks playing', 'USER_ERROR');
		}

		try {
			queue.node.pause();
		} catch (error) {
			console.error('Queue Pause Error -', error);

			return await App.respond(ctx, 'Could not pause the player', 'APP_ERROR');
		}

		return await App.respond(
			ctx,
			`⏸️\u2002Paused _${currentTrack.cleanTitle}_ by _${currentTrack.author}_`
		);
	},
};
