import type { Command } from '#utils/app';
import { Database } from '#utils/mongodb';
import { Player } from '#utils/player';
import { PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';

export const command: Command = {
	aliases: ['vol'],
	data: new SlashCommandBuilder()
		.setDescription('Displays or sets the volume for the server')
		.addIntegerOption((option) =>
			option
				.setName('volume')
				.setDescription('The volume to set between 5% and 100%')
				.setMinValue(5)
				.setMaxValue(100),
		)
		.setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
	async execute(ctx) {
		if (!ctx.member.permissions.has(PermissionFlagsBits.Administrator)) {
			return await ctx.respond('Only an administrator can execute this command', {
				type: 'USER_ERROR',
			});
		}

		const player = Player.getPlayer(ctx.guild.id);
		const input = parseInt(ctx.getOption('volume') ?? '');

		if (isNaN(input)) {
			const current = player?.volume ?? ctx.preferences.volume ?? 100;

			return await ctx.respond(`Volume is _${current}_%`, {
				emoji: current < 50 ? '🔉' : '🔊',
			});
		}

		const volume = Math.max(5, Math.min(100, input));

		if (player) {
			await player.setVolume(volume);
		}

		try {
			await Database.updatePreferences(ctx.guild.id, { volume });
		} catch {
			// Do nothing if the database update fails, the volume will still be set for the current session
		}

		return await ctx.respond(`Volume set to _${volume}_%`, {
			emoji: volume < 50 ? '🔉' : '🔊',
		});
	},
};
