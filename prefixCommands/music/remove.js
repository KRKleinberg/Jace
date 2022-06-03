export default {
	name: "remove",
	aliases: ["rm"],
	description: "Removes a specific track",
	options: ["\u0060track number\u0060"],
	run: async (client, message, args) => {
		if (message.member.voice.channel) {
            const queue = client.player.getQueue(message.guildId);
            
			if (queue && queue.playing) {
				const trackIndex = parseInt(args[0], 10) - 1;
				const trackName = queue.tracks[trackIndex];
				const success = queue.remove(trackIndex);

				message.channel.send({
					content: success
						? `🗑️ | Removed **${trackName}**.`
						: "❌ | Please enter a valid track number in the queue",
				});
			} else message.channel.send({ content: "❌ | No music is playing!" });
		} else message.channel.send({ content: "❌ | You're not in a voice channel!" });
	},
};
