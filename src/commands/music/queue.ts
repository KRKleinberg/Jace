import { App } from '#utils/app';
import { createNumberedList } from '#utils/helpers';
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
			return await App.respond(ctx, 'There are no tracks in the queue', App.ResponseType.UserError);
		}
		if (ctx.member.voice.channel !== queue.channel) {
			return App.respond(
				ctx,
				'You are not in the same voice channel as the app',
				App.ResponseType.UserError
			);
		}

		try {
			const nowPlaying = `**Now Playing:**\n[**${currentTrack.cleanTitle}**](${currentTrack.url}) by **${
				currentTrack.author
			}**\n\n`;
			const queuedTracks = queue.tracks.map(
				(track) => `[**${track.cleanTitle}**](${track.url}) by **${track.author}**`
			);

			const embed = new EmbedBuilder()
				.setColor(ctx.preferences.color)
				.setTitle('Queue')
				.setDescription(`${nowPlaying}${createNumberedList(queuedTracks, 4096 - nowPlaying.length)}`);

			return await App.respond(ctx, { embeds: [embed] });
		} catch (error) {
			console.error('Display Queue Error -', error);

			return await App.respond(ctx, 'Could not display the queue', App.ResponseType.AppError);
		}
	},
};
