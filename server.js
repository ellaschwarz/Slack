// const httpError = require('http-errors');
// const express = require('express');
// const path = require('path');
// const cookieParser = require('cookie-parser');
// const morgan = require('morgan');
// const server = express();


// let mongo = require("mongodb");
// let monk = require("monk");
// let bodyParser = require("body-parser");
// let usersDB = monk('localhost:27017/users');


// server.use(bodyParser.urlencoded({
//   extended: false
// }));


// server.use(bodyParser.json());

// //Gör vår databas tillgänglig för routen
// server.use(function (req, res, next) {
//     req.db = usersDB;
//     next();
//   });


// server.use(morgan('dev'));
// server.use(express.json());
// server.use(express.urlencoded({ extended: false }));
// server.use(cookieParser());
// server.use(express.static(path.join(__dirname, 'public')));