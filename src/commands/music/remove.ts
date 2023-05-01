import { useQueue } from 'discord-player';
import {
	ChatInputCommandInteraction,
	Guild,
	GuildMember,
	InteractionType,
	Message,
	SlashCommandBuilder,
} from 'discord.js';

export default {
	aliases: [''],
	data: new SlashCommandBuilder()
		.setDescription('Removes a track from the queue')
		.addIntegerOption((option) =>
			option.setName('track').setDescription('The position in the queue of the track you want to remove').setRequired(true)
		),
	async execute(command: ChatInputCommandInteraction | Message, guild: Guild, member: GuildMember, args: string[]) {
		const isInteraction = command.type === InteractionType.ApplicationCommand;
		const queue = useQueue(guild);
		const currentTrack = queue?.currentTrack;
		const trackNumber = isInteraction ? command.options.getInteger('track', true) - 1 : parseInt(args[0]) - 1;
		const track = queue?.tracks.toArray()[trackNumber];

		if (!member.voice.channel) {
			const response = '❌ | You are not in a voice channel';
			return isInteraction ? command.followUp({ content: response, ephemeral: true }) : command.channel.send(response);
		}
		if (!currentTrack) {
			const response = '❌ | There are no tracks in the queue';
			return isInteraction ? command.followUp({ content: response, ephemeral: true }) : command.channel.send(response);
		}
		if (member.voice.channel !== queue.channel) {
			const response = '❌ | You are not in the same voice channel as the bot';
			return isInteraction ? command.followUp({ content: response, ephemeral: true }) : command.channel.send(response);
		}
		if (!track) {
			const response = '❌ | Please enter a valid track number';
			return isInteraction ? command.followUp({ content: response, ephemeral: true }) : command.channel.send(response);
		}

		try {
			queue.removeTrack(track);
		} catch (error) {
			console.error(error);

			const response = '❌ | Could not remove that track';
			return isInteraction ? command.followUp({ content: response, ephemeral: true }) : command.channel.send(response);
		}

		const response = `⏭️ | Removed **${track.title}** by **${track.author}**`;
		return isInteraction ? command.editReply(response) : command.channel.send(response);
	},
};
