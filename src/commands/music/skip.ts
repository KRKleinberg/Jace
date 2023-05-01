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
	aliases: ['fs'],
	data: new SlashCommandBuilder().setDescription('Skips the current track'),
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
			queue.node.skip();
		} catch (error) {
			console.error(error);

			const response = '❌ | Could not skip the track';
			return isInteraction ? command.followUp({ content: response, ephemeral: true }) : command.channel.send(response);
		}

		const response = `⏭️ | Skipped **${currentTrack.title}** by **${currentTrack.author}**`;
		return isInteraction ? command.editReply(response) : command.channel.send(response);
	},
};
