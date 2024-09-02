
import crypto from 'crypto';


export const genMD5 = (input) => {
    return crypto.createHash('md5').update(input, 'utf8').digest("hex")
}
