import { type Command } from '#utils/app';
import { SlashCommandBuilder } from 'discord.js';

export const command: Command = {
	data: new SlashCommandBuilder().setDescription('Displays app network latency'),
	async execute(ctx) {
		return await ctx.respond(`${ctx.guild.client.ws.ping} ms`, {
			emoji: '📶',
		});
	},
};
