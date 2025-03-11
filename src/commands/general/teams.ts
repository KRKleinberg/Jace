import { App } from '#utils/app';
import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';

export const command: App.Command = {
	data: new SlashCommandBuilder().setDescription('Splits voice channel members into two teams'),
	async run(ctx) {
		if (!ctx.member.voice.channel) {
			return await App.respond(ctx, 'You are not in a voice channel', App.ResponseType.UserError);
		}

		try {
			const voiceMembers = ctx.member.voice.channel.members
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
				.setColor(ctx.command.guild?.members.me?.displayHexColor ?? null);

			return await App.respond(ctx, { embeds: [embed] });
		} catch (error) {
			console.error('Teams Command Error -', error);

			return await App.respond(ctx, 'Could not display teams', App.ResponseType.AppError);
		}
	},
};
