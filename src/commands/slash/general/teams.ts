import {
	ChatInputCommandInteraction,
	EmbedBuilder,
	GuildMember,
	SlashCommandBuilder,
} from 'discord.js';

export default {
	data: new SlashCommandBuilder()
		.setName('teams')
		.setDescription('Splits users in voice channel into two teams'),
	async execute(interaction: ChatInputCommandInteraction) {
		const member = interaction.member as GuildMember;

		if (!member.voice.channel)
			return interaction.reply({ content: '❌ | Youre not in a voice channel!' });

		const voiceMembers = member.voice.channel!.members.filter((m) => !m.user.bot);
		const shuffled = voiceMembers
			.map((value) => ({ value, sort: Math.random() }))
			.sort((a, b) => a.sort - b.sort)
			.map(({ value }) => value);

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
			.setColor(0x5864f1);

		return interaction.reply({ embeds: [embed] });
	},
};
