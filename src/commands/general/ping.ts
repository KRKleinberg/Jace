import { App } from '#utils/app';
import { SlashCommandBuilder } from 'discord.js';
import { basename } from 'path';
import { fileURLToPath } from 'url';

export const command: App.Command = {
	data: new SlashCommandBuilder()
		.setName(basename(fileURLToPath(import.meta.url), '.js').toLowerCase())
		.setDescription('Displays app latency'),
	async execute({ command }) {
		return await App.respond(command, `📶 | **${command.client.ws.ping.toString()}** ms`);
	},
};
