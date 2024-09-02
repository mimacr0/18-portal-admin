import fs from 'fs'
import ejs from 'ejs'
import path from 'path'

import { BASE_PATH } from '../etc/sys.js'

export const renderFile = async (template, data) => {

    if(!template) throw new Error('Template is required')

    const file = path.join(BASE_PATH, 'modules', `${template}.ejs`)

    if(!fs.existsSync(file)) throw new Error(`Template file not found: ${file}`)

    let removeLines = []

    let result = await ejs.renderFile(file, data)

    let lines = result.split('\n')

    lines.forEach((line, index) => { if(line.trim() == '##') removeLines.push(index) })

    return lines.filter((_, i) => !removeLines.includes(i)).join('\n')
}