
import { Logger } from './log.js'

export const validateSchema = (data, schema, options={}) => {
    const { raw=false, message } = options
    try {
        schema.parse(data)
        return { status: 'success' }
    } catch (err) {
        Logger.error('Validation error', err.errors)
        return raw ? { status: 'error', data: err } : { status: 'error', message: message ? message : err.errors.map(e => {
            return { value: e.path, message: e.message }
        }) }
    }
}