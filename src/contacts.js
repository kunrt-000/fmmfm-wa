const fs = require('fs');
const { jidNormalizedUser } = require('@whiskeysockets/baileys')

/**
 * Reads contacts from a local file.
 * @param {string} filePath - The path to the contacts file.
 * @returns {Promise<string[]>} A promise that resolves with an array of contact numbers.
 */
async function readContactsFromFile(filePath) {
    try {
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        // 处理不同类型的文件 比如 .csv .txt
        const lines = fileContent.trim().split(/\r?\n/);
        const contacts = lines.map(line => {
            //  处理CSV文件格式：使用逗号分隔
            if (line.includes(',')) {
                return line.split(',')[0].trim()
            }
            //  处理普通文本格式 直接返回号码
            return line.trim();
        }).filter(Boolean); // 移除空字符串

        //  使用set进行去重, 使用更加严格的方式格式化 JID
        return [...new Set(contacts)].map(contact => jidNormalizedUser(contact)).filter(Boolean).map(jid => jid.split('@')[0]);
    } catch (error) {
        console.error('Error reading contacts from file:', error);
        return [];
    }
}



/**
 * Validates if given numbers are on WhatsApp.
 * @param {WASocket} sock - The WhatsApp socket object.
 * @param {string[]} contacts - An array of contact numbers.
 * @returns {Promise<{ id: string; exists: boolean }[]>} A promise that resolves with an array of validation results.
 */
async function validateContacts(sock, contacts) {
    if (!sock || !contacts || contacts.length == 0) {
        console.warn('无效参数或者列表为空')
        return []
    }
    try {
        console.log(`开始验证号码是否存在${JSON.stringify(contacts)}`)
        const exists = await sock.onWhatsApp(contacts.map(contact => contact + '@s.whatsapp.net'))
        const result = exists.map(item => ({
            id: item.jid.split('@')[0],
            exists: item.exists
        }))

        console.log('号码验证完成', result)
        return result
    } catch (error) {
        console.error('Error validating contacts:', error);
        return [];
    }
}

/**
 * Filter out contact who is not on WhatsApp.
 * @param {{id:string,exists:boolean}[]} contacts - contact list.
 * @returns {string[]} A promise that resolves with an array of valid contact numbers.
 */
function filterValidContacts(contacts) {
    if (!contacts || contacts.length == 0) {
        return []
    }
    return contacts.filter(contact => contact.exists).map(contact => contact.id)
}

module.exports = {
    readContactsFromFile,
    validateContacts,
    filterValidContacts
};