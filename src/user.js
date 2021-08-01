const router = require('express').Router();
const {PORT, USER, VERSION, PASSWORD, DB_NAME, KEY} = process.env;
const {Sequelize, DataTypes, QueryTypes} = require('sequelize');
const sequelize = new Sequelize(`mysql://${USER}:${PASSWORD}@localhost:${PORT}/${DB_NAME}`)
const jwt = require('jsonwebtoken');
const sha1 = require('sha1');

/**
 * defines the data for the user's table and sets its the data type that will receive
*/

sequelize.define('user', {
    username: {
        type: DataTypes.STRING
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    last_name: {
        type: DataTypes.STRING
    },
    email: {
        type: DataTypes.STRING,
        allowNull: false
    },
    phone: {
        type: DataTypes.STRING,
        allowNull: false
    }, 
    address: {
        type: DataTypes.STRING,
        allowNull: false
    },
    password: {
        type: DataTypes.STRING,
        allowNull: false
    },
    is_admin: {
        type: DataTypes.BOOLEAN,
        allowNull: false
    }
})

// Middlewares

/**
 * @param {gets the data from the request's body} req
 * @param {Shows the errors when detects an unusual data on the body} res 
 * @param {When all data is ok starts with the queries} next 
 */

function validateRegister(req, res, next) {
    const {name, email, phone, address, password} = req.body
    if (name.length >= 1 && email.length >= 6 && phone.length >= 6 && address.length >= 6 && password.length >= 8) {
        if(email.includes('@')) {
            next();
        } else {
            res.status(400).json({
                error: 'The information received is invalid or necessary information is missing.',
                status: 400
            });
        }
    } else {
        res.status(400).json({
            error: 'The information received is invalid or necessary information is missing.',
            status: 400
        });
    }

}

// Routes

/**
 * Gets all user from the database (only admin can see this information)
 */

router.get(`${VERSION}/user`, (req, res) => {
    const [, decodeToken] = req.rawHeaders;
    const token = decodeToken.split(' ')[1];
    const decoded = jwt.verify(token, KEY);
    const {is_admin} = decoded;
    if(is_admin === 1) {
        sequelize.query('SELECT id, username, name, last_name, email, phone, address, created, last_update, is_admin FROM user', {type: QueryTypes.SELECT})
        .then((data) => {
            res.json(data);
        })
        .catch((err) => {
            res.status(500).json({
                error: `A problem has occurred with the server: ${err}`,
                status: 500
            })
        })
    }else {
        res.status(403).json({
            error: 'Administrator permissions are required to perform this action.',
            status: 403
        })
    }
});

/**
 * Creates a new user and return the user object from the database (anybody can use this)
 */

router.post(`${VERSION}/user/register`, validateRegister, (req, res) => {
    const {username, name, last_name, email, phone, address, password, is_admin} = req.body;
    const encriptedPass = sha1(password);
    sequelize.query('INSERT INTO user (username, name, last_name, email, phone, address, password, is_admin) values (:username, :name, :last_name, :email, :phone, :address, :encriptedPass, :is_admin)', {type: QueryTypes.INSERT,
    replacements: {
        username, name, last_name, email, phone, address, encriptedPass, is_admin
    }
    }).then((data) => {
        const [id] = data;
        sequelize.query('SELECT id, username, name, last_name, email, phone, address, created, last_update, is_admin FROM user WHERE id = :id', {type: QueryTypes.SELECT, replacements: {
            id
        }})
        .then((data) => {
            const [newUser] = data;
            const tokenData = {
                id: newUser.id,
                name: newUser.name,
                is_admin: newUser.is_admin
            }
            const token = jwt.sign(tokenData, KEY);
            res.json({
                token: token,
                result: newUser
            });
        });
    })
});


// export

module.exports = router;
