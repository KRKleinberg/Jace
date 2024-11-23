import * as App from '@utils/app';
import { useQueue } from 'discord-player';
import { SlashCommandBuilder } from 'discord.js';
import { basename } from 'path';
import { fileURLToPath } from 'url';

export const command: App.Command = {
	aliases: ['fs'],
	data: new SlashCommandBuilder()
		.setName(basename(fileURLToPath(import.meta.url), '.js').toLowerCase())
		.setDescription('Skips the current track'),
	async execute({ command, guild, member }) {
		const queue = useQueue();
		const currentTrack = queue?.currentTrack;

		if (member.voice.channel == null)
			return await App.respond(command, '❌ | You are not in a voice channel');
		if (currentTrack == null)
			return await App.respond(command, '❌ | There are no tracks in the queue');
		if (member.voice.channel !== queue?.channel)
			return await App.respond(command, '❌ | You are not in the same voice channel as the app');

		try {
			queue.node.skip();
		} catch (error) {
			console.error(error);

			return await App.respond(command, '⚠️ | Could not skip the track');
		}

		return await App.respond(
			command,
			`⏭️ | Skipped **${currentTrack.cleanTitle}** by **${currentTrack.author}**`
		);
	},
};
