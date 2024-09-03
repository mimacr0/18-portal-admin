
import crypto from 'crypto'

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
