import { App } from '#utils/app';
import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import { basename } from 'path';
import { fileURLToPath } from 'url';

export const command: App.Command = {
	data: new SlashCommandBuilder()
		.setName(basename(fileURLToPath(import.meta.url), '.js').toLowerCase())
		.setDescription('Splits voice channel members into two teams'),
	async execute({ command, member, preferences }) {
		if (member.voice.channel == null)
			return await App.respond(command, '❌ | You are not in a voice channel');

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
				.setColor(preferences.color);

			return await App.respond(command, { embeds: [embed] });
		} catch (error) {
			console.error(error);

			return await App.respond(command, '⚠️ | Could not display teams');
		}
	},
};
