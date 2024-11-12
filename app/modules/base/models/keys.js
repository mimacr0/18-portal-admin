import { DataTypes, Model } from 'sequelize'

import { dataDB } from '../../../controllers/db/db.js'


export class KeysKey extends Model {
    listActions(actions) {
        return actions
    }
}

KeysKey.init({
    id: {
        type: DataTypes.STRING(32),
        primaryKey: true,
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    data: {
        type: DataTypes.JSON,
        defaultValue: {},
        allowNull: false
    },
    conf: {
        type: DataTypes.JSON,
        defaultValue: {},
        allowNull: false
    }
}, { sequelize: dataDB, modelName: 'keys_key' })


export class AuthorizedKeys extends Model {
    listActions(actions) {
        return actions
    }
}

AuthorizedKeys.init({
    id: {
        type: DataTypes.STRING(32),
        primaryKey: true,
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    data: {
        type: DataTypes.JSON,
        defaultValue: {},
        allowNull: false
    },
    conf: {
        type: DataTypes.JSON,
        defaultValue: {},
        allowNull: false
    }
}, { sequelize: dataDB, modelName: 'authorized_keys' })


export class RPCConnections extends Model {
    listActions(actions) {
        return actions
    }
}

RPCConnections.init({
    id: {
        type: DataTypes.STRING(32),
        primaryKey: true,
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    data: {
        type: DataTypes.JSON,
        defaultValue: {},
        allowNull: false
    },
    conf: {
        type: DataTypes.JSON,
        defaultValue: {},
        allowNull: false
    }
}, { sequelize: dataDB, modelName: 'rpc_connections' })
