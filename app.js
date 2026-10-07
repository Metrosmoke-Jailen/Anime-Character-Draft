const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

const io = new Server(server);

app.use(express.static("static"));

const rooms = {};

const characters = [
    {
        id: 1,
        name: "Goku",
        anime: "Dragon Ball",
        power: 98,
        icon: "⚡"
    },
    {
        id: 2,
        name: "Luffy",
        anime: "One Piece",
        power: 94,
        icon: "🏴‍☠️"
    },
    {
        id: 3,
        name: "Gojo",
        anime: "Jujutsu Kaisen",
        power: 97,
        icon: "👁️"
    },
    {
        id: 4,
        name: "Naruto",
        anime: "Naruto",
        power: 93,
        icon: "🍥"
    },
    {
        id: 5,
        name: "Ichigo",
        anime: "Bleach",
        power: 95,
        icon: "⚔️"
    },
    {
        id: 6,
        name: "Tanjiro",
        anime: "Demon Slayer",
        power: 89,
        icon: "🔥"
    },
    {
        id: 7,
        name: "Saitama",
        anime: "One Punch Man",
        power: 99,
        icon: "👊"
    },
    {
        id: 8,
        name: "Eren",
        anime: "Attack on Titan",
        power: 91,
        icon: "🧱"
    },
    {
        id: 9,
        name: "Denji",
        anime: "Chainsaw Man",
        power: 88,
        icon: "🪚"
    }
];

// Check whether every player in a room is ready
function allPlayersReady(room) {
    const players = Object.values(rooms[room].players);

    return (
        players.length >= 2 &&
        players.every((player) => player.ready)
    );
}

function getRandomCharacters(amount) {
    const shuffled = [...characters]
        .sort(() => Math.random() - 0.5);

    return shuffled.slice(0, amount);
}

function startDraft(room) {

    const roomData = rooms[room];

    roomData.state = "drafting";
    roomData.round = 1;

    roomData.currentCharacters =
        getRandomCharacters(3);

    io.to(room).emit("start-draft", {
        round: roomData.round,
        characters: roomData.currentCharacters
    });

    console.log(
        `Round ${roomData.round} started in room ${room}`
    );
}

io.on("connection", (socket) => {

    console.log("Player connected:", socket.id);

    // Player joins a room
    socket.on("join-room", ({ username, room }) => {

        // Create room if it doesn't exist
        if (!rooms[room]) {
            rooms[room] = {
                players: {},
                round: 1,
                state: "waiting",
                currentCharacters: [],
                draftHistory: []
            };
        }

        // Add player to room
        rooms[room].players[socket.id] = {
            id: socket.id,
            username: username,
            team: [],
            ready: false
        };

        // Join Socket.IO room
        socket.join(room);

        console.log(`${username} joined room ${room}`);

        // Send updated player list to everyone
        io.to(room).emit("room-update", {
            players: Object.values(rooms[room].players)
        });
    });

    // Player clicks Ready
    socket.on("player-ready", () => {

        // Find the Socket.IO room this player belongs to
        const room = [...socket.rooms].find(
            (room) => room !== socket.id
        );

        if (!room) {
            return;
        }

        const roomData = rooms[room];

        if (!roomData) {
            return;
        }

        const player = roomData.players[socket.id];

        if (!player) {
            return;
        }

        // Mark player as ready
        player.ready = true;

        console.log(`${player.username} is ready`);

        // Update everyone in the room
        io.to(room).emit("room-update", {
            players: Object.values(roomData.players)
        });

        // Start the draft once everyone is ready
        if (allPlayersReady(room)) {

            roomData.state = "drafting";

            console.log(`Draft started in room ${room}`);

            io.to(room).emit("start-draft", {
                round: roomData.round
            });
        }
    });

    // Player disconnects
    socket.on("disconnect", () => {

        console.log("Player disconnected:", socket.id);

        // Find the room the player was in
        const room = [...socket.rooms].find(
            (room) => room !== socket.id
        );

        if (!room || !rooms[room]) {
            return;
        }

        // Remove player
        delete rooms[room].players[socket.id];

        // Tell remaining players
        io.to(room).emit("room-update", {
            players: Object.values(rooms[room].players)
        });

        // Delete empty rooms
        if (Object.keys(rooms[room].players).length === 0) {
            delete rooms[room];

            console.log(`Room ${room} deleted`);
        }
    });
});

const PORT = 3000;

server.listen(PORT, () => {
    console.log(`Anime Character Draft running at http://localhost:${PORT}`);
});