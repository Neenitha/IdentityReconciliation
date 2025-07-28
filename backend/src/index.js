const app = require('./app');
const config = require('./config/config');

// Start the server
const port = config.PORT;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
