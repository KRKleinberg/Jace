import { useHistory, useQueue } from 'discord-player';
import {
	InteractionType,
	SlashCommandBuilder,
	type Command,
	type InteractionEditReplyOptions,
	type MessageCreateOptions,
	type MessagePayload,
} from 'discord.js';

export default {
	data: new SlashCommandBuilder().setDescription('Plays the previous track'),
	async execute({ command, guild, member }) {
		const isInteraction = command.type === InteractionType.ApplicationCommand;
		const history = useHistory(guild);
		const queue = useQueue(guild);

		if (member.voice.channel == null) {
			const response: string | MessagePayload | MessageCreateOptions = '❌ | You are not in a voice channel';
			return isInteraction
				? await command.followUp({ content: response, ephemeral: true })
				: await command.channel.send(response);
		}
		if (member.voice.channel !== history?.queue.channel) {
			const response: string | MessagePayload | MessageCreateOptions =
				'❌ | You are not in the same voice channel as the bot';
			return isInteraction
				? await command.followUp({ content: response, ephemeral: true })
				: await command.channel.send(response);
		}

		if (history.isEmpty()) {
			try {
				await queue?.node.seek(0);
			} catch (error) {
				console.error(error);

				const response: string | MessagePayload | MessageCreateOptions = '⚠️ | Could not go back a track';
				return isInteraction
					? await command.followUp({ content: response, ephemeral: true })
					: await command.channel.send(response);
			}

			const response: string | MessagePayload | MessageCreateOptions = '⏮️ | Restarting track';
			return isInteraction ? await command.editReply(response) : await command.channel.send(response);
		}

		if (history.isEmpty()) {
			try {
				await queue?.node.seek(0);
			} catch (error) {
				console.error(error);

				const response: string | MessagePayload | MessageCreateOptions = '⚠️ | Could not go back a track';
				return isInteraction
					? await command.followUp({ content: response, ephemeral: true })
					: await command.channel.send(response);
			}

			const response: string | MessagePayload | MessageCreateOptions = '⏮️ | Restarting track';
			return isInteraction ? await command.editReply(response) : await command.channel.send(response);
		}

		try {
			await history.previous(true);
		} catch (error) {
			console.error(error);

			const response: string | MessagePayload | MessageCreateOptions = '⚠️ | Could not go back a track';
			return isInteraction
				? await command.followUp({ content: response, ephemeral: true })
				: await command.channel.send(response);
		}

		const response:
			| string
			| MessagePayload
			| InteractionEditReplyOptions
			| MessageCreateOptions = `⏮️ | Playing previous track`;
		return isInteraction ? await command.editReply(response) : await command.channel.send(response);
	},
} satisfies Command;
