import { App } from '@microsoft/teams.apps';
import { ConsoleLogger } from '@microsoft/teams.common';
import { DevtoolsPlugin } from '@microsoft/teams.dev';
import { prompt } from './prompt';
import { generateChartCard } from './cards';
import { MessageActivity } from '@microsoft/teams.api';

const app = new App({
    logger: new ConsoleLogger('adventureworks-data-analyst', { level: 'debug' }),
    plugins: [new DevtoolsPlugin()],
});

app.on('install.add', async ({ send }) => {
    await send(
        "👋 Hi! I'm your Data Analyst Agent. Ask me about your data and I'll help you explore it with SQL and visualizations!"
    );
});

app.on('message', async ({ stream, send, activity }) => {
    await send({ type: 'typing' });

    // Streaming text response using onChunk
    let streamedText = '';
    let fullResponse = '';
    let sentMessageId: string | undefined;
    try {
        const res = await prompt.send(activity.text, {
            onChunk: async (chunk) => {
                if (typeof chunk === 'string') {
                    stream.emit(chunk);
                }
            }
        });
        fullResponse = typeof res.content === 'string' ? res.content : JSON.stringify(res.content);
    } catch (err) {
        await send({ type: 'message', text: 'Error streaming response.' });
        return;
    }

    // After streaming, parse the full response for chart data
    let resObj: any = fullResponse;
    if (typeof fullResponse === 'string') {
        try {
            resObj = JSON.parse(fullResponse);
        } catch {
            await send({ type: 'message', text: fullResponse });
            return;
        }
    }

    const parseable = resObj.parseable?.[0];
    if (parseable && parseable.shouldChart) {
        const card = generateChartCard(
            { columns: parseable.columns, rows: parseable.rows },
            parseable.chartType,
            parseable.options
        );
        const chartAndInsightsMsg = new MessageActivity(resObj.text || '').addAiGenerated();
        chartAndInsightsMsg.attachments = [{
            contentType: 'application/vnd.microsoft.card.adaptive',
            content: card
        }];
        await send(chartAndInsightsMsg);
    } else if (resObj.text) {
        // Only send a final text message if not already streamed
        if (!sentMessageId) {
            const messageActivity = new MessageActivity(resObj.text).addAiGenerated();
            await send(messageActivity);
        }
    }
});

(async () => {
    await app.start(+(process.env.PORT || 3000));
})();