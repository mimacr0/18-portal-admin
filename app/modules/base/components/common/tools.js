
export const formatAttrs = (attrs) => {
    return Object.entries(attrs || {}).map(([k, v]) => `${k}="${v}"`).join(' ')
}

export const cammelCase = (str) => {
    return str.replace(/-([a-z])/g, (g) => g[1].toUpperCase())
}