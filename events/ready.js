import client from "../index.js";

client.on("ready", () => {
	console.log(`${client.user.tag} is online! Prefix set as "${process.env.PREFIX}"`);
	client.user.setStatus("online");
	client.activity.default();
});
