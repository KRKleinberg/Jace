export default {
	name: "resume",
	aliases: ['res'],
	description: "Resumes the current song",
	options: [],
	run: async (client, message) => {
		if (message.member.voice.channel) {
			const queue = client.player.getQueue(message.guildId);

			if (queue && queue.playing) {
				const resumed = queue.setPaused(false);

				message.channel.send({ content: resumed ? "▶ | Resumed!" : "❌ | Something went wrong!" });
			} else message.channel.send({ content: "❌ | No music is playing!" });
		} else message.channel.send({ content: "❌ | You're not in a voice channel!" });
	},
};
