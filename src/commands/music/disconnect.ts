import type { Command } from '#utils/app';
import { Player } from '#utils/player';
import { SlashCommandBuilder } from 'discord.js';

export const command: Command = {
	aliases: ['dc', 'stop'],
	data: new SlashCommandBuilder().setDescription('Disconnects from the voice channel'),
	async execute(ctx) {
		const player = Player.getPlayer(ctx.guild.id);

		if (!player) {
			return await ctx.respond('Player not connected', { type: 'USER_ERROR' });
		}

		await player.destroy();

		return await ctx.respond('Disconnected', { emoji: '🔌' });
	},
};
