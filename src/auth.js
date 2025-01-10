const { useMultiFileAuthState, makeWASocket, DisconnectReason, Browsers } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const path = require('path');

/**
 * Create a new WhatsApp connection.
 * @param {string} sessionId - The session ID.
 * @returns {Promise<WASocket>} A promise that resolves with the WhatsApp socket object.
 */
async function connectToWhatsApp(sessionId) {
    const authDir = path.join(__dirname, '..', 'ws', 'auth_info_baileys', sessionId);
    const { state, saveCreds } = await useMultiFileAuthState(authDir);
    const sock = makeWASocket({
        printQRInTerminal: true,
        auth: {
            creds: state.creds,
            /** caching makes the store faster to send/recv messages */
            keys: state.keys,
        },
        browser: Browsers.macOS('Chrome'),
    });

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log(`connection closed for session: ${sessionId} due to `, lastDisconnect?.error, ', reconnecting ', shouldReconnect);
            if (shouldReconnect) {
                connectToWhatsApp(sessionId);
            }
            console.warn(`连接到 ${sessionId} 的会话已关闭`, lastDisconnect?.error)

        } else if (connection === 'open') {
            console.log(`opened connection for session: ${sessionId}`);
        }
    });

    sock.ev.on('creds.update', saveCreds);

    return sock;
}


module.exports = {
    connectToWhatsApp,
};