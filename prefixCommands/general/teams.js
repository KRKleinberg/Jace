export default {
	name: "teams",
	aliases: [],
	description: "Splits users in voice channel into two teams",
	options: [],
	run: async (client, message) => {
		const voiceMembers = message.member.voice.channel.members;
		const half = Math.floor(voiceMembers.lenth / 2);
		const teams = voiceMembers
			.map((value) => ({ value, sort: Math.random() }))
			.sort((a, b) => a.sort - b.sort)
			.map(({ value }) => value);
		const teamA = teams.slice(0, half);
		const teamB = teams.slice(half, voiceMembers.lenth);

		message.channel.send({
			embeds: [
				{
					title: "Teams",
					fields: [
						{
							name: "Team A",
							value: `${teamA.join("\n")}`,
							inline: true,
						},
						{
							name: "Team B",
							value: `${teamB.join("\n")}`,
							inline: true,
						},
						{
							name: "Map Choice",
							value: `${teams[0]}`,
						},
					],
					color: 0x5864f1,
				},
			],
		});
	},
};
