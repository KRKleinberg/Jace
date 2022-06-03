export default {
    name: "restart",
    aliases: [],
    description: "Restarts the bot",
    options: [],
    run: async (client, message) => {
        message.channel.send(`🔄️ | <@${client.user.id}> is restarting`);
        client.user.setStatus('idle');
        client.user.setActivity({
			name: "Restarting...",
			type: "PLAYING",
		});

        console.log("Bot is restarting...");
        
        process.exit(1);
    },
};