import str from "@supercharge/strings";
import client from "../index.js";

let timeDisconnect;
function voiceDisconnect(queue) {
	timeDisconnect = setTimeout(() => {
		queue.destroy();
	}, 300000);
}

function stopTimeout() {
	clearTimeout(timeDisconnect);
}

client.player.on("error", (queue, error) => {
	console.log(`[${queue.guild.name}] Error emitted from the queue: ${error.message}`);
	if (error.message === "Status code: 410")
		queue.metadata.send(`🔞 | This video is age restricted, try a different one`);
	else queue.metadata.send(`⚠️ | **Error!** This video isn't working, try a different one`);
	client.user.setActivity({
		name: "Frogger | jacehelp",
		type: "PLAYING",
	});
});

client.player.on("connectionError", (queue, error) => {
	console.log(`[${queue.guild.name}] Error emitted from the connection: ${error.message}`);
	queue.metadata.send(
		`⚠️ | ${error.message} You may need to retry that command or restart the bot using "/restart"`
	);
	client.user.setActivity({
		name: "Frogger | jacehelp",
		type: "PLAYING",
	});
});

client.player.on("trackStart", (queue, track) => {
	stopTimeout();
	queue.metadata.send(`🎶 | Playing: **${track.title}** in **${queue.connection.channel.name}**!`);
	client.user.setActivity({
		name: `${track.title}`,
		type: "LISTENING",
	});
});

client.player.on("trackAdd", (queue, track) => {
	stopTimeout();
	if (track.url.includes("youtube") || track.url.includes("youtu.be")) {
		queue.metadata.send({
			embeds: [
				{
					author: {
						name: "Queued Track",
						icon_url: `${track.requestedBy.displayAvatarURL()}`,
					},
					color: 0x5864f1,
					thumbnail: {
						url: `${track.thumbnail}`,
					},
					title: `${str(`${track.title}`).limit(45, "...")}`,
					url: `${track.url}`,
					fields: [
						{
							name: "Channel",
							value: `${track.author}`,
							inline: true,
						},
						{
							name: "Duration",
							value: `${track.duration}`,
							inline: true,
						},
					],
				},
			],
		});
	} else if (track.url.includes("spotify")) {
		queue.metadata.send({
			embeds: [
				{
					author: {
						name: "Queued Track",
						icon_url: `${track.requestedBy.displayAvatarURL()}`,
					},
					color: 0x5864f1,
					thumbnail: {
						url: `${track.thumbnail}`,
					},
					title: `${str(`${track.title}`).limit(45, "...")}`,
					url: `${track.url}`,
					fields: [
						{
							name: "Artist",
							value: `${track.author}`,
							inline: true,
						},
						{
							name: "Duration",
							value: `${track.duration}`,
							inline: true,
						},
					],
				},
			],
		});
	} else if (track.url.includes("soundcloud")) {
		queue.metadata.send({
			embeds: [
				{
					author: {
						name: "Queued Track",
						icon_url: `http://assets.stickpng.com/thumbs/58e9198ceb97430e819064fa.png`,
					},
					color: 0x5864f1,
					thumbnail: {
						url: `${track.thumbnail}`,
					},
					title: `${str(`${track.title}`).limit(45, "...")}`,
					url: `${track.url}`,
					fields: [
						{
							name: "Channel",
							value: `${track.author}`,
							inline: true,
						},
						{
							name: "Duration",
							value: `${track.duration}`,
							inline: true,
						},
					],
				},
			],
		});
	} else queue.metadata.send(`✔️ | ${track.title} added to queue!`);
});

client.player.on("botDisconnect", (queue) => {
	queue.metadata.send("❌ | I was manually disconnected from the voice channel, clearing queue!");
	client.user.setActivity({
		name: "Frogger | jacehelp",
		type: "PLAYING",
	});
});

client.player.on("channelEmpty", (queue) => {
	queue.metadata.send("❌ | Nobody is in the voice channel, leaving...");
	queue.destroy();
	client.user.setActivity({
		name: "Frogger | jacehelp",
		type: "PLAYING",
	});
});

client.player.on("queueEnd", (queue) => {
	voiceDisconnect(queue);
	client.user.setActivity({
		name: "Frogger | jacehelp",
		type: "PLAYING",
	});
});
