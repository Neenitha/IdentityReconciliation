const express = require('express');
const morgan = require('morgan');
const httpStatus = require('http-status');
const identityRoute = require('./routes/identity.route');

// Create an instance of the Express application
const app = express();

app.use(express.json());
app.use(morgan('dev'));

// global error handling middleware
app.use((err, req, res, next) => {
  console.log("erroring");
  console.error(err.stack)
  res.status(httpStatus.status.INTERNAL_SERVER_ERROR).send(err.message)
});

app.use('/identity', identityRoute);

// Home Page
app.get('/', (req, res) => {
  res.send('<h1> Welcome to Identity Reconciliation! </p>');
});

module.exports = app;
