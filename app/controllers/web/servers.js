import { Server } from 'socket.io'
import cors from 'cors'
import express from 'express'
import fileupload from 'express-fileupload'
import cookieParser from 'cookie-parser'
import http from 'http'
import path from 'path'

import sysConfig from '../../etc/sys.js'
import { Logger } from '../../tools/log.js'

import { sessionMiddleware } from './security.js'

export const app = express()
export const server = http.createServer(app)

export const sio = new Server(server, {
    transports: ["websocket", "polling"]
})

app.disable('x-powered-by')
app.use(fileupload({
    useTempFiles: true,
    tempFileDir: "/tmp/"
}))
app.use(cors())
app.use(express.json({limit: sysConfig.MAX_UPLOAD_SIZE || '1mb'}))
app.use(express.urlencoded({ extended: false }))
app.use(cookieParser())
app.use(sessionMiddleware)

app.use(express.static(path.join(sysConfig.BASE_PATH, "/public")))

const wrap = middleware => (socket, next) => middleware(socket.request, {}, next)

sio.use(wrap(sessionMiddleware))

export const initServers = async () => {
    server.listen(sysConfig.SERVER_PORT, () => {
        Logger.debug(`Server running on ${sysConfig.SERVER_BASE_URL}`)
    })
}