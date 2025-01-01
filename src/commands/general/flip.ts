import { App } from '#utils/app';
import { SlashCommandBuilder } from 'discord.js';

export const command: App.Command = {
	data: new SlashCommandBuilder().setDescription('Flips a coin'),
	async run(ctx) {
		return await App.respond(ctx, `🪙\u2002${Math.round(Math.random()) !== 0 ? 'Heads' : 'Tails'}`);
	},
};
