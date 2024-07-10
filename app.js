const express = require('express');
const socket = require('socket.io');
const http = require('http');
const { Chess } = require('chess.js');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socket(server);

const chess = new Chess();
let players = {};
let currentPlayer = 'w';

app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.render('index', { title: 'Chess Game' });
});

io.on('connection', (uniquesocket) => {
    console.log('Connected:', uniquesocket.id);

    if (!players.white) {
        players.white = uniquesocket.id;
        uniquesocket.emit('playerRole', 'w');
    } else if (!players.black) {
        players.black = uniquesocket.id;
        uniquesocket.emit('playerRole', 'b');
    } else {
        uniquesocket.emit('spectatorRole');
    }

    uniquesocket.on('disconnect', () => {
        if (uniquesocket.id === players.white) {
            delete players.white;
            console.log('Player white exited');
        } else if (uniquesocket.id === players.black) {
            delete players.black;
            console.log('Player black exited');
        }
    });

    uniquesocket.on('move', (move) => {
        try {
            // Validate turn
            if ((chess.turn() === 'w' && uniquesocket.id !== players.white) ||
                (chess.turn() === 'b' && uniquesocket.id !== players.black)) {
                return;
            }

            const result = chess.move(move);
            if (result) {
                currentPlayer = chess.turn();
                io.emit('move', move);
                io.emit('boardState', chess.fen());
            } else {
                console.log('Invalid move:', move);
                uniquesocket.emit('invalidMove', move);
            }
        } catch (error) {
            console.error('Error processing move:', error);
            uniquesocket.emit('invalidMove', move);
        }
    });

    // Send initial board state to the newly connected player
    uniquesocket.emit('boardState', chess.fen());
});

server.listen(3000, () => {
    console.log('Server is running on port 3000');
});
