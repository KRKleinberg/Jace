export default {
	name: "queue",
	aliases: ["q"],
	description: "Displays the queue",
	options: [],
	run: async (client, message) => {
		const queue = client.player.getQueue(message.guildId);

		if (queue && queue.playing) {
			const currentTrack = queue.current;
			const tracks = queue.tracks
				.slice(0, 10)
				.map((m, i) => `${i + 1}. **${m.title}** ([link](${m.url}))`);

			message.channel.send({
				embeds: [
					{
						title: "Server Queue",
						description: `${tracks.join("\n")}${
							queue.tracks.length > tracks.length
								? `\n...${
										queue.tracks.length - tracks.length === 1
											? `${queue.tracks.length - tracks.length} more track`
											: `${queue.tracks.length - tracks.length} more tracks`
								  }`
								: ""
						}`,
						color: 0x5864f1,
						fields: [
							{ name: "Now Playing", value: `🎶 | **${currentTrack.title}** ([link](${currentTrack.url}))` },
						],
					},
				],
			});
		} else message.channel.send({ content: "❌ | No music is being played!" });
	},
};
