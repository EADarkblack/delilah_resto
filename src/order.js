const router = require('express').Router();
const {PORT, USER, VERSION, PASSWORD, DB_NAME, KEY} = process.env;
const {Sequelize, Op} = require('sequelize');
const sequelize = new Sequelize(`mysql://${USER}:${PASSWORD}@localhost:${PORT}/${DB_NAME}`)
const jwt = require('jsonwebtoken');
const order = require('./models/order');
const Order = order(sequelize, Sequelize);
const user = require('./models/user');
const User = user(sequelize, Sequelize);
const item = require('./models/item');
const Item = item(sequelize, Sequelize);
const product = require('./models/product');
const Product = product(sequelize, Sequelize);

// Relations

User.hasMany(Order, {foreignKey: 'user_id'});
Order.belongsTo(User, {foreignKey: 'user_id'});

Order.hasMany(Item, {foreignKey: 'order_id'});
Item.belongsTo(Order, {foreignKey: 'order_id'});

Product.hasMany(Item, {foreignKey: 'product_id'});
Item.belongsTo(Product, {foreignKey: 'product_id'});

/* Item.sync({force: true})
.then(() => {
    console.log("actualizado")
}); */


// Middlewares

/**
 * 
 * @param {[rawHeaders]} req - Gets the token from the request's header.
 * @param {function} res - Sends to the user the response depending if the user has passed the token on the header request.
 * @param {function} next - When the user has passed a valid token on the request header proceeds to the next function. 
 */

function validateToken(req, res, next) {
    const [, decodeToken] = req.rawHeaders;
    const token = decodeToken.split(' ')[1];
    const decoded = jwt.verify(token, KEY);
    const {id} = decoded;
    req.uuid = id;
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
    is_admin == true ? next() : res.status(403).json({
        error: 'Administrator permissions are required to perform this action.',
        status: 403
    });
}

/**
 * 
 * @param {{params, rawHeaders}} req - Gets from the request the token and the id to proceeds to make the validation and verify if the user's id exists on the database and compare the id from the token with the id received from the params to avoids the data manipulation from a non admin user.
 * @param {function} res - Sends to the user the response depending if the user has admin permission and if the user is trying to modify other users without admin permissions sends an error.
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
 * Gets all orders from the database and allow to search data using the queries from the path. (only admin can see this information)
 */

router.get(`${VERSION}/order`, validateToken, validateRole, (req, res) => {
    const {status} = req.query;
    if (status) {
        Order.findAll({where: {status : {[Op.like]: `%${status}%`}},
            attributes: {exclude: ['id', 'user_id']},
            include: [{
                attributes: {exclude: ['id', 'order_id','product_id']},
                model: Item,
                include: [{
                    attributes: {exclude: ['id']},
                    model: Product
                }]
            },
            {
                attributes: {exclude: ['id', 'password']},
                model: User
            }]
        })
        .then((data) => {
            res.json(data);
        })
        .catch((err) => {
            res.status(500).json({
                error: `A problem has occurred with the server: ${err}.`,
                status: 500
            });
        })
    } else {
        Order.findAll({
            attributes: {exclude: ['id', 'user_id']},
            include: [{
                attributes: {exclude: ['id', 'order_id','product_id']},
                model: Item,
                include: [{
                    attributes: {exclude: ['id']},
                    model: Product
                }]
            },
            {
                attributes: {exclude: ['id', 'password']},
                model: User
            }]
        })
        .then((data) => {
            res.json(data);
        })
        .catch((err) => {
            res.status(500).json({
                error: `A problem has occurred with the server: ${err}.`,
                status: 500
            });
        });
    }
});

/**
 * Creates a new order and return the order object from the database at the same time create the item object.
 */

router.post(`${VERSION}/order/new`, validateToken, (req, res) => {
    const {item, send_to, payment_type} = req.body;
    const uuid = req.uuid;
    User.findOne(
        {where: {uuid},
        attributes: ['id', 'address']
    })
    .then(({id, address}) => {
        const userId = id;
        Order.create({
            send_to: send_to || address,
            payment_type
        })
        .then(({id}) => {
            const orderId = id
            Order.update({user_id: userId}, {where: {id: orderId}})
            .then(() => {
                let total = 0;
                item.forEach(({uuid, amount}) => {
                    const amountValue = amount || 1;
                    Product.findOne({where: {uuid}})
                    .then(({id, price}) => {
                        const totalPriceItem = price * amountValue;
                        total += totalPriceItem;
                        Item.create({
                            amount: amountValue,
                            total_item: totalPriceItem,
                            order_id: orderId,
                            product_id: id
                        })
                        .then(() => {
                            Order.update({total}, {where: {id: orderId}})
                            .then(() => {
                                console.log('Information updated successfully.')
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
                    })
                    .catch((err) => {
                        res.status(500).json({
                            error: `A problem has occurred with the server: ${err}.`,
                            status: 500
                        });
                    });
                });
                Order.findOne({where: {id: orderId},
                    attributes: {exclude: ['id', 'total', 'user_id']},
                    include: [{
                        model: User,
                        attributes: {exclude: ['id', 'password']}
                    }]
                })
                .then(({uuid, status, send_to, payment_type, createdAt, updatedAt, user}) => {
                    res.json({
                        uuid,
                        status,
                        item: item || [],
                        user,
                        send_to,
                        payment_type,
                        createdAt,
                        updatedAt
                    });
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
        })
        .catch((err) => {
            res.status(500).json({
                error: `A problem has occurred with the server: ${err}.`,
                status: 500
            });
        });
    })
    .catch(() => {
        res.status(400).json({
            error: 'The information received is invalid or necessary information is missing.',
            status: 400
        });
    });
});

/**
 * Returns the orders from an user selected by his/her id. (Only admin can perform this action and the user only can see his/her own data.)
 */

router.get(`${VERSION}/user/:id/order`, validateToken, validateIdRole, (req, res) => {
    const {id} = req.params;
    User.findOne({where: {uuid: id},
        attributes: {exclude: ['id', 'password']},
        include: [{
            attributes: {exclude: ['id', 'user_id']},
            model: Order,
            include: {
                attributes: {exclude: ['id', 'order_id', 'product_id']},
                model: Item,
                include: {
                    attributes: {exclude: ['id']},
                    model: Product
                }
            }
        }]
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
 * Return an order selected by its id (Only admin can see this information.)
 */

router.get(`${VERSION}/order/:id`, validateToken, validateRole, (req, res) => {
    const {id} = req.params;
    Order.findOne({where: {uuid: id},
        attributes: {exclude: ['id','user_id']},
        include: [{
            attributes: {exclude: ['id', 'order_id', 'product_id']},
            model: Item,
            include: {
                attributes: {exclude: ['id']},
                model: Product
            },
        },
        {
            attributes: {exclude: ['id', 'password']},
            model: User
        }]
    })
    .then((data) => {
        res.json(data)
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

router.put(`${VERSION}/order/:id`, validateToken, validateRole, (req, res) => {
    const {id} = req.params;
    const {short_name, name, description, image, category, price, available} = req.body;
    const images = image || [];
    Product.update({
        short_name,
        name,
        description,
        category,
        price,
        available,
    }, {where: {uuid: id}})
    .then(() => {
        Product.findOne({where:{uuid: id}})
        .then((data) => {
            const {id, uuid, short_name, name, description, category, price, available, createdAt, updatedAt} = data.dataValues;
            const productId = id;
            images.forEach(({path}) => {
                Image.create({
                    path
                })
                .then(({id}) => {
                    Image.update({product_id: productId}, {where: {id: id}})
                    .then(() => {
                        console.log('Information updated.')
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
            res.json({
                uuid, 
                short_name, 
                name, 
                description, 
                image: images, 
                category, 
                price, 
                available,
                createdAt, 
                updatedAt
            });
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
 * 
 */

router.put(`${VERSION}/product/image/:id`, validateToken, validateRole, (req, res) => {
    const {id} = req.params;
    const {path} = req.body;
    Image.update({
        path
    }, {where: {uuid: id}})
    .then(() => {
        Image.findOne({where:{uuid: id},
            attributes: {exclude: ['id', 'product_id']}})
        .then((data) => {
            if (data) {
                res.json(data)
            } else {
                res.status(404).json({
                    error: 'Image not found.',
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
 * 
 */

router.delete(`${VERSION}/product/image/:id`, validateToken, validateRole, (req, res) => {
    const {id} = req.params;
    Image.findOne({where: {uuid: id}})
    .then((data) => {
        if (data) {
            Image.destroy({where: {uuid: id}})
            .then(() => {
                res.json({
                    message: 'Image deleted successfully.',
                    status: 200
                })
            })
            .catch((err) => {
                res.status(500).json({
                    error: `A problem has occurred with the server: ${err}.`,
                    status: 500
                });
            });
        } else {
            res.status(404).json({
                error: 'Image not found.',
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
 * Allows delete any user on the database, for this path any role can perform this action, although only admin user can delete others users from the database using his/her respective id.
 */

router.delete(`${VERSION}/product/:id`, validateToken, validateRole, (req, res) => {
    const {id} = req.params;
    Product.findOne({where: {uuid: id}})
    .then((data) => {
        if (data) {
            Product.destroy({where: {uuid: id}})
            .then(() => {
                Image.findAll({where: {product_id: null}})
                .then((data) => {
                    data.forEach(({uuid}) => {
                        Image.destroy({where: {uuid: uuid}})
                        .then(() => {
                            console.log('Image deleted successfully.');
                        })
                        .catch((err) => {
                            res.status(500).json({
                                error: `A problem has occurred with the server: ${err}.`,
                                status: 500
                            });
                        });
                    });
                })
                .catch((err) => {
                    res.status(500).json({
                        error: `A problem has occurred with the server: ${err}.`,
                        status: 500
                    });
                });
                res.json({
                    message: 'Product deleted successfully.',
                    status: 200
                });
            })
            .catch((err) => {
                res.status(500).json({
                    error: `A problem has occurred with the server: ${err}.`,
                    status: 500
                });
            });
        } else {
            res.status(404).json({
                error: 'Product not found.',
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