const express = require('express')
const app = express()
const cors = require('cors');

app.use(cors({origin: 'http://localhost:8000'}));


//set the template engine ejs
app.set('view engine', 'ejs')

//middlewares
app.use(express.static('public'))


const bluebird = require('bluebird');
const redis = require("redis"),
    redisClient = redis.createClient();
bluebird.promisifyAll(redis.RedisClient.prototype);
bluebird.promisifyAll(redis.Multi.prototype);


//routes
app.get('/', (req, res) => {
	res.render('index')
});

//Listen on port 3000
server = app.listen(8000)



//socket.io instantiation
const io = require("socket.io")(server)
const connectionStats = {
    count : 0
};

//listen on every connection
io.on('connection', (socket) => {
    socket.broadcast.emit('New user connected.');
    console.log('> new connection');
    console.log(socket.id);

	//default username
	socket.username = "anon." + connectionStats.count++;
    redisClient
        .setAsync(socket.id, socket.username)
        .then(function(userInserted){
            console.log("NEW USER INSERTED")
            redisClient
                .keys('*', function(err, keys){
                    if(err){
                        console.log("REDIS ERR", err)
                    } else {
                        console.log('KEYS IN REDIS', keys);
                    }
                })
        })
        .catch(err => {
            console.log("REDIS ERR:", err)
        });

    //listen on change_username
    socket.on('change_username', (inputData) => {
        redisClient
            .keys(socket.id, function(err, data){
                if(err){
                    console.log("REDIS ERR", err)
                } else {
                    socket.username = inputData.username;

                    redisClient
                        .setAsync(socket.id, socket.username)
                        .then(function(response){
                            console.log(response)
                        })
                        .catch(err => console.log("REDIS ERR", err));
                }
            })
    });

    //listen on new_message
    socket.on('new_message', (data) => {
        //broadcast the new message
        io.sockets.emit('new_message', {message : data.message, username : socket.username});
    });

    //listen on typing
    socket.on('typing', (data) => {
    	socket.broadcast.emit('typing', {username : socket.username})
    })
})
