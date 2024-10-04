
import { Form } from './form.js'

export class FormAction extends Form {
    constructor(data, index, ctx) {
        const { action } = ctx
        super(data, index, ctx)
        this.action = action
    }
    get id() {
        return `${this.action.id}-${this._id}-form`
    }
}