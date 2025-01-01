import { App } from '#utils/app';
import { useQueue } from 'discord-player';
import { SlashCommandBuilder } from 'discord.js';

export const command: App.Command = {
	aliases: ['dc', 'stop'],
	data: new SlashCommandBuilder().setDescription('Disconnects from the voice channel'),
	async run(ctx) {
		const queue = useQueue();

		try {
			queue?.delete();
		} catch (error) {
			console.error(error);

			return await App.respond(ctx, 'Could not disconnect', App.ResponseType.AppError);
		}

		return await App.respond(ctx, '🔌\u2002Disconnected');
	},
};
