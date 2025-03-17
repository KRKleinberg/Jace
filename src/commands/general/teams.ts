import { App, type Command } from '#utils/app';
import { randomizeArray } from '#utils/helpers';
import { EmbedBuilder, GuildMember, SlashCommandBuilder } from 'discord.js';

export const command: Command = {
	data: new SlashCommandBuilder().setDescription('Splits voice channel members into two teams'),
	async run(ctx) {
		if (!ctx.member.voice.channel) {
			return await App.respond(ctx, 'You are not in a voice channel', 'USER_ERROR');
		}

		try {
			const voiceMembers = randomizeArray(
				ctx.member.voice.channel.members.reduce((voiceMembers: GuildMember[], voiceMember) => {
					if (!voiceMember.user.bot) {
						voiceMembers.push(voiceMember);
					}

					return voiceMembers;
				}, [])
			);
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
				.setColor(ctx.command.guild?.members.me?.displayHexColor ?? null);

			return await App.respond(ctx, { embeds: [embed] });
		} catch (error) {
			console.error('Teams Command Error -', error);

			return await App.respond(ctx, 'Could not display teams', 'APP_ERROR');
		}
	},
};
