export default {
	name: "clear",
	aliases: ["clr"],
	description: "Clears the queue",
	options: [],
	run: async (client, message) => {
		if (message.member.voice.channel) {
			const queue = client.player.getQueue(message.guildId);

			if (queue && queue.playing) {
				queue.clear();

				message.channel.send({ content: "🧼 | Queue cleared." });
			} else message.channel.send({ content: "❌ | No music is being played!" });
		} else message.channel.send({ content: "❌ | You're not in a voice channel!" });
	},
};
