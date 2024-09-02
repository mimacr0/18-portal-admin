
import { Field } from './field.js'
import { cammelCase } from '../common/tools.js'

export class Form {
    constructor(data, id, ctx) {
        this.ctx = ctx
        this.id = id
        this.data = data
    }
    get name() {
        return {
            id: this.id,
            var: cammelCase(this.id),
            lower: this.id.replace(/-/g, '_'),
            url: `/${this.id.replace(/-/g, '/')}`,
            parts: this.id.split('-'),
            upper: this.id.replace(/-/g, ' ').toUpperCase()
        }
    }
    get fields() {
        const fields = this.data?.fields || []
        return fields.map((field, index) => new Field(field, index, {...this.ctx, form: this}))
    }
    get submit() {
        return this.data?.submit
    }
}