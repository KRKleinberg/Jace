import { useQueue } from 'discord-player';
import {
	ChatInputCommandInteraction,
	EmbedBuilder,
	Guild,
	GuildMember,
	InteractionType,
	Message,
	SlashCommandBuilder,
} from 'discord.js';

export default {
	aliases: [''],
	data: new SlashCommandBuilder().setDescription('Displays the currently playing song info'),
	async execute(command: ChatInputCommandInteraction | Message, guild: Guild, member: GuildMember, args: string[]) {
		const isInteraction = command.type === InteractionType.ApplicationCommand;
		const queue = useQueue(guild);
		const currentTrack = queue?.currentTrack;

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
			const embed = new EmbedBuilder()
				.setColor(0x5864f1)
				.setTitle('Now Playing')
				.setFields([
					{
						name: currentTrack.title,
						value: queue.node.createProgressBar() || currentTrack.author,
					},
				]);

			const response = { embeds: [embed] };
			return isInteraction ? command.editReply(response) : command.channel.send(response);
		} catch (error) {
			console.error(error);

			const response = `🎶 | Now playing **${currentTrack.title}** by **${currentTrack.author}**`;
			return isInteraction ? command.editReply(response) : command.channel.send(response);
		}
	},
};
