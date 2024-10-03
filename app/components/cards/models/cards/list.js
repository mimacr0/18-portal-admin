
import { Card } from './base.js'
import { ListAction } from '../actions/list.js'

export class List extends Card {
    constructor(data, index, ctx) {
        super(data, index, 'list', ctx)
    }
    get actions() {
        const actions = super.actions
        const ctx = {
            card: this,
            page: this.page
        }

        const crud = this.data.actions?.crud || []
        const list = this.data.actions?.list || []
        const hasUpdate = crud.includes('all') || crud.includes('update')
        const updateDefault = {
            label: 'Update',
            icon: 'fas fa-edit',
            action: 'update'
        }
        const hasDelete = crud.includes('all') || crud.includes('delete')
        const deleteDefault = {
            label: 'Delete',
            icon: 'fas fa-trash',
            action: 'delete'
        }

        return {
            ...actions,
            update: hasUpdate ? new ListAction({
                ...updateDefault,
                ...list.find(a => a.action == 'update')
            }, list.length + 1, ctx) : false,
            delete: hasDelete ? new ListAction({
                ...deleteDefault,
                ...list.find(a => a.action == 'delete')
            }, list.length + 2, ctx) : false
        }
    }
}