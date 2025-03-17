import { App, type Command } from '#utils/app';
import { useQueue } from 'discord-player';
import { SlashCommandBuilder } from 'discord.js';

export const command: Command = {
	aliases: ['dc', 'stop'],
	data: new SlashCommandBuilder().setDescription('Disconnects from the voice channel'),
	async run(ctx) {
		const queue = useQueue();

		try {
			queue?.delete();
		} catch (error) {
			console.error('Queue Delete Error -', error);

			return await App.respond(ctx, 'Could not disconnect', 'APP_ERROR');
		}

		return await App.respond(ctx, '🔌\u2002Disconnected');
	},
};
