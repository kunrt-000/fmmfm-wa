const { connectToWhatsApp } = require('./auth');
const { readContactsFromFile, validateContacts, filterValidContacts } = require('./contacts');
const path = require('path');
const express = require('express');
const axios = require('axios');
const { makeCacheableSignalKeyStore } = require('@whiskeysockets/baileys');

const app = express();
const port = 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

//  假设你有3个账号需要登录，这里使用session1, session2, session3
const sessions = {

};

//  指定联系人列表文件路径
const contactsFilePath = path.join(__dirname, '..', 'ws', 'contacts.txt');

let allContacts = []

async function main() {
    try {
        const sock = await connectToWhatsApp(Object.keys(sessions)[0] || 'default'); // 创建一个默认的连接,  只是为了读取验证联系人
        if (Object.keys(sessions).length > 0) {
            console.log(`使用默认session 读取并验证联系人`)
            const contacts = await readContactsFromFile(contactsFilePath);
            const validatedContacts = await validateContacts(sock, contacts);
            allContacts = filterValidContacts(validatedContacts);
            console.log('有效联系人列表:', allContacts);
        }
    } catch (error) {
        console.error(`默认会话连接失败`, error);
    }
}

app.get('/sessions', async (req, res) => {
    const sessionStatus = Object.keys(sessions).map(session => ({
        id: session,
        status: sessions[session]?.status || 'disconnected',
        error: sessions[session]?.error || null
    }));
    res.json(sessionStatus)
});

app.post('/read-contacts', async (req, res) => {
    if (Object.keys(sessions).filter(session => sessions[session]?.status === 'connected').length === 0) {
        return res.status(400).json({ error: "请先添加实例并完成认证" });
    }
    const sock = sessions[Object.keys(sessions)[0]]?.sock;
    if (!sock) {
        return res.status(400).json({ error: "没有可用会话连接." });
    }
    try {
        const contacts = await readContactsFromFile(contactsFilePath);
        const validatedContacts = await validateContacts(sock, contacts);
        const allContacts = filterValidContacts(validatedContacts);
        console.log('有效联系人列表:', allContacts);
        res.json(allContacts)
    } catch (error) {
        console.error(`读取联系人失败:`, error);
        res.status(500).json({ error: '读取联系人失败', message: error.message });
    }
});

app.get('/generate-qr/:sessionId', async (req, res) => {
    const { sessionId } = req.params;
    try {
        let sock = sessions[sessionId]?.sock;
        if (!sock) {
            console.log(`会话 ${sessionId} 不存在，正在建立连接...`)
            sock = await connectToWhatsApp(sessionId)
            sessions[sessionId] = {
                sock,
                keys: makeCacheableSignalKeyStore(sock.authState.keys, console),
            }
        } else {
            console.log(`会话 ${sessionId} 已存在, 直接获取二维码...`)
        }
        sock.generateQrCode = new Promise((resolve, reject) => {
            sock.ev.on('connection.update', (update) => {
                if (update.qr) {
                    resolve(update.qr);
                }
                if (update.connection == 'close') {
                    reject('会话连接中断')
                }
            })
        });
        const qr = await sock.generateQrCode
        sessions[sessionId].status = "connected";
        res.json({ qr })
    } catch (error) {
        console.error(`生成二维码失败:`, error);
        if (sessions[sessionId]) {
            sessions[sessionId].status = "disconnected";
            sessions[sessionId].error = error.message;
        }
        res.status(500).json({ error: '生成二维码失败', message: error.message });
    }
});
app.post('/send', async (req, res) => {
    try {
        const { contacts, template, instances } = req.body;
        if (!contacts || contacts.length === 0) {
            return res.status(400).json({ success: false, message: '联系人列表为空!' });
        }
        if (!template || !template.caption) {
            return res.status(400).json({ success: false, message: '请编辑消息模板!' });
        }
        if (!instances || instances.length === 0) {
            return res.status(400).json({ success: false, message: '请添加实例!' });
        }
        const results = []
        for (let contact of contacts) {
            let success = false;
            for (const session in sessions) {
                if (sessions[session]?.status === 'connected') {
                    const sock = sessions[session].sock;
                    try {
                        await sock.sendMessage(`${contact}@s.whatsapp.net`, { text: template.caption });
                        results.push({ contact: contact, result: { success: true } })
                        success = true;
                        break;
                    } catch (e) {
                        results.push({ contact: contact, result: { success: false, message: e.message } })
                    }
                }
            }
            if (!success) {
                results.push({ contact: contact, result: { success: false, message: '没有可用实例发送消息' } })
            }
        }

        res.json({ success: true, results: results });
    } catch (e) {
        res.status(500).json({ success: false, message: '发送消息失败', error: e.message })
    }
})
app.get('/instance/qr/:instanceId', async (req, res) => {
    const { instanceId } = req.params;
    const token = req.query.token;
    try {
        const response = await axios.get(`https://api.ultramsg.com/${instanceId}/instance/qr?token=${token}`)
        if (!response.data.qrCode) {
            return res.json({ message: '获取二维码失败' });
        }
        res.json({ qrCode: response.data.qrCode });
    } catch (e) {
        res.status(500).json({ message: '获取二维码失败', error: e.message });
    }
});
app.get('/instance/me/:instanceId', async (req, res) => {
    const { instanceId } = req.params;
    const token = req.query.token;
    try {
        const response = await axios.get(`https://api.ultramsg.com/${instanceId}/instance/me?token=${token}`);
        if (response.data.status) {
            res.json(response.data);
        } else {
            res.status(500).json({ success: false, message: '获取实例状态失败' });
        }

    } catch (e) {
        res.status(500).json({ success: false, message: '获取实例状态失败', error: e.message });
    }
});

app.listen(port, () => {
    console.log(`后端服务启动在 http://localhost:${port}`);
    main();
});