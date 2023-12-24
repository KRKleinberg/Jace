import { useQueue } from 'discord-player';
import {
	InteractionType,
	SlashCommandBuilder,
	type Command,
	type MessageCreateOptions,
	type MessagePayload,
} from 'discord.js';
import { basename } from 'path';
import { fileURLToPath } from 'url';

export const command: Command = {
	aliases: ['dc', 'stop'],
	data: new SlashCommandBuilder()
		.setName(basename(fileURLToPath(import.meta.url), '.js').toLowerCase())
		.setDescription('Disconnects from the voice channel'),
	async execute({ command, guild }) {
		const isInteraction = command.type === InteractionType.ApplicationCommand;
		const queue = useQueue(guild);

		try {
			queue?.delete();
		} catch (error) {
			console.error(error);

			const response: string | MessagePayload | MessageCreateOptions = '⚠️ | Could not disconnect';
			return isInteraction
				? await command.followUp({ content: response, ephemeral: true })
				: await command.channel.send(response);
		}

		const response: string | MessagePayload | MessageCreateOptions = `🔌 | Disconnected`;
		return isInteraction ? await command.editReply(response) : await command.channel.send(response);
	},
};
