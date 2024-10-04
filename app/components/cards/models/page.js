
import { Page } from '../../layout/models/page.js'
import { Screen } from './screen.js'

export class Cards extends Page {

    get screens() {
        return (this.data?.screens || []).map((i, index) => new Screen(i, index, this))
    }

    get forms() {
        const cardForms = this.cards.reduce((acc, card) => {
            if(!acc) acc = []
            if(card.form) acc.push(card.form)
            return acc
        }, [])
        const toolsForms = this.cards.reduce((acc, card) => {
            if(!acc) acc = []
            for(const tool of card.actions.tools) {
                if(tool.modal.before) acc.push(tool.modal.before)
                if(tool.modal.after) acc.push(tool.modal.after)
            }
            return acc
        }, [])
        const batchForms = this.cards.reduce((acc, card) => {
            if(!acc) acc = []
            for(const batch of card.actions.batch) {
                if(batch.modal.before) acc.push(batch.modal.before)
                if(batch.modal.after) acc.push(batch.modal.after)
            }
            return acc
        }, [])
        const listForms = this.cards.reduce((acc, card) => {
            if(!acc) acc = []
            for(const list of card.actions.list) {
                if(list.modal.before) acc.push(list.modal.before)
                if(list.modal.after) acc.push(list.modal.after)
            }
            return acc
        }, [])
        return [...cardForms, ...toolsForms, ...batchForms, ...listForms]
    }

    get cards() {
        return this.screens.reduce((acc, screen) => {
            if(!acc) acc = []
            for(const section of screen.sections) {
                acc.push(...section.cards)
            }
            return acc
        }, [])
    }

}