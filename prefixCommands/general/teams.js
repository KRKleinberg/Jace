export default {
	name: "teams",
	aliases: [],
	description: "Splits users in voice channel into two teams",
	options: [],
	run: async (client, message) => {
		const voiceMembers = message.member.voice.channel.members;
		const teammate = voiceMembers
			.map((value) => ({ value, sort: Math.random() }))
			.sort((a, b) => a.sort - b.sort)
			.map(({ value }) => value);
		
		message.channel.send({
	embeds: [
		{
			title: "Teams",
			fields: [
				{
					name: "Team A",
					value: `${teammate}`,
					inline: true,
				},
				{
					name: "Team B",
					value: "Kevin\nRyan",
					inline: true,
				},
				{
					name: "Map Choice",
					value: "Kevin",
				},
			],
			color: 0x5864f1,
		},
	],
});
	},
};
