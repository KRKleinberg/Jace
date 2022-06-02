import client from "../index";

client.on("ready", () => {
	console.log(`${client.user.tag} is online! Prefix set as "${process.env.PREFIX}"`);
	client.user.setStatus("online");
	client.user.setActivity({
		name: "Frogger | jacehelp",
		type: "PLAYING",
	});
});
