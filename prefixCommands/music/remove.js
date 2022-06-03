export default {
	name: "remove",
	aliases: ["-"],
	description: "Removes a specific track",
	options: ["`track number`"],
	run: async (client, message, args) => {
		const queue = client.player.getQueue(message.guildId);
		if (queue || queue.playing) {
			const trackIndex = parseInt(args[0], 10) - 1;
			const success = queue.remove(trackIndex);

			message.channel.send({
				content: success
					? `➖ | Removed track ${queue.tracks[trackIndex].title}.`
					: "❌ | Please enter a valid track number in the queue",
			});
		} else message.channel.send({ content: "❌ | No music is being played!" });
	},
};