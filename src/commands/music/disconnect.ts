import { Bot } from '@utils/bot';
import { useQueue } from 'discord-player';
import { SlashCommandBuilder } from 'discord.js';
import { basename } from 'path';
import { fileURLToPath } from 'url';

export const command: Bot.Command = {
	aliases: ['dc', 'stop'],
	data: new SlashCommandBuilder()
		.setName(basename(fileURLToPath(import.meta.url), '.js').toLowerCase())
		.setDescription('Disconnects from the voice channel'),
	async execute({ command, guild }) {
		const queue = useQueue(guild);

		try {
			queue?.delete();
		} catch (error) {
			console.error(error);

			return await Bot.respond(command, '⚠️ | Could not disconnect');
		}

		return await Bot.respond(command, `🔌 | Disconnected`);
	},
};
