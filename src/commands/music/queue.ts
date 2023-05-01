import { useQueue } from 'discord-player';
import { Str } from '@supercharge/strings';
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
	data: new SlashCommandBuilder().setDescription('Displays the queue'),
	async execute(command: ChatInputCommandInteraction | Message, guild: Guild, member: GuildMember, args: string[]) {
		const isInteraction = command.type === InteractionType.ApplicationCommand;
		const queue = useQueue(guild);
		const currentTrack = queue?.currentTrack;

		if (!currentTrack) {
			const response = '❌ | There are no tracks in the queue';
			return isInteraction ? command.followUp({ content: response, ephemeral: true }) : command.channel.send(response);
		}

		try {
			const embed = new EmbedBuilder().setColor(0x5864f1).setTitle('Queue').setDescription(`
				${Str(
				`**Now Playing:**\n[**${queue.currentTrack.title}**](${queue.currentTrack.url}) by **${
					queue.currentTrack.author
				}**\n\n${queue.tracks
					.map((track, index) => `**${index + 1}.** [**${track.title}**](${track.url}) by **${track.author}**`)
					.join('\n')}`
			).limit(4093, '...')}`);
			const response = { embeds: [embed] };
			return isInteraction ? command.editReply(response) : command.channel.send(response);
		} catch (error) {
			console.error(error);

			const response = '❌ | Could not display the queue';
			return isInteraction ? command.followUp({ content: response, ephemeral: true }) : command.channel.send(response);
		}
	},
};
