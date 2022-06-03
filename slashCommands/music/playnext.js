import { QueryType } from "discord-player";

export default {
	name: "playnext",
	description: "Adds a song to the top of the queue",
	options: [
		{
			name: "song",
			type: "STRING",
			description: "The song you want to play next",
			required: true,
		},
	],
	run: async (client, interaction) => {
		if (interaction.member.voice.channel) {
			const query = interaction.options.get("song").value;
			const searchResult = await client.player
				.search(query, {
					requestedBy: interaction.user,
					searchEngine: QueryType.AUTO,
				})
				.catch(() => {});

			if (searchResult && searchResult.tracks.length) {
				const queue = await client.player.getQueue(interaction.guild, {
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
					metadata: interaction.channel,
				});

				if (queue && queue.playing) {
					await interaction.followUp({
						content: `⏱ | Loading your ${searchResult.playlist ? "playlist" : "track"}...`,
					});

					if (searchResult.playlist) queue.insert(searchResult.tracks);
					else queue.insert(searchResult.tracks[0]);
				} else interaction.followUp({ content: "❌ | No music is being played!" });
			} else interaction.followUp({ content: "❌ | No results were found!" });
		} else interaction.deferReply({ content: "❌ | You're not in a voice channel!" });
	},
};
