module.exports = (sequelize, {DataTypes}) => {
    return sequelize.define('image', {
        uuid: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4
        },
        path: {
            type: DataTypes.STRING(100)
        },
    },{
        freezeTableName: true,
    })
}