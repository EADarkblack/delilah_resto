const router = require('express').Router();
const {PORT, USER, VERSION, PASSWORD, DB_NAME, KEY} = process.env;
const {Sequelize, Op} = require('sequelize');
const sequelize = new Sequelize(`mysql://${USER}:${PASSWORD}@localhost:${PORT}/${DB_NAME}`)
const jwt = require('jsonwebtoken');
const product = require('./models/product');
const Product = product(sequelize, Sequelize);
const image = require('./models/image');
const Image = image(sequelize, Sequelize);

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
    token ? next() : res.status(401).json({
        error: 'Invalid token',
        status: 401
    });;
}

/**
 * 
 * @param {[rawHeaders]} req - Gets the token from the request's header.
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

// Routes

/**
 * Gets all products from the database.
 */

router.get(`${VERSION}/product`, validateToken, (req, res) => {
    const {category, q} = req.query;
    if (category || q) {
        Product.findAll({where: {[Op.or]: [
            {category : {[Op.like]: `%${category}%`}},
            {name: {[Op.like]: `%${q}%`}}
        ]},
        attributes: {exclude: ['id']},
        include: [{
            model: Image,
            attributes: {exclude: ['id', 'product_id']}
        }]})
        .then((data) => {
            res.json(data);
        })
        .catch((err) => {
            res.status(500).json({
                error: `A problem has occurred with the server: ${err}.`,
                status: 500
            });
        });
    } else {
        Product.findAll({
            attributes: {exclude: ['id']},
            include: [{
                model: Image,
                attributes: {exclude: ['id', 'product_id']}
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
 * Creates a new product and return the product object from the database and when an image exists create the image object (admin permission is required to perform this action.)
 */

router.post(`${VERSION}/product/new`, validateToken, validateRole, (req, res) => {
    const {short_name, name, description, image, category, price, available} = req.body;
    const images = image || [];
    Product.create({
        short_name,
        name, 
        description,
        category, 
        price, 
        available,
    })
    .then((data) => {
        const {uuid, id} = data.dataValues;
        const productId = id;
        images.forEach((item) => {
            const {path} = item;
            Image.create({
                path
            })
            .then((data) => {
                const {id} = data.dataValues;
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
                createdAt,
                updatedAt,
                image: images
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
        })
    });
});

/**
 * Returns the data from a product selected by its id.
 */

router.get(`${VERSION}/product/:id`, validateToken, (req, res) => {
    const {id} = req.params;
    Product.findOne({where: {uuid: id},
        attributes: {exclude: ['id']},
        include: [{
            model: Image,
            attributes: {exclude: ['id', 'product_id']}
        }]
    })
    .then((data) => {
        data ? res.json(data) : res.status(404).json({
            error: 'Product not found.',
            status: 404
        });
    })
    .catch((err) => {
        res.status(500).json({
            error: `A problem has occurred with the server: ${err}.`,
            status: 500
        });
    })
});

/**
 * Allows edit any product on the database, for this path only admin can perform this action.
 */

router.put(`${VERSION}/product/:id`, validateToken, validateRole, (req, res) => {
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
                category, 
                price, 
                available,
                createdAt, 
                updatedAt,
                image: images
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
 * Allows update an image's data using its id, only admin can perform this action.
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
 * Allows delete an image using its id, only admin can perform this action.
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
 * Allows delete any product on the database, for this path only admin can perform this action.
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