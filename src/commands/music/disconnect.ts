import { useQueue } from 'discord-player';
import { InteractionType, SlashCommandBuilder, type Client } from 'discord.js';

export default {
	aliases: ['dc', 'stop'],
	data: new SlashCommandBuilder().setDescription('Disconnects from the voice channel'),
	async execute({ command, guild }) {
		const isInteraction = command.type === InteractionType.ApplicationCommand;
		const queue = useQueue(guild);

		try {
			queue?.delete();
		} catch (error) {
			console.error(error);

			const response = '❌ | Could not disconnect';
			return isInteraction
				? await command.followUp({ content: response, ephemeral: true })
				: await command.channel.send(response);
		}

		const response = `🔌 | Disconnected`;
		return isInteraction ? await command.editReply(response) : await command.channel.send(response);
	},
} satisfies Client['command'];
