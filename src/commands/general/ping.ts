import * as Bot from '@utils/bot';
import { SlashCommandBuilder } from 'discord.js';
import { basename } from 'path';
import { fileURLToPath } from 'url';

export const command: Bot.Command = {
	data: new SlashCommandBuilder()
		.setName(basename(fileURLToPath(import.meta.url), '.js').toLowerCase())
		.setDescription('Displays bot latency'),
	async execute({ command }) {
		return await Bot.respond(command, `📶 | **${command.client.ws.ping.toString()}** ms`);
	},
};
