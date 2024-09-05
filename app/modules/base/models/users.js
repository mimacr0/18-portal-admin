
import bcrypt from 'bcrypt'
import { DataTypes, Model } from 'sequelize'

import { dataDB } from '../../../controllers/db/db.js'
import { USER_PASSWORD_SALT } from '../../../etc/sys.js'
import { genMD5 } from '../../../tools/sys.js'
import { runScript } from '../../../tools/cli.js'
import { formatAttrs } from '../components/common/tools.js'


export class SysUser extends Model {
    static async registerUsers(users) {
        for(const user of users || []) {
            const uid = genMD5(user.login)
            const item = await SysUser.findByPk(uid)
            await SysUser.upsert({
                id: uid,
                name: user.name || user.login,
                login: user.login,
                password: await bcrypt.hash(user.password, USER_PASSWORD_SALT),
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
    listActions(card) {
        let result = []

        if(card.actions.list.length > 0) result = [...card.actions.list]

        if(card.actions.crud.update) result.push({
            name: 'Update',
            icon: 'fas fa-edit',
            action: 'update'
        })

        if(card.actions.crud.delete) result.push({
            name: 'Delete',
            icon: 'fas fa-trash',
            action: 'delete'
        })

        return result
    }
    get userImage() {
        const file = this.data?.image?.name
        return `<img src="/base/image/file/${file}" alt="Image" class="img-circle img-size-32 mr-2">`
    }
    userImageCustom(attrs) {
        const file = this.data?.image?.name
        return `<img src="/base/image/file/${file}" ${formatAttrs({...{ alt: 'Image', class: 'img-circle img-size-32 mr-2' }, ...(attrs || {})})}>`
    }
    get portal() {
        return this.data?.role === 'portal'
    }
    get portalID() {
        return this.data?.dbid
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
        type: DataTypes.STRING,
        allowNull: false
    },
    data: {
        type: DataTypes.JSON,
        allowNull: false
    }
}, { sequelize: dataDB, modelName: 'sys_user' })