import { ChatInputCommandInteraction, EmbedBuilder, GuildMember } from 'discord.js';

export default {
	data: {
		name: 'teams',
		description: 'Splits users in voice channel into two teams',
	},
	async execute(interaction: ChatInputCommandInteraction) {
		if ((interaction.member as GuildMember).voice.channel) {
			const voiceMembers = (interaction.member as any).voice.channel.members.filter(
				(member: GuildMember) => !member.user.bot
			);
			const shuffled = voiceMembers
				.map((value: any) => ({ value, sort: Math.random() }))
				.sort((a: { sort: number }, b: { sort: number }) => a.sort - b.sort)
				.map((value: any) => value);
			const half = Math.ceil(shuffled.length / 2);
			const teamA = shuffled.slice(0, half);
			const teamB = shuffled.slice(half);
			const mapChoice = shuffled[Math.floor(Math.random() * shuffled.length)];

			const embed = new EmbedBuilder()
				.setTitle('Teams')
				.addFields([
					{
						name: 'Team A',
						value: `${teamA.join('\n')}\u200B`,
						inline: true,
					},
					{
						name: 'Team B',
						value: `${teamB.join('\n').toString()}\u200B`,
						inline: true,
					},
					{
						name: 'Map Choice',
						value: `${mapChoice.toString()}\u200B`,
					},
				])
				.setColor('#5864f1');

			await interaction.reply({ embeds: [embed] });
		} else {
			await interaction.reply({ content: '❌ | Youre not in a voice channel!' });
		}
	},
};
