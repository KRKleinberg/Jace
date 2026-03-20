import type { Command } from '#utils/app';
import { resolveEmbedColor } from '#utils/embeds';
import { truncateList } from '#utils/helpers';
import { Player } from '#utils/player';
import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';

export const command: Command = {
	aliases: ['q'],
	data: new SlashCommandBuilder().setDescription('Displays the queue'),
	async execute(ctx) {
		const player = Player.getPlayer(ctx.guild.id);
		const currentTrack = player?.queue.current;

		if (!currentTrack) {
			return await ctx.respond('There are no tracks in the queue', { type: 'USER_ERROR' });
		}

		const nowPlaying = `**Now Playing:**\n[**${currentTrack.info.title}**](${currentTrack.info.uri}) by **${currentTrack.info.author}**\n\n`;

		const queuedTracks = player.queue.tracks.map(
			(track, index) =>
				`**${index + 1}.** [**${track.info.title}**](${track.info.uri}) by **${track.info.author}**`,
		);

		const embed = new EmbedBuilder()
			.setColor(resolveEmbedColor(ctx.source.channelId))
			.setTitle('Queue')
			.setDescription(
				queuedTracks.length
					? `${nowPlaying}${truncateList(queuedTracks, 4096 - nowPlaying.length)}`
					: nowPlaying.trim(),
			);

		return await ctx.respond({ embeds: [embed] });
	},
};
