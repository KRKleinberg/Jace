import { type Command } from '#utils/app';
import { resolveEmbedColor } from '#utils/embeds';
import { randomizeArray } from '#utils/helpers';
import { EmbedBuilder, GuildMember, SlashCommandBuilder } from 'discord.js';

export const command: Command = {
	data: new SlashCommandBuilder().setDescription('Splits voice channel members into two teams'),
	async execute(ctx) {
		if (!ctx.member.voice.channel) {
			return await ctx.respond('You are not in a voice channel', { type: 'USER_ERROR' });
		}

		const voiceMembers = randomizeArray(
			ctx.member.voice.channel.members.reduce((voiceMembers: GuildMember[], voiceMember) => {
				if (!voiceMember.user.bot) voiceMembers.push(voiceMember);

				return voiceMembers;
			}, []),
		);
		const half = Math.ceil(voiceMembers.length / 2);
		const mapChoice = voiceMembers[Math.floor(Math.random() * voiceMembers.length)];

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
					value: mapChoice!.toString(),
				},
			])
			.setColor(resolveEmbedColor(ctx.source.channelId));

		return await ctx.respond({ embeds: [embed] });
	},
};
