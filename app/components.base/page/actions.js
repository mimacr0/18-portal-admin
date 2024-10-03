
import { formatAttrs } from '../common/tools.js'
import { Form } from '../form/form.js'
import { cammelCase } from '../common/tools.js'

class ToolAction {
    constructor(data, index, ctx) {
        this.ctx = ctx
        this.data = data
        this.index = index
        this.card = ctx.card
    }
    get modal() {
        const modal = this.data.modal || {}
        const name = this.getName(this.card)
        return {
            before: modal.before ? new Form(modal.before, name.modal.before.id, this.ctx) : false,
            after: modal.after ? new Form(modal.after, name.modal.after.id, this.ctx) : false
        }
    }
    get attrsHTML() {
        const defaultAttrs = {
            class: "btn btn-tool btn-sm",
            id: `${this.card.id.id}-tools-action-${this.data.action}`,
            'data-toggle': "tooltip",
            title: this.data.tooltip
        }
        return formatAttrs({...defaultAttrs, ...this.data.attrs})
    }
    get icon() {
        return this.data.icon
    }
    get type() {
        return this.data.type
    }
    get jsTemplate() {
        if(['page', 'link'].includes(this.type)) return false
        if(this.modal.before && this.modal.after) return 'all'
        if(this.modal.after) return 'after'
        if(this.modal.before) return 'before'
        return this.type || 'base'
    }
    htmlTemplate(def) {
        if(['link'].includes(this.type)) return 'link'
        return def
    }
    getName(card) {
        const id = `${card.id.id}-tools-action-${this.data.action}`
        const beforeId = `${id}-before`
        const afterId = `${id}-after`
        return {
            id,
            var: cammelCase(id),
            lower: id.replace(/-/g, '_'),
            url: `/${id.replace(/-/g, '/')}`,
            parts: id.split('-'),
            modal: {
                before: {
                    id: beforeId,
                    var: cammelCase(beforeId),
                    lower: beforeId.replace(/-/g, '_'),
                    url: `/${beforeId.replace(/-/g, '/')}`,
                    parts: beforeId.split('-')
                },
                after: {
                    id: afterId,
                    var: cammelCase(afterId),
                    lower: afterId.replace(/-/g, '_'),
                    url: `/${afterId.replace(/-/g, '/')}`,
                    parts: afterId.split('-')
                }
            }
        }
    }
}

class ListAction {
    constructor(data, index, ctx) {
        this.ctx = ctx
        this.data = data
        this.index = index
    }
}

class BatchAction {
    constructor(data, index, ctx) {
        this.ctx = ctx
        this.data = data
        this.index = index
    }
    get icon() {
        return this.data.icon
    }
    getName(card) {
        const id = `${card.id.id}-batch-action-${this.data.action}`
        return {
            id,
            var: cammelCase(id),
            lower: id.replace(/-/g, '_'),
            url: `/${id.replace(/-/g, '/')}`,
            parts: id.split('-')
        }
    }
}

export class Actions {
    constructor(data, ctx) {
        this.ctx = ctx
        this.data = data
    }
    get crud() {
        const crud = this.data?.crud || []
        return {
            create: crud.includes('all') || crud.includes('create'),
            update: crud.includes('all') || crud.includes('update'),
            delete: crud.includes('all') || crud.includes('delete')
        }
    }
    get tools() {
        const tools = this.data?.tools || []
        return tools.map((tool, index) => new ToolAction(tool, index, this.ctx))
    }
    get list() {
        const list = this.data?.list || []
        return list.map((list, index) => new ListAction(list, index, this.ctx))
    }
    get batch() {
        const batch = this.data?.batch || []
        return batch.map((batch, index) => new BatchAction(batch, index, this.ctx))
    }
}