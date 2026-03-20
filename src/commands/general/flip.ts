import { type Command } from '#utils/app';
import { SlashCommandBuilder } from 'discord.js';

export const command: Command = {
	data: new SlashCommandBuilder().setDescription('Flips a coin'),
	async execute(ctx) {
		return await ctx.respond(`${Math.round(Math.random()) !== 0 ? 'Heads' : 'Tails'}`, {
			emoji: '🪙',
		});
	},
};
