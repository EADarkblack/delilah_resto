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
const image = require('./models/image');
const Image = image(sequelize, Sequelize);

// Relations

User.hasMany(Order, {foreignKey: 'user_id'});
Order.belongsTo(User, {foreignKey: 'user_id'});

Order.hasMany(Item, {foreignKey: 'order_id'});
Item.belongsTo(Order, {foreignKey: 'order_id'});

Product.hasMany(Item, {foreignKey: 'product_id'});
Item.belongsTo(Product, {foreignKey: 'product_id'});

Product.hasMany(Image, {foreignKey: 'product_id'});
Image.belongsTo(Product, {foreignKey: 'product_id'});

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
    const {id, is_admin} = decoded;
    req.uuid = id;
    req.is_admin = is_admin;
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

/**
 * 
 * @param {{uuid, is_admin, params}} req - Gets from the request the user's data to validate if the user is trying to modify order or item from other user.
 * @param {function} res - Sends to the user the response depending if the user's data correspond to her/his own data.
 * @param {function} next - When the user has admin permissions proceeds to the next function the same action happen when the non admin user modify his/her own data.
 */

function validateOrderId(req, res, next) {
    const uuid = req.uuid;
    const is_admin = req.is_admin;
    const {id} = req.params;
    if (is_admin == true) {
        Order.findOne({where: {uuid: id}})
        .then((data) => {
            data ? next() : res.status(404).json({
                error: 'Order not found.',
                status: 404
            });
        })
        .catch((err) => {
            res.status(500).json({
                error: `A problem has occurred with the server: ${err}.`,
                status: 500
            });
        });
    } else {
        User.findOne({where: {uuid},
            include: [{
                model: Order
            }]
        })
        .then(({orders}) => {
            const sameOrder = orders.find((orders) => orders.uuid == id);
            sameOrder ? next() : res.status(403).json({
                error: 'Administrator permissions are required to perform this action.',
                status: 403
            });
        })
        .catch((err) => {
            res.status(500).json({
                error: `A problem has occurred with the server: ${err}.`,
                status: 500
            });
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
                    model: Product,
                    include: [{
                        attributes: {exclude: ['id', 'product_id']},
                        model: Image
                    }]
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
                    model: Product,
                    include: [{
                        attributes: {exclude: ['id', 'product_id']},
                        model: Image
                    }]
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
                        send_to,
                        payment_type,
                        createdAt,
                        updatedAt,
                        item: item || [],
                        user
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
                    model: Product,
                    include: [{
                        attributes: {exclude: ['id', 'product_id']},
                        model: Image
                    }]
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

router.get(`${VERSION}/order/:id`, validateToken, validateOrderId, (req, res) => {
    const {id} = req.params;
    Order.findOne({where: {uuid: id},
        attributes: {exclude: ['id','user_id']},
        include: [{
            attributes: {exclude: ['id', 'order_id', 'product_id']},
            model: Item,
            include: {
                attributes: {exclude: ['id']},
                model: Product,
                include: [{
                    attributes: {exclude: ['id', 'product_id']},
                    model: Image
                }]
            },
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
});

/**
 * Allows edit any order on the database. (Only admin user can perform this action.)
 */

router.put(`${VERSION}/order/:id`, validateToken, validateRole, (req, res) => {
    const {id} = req.params;
    const {status, send_to, payment_type, item} = req.body;
    const items = item || [];
    Order.update({
        status,
        send_to,
        payment_type
    }, {where: {uuid: id}})
    .then(() => {
        Order.findOne({where: {uuid: id},
            attributes: {exclude: ['user_id']}
        })
        .then(({id, uuid, status, send_to, payment_type, createdAt, updatedAt}) => {
            const orderId = id;
            items.forEach(({uuid, amount}) => {
                const amountValue = amount || 1;
                Product.findOne({where: {uuid}})
                .then(({id, price}) => {
                    const totalPriceItem = price * amountValue;
                    Item.create({
                        amount: amountValue,
                        total_item: totalPriceItem,
                        order_id: orderId,
                        product_id: id
                    })
                    .then(() => {
                        Item.findAll({where: {order_id: orderId}})
                        .then((data) => {
                            let newTotal = 0;
                            data.forEach(({total_item}) => {
                                newTotal += total_item;
                            });
                            Order.update({total: newTotal}, {where: {id: orderId}})
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
                status,
                send_to,
                payment_type,
                createdAt,
                updatedAt,
                item: items
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
            error: `The information received is invalid or necessary information is missing.` ,
            status: 400
        });
    });
});

/**
 * Allows update an item's data using its id, only admin can perform this action.
 */

router.put(`${VERSION}/order/item/:id`, validateToken, validateRole, (req, res) => {
    const {id} = req.params;
    const {amount} = req.body;
    const newAmount = amount || 1;
    Item.findOne({where: {uuid: id},
        include: [{
            model: Product,
        }]
    })
    .then(({product}) => {
        const {price} = product;
        const newTotalItem = price * newAmount;
        Item.update({
            amount: newAmount,
            total_item: newTotalItem
        },{where: {uuid: id}})
        .then(() => {
            Item.findOne({where: {uuid: id},
                attributes: {exclude: ['id', 'order_id', 'product_id']},
                include: [{
                    attributes: {exclude: ['id']},
                    model: Product,
                    include: [{
                        attributes: {exclude: ['id', 'product_id']},
                        model: Image
                    }]
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
 * Allows delete an order's item using its id, only admin can perform this action.
 */

router.delete(`${VERSION}/order/item/:id`, validateToken, validateRole, (req, res) => {
    const {id} = req.params;
    Item.findOne({where: {uuid: id}})
    .then((data) => {
        if (data) {
            Item.destroy({where: {uuid: id}})
            .then(() => {
                res.json({
                    message: 'Item deleted successfully.',
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
                error: 'Item not found.',
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
 * Allows delete any order on the database (Only admin can perform this action.)
 */

router.delete(`${VERSION}/order/:id`, validateToken, validateRole, (req, res) => {
    const {id} = req.params;
    Order.findOne({where: {uuid: id}})
    .then((data) => {
        if (data) {
            Order.destroy({where: {uuid: id}})
            .then(() => {
                Item.findAll({where: {order_id: null}})
                .then((data) => {
                    data.forEach(({uuid}) => {
                        Item.destroy({where: {uuid: uuid}})
                        .then(() => {
                            console.log('Item deleted successfully.');
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
                    message: 'Order deleted successfully.',
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
                error: 'Order not found.',
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