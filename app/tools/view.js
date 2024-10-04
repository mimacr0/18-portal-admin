import fs from 'fs'
import ejs from 'ejs'
import path from 'path'

import sysConfig from '../etc/sys.js'

const renderFile = async (template, data, baseDir) => {

    if(!template) throw new Error('Template is required')

    const file = path.join(sysConfig.BASE_PATH, baseDir, `${template}.ejs`)

    if(!fs.existsSync(file)) throw new Error(`Template file not found: ${file}`)

    let removeLines = []

    let result = await ejs.renderFile(file, data, { async: true })

    let lines = result.split('\n')

    lines.forEach((line, index) => { if(line.trim() == '##') removeLines.push(index) })

    return lines.filter((_, i) => !removeLines.includes(i)).join('\n')
}

export const renderComponent = async (template, data) => {
    return await renderFile(template, data, 'components')
}

export const renderModule = async (template, data) => {
    return await renderFile(template, data, 'modules')
}

export const formatAttrs = (attrs) => {
    return Object.entries(attrs || {}).map(([k, v]) => `${k}="${v}"`).join(' ')
}

export const formatAssets = (assets) => {

    if(!assets) return {
        css: [],
        js: []
    }

    const css = assets?.css?.length > 0 ? assets?.css.map(i => {
        return {
            attrsHTML: formatAttrs({ href: i.url, ...{rel: 'stylesheet'}, ...(i.attrs || {})})
        }
    }) : []
    const js = assets?.js?.length > 0 ? assets?.js.map(i => {
        return {
            attrsHTML: formatAttrs({ src: i.url, ...(i.attrs || {})})
        }
    }) : []
    return { css, js }
}

export const cammelCase = (str) => {
    return str.replace(/-([a-z])/g, (g) => g[1].toUpperCase())
}