import { ActivityType } from "discord.js";
import { client } from "..";

console.log("ready");
client.once("ready", () => {
	console.log(`${client.user!.tag} is online! Prefix set as "${process.env.PREFIX}"`);

	client.user!.setPresence({
		activities: [{ name: `Frogger | ${process.env.PREFIX}help`, type: ActivityType.Playing }],
		status: "online",
	});
});
