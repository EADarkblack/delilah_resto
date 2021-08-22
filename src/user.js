const router = require('express').Router();
const {PORT, USER, VERSION, PASSWORD, DB_NAME, KEY} = process.env;
const {Sequelize} = require('sequelize');
const sequelize = new Sequelize(`mysql://${USER}:${PASSWORD}@localhost:${PORT}/${DB_NAME}`)
const jwt = require('jsonwebtoken');
const sha1 = require('sha1');
const user = require('./models/user');
const User = user(sequelize, Sequelize);

// User.sync({force: true})

// Middlewares

/**
 * 
 * @param {{rawHeaders}} req - Gets the token from the request's header.
 * @param {function} res - Sends to the user the response depending if the user has admin permission.
 * @param {function} next - When the user has admin permissions proceeds to the next function.
 */

function validateRole(req, res, next) {
    const [, decodeToken] = req.rawHeaders;
    const token = decodeToken.split(' ')[1];
    const decoded = jwt.verify(token, KEY);
    const {is_admin} = decoded;
    is_admin == true ? next() : res.status(403).json({
        error: 'Administrator permissions are required to perform this action.',
        status: 403
    });
}

/**
 * 
 * @param {{body, rawHeaders}} req - Gets from the request the token, the email and password to proceeds to make the validation.
 * @param {function} res - Sends to the user the response depending if the user use his/her own token and if he/she exists on the database.
 * @param {function} next - When the user exists on the database and he/she is using his/her own  token proceeds to the next function.
 */

function validateLogin(req, res, next) {
    const {email, password} = req.body;
    if(email && password) {
        const encriptedPass = sha1(password);
        User.findOne({where: {email: email, password: encriptedPass},
            attributes: ['uuid', 'is_admin']
        })
        .then((data) => {
            if(data) {
                const {uuid, is_admin} = data;
                const tokenData = {
                    id: uuid,
                    is_admin
                };
                const token = jwt.sign(tokenData, KEY);
                req.token = token;
                next();
            } else {
                res.status(404).json({
                    error: 'Incorrect email and / or password.',
                    status: 404
                });
            }
        })
        .catch((err) => {
            res.status(500).json({
                error: `A problem has occurred with the server: ${err}.`,
                status: 500
            });
        });
    } else {
        res.status(400).json({
            error: 'The information received is invalid or necessary information is missing.',
            status: 400
        });
    }
}

/**
 * 
 * @param {{params, rawHeaders}} req - Gets from the request the token and the id to proceeds to make the validation and verify if the user's id exists on the database and compare the id from the token with the id received from the params to avoids the data manipulation from a non admin user.
 * @param {function} res - Sends to the user the response depending if the user has admin permission and if the user is trying to modify other users without admin permissions.
 * @param {function} next - When the user has admin permissions proceeds to the next function the same action happen when the non admin user modify his/her own data.
 */

function validateIdRole(req, res, next) {
    const {id} = req.params;
    const [, decodeToken] = req.rawHeaders;
    const token = decodeToken.split(' ')[1];
    const decoded = jwt.verify(token, KEY);
    const {is_admin} = decoded;
    if (is_admin == true) {
        next();
    } else {
        id == decoded.id ? next() : res.status(401).json({
            error: 'Invalid token',
            status: 401
        });
    }
}

// Routes

/**
 * Gets all user from the database (only admin can see this information)
 */

router.get(`${VERSION}/user`, validateRole, (req, res) => {
    User.findAll({
        attributes: {exclude: ['id', 'password']}
    })
    .then((data) => {
        res.json(data)
    })
    .catch((err) => {
        res.status(500).json({
            error: `A problem has occurred with the server: ${err}.`,
            status: 500
        });
    })
});

/**
 * Creates a new user and return the user object from the database (anybody can use this)
 */

router.post(`${VERSION}/user/register`, (req, res) => {
    const {username, name, last_name, email, phone, address, password, is_admin} = req.body;
    const encriptedPass = sha1(password);
    User.create({
        username, 
        name, 
        last_name, 
        email, 
        phone, 
        address, 
        password: encriptedPass, 
        is_admin})
    .then(({uuid, username, name, last_name, email, phone, address, is_admin, createdAt, updatedAt}) => {
        res.json({
            uuid, 
            username, 
            name: name || null, 
            last_name: last_name || null, 
            email, 
            phone, 
            address, 
            is_admin, 
            createdAt, 
            updatedAt
        });
    })
    .catch((err) => {
        res.status(400).json({
            error: `The information received is invalid or necessary information is missing: ${err}` ,
            status: 400
        });
    });
});

/**
 * When the user logged returns the main data of the user. (Is necessary send the token when the user gonna made this action.)
 */

router.post(`${VERSION}/user/login`, validateLogin, (req, res) => {
    const token = req.token;
    const {email} = req.body;
    User.findOne({where: {email: email},
        attributes: {exclude: ['id', 'password']}
    })
    .then((data) => {
        res.json({
            token,
            data
        });
    })
    .catch((err) => {
        res.status(500).json({
            error: `A problem has occurred with the server: ${err}.`,
            status: 500
        });
    });
});

/**
 * Returns the main data from an user selected by his/her id. (Only admin user can perform this action.)
 */

router.get(`${VERSION}/user/:id`, validateRole, (req, res) => {
    const {id} = req.params;
    User.findOne({where: {uuid: id},
        attributes: {exclude: ['id', 'password']}
    })
    .then((data) => {
        data ? res.json(data) : res.status(404).json({
            error: 'User not found.',
            status: 404
        });  
    })
    .catch((err) => {
        res.status(500).json({
            error: `A problem has occurred with the server: ${err}.`,
            status: 500
        });
    });
});

/**
 * Allows edit any user on the database, for this path any role can perform this action, although only admin user can edit others user data search him/her by the id.
 */

router.put(`${VERSION}/user/:id`, validateIdRole, (req, res) => {
    const {id} = req.params;
    const {username, name, last_name, email, phone, address, password, is_admin} = req.body;
    const encriptedNewPass = password && sha1(password);
    User.update({
        username,
        name,
        last_name,
        email,
        phone,
        address,
        password : encriptedNewPass,
        is_admin
    }, {where: {uuid: id}})
    .then(() => {
        User.findOne({where:{uuid: id}})
        .then((data) => {
            if (data) {
                const {uuid, username, name, last_name, email, phone, address, is_admin, createdAt, updatedAt} = data.dataValues;
                res.json({
                    uuid, 
                    username, 
                    name: name || null, 
                    last_name: last_name || null, 
                    email, 
                    phone, 
                    address, 
                    is_admin, 
                    createdAt, 
                    updatedAt
                });
            } else {
                res.status(404).json({
                    error: 'User not found.',
                    status: 404
                });
            }
        })
        .catch((err) => {
            res.status(500).json({
                error: `A problem has occurred with the server: ${err}.`,
                status: 500
            });
        });
    })
    .catch((err) => {
        res.status(500).json({
            error: `A problem has occurred with the server: ${err}.`,
            status: 500
        });
    });
});

/**
 * Allows delete any user on the database, for this path any role can perform this action, although only admin user can delete others users from the database using his/her respective id.
 */

router.delete(`${VERSION}/user/:id`, validateIdRole, (req, res) => {
    const {id} = req.params;
    User.findOne({where: {uuid: id}})
    .then((data) => {
        if (data) {
            User.destroy({where: {uuid: id}})
            .then(() => {
                res.json({
                    message: 'User deleted successfully.',
                    status: 200
                })
            })
            .catch(() => {
                res.status(500).json({
                    error: `A problem has occurred with the server: ${err}.`,
                    status: 500
                });
            });
        } else {
            res.status(404).json({
                error: 'User not found.',
                status: 404
            });
        }
    })
    .catch((err) => {
        res.status(500).json({
            error: `A problem has occurred with the server: ${err}.`,
            status: 500
        });
    });
});

// export

module.exports = router;
