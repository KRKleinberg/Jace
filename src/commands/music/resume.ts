import { App, type Command } from '#utils/app';
import { useQueue } from 'discord-player';
import { SlashCommandBuilder } from 'discord.js';

export const command: Command = {
	aliases: ['res'],
	data: new SlashCommandBuilder().setDescription('Resumes the player'),
	async run(ctx) {
		const queue = useQueue();
		const currentTrack = queue?.currentTrack;

		if (!ctx.member.voice.channel) {
			return await App.respond(ctx, 'You are not in a voice channel', 'USER_ERROR');
		}
		if (!currentTrack) {
			return await App.respond(ctx, 'There are no tracks in the queue', 'USER_ERROR');
		}
		if (ctx.member.voice.channel !== queue.channel) {
			return await App.respond(ctx, 'You are not in the same voice channel as the app', 'USER_ERROR');
		}
		if (queue.node.isPlaying()) {
			return await App.respond(ctx, '🎶\u2002A track is already playing');
		}

		try {
			queue.node.resume();
		} catch (error) {
			console.error('Queue Resume Error -', error);

			return await App.respond(ctx, 'Could not resume the player', 'APP_ERROR');
		}

		return await App.respond(
			ctx,
			`▶️\u2002Resumed _${currentTrack.cleanTitle}_ by _${currentTrack.author}_`
		);
	},
};
