
import { Field } from './base.js'

export class Select extends Field {
    get js() {
        return 'select'
    }
    get jsValue() {
        return 'select'
    }
}
