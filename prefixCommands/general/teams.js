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
		const teamA = `${teams.slice(0, half).join("\n")}`;
		const teamB = `${teams.slice(half, voiceMembers.lenth).join("\n")}`;
		const mapChoice = `${teams[Math.floor(Math.random() * teams.lenth)]}`;

		message.channel.send({
			embeds: [
				{
					title: "Teams",
					fields: [
						{
							name: "Team A",
							value: teamA,
							inline: true,
						},
						{
							name: "Team B",
							value: teamB,
							inline: true,
						},
						{
							name: "Map Choice",
							value: mapChoice,
						},
					],
					color: 0x5864f1,
				},
			],
		});
	},
};
