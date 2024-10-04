
import { spawn } from 'child_process'
import crypto from 'crypto'
import fs from 'fs'
import path from 'path'

import sysConfig from '../etc/sys.js'
import { Logger } from './log.js'

const fsp = fs.promises

const fileExists = (file) => {
    return fs.existsSync(file)
}

export const runScript = async (script, args={}, options={}) => {

    const { debug=false, clean=false } = options

    const scriptDir = path.resolve(sysConfig.BASE_PATH, 'scripts')
    const scriptFile = path.join(scriptDir, `${script}.py`)
    const tmpDir = path.join(scriptDir, 'tmp')

    const scriptExist = fileExists(scriptFile)
    const pythonPath = process.env.PYTHONPATH || '/usr/bin/python3'
    const pythonExist = fileExists(pythonPath)
    const tmpExist = fileExists(tmpDir)
    const cmdID = crypto.randomBytes(16).toString('hex')
    const cmdFile = path.join(tmpDir, `${cmdID}.tmp`)

    if(!scriptExist) throw new Error(`Script ${script} not found`)

    if(clean) {
        try {
            if(fs.existsSync(tmpDir)) fs.rmSync(tmpDir, { recursive: true })
            fs.mkdirSync(tmpDir)
        } catch(err) {
            Logger.error(`Error cleaning tmp dir ${tmpDir}`, err)
        }
    }

    if(scriptExist && pythonExist) await fsp.writeFile(cmdFile, JSON.stringify({ in: args, out: {} }))

    if(debug) return Logger.debug(`
{
    "name": "Python: SCRIPT",
    "type": "debugpy",
    "request": "launch",
    "python": "${process.env.PYTHONPATH || '/usr/bin/python3'}",
    "program": "${scriptFile}",
    "console": "integratedTerminal",
    "args": [
        "${path.join(tmpDir, 'cmdID')}"
    ],
    "env": {
        "BASE_DIR": "${BASE_PATH}",
        "WORK_DIR": "${process.env?.WORK_DIR || sysConfig.BASE_PATH}",
        "CMD_FILE": "${cmdFile}"
    },
    "cwd": "${sysConfig.BASE_PATH}"
}
    `)

    return new Promise((resolve, reject) => {

        if(!scriptExist) reject({ status: 'error', message: 'Script not found' })
        if(!pythonExist) reject({ status: 'error', message: 'Python not found' })

        if(!tmpExist) fs.mkdir(tmpDir)

        const child = spawn(pythonPath, [scriptFile, cmdFile], { env: {
                WORK_DIR: process.env?.WORK_DIR || sysConfig.BASE_PATH,
                BASE_DIR: sysConfig.BASE_PATH, CMD_FILE: cmdFile,
                DISPLAY: process.env?.DISPLAY || ':0'
            }
        })

        child.stdout.on('data', data => {
            Logger.debug(data.toString())
        })

        child.stderr.on('data', data => {
            Logger.error(data.toString())
        })

        child.on('error', error => {
            Logger.error(error)

            try { if(fileExists(cmdFile)) fs.unlinkSync(cmdFile) }
            catch(err) { Logger.error(`Error deleting ${cmdFile}`, err) }

            resolve(false)
        })

        child.on('close', code => {
            try {
                const data = JSON.parse(fs.readFileSync(cmdFile))
                resolve(data?.out || { status: 'success', data: {} })
            } catch(err) { Logger.error(err) }

            if(code !== 0) reject({ status: 'error', message: `Process exited with code ${code}` })

            try { if(fileExists(cmdFile)) fs.unlinkSync(cmdFile) }
            catch(err) { Logger.error(err) }

            resolve({})
        })

    })

}