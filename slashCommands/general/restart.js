export default {
    name: "restart",
    description: "Restarts the bot",
    run: async (client, interaction) => {
        await interaction.followUp({ content: `🔄️ | <@${client.user.id}> is restarting` });
        await client.user.setStatus('idle');
        await console.log("Bot is restarting...");
        
        process.exit(0);
    },
};