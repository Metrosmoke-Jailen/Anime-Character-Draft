const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

const io = new Server(server);

app.use(express.static("static"));


// ========================================
// GAME DATA
// ========================================

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


// ========================================
// HELPER FUNCTIONS
// ========================================

// Find the room a socket belongs to
function getPlayerRoom(socket) {

    return [...socket.rooms].find(
        (room) => room !== socket.id
    );

}


// Check whether all players are ready
function allPlayersReady(room) {

    const players =
        Object.values(rooms[room].players);

    return (
        players.length >= 2 &&
        players.every(
            (player) => player.ready
        )
    );

}


// Check whether every player has
// picked during the current round
function allPlayersPicked(room) {

    const players =
        Object.values(rooms[room].players);

    return players.every(
        (player) =>
            player.team.length === rooms[room].round
    );

}


// Get random characters
function getRandomCharacters(amount) {

    const shuffled =
        [...characters].sort(
            () => Math.random() - 0.5
        );

    return shuffled.slice(0, amount);

}


// ========================================
// START DRAFT
// ========================================

function startDraft(room) {

    const roomData = rooms[room];

    roomData.state = "drafting";
    roomData.round = 1;

    roomData.currentCharacters =
        getRandomCharacters(3);

    console.log(
        `Round ${roomData.round} started in room ${room}`
    );

    io.to(room).emit("start-draft", {
        round: roomData.round,
        characters: roomData.currentCharacters
    });

}


// ========================================
// NEXT ROUND
// ========================================

function nextRound(room) {

    const roomData = rooms[room];

    roomData.round += 1;


    // End after 5 rounds
    if (roomData.round > 5) {

        endDraft(room);

        return;
    }


    // Generate new characters
    roomData.currentCharacters =
        getRandomCharacters(3);


    console.log(
        `Starting round ${roomData.round} in room ${room}`
    );


    io.to(room).emit("next-round", {
        round: roomData.round,
        characters: roomData.currentCharacters
    });

}


// ========================================
// END DRAFT
// ========================================

function endDraft(room) {

    // Results will be implemented
    // in a later step.

    const roomData = rooms[room];

    roomData.state = "finished";

    console.log(
        `Draft finished in room ${room}`
    );

}


// ========================================
// SOCKET.IO
// ========================================

io.on("connection", (socket) => {

    console.log(
        "Player connected:",
        socket.id
    );


    // ====================================
    // JOIN ROOM
    // ====================================

    socket.on(
        "join-room",
        ({ username, room }) => {

            // Create room if necessary
            if (!rooms[room]) {

                rooms[room] = {

                    players: {},

                    round: 1,

                    state: "waiting",

                    currentCharacters: [],

                    draftHistory: []

                };

            }


            // Add player
            rooms[room].players[socket.id] = {

                id: socket.id,

                username: username,

                team: [],

                ready: false

            };


            // Join Socket.IO room
            socket.join(room);


            console.log(
                `${username} joined room ${room}`
            );


            // Tell everyone about
            // the updated player list
            io.to(room).emit(
                "room-update",
                {
                    players:
                        Object.values(
                            rooms[room].players
                        )
                }
            );

        }
    );


    // ====================================
    // PLAYER READY
    // ====================================

    socket.on(
        "player-ready",
        () => {

            const room =
                getPlayerRoom(socket);


            if (!room) {
                return;
            }


            const roomData =
                rooms[room];


            if (!roomData) {
                return;
            }


            const player =
                roomData.players[socket.id];


            if (!player) {
                return;
            }


            // Mark player ready
            player.ready = true;


            console.log(
                `${player.username} is ready`
            );


            // Update everyone
            io.to(room).emit(
                "room-update",
                {
                    players:
                        Object.values(
                            roomData.players
                        )
                }
            );


            // Start game when everyone
            // is ready
            if (allPlayersReady(room)) {

                console.log(
                    `Draft started in room ${room}`
                );

                startDraft(room);

            }

        }
    );


    // ====================================
    // PICK CHARACTER
    // ====================================

    socket.on(
        "pick-character",
        ({ characterId }) => {

            const room =
                getPlayerRoom(socket);


            if (!room) {
                return;
            }


            const roomData =
                rooms[room];


            if (!roomData) {
                return;
            }


            // Only allow picks during drafting
            if (
                roomData.state !== "drafting"
            ) {
                return;
            }


            // Find character in current round
            const character =
                roomData.currentCharacters.find(
                    (character) =>
                        character.id === characterId
                );


            // Character doesn't exist
            if (!character) {
                return;
            }


            // Character already picked
            if (character.pickedBy) {
                return;
            }


            // Find player
            const player =
                roomData.players[socket.id];


            if (!player) {
                return;
            }


            // Claim character
            character.pickedBy =
                socket.id;


            // Add character to team
            player.team.push(character);


            console.log(
                `${player.username} picked ${character.name}`
            );


            // Tell everyone about the pick
            io.to(room).emit(
                "draft-update",
                {
                    characterId:
                        character.id,

                    playerId:
                        socket.id,

                    username:
                        player.username
                }
            );


            // Check whether everyone
            // has picked this round
            if (allPlayersPicked(room)) {

                setTimeout(
                    () => {
                        nextRound(room);
                    },
                    1000
                );

            }

        }
    );


    // ====================================
    // DISCONNECT
    // ====================================

    socket.on(
        "disconnect",
        () => {

            console.log(
                "Player disconnected:",
                socket.id
            );


            const room =
                getPlayerRoom(socket);


            if (!room) {
                return;
            }


            if (!rooms[room]) {
                return;
            }


            // Remove player
            delete rooms[room]
                .players[socket.id];


            // Notify remaining players
            io.to(room).emit(
                "room-update",
                {
                    players:
                        Object.values(
                            rooms[room].players
                        )
                }
            );


            // Delete empty room
            if (
                Object.keys(
                    rooms[room].players
                ).length === 0
            ) {

                delete rooms[room];

                console.log(
                    `Room ${room} deleted`
                );

            }

        }
    );

});


// ========================================
// START SERVER
// ========================================

const PORT = 3000;

server.listen(
    PORT,
    () => {

        console.log(
            `Anime Character Draft running at http://localhost:${PORT}`
        );

    }
);