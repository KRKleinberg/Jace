import { App } from '#utils/app';
import { useHistory, useQueue, useTimeline } from 'discord-player';
import { SlashCommandBuilder } from 'discord.js';

export const command: App.Command = {
	data: new SlashCommandBuilder().setDescription('Plays the previous track'),
	async run(ctx) {
		const history = useHistory();
		const queue = useQueue();
		const timeline = useTimeline();

		if (!ctx.member.voice.channel) {
			return await App.respond(ctx, 'You are not in a voice channel', App.ResponseType.UserError);
		}
		if (ctx.member.voice.channel !== queue?.channel) {
			return await App.respond(
				ctx,
				'You are not in the same voice channel as the app',
				App.ResponseType.UserError
			);
		}
		if (!history || history.isEmpty()) {
			try {
				await timeline?.setPosition(0);
			} catch (error) {
				console.error(error);

				return await App.respond(ctx, 'Could not go back a track', App.ResponseType.AppError);
			}

			return await App.respond(ctx, `⏮️\u2002Restarting track`);
		}

		try {
			await history.previous(true);
		} catch (error) {
			console.error(error);

			return await App.respond(ctx, 'Could not go back a track', App.ResponseType.AppError);
		}

		return await App.respond(ctx, '⏮️\u2002Playing previous track');
	},
};
