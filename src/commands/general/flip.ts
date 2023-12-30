import { Bot } from '@utils/bot';
import { SlashCommandBuilder } from 'discord.js';
import { basename } from 'path';
import { fileURLToPath } from 'url';

export const command: Bot.Command = {
	aliases: ['coin'],
	data: new SlashCommandBuilder()
		.setName(basename(fileURLToPath(import.meta.url), '.js').toLowerCase())
		.setDescription('Flips a coin'),
	async execute({ command }) {
		return await Bot.respond(
			command,
			`🪙 | **${Math.round(Math.random()) !== 0 ? 'Heads' : 'Tails'}**`
		);
	},
};
