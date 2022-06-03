import client from "../index.js";

client.on("ready", () => {
	process.send("ready");
	console.log(`${client.user.tag} is online! Prefix set as "${process.env.PREFIX}"`);
	client.user.setStatus("online");
	client.user.setActivity({
		name: `Frogger | ${process.env.PREFIX}help`,
		type: "PLAYING",
	});
});
