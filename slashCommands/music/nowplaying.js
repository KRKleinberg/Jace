export default {
    name: "nowplaying",
    description: "Displays currently playing song",
    run: async (client, interaction) => {
        const queue = client.player.getQueue(interaction.guildId);
        
        if (!queue || !queue.playing) return interaction.followUp({ content: "❌ | No music is being played!" });

        const progress = queue.createProgressBar();
        const perc = queue.getPlayerTimestamp();

        return interaction.followUp({
            embeds: [
                {
                    title: "Now Playing",
                    description: `🎶 | **${queue.current.title}** (\`${perc.progress}%\`)`,
                    fields: [
                        {
                            name: "\u200b",
                            value: progress
                        }
                    ],
                    color: 0x5864f1
                }
            ]
        });
    },
};