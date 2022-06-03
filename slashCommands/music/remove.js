export default {
    name: 'remove',
    description: 'Removes a specific track',
    options: [
        {
            name: 'track',
            description: 'The number of the track in the queue to remove',
            type: 'INTEGER',
            required: true
        }
    ],
    run: async (client, interaction) => {
        const queue = client.player.getQueue(interaction.guildId);
        if (queue || queue.playing) {
            const trackIndex = interaction.options.getNumber("track") - 1;
            const success = queue.remove(trackIndex);

            interaction.followUp({ content: success ? `➖ | Removed track ${queue.tracks[trackIndex]}.` : '❌ | Please enter a valid track number in the queue' });
        } else interaction.followUp({ content: "❌ | No music is being played!" });
    },
};