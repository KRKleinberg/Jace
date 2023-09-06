import { InteractionType, SlashCommandBuilder, type Client } from 'discord.js';

export default {
	data: new SlashCommandBuilder().setDescription('Displays bot latency'),
	async execute({ command }) {
		const isInteraction = command.type === InteractionType.ApplicationCommand;

		const response = `📶 | **${command.client.ws.ping.toString()}** ms`;
		return isInteraction ? await command.editReply(response) : await command.channel.send(response);
	},
} satisfies Client['command'];
