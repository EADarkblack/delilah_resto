module.exports = (sequelize, {DataTypes}) => {
    return sequelize.define('item', {
        uuid: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4
        },
        amount: {
            type: DataTypes.INTEGER,
            defaultValue: 1,
            allowNull: false,
            validate: {
                isInt: {
                    args: true,
                    msg: 'The amount must be an integer numeric value.'
                },
                min: {
                    args: 1,
                    msg: 'The amount must be at least 1 characters long.'
                }
            }
        },
        total_item: {
            type: DataTypes.FLOAT(10,2),
            allowNull: false,
            validate: {
                min: {
                    args: 1,
                    msg: `The item's total price must be at least 1 characters long.`
                },
                isFloat: {
                    arg: true,
                    msg: `The item's total price must be a float number.`
                }
            }
        }
    },{
        freezeTableName: true,
    })
}