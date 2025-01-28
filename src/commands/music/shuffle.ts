import { App } from '#utils/app';
import { Player } from '#utils/player';
import { useQueue } from 'discord-player';
import { SlashCommandBuilder } from 'discord.js';

export const command: App.Command = {
	aliases: ['sh'],
	data: new SlashCommandBuilder().setDescription('Shuffles the queue'),
	async run(ctx) {
		const queue = useQueue();

		// REMOVE LATER
		await Player.initializeExtractors();

		if (!ctx.member.voice.channel) {
			return await App.respond(ctx, 'You are not in a voice channel', App.ResponseType.UserError);
		}
		if (!queue || queue.isEmpty()) {
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
			queue.tracks.shuffle();
		} catch (error) {
			console.error(error);

			return await App.respond(ctx, 'Could not shuffle the queue', App.ResponseType.AppError);
		}

		return await App.respond(ctx, '🔀\u2002Shuffled the queue');
	},
};
