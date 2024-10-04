
import { cammelCase } from '../../../../tools/view.js'
import { Form } from '../../../forms/models/form.js'
import { ToolAction } from '../actions/tools.js'
import { ToolLinkAction } from '../actions/link.js'

const actionsToolMap = {
    link: ToolLinkAction
}


export class Card {
    constructor(data, index, category, ctx) {
        const { page } = ctx
        this.index = index
        this.data = data
        this.page = page
        this.category = category

        if(!this.page) throw new Error('Page not found')
    }
    get num() {
        return this.index + 1
    }
    get name() {
        return this.data.name
    }
    get id() {
        return `${this.page.data.name}-${this.data.name}`
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
    get columns() {
        return this.data?.columns || []
    }
    get title() {
        return this.data.title
    }
    get actions() {
        const crud = this.data.actions?.crud || []
        const tools = this.data?.actions?.tools || []
        const ctx = {
            card: this,
            page: this.page
        }
        return {
            tools: tools.map(
                (tool, index) => actionsToolMap[tool.type] ?
                new actionsToolMap[tool.type](tool, index, ctx) :
                new ToolAction(tool, index, ctx)
            ),
            batch: [],
            list: [],
            crud: {
                create: crud.includes('all') || crud.includes('create'),
                update: crud.includes('all') || crud.includes('update'),
                delete: crud.includes('all') || crud.includes('delete')
            }
        }
    }
    get form() {
        const ctx = {
            card: this
        }
        return this.data.form ? new Form(this.data.form, 'update', ctx) : false
    }
    get js() {
        if(this.data.no_js) return false
        return this.category
    }
    get html() {
        if(this.data.no_html) return false
        return this.category
    }
}