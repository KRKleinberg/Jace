import { App } from '#utils/app';
import { Player } from '#utils/player';
import { useQueue } from 'discord-player';
import { SlashCommandBuilder } from 'discord.js';

export const command: App.Command = {
	data: new SlashCommandBuilder().setDescription('Displays app network latency'),
	async run(ctx) {
		// REMOVE LATER
		{
			const queue = useQueue();

			queue?.delete();

			await Player.initializeExtractors();
		}

		return await App.respond(ctx, `📶\u2002${ctx.command.client.ws.ping.toString()} ms`);
	},
};
