import { useQueue } from 'discord-player';
import {
	ChatInputCommandInteraction,
	Collection,
	EmbedBuilder,
	Guild,
	GuildMember,
	InteractionType,
	Message,
	SlashCommandBuilder,
} from 'discord.js';

export default {
	aliases: [''],
	data: new SlashCommandBuilder().setDescription('Splits voice channel members into two teams'),
	async execute(command: ChatInputCommandInteraction | Message, guild: Guild, member: GuildMember, args: string[]) {
		const isInteraction = command.type === InteractionType.ApplicationCommand;

		function shuffle(voiceMembers: Collection<string, GuildMember>) {
			return voiceMembers
				.map((voiceMember) => ({ voiceMember, sort: Math.random() }))
				.sort((a, b) => a.sort - b.sort)
				.map(({ voiceMember }) => voiceMember);
		}

		if (!member.voice.channel) {
			const response = '❌ | You are not in a voice channel';
			return isInteraction ? command.followUp({ content: response, ephemeral: true }) : command.channel.send(response);
		}

		try {
			const voiceMembers = shuffle(member.voice.channel.members.filter((member) => !member.user.bot));
			const half = Math.ceil(voiceMembers.length / 2);
			const embed = new EmbedBuilder()
				.setTitle('Teams')
				.addFields([
					{
						name: 'Team A',
						value: voiceMembers.slice(0, half).join('\n') || '--',
						inline: true,
					},
					{
						name: 'Team B',
						value: voiceMembers.slice(half).join('\n').toString() || '--',
						inline: true,
					},
					{
						name: 'Map Choice',
						value: voiceMembers[Math.floor(Math.random() * voiceMembers.length)].toString() || '--',
					},
				])
				.setColor(0x5864f1);

			const response = { embeds: [embed] };
			return isInteraction ? command.editReply(response) : command.channel.send(response);
		} catch (error) {
			console.error(error);

			const response = '❌ | Could not skip the track';
			return isInteraction ? command.followUp({ content: response, ephemeral: true }) : command.channel.send(response);
		}
	},
};
