import { QueryType } from "discord-player";

export default {
	name: "playnext",
	aliases: ["pn"],
	description: "Adds a song to the top of the queue",
	options: ["\u0060song\u0060"],
	run: async (client, message, args) => {
		if (message.member.voice.channel) {
			const query = args.join(" ");
			const searchResult = await client.player
				.search(query, {
					requestedBy: message.author,
					searchEngine: QueryType.AUTO,
				})
				.catch(() => {});

			if (searchResult && searchResult.tracks.length) {
				const queue = await client.player.getQueue(message.guild, {
					ytdlOptions: {
						requestOptions: {
							headers: {
								cookie: process.env.COOKIE,
								"x-youtube-identity-token": process.env.ID_TOKEN,
							},
						},
						quality: "highest",
						filter: "audioonly",
						// eslint-disable-next-line no-bitwise
						highWaterMark: 1 << 25,
						dlChunkSize: 0,
					},
					leaveOnEnd: false,
					leaveOnStop: true,
					leaveOnEmpty: false,
					leaveOnEmptyCooldown: 5000,
					autoSelfDeaf: true,
					metadata: message.channel,
				});

				if (queue && queue.playing) {
					await message.channel.send({
						content: `⏱ | Loading your ${searchResult.playlist ? "playlist" : "track"}...`,
					});

					if (searchResult.playlist) queue.insert(searchResult.tracks);
					else queue.insert(searchResult.tracks[0]);
				} else message.channel.send({ content: "❌ | No music is playing!" });
			} else message.channel.send({ content: "❌ | No results were found!" });
		} else message.channel.send({ content: "❌ | You're not in a voice channel!" });
	},
};
