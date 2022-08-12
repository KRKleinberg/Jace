import { EmbedBuilder, Message } from 'discord.js';

export default {
	data: {
		name: 'teams',
		description: 'Splits users in voice channel into two teams',
	},
	async execute(message: Message) {
		if (!message.member!.voice.channel) {
			return message.channel.send({ content: '❌ | You are not in a voice channel!' });
		}

		const voiceMembers = message.member!.voice.channel.members.filter((member) => !member.user.bot);
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

		return message.channel.send({ embeds: [embed] });
	},
};
