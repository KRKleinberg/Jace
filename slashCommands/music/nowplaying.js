export default {
	name: "nowplaying",
	description: "Displays currently playing song",
	run: async (client, interaction) => {
		if (interaction.member.voice.channel) {
			const queue = client.player.getQueue(interaction.guildId);

			if (queue && queue.playing) {
				const progress = queue.createProgressBar();
				const perc = queue.getPlayerTimestamp();

				interaction.followUp({
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
			} else interaction.followUp({ content: "❌ | No music is being played!" });
		} else interaction.deferReply({ content: "❌ | You're not in a voice channel!" });
	},
};
