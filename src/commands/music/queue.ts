import { App } from '#utils/app';
import { createNumberedList, trunicate } from '#utils/helpers';
import { useQueue } from 'discord-player';
import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';

export const command: App.Command = {
	aliases: ['q'],
	data: new SlashCommandBuilder().setDescription('Displays the queue'),
	async run(ctx) {
		const queue = useQueue();
		const currentTrack = queue?.currentTrack;

		if (!ctx.member.voice.channel) {
			return await App.respond(ctx, 'You are not in a voice channel', App.ResponseType.UserError);
		}
		if (!currentTrack) {
			return await App.respond(
				ctx,
				'You are not in the same voice channel as the app',
				App.ResponseType.UserError
			);
		}
		if (ctx.member.voice.channel !== queue.channel) {
			return App.respond(
				ctx,
				'You are not in the same voice channel as the app',
				App.ResponseType.UserError
			);
		}

		try {
			const embed = new EmbedBuilder()
				.setColor(ctx.preferences.color)
				.setTitle('Queue')
				.setDescription(
					trunicate(
						`**Now Playing:**\n[**${currentTrack.cleanTitle}**](${currentTrack.url}) by **${
							currentTrack.author
						}**\n\n${createNumberedList(
							queue.tracks.map((track) => `[**${track.cleanTitle}**](${track.url}) by **${track.author}**`)
						)}`,
						4096
					)
				);

			return await App.respond(ctx, { embeds: [embed] });
		} catch (error) {
			console.error(error);

			return await App.respond(ctx, 'Could not display the queue', App.ResponseType.AppError);
		}
	},
};
