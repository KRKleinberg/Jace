import type { Command } from '#utils/app';
import { Player } from '#utils/player';
import { SlashCommandBuilder } from 'discord.js';

export const command: Command = {
	aliases: ['rem'],
	data: new SlashCommandBuilder()
		.setDescription('Removes a track from the queue')
		.addIntegerOption((option) =>
			option
				.setName('track')
				.setDescription('The position in the queue of the track you want to remove')
				.setRequired(true),
		),
	async execute(ctx) {
		if (!ctx.member.voice.channel) {
			return await ctx.respond('You are not in a voice channel', { type: 'USER_ERROR' });
		}

		const player = Player.getPlayer(ctx.guild.id);

		if (!player || !player.queue.tracks.length) {
			return await ctx.respond('There are no tracks in the queue', { type: 'USER_ERROR' });
		}
		if (ctx.member.voice.channel.id !== player.voiceChannelId) {
			return await ctx.respond('You are not in the same voice channel as the app', {
				type: 'USER_ERROR',
			});
		}

		const index = parseInt(ctx.getOption('track') ?? '') - 1;
		const track = player.queue.tracks[index];

		if (!track) {
			return await ctx.respond('Please enter a valid track number', { type: 'USER_ERROR' });
		}

		player.queue.tracks.splice(index, 1);

		return await ctx.respond(`Removed _${track.info.title}_ by _${track.info.author}_`, {
			emoji: '🗑️',
		});
	},
};
