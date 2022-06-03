export default {
	name: "disconnect",
	aliases: ["dc"],
	description: "Disconnects from voice channel",
	options: [],
	run: async (client, message) => {
        let queue = client.player.getQueue(message.guildId);
        
		if (!queue || !queue.playing) queue = await client.player.createQueue(message.guild);

        queue.destroy();
        
		message.channel.send({ content: "🔌 | Disconnected!" });
	},
};
