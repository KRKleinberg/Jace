import { Bot } from '@utils/bot';
import { useQueue } from 'discord-player';
import { SlashCommandBuilder } from 'discord.js';
import { basename } from 'path';
import { fileURLToPath } from 'url';

export const command: Bot.Command = {
	aliases: ['sh'],
	data: new SlashCommandBuilder()
		.setName(basename(fileURLToPath(import.meta.url), '.js').toLowerCase())
		.setDescription('Shuffles the queue'),
	async execute({ command, guild, member }) {
		const queue = useQueue(guild);

		if (member.voice.channel == null)
			return await Bot.respond(command, '❌ | You are not in a voice channel');
		if (queue?.isEmpty() ?? false)
			return await Bot.respond(command, '❌ | There are no tracks in the queue');
		if (member.voice.channel !== queue?.channel)
			return await Bot.respond(command, '❌ | You are not in the same voice channel as the bot');

		try {
			queue.tracks.shuffle();
		} catch (error) {
			console.error(error);

			return await Bot.respond(command, '⚠️ | Could not shuffle the queue');
		}

		return await Bot.respond(command, `🔀 | Shuffled the queue`);
	},
};
