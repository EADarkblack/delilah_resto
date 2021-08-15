module.exports = (sequelize, {DataTypes}) => {
    return sequelize.define('user', {
        uuid: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            allowNull: false
        },
        username: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true,
            validate: {
                len: {
                    args: [6, 100],
                    msg: 'The username must be at least 6 characters long.'
                }
            }
        },
        name: {
            type: DataTypes.STRING,
            validate: {
                len: {
                    args: [1, 100],
                    msg: 'The name must be at least 1 characters long.'
                }
            }
        },
        last_name: {
            type: DataTypes.STRING,
            validate: {
                len: {
                    args: [1, 100],
                    msg: 'The last name must be at least 1 characters long.'
                }
            }
        },
        email: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true,
            validate: {
                len: {
                    args: [6, 100],
                    msg: 'The email must be at least 6 characters long.'
                },
                isEmail: {
                    args: true,
                    msg: 'A valid email address is required.'
                }
            }
        },
        phone: {
            type: DataTypes.STRING,
            allowNull: false,
            validate: {
                len: {
                    args: [6, 25],
                    msg: 'The phone must be at least 6 characters long.'
                }
            }
        },
        address: {
            type: DataTypes.STRING,
            allowNull: false,
            validate: {
                len: {
                    args: [6, 200],
                    msg: 'The address must be at least 6 characters long.'
                }
            }
        },
        password: {
            type: DataTypes.STRING,
            allowNull: false,
            validate: {
                len: {
                    args: [8, 200],
                    msg: 'The email must be at least 8 characters long.'
                }
            }
        },
        is_admin: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false
        }
    },{
        freezeTableName: true,
    })
}