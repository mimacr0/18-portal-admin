
import { z } from 'zod'


export const jsFileSchema = z.object({
    page: z.string({
        required_error: 'Page is required'
    }).min(1).max(20),
    card: z.string({
        required_error: 'Card is required'
    }).min(1).max(20),
    file: z.string({
        required_error: 'File is required'
    }).min(1).max(20)
})

export const loginSchema = z.object({
    username: z.string({
        required_error: 'Username is required',
    }).min(1),
    password: z.string({
        required_error: 'Password is required'
    }).min(1)
})
