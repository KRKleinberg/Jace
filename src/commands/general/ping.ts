import { App, type Command } from '#utils/app';
import { SlashCommandBuilder } from 'discord.js';

export const command: Command = {
	data: new SlashCommandBuilder().setDescription('Displays app network latency'),
	async execute(ctx) {
		return await App.respond(ctx, `${ctx.command.client.ws.ping.toString()} ms`, {
			emoji: '📶',
		});
	},
};
