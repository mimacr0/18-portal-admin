
import crypto from 'crypto'
import fs from 'fs'
import jwt from 'jsonwebtoken'
import path from 'path'
import util from 'util'

import { Logger } from './log.js'
import sysConfig from '../etc/sys.js'


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
    const fpath = path.join(sysConfig.BASE_PATH, 'data', 'filestore', sname)
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
    const fpath = path.join(sysConfig.BASE_PATH, file)
    try {
        fs.unlinkSync(fpath)
        Logger.debug(`File ${file} has been removed from ${fpath}`)
    } catch (error) {
        Logger.error(`Error removing file ${file} from ${fpath}`)
    }
    return true
}

export const uploadFiles = async (files) => {
    const dpath = path.join(sysConfig.BASE_PATH, 'data', 'filestore')
    let result = []
    for (const file of Object.values(files)) {
        const { name, mimetype, size, md5 } = file
        const ext = name.split('.').pop()
        const fpath = path.join(dpath, md5)
        const rpath = path.join('data/filestore', md5)
        try {
            await file.mv(fpath)
            result.push({ name, ext, mimetype, size, md5, path: rpath })
            Logger.debug(`File ${name} has been saved to ${fpath}`);
        } catch (error) {
            Logger.error(`Error saving file ${name} to ${fpath}`);
        }
    }
    return result
}

export const generateWebToken = async (data, secret, options) => {
    return jwt.sign(data, secret, options)
}

export const verifyWebToken = async (token, secret, options) => {
    try {
        const payload = await util.promisify(jwt.verify)(token, secret, options)
        return { status: 'success', data: payload }
    } catch (error) {
        if(error.name === 'TokenExpiredError') return { status: 'error', message: 'Token expired', code: 401 }
        if(error.name === 'JsonWebTokenError') return { status: 'error', message: 'Token invalid', code: 403 }
        Logger.error('Token error:', error)
        return { status: 'error', message: 'Token error', code: 400 }
    }
}
