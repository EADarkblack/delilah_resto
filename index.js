const express  = require('express');
require('dotenv').config();
const app = express();
const product = require('./src/product');
const user = require('./src/user');
const helmet = require('helmet');
const cors = require('cors');

// Middlewares

app.use(express.urlencoded({extended: true}));
app.use(express.json());
app.use(helmet());
app.use(cors());

// Routes

app.use(user)
app.use(product)

// listen

app.listen(4000, () => {
    console.log(`App listening on port 4000!`);
});