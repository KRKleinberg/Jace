import * as Bot from '@utils/bot';
import { useQueue } from 'discord-player';
import { SlashCommandBuilder } from 'discord.js';
import { basename } from 'path';
import { fileURLToPath } from 'url';

export const command: Bot.Command = {
	aliases: ['fs'],
	data: new SlashCommandBuilder()
		.setName(basename(fileURLToPath(import.meta.url), '.js').toLowerCase())
		.setDescription('Skips the current track'),
	async execute({ command, guild, member }) {
		const queue = useQueue(guild);
		const currentTrack = queue?.currentTrack;

		if (member.voice.channel == null)
			return await Bot.respond(command, '❌ | You are not in a voice channel');
		if (currentTrack == null)
			return await Bot.respond(command, '❌ | There are no tracks in the queue');
		if (member.voice.channel !== queue?.channel)
			return await Bot.respond(command, '❌ | You are not in the same voice channel as the bot');

		try {
			queue.node.skip();
		} catch (error) {
			console.error(error);

			return await Bot.respond(command, '⚠️ | Could not skip the track');
		}

		return await Bot.respond(
			command,
			`⏭️ | Skipped **${currentTrack.title}** by **${currentTrack.author}**`
		);
	},
};
