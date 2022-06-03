import client from "../index.js";

client.once("ready", () => {
	console.log(`${client.user.tag} is online! Prefix set as "${process.env.PREFIX}"`);
	client.user.setStatus("online");
	client.user.setActivity({
		name: `Frogger | ${process.env.PREFIX}help`,
		type: "PLAYING",
	});
});
