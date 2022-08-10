import { ActivityType } from "discord.js";
import { client } from "../index.js";

client.once("ready", () => {
	
	client.user!.setPresence({
		activities: [{ name: `Frogger | ${process.env.PREFIX}help`, type: ActivityType.Playing }],
		status: "online",
	});
	console.log(`${client.user!.tag} is online! Prefix set as "${process.env.PREFIX}"`);
});
