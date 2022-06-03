export default {
	name: "nowplaying",
	aliases: ["np"],
	description: "Displays currently playing song",
	options: [],
	run: async (client, message) => {
		if (message.member.voice.channel) {
			const queue = client.player.getQueue(message.guildId);

			if (queue && queue.playing) {
				const progress = queue.createProgressBar();
				const perc = queue.getPlayerTimestamp();

				message.channel.send({
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
			} else message.channel.send({ content: "❌ | No music is being played!" });
		} else message.channel.send({ content: "❌ | You're not in a voice channel!" });
	},
};
