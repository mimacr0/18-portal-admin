
import bcrypt from 'bcrypt'
import { DataTypes, Model } from 'sequelize'

import { dataDB } from '../../../controllers/db/db.js'
import { USER_PASSWORD_SALT } from '../../../etc/sys.js'
import { genMD5 } from '../../../tools/sys.js'


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
        return await bcrypt.compare(passwd, this.password)
    }
    listActions(card) {
        let result = []

        if(card.actions.list.length > 0) result = [...card.actions.list]

        if(card.actions.crud.update) result.push({
            name: 'Actualizar',
            icon: 'fas fa-edit',
            action: 'update'
        })

        if(card.actions.crud.delete) result.push({
            name: 'Eliminar',
            icon: 'fas fa-trash',
            action: 'delete'
        })

        return result
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