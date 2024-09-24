import fs from 'fs'
import ejs from 'ejs'
import path from 'path'

import i18n from '../controllers/i18n/i18n.js'

import { BASE_PATH } from '../etc/sys.js'

export const renderFile = async (template, data) => {

    if(!template) throw new Error('Template is required')

    const file = path.join(BASE_PATH, 'modules', `${template}.ejs`)

    if(!fs.existsSync(file)) throw new Error(`Template file not found: ${file}`)

    let removeLines = []

    const langData = {
        en: 'en_US',
        es: 'es_ES',
        zh: 'zh_CN'
    }
    const lang = data.user?.lang?.code || 'en'

    i18n.setLocale(langData[lang])

    let result = await ejs.renderFile(file, { ...{ i18n }, ...data })

    let lines = result.split('\n')

    lines.forEach((line, index) => { if(line.trim() == '##') removeLines.push(index) })

    return lines.filter((_, i) => !removeLines.includes(i)).join('\n')
}