
import { List } from './cards/list.js'
import { Messages } from './cards/messages.js'
import { Chat } from './cards/chat.js'

const cardTypes = {
    list: List,
    messages: Messages,
    chat: Chat
}

export class Section {
    constructor(data, index, page) {
        this.index = index
        this.data = data
        this.page = page
    }
    get num() {
        return this.index + 1
    }
    get class() {
        return this.data?.class || ''
    }
    get cards() {
        return (this.data?.cards || []).map(
            (i, index) => new cardTypes[i.type || 'list'](i, index, { page: this.page }))
    }
}