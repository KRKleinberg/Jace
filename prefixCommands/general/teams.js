export default {
	name: "teams",
	aliases: [],
	description: "Splits users in voice channel into two teams",
	options: [],
	run: async (client, message) => {
		const voiceMembers = message.member.voice.channel.members;
		const half = Math.floor(voiceMembers.lenth / 2);
		function shuffle(array) {
			const shuffled = array;
			// eslint-disable-next-line no-plusplus
			for (let i = shuffled.length - 1; i > 0; i--) {
				const j = Math.floor(Math.random() * (i + 1));
				// eslint-disable-next-line no-param-reassign
				[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
			}
			return shuffled;
		}
		const shuffled = shuffle(voiceMembers);
		const teamA = shuffled.slice(0, half);
		const teamB = shuffled.slice(-half);
		const mapChoice = shuffled[Math.floor(Math.random() * shuffled.length)];

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
					value: `3 ${shuffled} ${shuffled.length}`,
				},
			],
			color: 0x5864f1,
		},
	],
});
	},
};
