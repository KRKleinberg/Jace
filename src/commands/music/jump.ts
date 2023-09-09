import { useQueue } from 'discord-player';
import {
	InteractionType,
	SlashCommandBuilder,
	type Command,
	type MessageCreateOptions,
	type MessagePayload,
} from 'discord.js';

export default {
	aliases: ['skipto'],
	data: new SlashCommandBuilder()
		.setDescription('Jumps to a track in the queue')
		.addIntegerOption((option) =>
			option.setName('track').setDescription('The position in the queue of the track you want to jump to').setRequired(true)
		),
	async execute({ command, guild, member, args }) {
		const isInteraction = command.type === InteractionType.ApplicationCommand;
		const queue = useQueue(guild);
		const currentTrack = queue?.currentTrack;
		const trackNumber = isInteraction ? command.options.getInteger('track', true) - 1 : parseInt(args[0]) - 1;
		const track = queue?.tracks.toArray()[trackNumber];

		if (member.voice.channel == null) {
			const response: string | MessagePayload | MessageCreateOptions = '❌ | You are not in a voice channel';
			return isInteraction
				? await command.followUp({ content: response, ephemeral: true })
				: await command.channel.send(response);
		}
		if (currentTrack == null) {
			const response: string | MessagePayload | MessageCreateOptions = '❌ | There are no tracks in the queue';
			return isInteraction
				? await command.followUp({ content: response, ephemeral: true })
				: await command.channel.send(response);
		}
		if (member.voice.channel !== queue?.channel) {
			const response: string | MessagePayload | MessageCreateOptions =
				'❌ | You are not in the same voice channel as the bot';
			return isInteraction
				? await command.followUp({ content: response, ephemeral: true })
				: await command.channel.send(response);
		}
		if (track == null) {
			const response: string | MessagePayload | MessageCreateOptions = '❌ | Please enter a valid track number';
			return isInteraction
				? await command.followUp({ content: response, ephemeral: true })
				: await command.channel.send(response);
		}

		try {
			queue.node.skipTo(track);
		} catch (error) {
			console.error(error);

			const response: string | MessagePayload | MessageCreateOptions = '❌ | Could not jump to that track';
			return isInteraction
				? await command.followUp({ content: response, ephemeral: true })
				: await command.channel.send(response);
		}

		const response:
			| string
			| MessagePayload
			| MessageCreateOptions = `⏭️ | Jumped to **${track.title}** by **${track.author}**`;
		return isInteraction ? await command.editReply(response) : await command.channel.send(response);
	},
} satisfies Command;
