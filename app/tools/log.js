
export class Logger {
    static info(...messages) {
        console.log(`\x1b[32m[INFO]\x1b[0m ${new Date().toISOString()} -`, ...messages);
    }

    static warn(...messages) {
        console.warn(`\x1b[33m[WARN]\x1b[0m ${new Date().toISOString()}: -`, ...messages);
    }

    static error(...messages) {
        console.error(`\x1b[31m[ERROR]\x1b[0m ${new Date().toISOString()} -`, ...messages);
    }

    static debug(...messages) {

        if (process.env?.NODE_ENV === 'development') {
            console.debug(`\x1b[34m[DEBUG]\x1b[0m ${new Date().toISOString()} -`, ...messages);
        }
    }
}