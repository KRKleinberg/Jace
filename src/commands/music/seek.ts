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
		.setDescription('Seeks to the given time in seconds')
		.addIntegerOption((option) =>
			option.setName('seconds').setDescription('The time to seek to in seconds').setRequired(true)
		),
	async execute(command: ChatInputCommandInteraction | Message, guild: Guild, member: GuildMember, args: string[]) {
		const isInteraction = command.type === InteractionType.ApplicationCommand;
		const queue = useQueue(guild);
		const currentTrack = queue?.currentTrack;
		const seconds = isInteraction ? command.options.getInteger('seconds', true) * 1000 : parseInt(args[0]) * 1000;

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

		try {
			queue.node.seek(seconds * 1000);
		} catch (error) {
			console.error(error);

			const response = `❌ | Could not seek to **${seconds}** s`;
			return isInteraction ? command.followUp({ content: response, ephemeral: true }) : command.channel.send(response);
		}

		const response = `⏩ | Seeked to **${seconds}** s`;
		return isInteraction ? command.editReply(response) : command.channel.send(response);
	},
};
