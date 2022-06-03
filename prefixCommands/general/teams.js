export default {
	name: "teams",
	aliases: [],
	description: "Splits users in voice channel into two teams",
	options: [],
	run: async (client, message) => {
		const voiceMembers = message.member.voice.channel.members;
		const half = Math.floor(voiceMembers.lenth / 2);
		function shuffle(array) {
			// eslint-disable-next-line no-plusplus
			for (let i = array.length - 1; i > 0; i--) {
				const j = Math.floor(Math.random() * (i + 1));
				// eslint-disable-next-line no-param-reassign
				[array[i], array[j]] = [array[j], array[i]];
			}
		}
		shuffle(voiceMembers);
		const teamA = voiceMembers.slice(0, half).join("\n");
		const teamB = voiceMembers.slice(-half).join("\n");
		const mapChoice = voiceMembers[Math.floor(Math.random() * voiceMembers.length)];

		message.channel.send({
	embeds: [
		{
			title: "Teams",
			fields: [
				{
					name: "Team A",
					value: `1 ${teamA}`,
					inline: true,
				},
				{
					name: "Team B",
					value: `2 ${teamB}`,
					inline: true,
				},
				{
					name: "Map Choice",
					value: `3 ${mapChoice}`,
				},
				{
					name: "Map Choice",
					value: `3 ${voiceMembers} ${voiceMembers.length}`,
				},
			],
			color: 0x5864f1,
		},
	],
});
	},
};
