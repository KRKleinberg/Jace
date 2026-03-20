import type { Command } from '#utils/app';
import { Player } from '#utils/player';
import { SlashCommandBuilder } from 'discord.js';

export const command: Command = {
	aliases: ['clr'],
	data: new SlashCommandBuilder().setDescription('Clears the queue'),
	async execute(ctx) {
		if (!ctx.member.voice.channel) {
			return await ctx.respond('You are not in a voice channel', { type: 'USER_ERROR' });
		}

		const player = Player.getPlayer(ctx.guild.id);

		if (!player || !player.queue.tracks.length) {
			return await ctx.respond('There are no tracks in the queue', { type: 'USER_ERROR' });
		}

		if (ctx.member.voice.channelId !== player.voiceChannelId) {
			return await ctx.respond('You are not in the same voice channel as the app', {
				type: 'USER_ERROR',
			});
		}

		player.queue.tracks.splice(0);

		return await ctx.respond('Cleared', { emoji: '🧹' });
	},
};
