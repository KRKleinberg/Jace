export default {
	name: "nowplaying",
	aliases: ["np"],
	description: "Displays currently playing song",
	options: [],
	run: async (client, message) => {
		const queue = client.player.getQueue(message.guildId);
		if (!queue || !queue.playing)
			return void message.channel.send({ content: "❌ | No music is being played!" });
		const progress = queue.createProgressBar();
		const perc = queue.getPlayerTimestamp();

		return message.channel.send({
			embeds: [
				{
					title: "Now Playing",
					description: `🎶 | **${queue.current.title}** (\`${perc.progress}%\`)`,
					fields: [
						{
							name: "\u200b",
							value: progress,
						},
					],
					color: 0x5864f1,
				},
			],
		});
	},
};
