import { EmbedBuilder, InteractionType, SlashCommandBuilder, type Client } from 'discord.js';

export default {
	data: new SlashCommandBuilder().setDescription('Splits voice channel members into two teams'),
	async execute({ command, member, defaultPrefs, guildPrefs }) {
		const isInteraction = command.type === InteractionType.ApplicationCommand;

		if (member.voice.channel == null) {
			const response = '❌ | You are not in a voice channel';
			return isInteraction
				? await command.followUp({ content: response, ephemeral: true })
				: await command.channel.send(response);
		}

		try {
			const voiceMembers = member.voice.channel.members
				.filter((member) => !member.user.bot)
				.map((voiceMember) => ({ voiceMember, sort: Math.random() }))
				.sort((a, b) => a.sort - b.sort)
				.map(({ voiceMember }) => voiceMember);
			const half = Math.ceil(voiceMembers.length / 2);
			const embed = new EmbedBuilder()
				.setTitle('Teams')
				.addFields([
					{
						name: 'Team A',
						value: voiceMembers.slice(0, half).join('\n'),
						inline: true,
					},
					{
						name: 'Team B',
						value: voiceMembers.length >= 2 ? voiceMembers.slice(half).join('\n') : '--',
						inline: true,
					},
					{
						name: 'Map Choice',
						value: voiceMembers[Math.floor(Math.random() * voiceMembers.length)].toString(),
					},
				])
				.setColor(guildPrefs?.color ?? defaultPrefs.color);

			const response = { embeds: [embed] };
			return isInteraction ? await command.editReply(response) : await command.channel.send(response);
		} catch (error) {
			console.error(error);

			const response = '❌ | Could not display teams';
			return isInteraction
				? await command.followUp({ content: response, ephemeral: true })
				: await command.channel.send(response);
		}
	},
} satisfies Client['command'];
