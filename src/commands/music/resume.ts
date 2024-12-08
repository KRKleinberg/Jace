import { App } from '#utils/app';
import { useQueue } from 'discord-player';
import { SlashCommandBuilder } from 'discord.js';
import { basename } from 'path';
import { fileURLToPath } from 'url';

export const command: App.Command = {
	aliases: ['res'],
	data: new SlashCommandBuilder()
		.setName(basename(fileURLToPath(import.meta.url), '.js').toLowerCase())
		.setDescription('Resumes the player'),
	async execute({ command, member }) {
		const queue = useQueue();
		const currentTrack = queue?.currentTrack;

		if (member.voice.channel == null)
			return await App.respond(command, '❌ | You are not in a voice channel');
		if (currentTrack == null)
			return await App.respond(command, '❌ | There are no tracks in the queue');
		if (member.voice.channel !== queue?.channel)
			return await App.respond(command, '❌ | You are not in the same voice channel as the app');
		if (queue.node.isPlaying()) return await App.respond(command, '🎶 | A track is already playing');

		try {
			queue.node.resume();
		} catch (error) {
			console.error(error);

			return await App.respond(command, '⚠️ | Could not resume the player');
		}

		return await App.respond(
			command,
			`▶️ | Resumed **${currentTrack.cleanTitle}** by **${currentTrack.author}**`
		);
	},
};
