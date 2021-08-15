const router = require('express').Router();
const {PORT, USER, VERSION, PASSWORD, DB_NAME, KEY} = process.env;
const {Sequelize, QueryTypes} = require('sequelize');
const sequelize = new Sequelize(`mysql://${USER}:${PASSWORD}@localhost:${PORT}/${DB_NAME}`)
const jwt = require('jsonwebtoken');
const sha1 = require('sha1');
const product = require('./models/product');
const Product = product(sequelize, Sequelize);
const image = require('./models/image');
const Image = image(sequelize, Sequelize);

Product.hasMany(Image, {foreignKey: 'product_id'});
Image.belongsTo(Product, {foreignKey: 'product_id'});


/* sequelize.sync({force: true})
.then(() => {
    console.log("actualizado")
}) */

// Middlewares

/**
 * 
 * @param {*} req 
 * @param {*} res 
 * @param {*} next 
 */

function validateToken(req, res, next) {
    const [, decodeToken] = req.rawHeaders;
    const token = decodeToken.split(' ')[1];
    token ? next() : res.status(401).json({
        error: 'Invalid token',
        status: 401
    });;
}

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
    if(is_admin == true) {
        next();
    } else {
        res.status(403).json({
            error: 'Administrator permissions are required to perform this action.',
            status: 403
        });
    }
}

/**
 * 
 * @param {*} req 
 * @param {*} res 
 * @param {*} next 
 */

function uploadImg(req, res, next) {
    const {image} = req.body;
    const images = image || [];
    if (images.length != 0) {
        let imgArr = []
/*         console.log("tiene data")
        console.log(images) */
        images.forEach((item) => {
            const {path} = item;
            Image.create({
                path
            })
            .then((data) => {
                const {uuid, path, createdAt, updatedAt} = data.dataValues;
                const images = {
                    uuid,
                    path,
                    createdAt,
                    updatedAt
                }
                imgArr.push(images);
                // console.log(imgArr)
            })
        });

    } else {
        console.log("no tiene data")
    }
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
        User.findOne({where: {email: email, password: encriptedPass}})
        .then((data) => {
            if(data) {
                const {uuid, username, is_admin} = data;
                const tokenData = {
                    id: uuid,
                    username: username,
                    is_admin: is_admin
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
        })
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
    if (is_admin == 1) {
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

router.get(`${VERSION}/product`, validateRole, (req, res) => {
    Product.findAll({
        include: {
            model: Image
        }
    })
    .then(([data]) => {
        const {dataValues} = data;
        res.json(dataValues)
    })
/*     sequelize.query('SELECT uuid, username, name, last_name, email, phone, address, is_admin, createdAt, updatedAt FROM user', {type: QueryTypes.SELECT})
    .then((data) => {
        res.json(data);
    })
    .catch((err) => {
        res.status(500).json({
            error: `A problem has occurred with the server: ${err}.`,
            status: 500
        });
    }); */
});

/**
 * Creates a new user and return the user object from the database (anybody can use this)
 */

router.post(`${VERSION}/product/new`, validateToken, validateRole, uploadImg, (req, res) => {
    const {short_name, name, description, category, price, available} = req.body;
    const image = req.image;
    console.log(image)
    Product.create({
        short_name,
        name, 
        description,
        category, 
        price, 
        available,
    })
    .then((data) => {
        const {uuid} = data.dataValues;
        Product.findOne({where: {uuid: uuid}},)
        .then((data) => {
            const {uuid, short_name, name, description, category, price, available, createdAt, updatedAt} = data.dataValues;
            res.json({
                uuid,
                short_name,
                name,
                description,
                category,
                price,
                available,
                image,
                createdAt,
                updatedAt
            })
            console.log("a")
        })
/*         const {uuid, short_name, name, description, image, category, price, available, createdAt, updatedAt} = data;
        res.json({
            uuid: uuid,
            short_name: short_name,
            name: name, 
            description: description || null, 
            category: category, 
            price: price, 
            available: available, 
            createdAt: createdAt, 
            updatedAt: updatedAt
        }); */
    })
    .catch(() => {
        /*         res.status(400).json({
            error: err.errors[0].message,
            status: 400
        }) */
    })
});

/**
 * When the user logged returns the main data of the user. (Is necessary send the token when the user gonna made this action.)
 */

router.post(`${VERSION}/user/login`, validateLogin, (req, res) => {
    const token = req.token;
    const {email} = req.body;
    sequelize.query('SELECT uuid, username, name, last_name, email, phone, address, is_admin, createdAt, updatedAt FROM user WHERE email= :email', {type: QueryTypes.SELECT, replacements: {
        email: email
    }})
    .then(([data]) => {
        res.json({
            token: token,
            user: data
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
    sequelize.query('SELECT uuid, username, name, last_name, email, phone, address, is_admin, createdAt, updatedAt FROM user WHERE uuid = :id', {type: QueryTypes.SELECT, replacements: {
        id: id
     }})
    .then(([data]) => {
        if (data) {
            res.json(data);
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
                    uuid: uuid, 
                    username: username, 
                    name: name || null, 
                    last_name: last_name || null, 
                    email: email, 
                    phone: phone, 
                    address: address, 
                    is_admin: is_admin, 
                    createdAt: createdAt, 
                    updatedAt: updatedAt
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