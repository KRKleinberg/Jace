import { Bot } from '@utils/bot';
import { useHistory, useQueue } from 'discord-player';
import { SlashCommandBuilder } from 'discord.js';
import { basename } from 'path';
import { fileURLToPath } from 'url';

export const command: Bot.Command = {
	data: new SlashCommandBuilder()
		.setName(basename(fileURLToPath(import.meta.url), '.js').toLowerCase())
		.setDescription('Plays the previous track'),
	async execute({ command, guild, member }) {
		const history = useHistory(guild);
		const queue = useQueue(guild);

		if (member.voice.channel == null)
			return await Bot.respond(command, '❌ | You are not in a voice channel');
		if (member.voice.channel !== history?.queue.channel)
			return await Bot.respond(command, '❌ | You are not in the same voice channel as the bot');
		if (history.isEmpty()) {
			try {
				await queue?.node.seek(0);
			} catch (error) {
				console.error(error);

				return await Bot.respond(command, '⚠️ | Could not go back a track');
			}

			return await Bot.respond(command, '⏮️ | Restarting track');
		}

		try {
			await history.previous(true);
		} catch (error) {
			console.error(error);

			return await Bot.respond(command, '⚠️ | Could not go back a track');
		}

		return await Bot.respond(command, '⏮️ | Playing previous track');
	},
};
