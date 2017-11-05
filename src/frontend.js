const port = process.env.PORT || 1100;

const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);

app.use(express.static('client'));
app.use('/images', express.static('images'));

app.use('/jquery', express.static('node_modules/jquery/dist'));
app.use('/bootstrap', express.static('node_modules/bootstrap/dist'));
app.use('/fontawesome', express.static('node_modules/font-awesome'));
app.use('/tether', express.static('node_modules/tether/dist'));
app.use('/popper', express.static('node_modules/popper.js/dist/umd'));

http.listen(port, () => {
    console.log('Server started on port ' + port);
});

module.exports = io;