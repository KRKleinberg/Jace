import {
	InteractionType,
	SlashCommandBuilder,
	type Command,
	type InteractionEditReplyOptions,
	type MessageCreateOptions,
	type MessagePayload,
} from 'discord.js';
import { basename } from 'path';
import { fileURLToPath } from 'url';

export const command: Command = {
	data: new SlashCommandBuilder()
		.setName(basename(fileURLToPath(import.meta.url), '.js').toLowerCase())
		.setDescription('Displays bot latency'),
	async execute({ command }) {
		const isInteraction = command.type === InteractionType.ApplicationCommand;

		const response: string | MessagePayload | InteractionEditReplyOptions | MessageCreateOptions =
			`📶 | **${command.client.ws.ping.toString()}** ms`;
		return isInteraction ? await command.editReply(response) : await command.channel.send(response);
	},
};
