module.exports = (sequelize, {DataTypes}) => {
    return sequelize.define('product', {
        uuid: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4
        },
        short_name:{
            type: DataTypes.STRING(50),
            allowNull: false,
            unique: true,
            validate: {
                len: {
                    args: [1, 50],
                    msg: 'The short name must be at least 1 characters long.'
                }
            }
        },
        name: {
            type: DataTypes.STRING(200),
            allowNull: false,
            validate: {
                len: {
                    args: [1, 200],
                    msg: 'The name must be at least 1 characters long.'
                }
            }
        },
        description: {
            type: DataTypes.TEXT,
            validate: {
                len: {
                    args: [1, 300],
                    msg: 'The description must be at least 1 characters long.'
                }
            }
        },
        category: {
            type: DataTypes.STRING(100),
            allowNull: false,
            validate: {
                len: {
                    args: [1, 100],
                    msg: 'The category must be at least 1 characters long.'
                }
            }
        },
        price: {
            type: DataTypes.FLOAT(10, 2),
            allowNull: false,
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
        available: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        }
    },{
        freezeTableName: true,
    })
}