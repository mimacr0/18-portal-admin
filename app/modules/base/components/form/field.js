import { cammelCase, formatAttrs } from '../common/tools.js'

export class Field {
    constructor(data, index, ctx) {
        this.ctx = ctx
        this.index = index
        this.data = data
        this.form = ctx.form
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
    get jsTemplate() {
        if(['str', 'int'].includes(this.type)) return false
        return this.data?.type || ''
    }
    get name() {
        const id = `${this.form.name.id}-${this.data.name}`
        return {
            id,
            var: cammelCase(id),
            lower: id.replace(/-/g, '_'),
            url: `/${id.replace(/-/g, '/')}`,
            parts: id.split('-')
        }
    }
    get id() {
        return this.name.id
    }
    groupHTML(attrs) {
        const _attrs = {
            ...{ id: `${this.id}-group` },
            ...attrs,
            ...this.data?.group
        }
        return formatAttrs(_attrs)
    }
    inputHTML(attrs) {
        let defaultAttrs = {
            class: 'form-control',
            id: this.id,
            name: this.data.name
        }
        return formatAttrs({...defaultAttrs, ...attrs, ...this.data?.attrs})
    }
}