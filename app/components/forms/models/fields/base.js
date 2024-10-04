
import { cammelCase } from '../../../../tools/view.js'

export class Field {
    constructor(data, index, ctx) {
        const { form, card } = ctx
        this.index = index
        this.data = data
        this.form = form
        this.card = card
    }
    get num() {
        return this.index + 1
    }
    get hidden() {
        return this.index >= 1
    }
    get class() {
        return this.data?.class || ''
    }
    get tmpl() {
        return this.data?.type || ''
    }
    get type() {
        return this.data?.type || ''
    }
    get label() {
        return this.data?.label || ''
    }
    get placeholder() {
        return this.data?.placeholder || this.label
    }
    get formName() {
        return this.data.name
    }
    get js() {
        return false
    }
    get jsValue() {
        return 'index'
    }
    get html() {
        return 'index'
    }
    get name() {
        return this.data.name
    }
    get id() {
        return `${this.form.id}-${this.name}`
    }
    get lineId() {
        return this.id.replace(/-/g, '_')
    }
    get varName() {
        return cammelCase(this.id)
    }
    get defaultValue() {
        return this.data?.default || ''
    }
}
