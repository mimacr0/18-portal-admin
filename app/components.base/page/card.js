
import { Actions } from './actions.js'
import { Form } from '../form/form.js'
import { cammelCase } from '../common/tools.js'

export class Card {
    constructor(data, index, ctx) {
        this.ctx = ctx
        this.index = index
        this.data = data

        ctx.card = this
    }
    get num() {
        return this.index + 1
    }
    get name() {
        return this.data.name
    }
    get id() {
        const id = `${this.ctx.page.data.name}-${this.data.name}`
        return {
            id,
            var: cammelCase(id),
            lower: id.replace(/-/g, '_'),
            url: `/${id.replace(/-/g, '/')}`,
            parts: id.split('-')
        }
    }
    get columns() {
        return this.data?.columns || []
    }
    get actions() {
        return new Actions(this.data.actions, this.ctx)
    }
    get title() {
        return this.data.title
    }
    get form() {
        return this.data.form ? new Form(this.data.form, `${this.id.id}-update`, this.ctx) : false
    }
}