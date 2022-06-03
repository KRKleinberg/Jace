export default {
	name: "pause",
	aliases: ["ps"],
	description: "Pauses the current song",
	options: [],
	run: async (client, message) => {
		if (message.member.voice.channel) {
			const queue = client.player.getQueue(message.guildId);

			if (queue && queue.playing) {
				const paused = queue.setPaused(true);

				message.channel.send({ content: paused ? "⏸ | Paused!" : "❌ | Something went wrong!" });
			} else message.channel.send({ content: "❌ | No music is being played!" });
		} else message.channel.send({ content: "❌ | You're not in a voice channel!" });
	},
};
