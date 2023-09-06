import { useHistory, useQueue } from 'discord-player';
import { InteractionType, SlashCommandBuilder, type Client } from 'discord.js';

export default {
	data: new SlashCommandBuilder().setDescription('Plays the previous track'),
	async execute({ command, guild, member }) {
		const isInteraction = command.type === InteractionType.ApplicationCommand;
		const history = useHistory(guild);
		const queue = useQueue(guild);

		if (member.voice.channel == null) {
			const response = '❌ | You are not in a voice channel';
			return isInteraction
				? await command.followUp({ content: response, ephemeral: true })
				: await command.channel.send(response);
		}
		if (member.voice.channel !== history?.queue.channel) {
			const response = '❌ | You are not in the same voice channel as the bot';
			return isInteraction
				? await command.followUp({ content: response, ephemeral: true })
				: await command.channel.send(response);
		}

		if (history.isEmpty()) {
			try {
				await queue?.node.seek(0);
			} catch (error) {
				console.error(error);

				const response = '❌ | Could not go back a track';
				return isInteraction
					? await command.followUp({ content: response, ephemeral: true })
					: await command.channel.send(response);
			}

			const response = '⏮️ | Restarting track';
			return isInteraction ? await command.editReply(response) : await command.channel.send(response);
		}

		if (history.isEmpty()) {
			try {
				await queue?.node.seek(0);
			} catch (error) {
				console.error(error);

				const response = '❌ | Could not go back a track';
				return isInteraction ? command.followUp({ content: response, ephemeral: true }) : command.channel.send(response);
			}

			const response = '⏮️ | Restarting track';
			return isInteraction ? command.editReply(response) : command.channel.send(response);
		}

		try {
			await history.previous(true);
		} catch (error) {
			console.error(error);

			const response = '❌ | Could not go back a track';
			return isInteraction
				? await command.followUp({ content: response, ephemeral: true })
				: await command.channel.send(response);
		}

		const response = `⏮️ | Playing previous track`;
		return isInteraction ? await command.editReply(response) : await command.channel.send(response);
	},
} satisfies Client['command'];
