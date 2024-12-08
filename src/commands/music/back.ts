import { App } from '#utils/app';
import { useHistory, useQueue } from 'discord-player';
import { SlashCommandBuilder } from 'discord.js';
import { basename } from 'path';
import { fileURLToPath } from 'url';

export const command: App.Command = {
	data: new SlashCommandBuilder()
		.setName(basename(fileURLToPath(import.meta.url), '.js').toLowerCase())
		.setDescription('Plays the previous track'),
	async execute({ command, member }) {
		const history = useHistory();
		const queue = useQueue();

		if (member.voice.channel == null)
			return await App.respond(command, '❌ | You are not in a voice channel');
		if (member.voice.channel !== history?.queue.channel)
			return await App.respond(command, '❌ | You are not in the same voice channel as the app');
		if (history.isEmpty()) {
			try {
				await queue?.node.seek(0);
			} catch (error) {
				console.error(error);

				return await App.respond(command, '⚠️ | Could not go back a track');
			}

			return await App.respond(command, '⏮️ | Restarting track');
		}

		try {
			await history.previous(true);
		} catch (error) {
			console.error(error);

			return await App.respond(command, '⚠️ | Could not go back a track');
		}

		return await App.respond(command, '⏮️ | Playing previous track');
	},
};
