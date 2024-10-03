
import { Field } from './base.js'

export class Ace extends Field {
    get html() {
        return 'ace'
    }
    get js() {
        return 'ace'
    }
    get jsValue() {
        return 'ace'
    }
    get mode() {
        return this.data?.mode || 'text'
    }
}
