
import { z } from 'zod'

export const jsFileSchema = z.object({
    module: z.string({
        required_error: 'Module is required'
    }).min(1).max(20),
    page: z.string({
        required_error: 'Page is required'
    }).min(1).max(20)
})
