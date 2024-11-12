
import bcrypt from 'bcrypt'
import { DataTypes, Model } from 'sequelize'

import sysConfig from '../../../etc/sys.js'

import { dataDB } from '../../../controllers/db/db.js'
import { genMD5 } from '../../../tools/sys.js'
import { runScript } from '../../../tools/cli.js'


export class SysUser extends Model {
    static async registerUsers(users) {
        for(const user of users || []) {
            const uid = genMD5(user.login)
            const item = await SysUser.findByPk(uid)
            await SysUser.upsert({
                id: uid,
                name: user.name || user.login,
                login: user.login,
                password: await bcrypt.hash(user.password, sysConfig.USER_PASSWORD_SALT),
                data: {
                    ...item?.data, ...user?.data
                }
            })
        }
    }
    async doLogin(passwd) {
        if(this.data?.role != 'portal') return await bcrypt.compare(passwd, this.password)

        const result = await runScript('users/login', {
            password: passwd,
            hash: this.password
        })

        return result?.status === 'success'
    }
    listActions(actions) {
        return actions
    }
    get imageFile() {
        return this.data?.image?.name || 'default_user.svg'
    }
    get userImage() {
        const file = this.data?.image?.name
        return `<img src="/base/image/user/${file}" alt="Image" class="img-circle mr-2" width="32" height="35">`
    }
    get portal() {
        return this.data?.role === 'portal'
    }
    get uid() {
        return this.data?.dbid
    }
    get lang() {
        const clang = this.config?.lang || this.data?.lang || 'en_US'
        let lang = clang
        if(!clang.includes('_')) lang = sysConfig.I18N_LOCALES.find(l => l.startsWith(clang))
        if(!sysConfig.I18N_LOCALES.includes(lang)) throw new Error(`Language "${lang}" not found`)
        return lang
    }
    get langName() {
        const lang = this.config?.lang || this.data?.lang || 'en'
        if(lang.includes('_')) return sysConfig.LANG_DATA[lang.split('_')[0]]
        return sysConfig.LANG_DATA[lang].name
    }
    get langCode() {
        const lang = this.config?.lang || this.data?.lang || 'en'
        if(lang.includes('_')) return sysConfig.LANG_DATA[lang.split('_')[0]].code
        return sysConfig.LANG_DATA[lang].code
    }
    get displayName() {
        return this.data?.short_name || this.name
    }
    get dbid() {
        return this.data?.dbid
    }
    hasPrivilege(privilege) {
        return this.data?.privileges?.includes(privilege)
    }
}

SysUser.init({
    id: {
        type: DataTypes.STRING(32),
        primaryKey: true
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    login: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    password: {
        type: DataTypes.STRING
    },
    data: {
        type: DataTypes.JSON,
        allowNull: false
    },
    config: {
        type: DataTypes.JSON,
        allowNull: false,
        defaultValue: {}
    }
}, { sequelize: dataDB, modelName: 'sys_user' })
