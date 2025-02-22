import { App } from '#utils/app';
import { useQueue } from 'discord-player';
import { SlashCommandBuilder } from 'discord.js';

export const command: App.Command = {
	aliases: ['res'],
	data: new SlashCommandBuilder().setDescription('Resumes the player'),
	async run(ctx) {
		const queue = useQueue();
		const currentTrack = queue?.currentTrack;

		if (!ctx.member.voice.channel) {
			return await App.respond(ctx, 'You are not in a voice channel', App.ResponseType.UserError);
		}
		if (!currentTrack) {
			return await App.respond(ctx, 'There are no tracks in the queue', App.ResponseType.UserError);
		}
		if (ctx.member.voice.channel !== queue.channel) {
			return await App.respond(
				ctx,
				'You are not in the same voice channel as the app',
				App.ResponseType.UserError
			);
		}
		if (queue.node.isPlaying()) {
			return await App.respond(ctx, '🎶\u2002A track is already playing');
		}

		try {
			queue.node.resume();
		} catch (error) {
			console.error('Queue Resume Error -', error);

			return await App.respond(ctx, 'Could not resume the player', App.ResponseType.AppError);
		}

		return await App.respond(
			ctx,
			`▶️\u2002Resumed _${currentTrack.cleanTitle}_ by _${currentTrack.author}_`
		);
	},
};
