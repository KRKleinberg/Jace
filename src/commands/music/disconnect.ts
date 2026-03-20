import type { Command } from '#utils/app';
import { Player } from '#utils/player';
import { SlashCommandBuilder } from 'discord.js';

export const command: Command = {
	aliases: ['dc', 'stop'],
	data: new SlashCommandBuilder().setDescription('Disconnects from the voice channel'),
	async execute(ctx) {
		if (!ctx.member.voice.channel) {
			return await ctx.respond('You are not in a voice channel', { type: 'USER_ERROR' });
		}

		const player = Player.getPlayer(ctx.guild.id);

		if (!player) {
			return await ctx.respond('There is no active player', { type: 'USER_ERROR' });
		}

		if (ctx.member.voice.channelId !== player.voiceChannelId) {
			return await ctx.respond('You are not in the same voice channel as the app', {
				type: 'USER_ERROR',
			});
		}

		await player.destroy();

		return await ctx.respond('Disconnected', { emoji: '🔌' });
	},
};
