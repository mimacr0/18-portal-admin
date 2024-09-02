import { Server } from 'socket.io'
import cors from 'cors'
import express from 'express'
import fileupload from 'express-fileupload'
import cookieParser from 'cookie-parser'
import http from 'http'
import path from 'path'

import { BASE_PATH, MAX_UPLOAD_SIZE } from '../../etc/sys.js'

import { socketCheckUser } from './security.js'

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
app.use(express.json({limit: MAX_UPLOAD_SIZE || '1mb'}))
app.use(express.urlencoded({ extended: false }))
app.use(cookieParser())

app.use(express.static(path.join(BASE_PATH, "/public")))

sio.use(socketCheckUser)
