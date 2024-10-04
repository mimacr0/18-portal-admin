
import { cammelCase } from '../../../../tools/view.js'
import { FormAction } from '../../../forms/models/action.js'


export class BaseAction {
    constructor(data, index, category, ctx) {
        const { card } = ctx
        this.data = data
        this.card = card
        this.category = category
        this.index = index

        if(!this.card) throw new Error('Card not found')
        if(!this.data) throw new Error('Action data not found')
        if(!this.category) throw new Error('Action category not found')
    }
    get icon() {
        return this.data.icon
    }
    get type() {
        return this.data.type
    }
    get id() {
        return `${this.card.id}-${this.category}-action-${this.data.action}`
    }
    get varName() {
        return cammelCase(this.id)
    }
    get lineId() {
        return this.id.replace(/-/g, '_')
    }
    get url() {
        return `/${this.id.replace(/-/g, '/')}`
    }
    get modal() {
        const modal = this.data.modal || {}
        const ctx = {
            card: this.card,
            action: this
        }
        return {
            before: modal.before ? new FormAction(modal.before, 'before', ctx) : false,
            after: modal.after ? new FormAction(modal.after, 'after', ctx) : false
        }
    }
    get tooltip() {
        return this.data.tooltip
    }
    get js() {
        if(this.modal.before && this.modal.after) return 'after'
        if(this.modal.before) return 'before'
        return 'index'
    }
    get html() {
        if(this.modal.before && this.modal.after) return 'after'
        if(this.modal.before) return 'before'
        return 'index'
    }
}
