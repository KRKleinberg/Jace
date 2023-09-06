import { InteractionType, SlashCommandBuilder, type Client } from 'discord.js';

export default {
	aliases: ['coin'],
	data: new SlashCommandBuilder().setDescription('Flips a coin'),
	async execute({ command }) {
		const isInteraction = command.type === InteractionType.ApplicationCommand;

		const response = `🪙 | **${Math.round(Math.random()) !== 0 ? 'Heads' : 'Tails'}**`;
		return isInteraction ? await command.editReply(response) : await command.channel.send(response);
	},
} satisfies Client['command'];
