
import { formatAttrs } from '../common/tools.js'

const formatAssets = (assets) => {

    if(!assets) return {
        css: [],
        js: []
    }

    const css = assets?.css?.length > 0 ? assets?.css.map(i => {
        return {
            attrsHTML: formatAttrs({ src: i.url, ...(i.attrs || {})})
        }
    }) : []
    const js = assets?.js?.length > 0 ? assets?.js.map(i => {
        return {
            attrsHTML: formatAttrs({ src: i.url, ...(i.attrs || {})})
        }
    }) : []
    return { css, js }
}

export const pageAssets = (page) => {
    return {
        header: formatAssets(page?.data?.assets?.header),
        footer: formatAssets(page?.data?.assets?.footer)
    }
}