const router = require('express').Router();
const version = process.env.VERSION;

router.get(`${version}/product`, (req, res) => {
    res.json('Hola mundo desde otra ruta')
})

module.exports = router;