
import { Field } from './fields/base.js'
import { Ace } from './fields/_ace.js'
import { Select } from './fields/_select.js'
import { Many2One } from './fields/_m2o.js'
import { Hidden } from './fields/_hidden.js'

import { cammelCase } from '../../../tools/view.js'

const fieldMap = {
    ace: Ace,
    select: Select,
    m2o: Many2One,
    hidden: Hidden
}

export class Form {
    constructor(data, id, ctx) {
        const { card } = ctx
        this._id = id
        this.data = data
        this.card = card
    }
    get id() {
        return `${this.card.id}-${this._id}-form`
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
    get idParts() {
        return this.id.split('-')
    }
    get detailId() {
        return this.id.replace(/-/g, ' ')
    }
    get title() {
        return this.data?.title || ''
    }
    get fields() {
        const fields = (this.data?.fields || [])
        const ctx = { card: this.card, form: this }
        const idField = fields.find(f => f.name == 'id')
        const tokenField = fields.find(f => f.name == 'token')
        if(!idField) fields.push({name: 'id', type: 'hidden'})
        if(!tokenField) fields.push({name: 'token', type: 'hidden'})
        return fields.map((field, index) => fieldMap[field.type] ?
            new fieldMap[field.type](field, index, ctx) :
            new Field(field, index, ctx)
        )
    }
    get jsFields() {
        return this.fields.filter(f => f.js)
    }
    get submit() {
        return this.data?.submit
    }
}