
import { Field } from './base.js'

export class Hidden extends Field {
    get html() {
        return 'hidden'
    }
}
