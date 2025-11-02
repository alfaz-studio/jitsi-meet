import { setTestProperties } from '../../helpers/TestProperties';
import { ensureOneParticipant } from '../../helpers/participants';

setTestProperties(__filename, { usesBrowsers: [ 'p1' ] });

describe('Chat Panel', () => {
    it('join participant', () => ensureOneParticipant({
        useActiveToken: true
    }));

    it('start closed', async () => {
        expect(await ctx.p1.getChatPanel().isOpen()).toBe(false);
    });
    it('open', async () => {
        const { p1 } = ctx;

        await p1.getToolbar().clickChatButton();
        expect(await p1.getChatPanel().isOpen()).toBe(true);
    });
    it('use shortcut to close', async () => {
        const chatPanel = ctx.p1.getChatPanel();

        await chatPanel.pressShortcut();
        expect(await chatPanel.isOpen()).toBe(false);
    });
    it('use shortcut to open', async () => {
        const chatPanel = ctx.p1.getChatPanel();

        await chatPanel.pressShortcut();
        expect(await chatPanel.isOpen()).toBe(true);
    });
    it('use button to open', async () => {
        const { p1 } = ctx;

        await p1.getToolbar().clickCloseChatButton();
        expect(await p1.getChatPanel().isOpen()).toBe(false);
    });
});
