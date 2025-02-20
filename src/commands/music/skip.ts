import { App } from '#utils/app';
import { useQueue } from 'discord-player';
import { SlashCommandBuilder } from 'discord.js';

export const command: App.Command = {
	aliases: ['fs'],
	data: new SlashCommandBuilder().setDescription('Skips the current track'),
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

		try {
			queue.node.skip();
		} catch (error) {
			console.error('Queue Skip Error:', error);

			return await App.respond(ctx, 'Could not skip the track', App.ResponseType.AppError);
		}

		return await App.respond(
			ctx,
			`⏭️\u2002Skipped _${currentTrack.cleanTitle}_ by _${currentTrack.author}_`
		);
	},
};
