
import crypto from 'crypto'
import fs from 'fs'
import path from 'path'
import util from 'util'

import { Logger } from './log.js'
import { BASE_PATH } from '../etc/sys.js'


export const genMD5 = (input) => {
    return crypto.createHash('md5').update(input, 'utf8').digest("hex")
}

export const genDBID = () => {
    const bytes = new Uint8Array(16)

    for (let i = 0; i < 16; i++) {
        bytes[i] = Math.floor(Math.random() * 256)
    }

    bytes[6] = (bytes[6] & 0x0f) | 0x40
    bytes[8] = (bytes[8] & 0x3f) | 0x80

    const buffer = Buffer.from(bytes)
    return buffer.toString('hex')
}

export const saveFile = async (data) => {
    const { file, ext, b64, mimetype, size, md5 } = data

    if(!md5) return { status: 'error', message: 'MD5 hash not found' }

    const sname = `${md5}.${ext.replace(/^\./, '').trim().toLowerCase()}`
    const fname = file || sname
    const writeFile = util.promisify(fs.writeFile)
    const fpath = path.join(BASE_PATH, 'data', 'filestore', sname)
    const rpath = path.join('data/filestore', sname)
    let fsize = 0

    try {
        await writeFile(fpath, b64, { encoding: 'base64' })
        fsize = fs.statSync(fpath).size
        Logger.debug(`File ${fname} has been saved to ${fpath}`);
    } catch (error) {
        Logger.error(`Error saving file ${fname} to ${fpath}`);
    }
    return { name: fname, path: rpath, ext, mimetype, size: size || fsize }
}

export const removeFile = async (file) => {
    const fpath = path.join(BASE_PATH, file)
    try {
        fs.unlinkSync(fpath)
        Logger.debug(`File ${file} has been removed from ${fpath}`)
    } catch (error) {
        Logger.error(`Error removing file ${file} from ${fpath}`)
    }
    return true
}