export default {
    name: "restart",
    aliases: [],
    description: "Restarts the bot",
    options: [],
    run: async (client, message) => {
        await message.channel.send(`🔄️ | <@${client.user.id}> is restarting`);
        await client.user.setStatus('idle');
        await console.log("Bot is restarting...");
        
        process.exit(0);
    },
};