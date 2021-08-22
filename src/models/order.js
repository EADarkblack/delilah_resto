module.exports = (sequelize, {DataTypes}) => {
    return sequelize.define('order', {
        uuid: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4
        },
        status:{
            type: DataTypes.STRING(20),
            allowNull: false,
            defaultValue: 'new',
            validate: {
                isIn: {
                    args: [['new', 'confirmed', 'preparing', 'sending', 'delivered']],
                    msg: 'The order must contain at least one of the following statuses: new, confirmed, preparing, sending or delivered.'
                },
                len: {
                    args: [3, 20],
                    msg: 'The status must be at least 3 characters long.'
                }
            }
        },
        total: {
            type: DataTypes.FLOAT(10,2),
            validate: {
                min: {
                    args: 1,
                    msg: 'The price must be at least 1 characters long.'
                },
                isFloat: {
                    arg: true,
                    msg: 'The price must be a float number.'
                }
            }
        },
        send_to: {
            type: DataTypes.STRING(200),
            allowNull: false,
            validate: {
                len: {
                    args: [1, 200],
                    msg: 'The address must be at least 1 characters long.'
                }
            }
        },
        payment_type: {
            type: DataTypes.STRING(50),
            allowNull: false,
            defaultValue: 'cash',
            validate: {
                isIn: {
                    args: [['cash', 'credit card', 'debit']]
                },
                len: {
                    args: [4, 50],
                    msg: 'The payment type must be at least 4 characters long.'
                }
            }
        }
    },{
        freezeTableName: true,
    })
}