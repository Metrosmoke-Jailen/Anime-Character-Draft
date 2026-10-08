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

function getPlayerRoom(socket) {

    return [...socket.rooms].find(
        (room) => room !== socket.id
    );

}


function allPlayersReady(room) {

    const players =
        Object.values(
            rooms[room].players
        );

    return (
        players.length >= 2 &&
        players.every(
            (player) =>
                player.ready
        )
    );

}


function allPlayersPicked(room) {

    const players =
        Object.values(
            rooms[room].players
        );

    return players.every(
        (player) =>
            player.team.length ===
            rooms[room].round
    );

}


function getRandomCharacters(
    amount,
    pickedCharacters = []
) {

    const availableCharacters =
        characters.filter(
            (character) =>
                !pickedCharacters.includes(
                    character.id
                )
        );

    const shuffled =
        [...availableCharacters].sort(
            () => Math.random() - 0.5
        );

    return shuffled.slice(
        0,
        amount
    );

}


// ========================================
// START DRAFT
// ========================================

function startDraft(room) {

    const roomData =
        rooms[room];

    roomData.state =
        "drafting";

    roomData.round =
        1;

    roomData.currentCharacters =
        getRandomCharacters(
            3,
            roomData.pickedCharacters
        );

    console.log(
        `Round ${roomData.round} started in room ${room}`
    );

    io.to(room).emit(
        "start-draft",
        {
            round:
                roomData.round,

            characters:
                roomData.currentCharacters
        }
    );

}


// ========================================
// NEXT ROUND
// ========================================

function nextRound(room) {

    const roomData =
        rooms[room];

    roomData.round += 1;

    if (
        roomData.round > 5
    ) {

        endDraft(room);

        return;

    }

    roomData.currentCharacters =
        getRandomCharacters(
            3,
            roomData.pickedCharacters
        );

    console.log(
        `Starting round ${roomData.round} in room ${room}`
    );

    io.to(room).emit(
        "next-round",
        {
            round:
                roomData.round,

            characters:
                roomData.currentCharacters
        }
    );

}


// ========================================
// TEAM POWER
// ========================================

function calculateTeamPower(
    team
) {

    return team.reduce(
        (
            total,
            character
        ) => {

            return (
                total +
                character.power
            );

        },
        0
    );

}


// ========================================
// END DRAFT
// ========================================

function endDraft(room) {

    const roomData =
        rooms[room];

    roomData.state =
        "finished";

    const players =
        Object.values(
            roomData.players
        );

    const results =
        players.map(
            (player) => {

                const score =
                    calculateTeamPower(
                        player.team
                    );

                return {
                    id:
                        player.id,

                    username:
                        player.username,

                    team:
                        player.team,

                    score:
                        score
                };

            }
        );

    const highestScore =
        Math.max(
            ...results.map(
                (player) =>
                    player.score
            )
        );

    const winners =
        results.filter(
            (player) =>
                player.score ===
                highestScore
        );

    console.log(
        `Draft finished in room ${room}`
    );

    console.log(
        "Results:",
        results
    );

    io.to(room).emit(
        "draft-ended",
        {
            results,
            winners
        }
    );

}


// ========================================
// SOCKET.IO
// ========================================

io.on(
    "connection",
    (socket) => {

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

                username =
                    username.trim();

                room =
                    room
                        .trim()
                        .toUpperCase();


                // ====================================
                // VALIDATE INPUT
                // ====================================

                if (
                    !username ||
                    !room
                ) {

                    socket.emit(
                        "lobby-error",
                        {
                            message:
                                "Username and room code are required."
                        }
                    );

                    return;

                }


                // ====================================
                // CREATE ROOM
                // ====================================

                if (!rooms[room]) {

                    rooms[room] = {

                        players: {},

                        round: 1,

                        state:
                            "waiting",

                        currentCharacters:
                            [],

                        pickedCharacters:
                            [],

                        draftHistory:
                            []

                    };

                }


                const roomData =
                    rooms[room];


                // ====================================
                // CHECK GAME STATE
                // ====================================

                if (
                    roomData.state !==
                    "waiting"
                ) {

                    socket.emit(
                        "lobby-error",
                        {
                            message:
                                "This draft has already started."
                        }
                    );

                    return;

                }


                // ====================================
                // CHECK ROOM SIZE
                // ====================================

                if (
                    Object.keys(
                        roomData.players
                    ).length >= 4
                ) {

                    socket.emit(
                        "lobby-error",
                        {
                            message:
                                "This room is full."
                        }
                    );

                    return;

                }


                // ====================================
                // CHECK USERNAME
                // ====================================

                const usernameTaken =
                    Object.values(
                        roomData.players
                    ).some(
                        (player) =>
                            player.username
                                .toLowerCase() ===
                            username.toLowerCase()
                    );

                if (
                    usernameTaken
                ) {

                    socket.emit(
                        "lobby-error",
                        {
                            message:
                                "That username is already taken in this room."
                        }
                    );

                    return;

                }


                // ====================================
                // ADD PLAYER
                // ====================================

                roomData.players[
                    socket.id
                ] = {

                    id:
                        socket.id,

                    username:
                        username,

                    room:
                        room,

                    team:
                        [],

                    ready:
                        false

                };


                socket.join(
                    room
                );


                console.log(
                    `${username} joined room ${room}`
                );


                // ====================================
                // UPDATE ROOM
                // ====================================

                io.to(room).emit(
                    "room-update",
                    {
                        players:
                            Object.values(
                                roomData.players
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
                    getPlayerRoom(
                        socket
                    );

                if (!room) {
                    return;
                }

                const roomData =
                    rooms[room];

                if (!roomData) {
                    return;
                }

                if (
                    roomData.state !==
                    "waiting"
                ) {
                    return;
                }

                const player =
                    roomData.players[
                        socket.id
                    ];

                if (!player) {
                    return;
                }

                if (player.ready) {
                    return;
                }

                player.ready =
                    true;

                console.log(
                    `${player.username} is ready`
                );

                io.to(room).emit(
                    "room-update",
                    {
                        players:
                            Object.values(
                                roomData.players
                            )
                    }
                );

                if (
                    allPlayersReady(
                        room
                    )
                ) {

                    console.log(
                        `Draft started in room ${room}`
                    );

                    startDraft(
                        room
                    );

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
                    getPlayerRoom(
                        socket
                    );

                if (!room) {
                    return;
                }

                const roomData =
                    rooms[room];

                if (!roomData) {
                    return;
                }


                // ====================================
                // CHECK GAME STATE
                // ====================================

                if (
                    roomData.state !==
                    "drafting"
                ) {

                    return;

                }


                // ====================================
                // CHECK CHARACTER
                // ====================================

                const character =
                    roomData.currentCharacters.find(
                        (character) =>
                            character.id ===
                            characterId
                    );

                if (!character) {

                    return;

                }


                // ====================================
                // CHECK IF ALREADY PICKED
                // ====================================

                if (
                    character.pickedBy
                ) {

                    return;

                }


                // ====================================
                // GET PLAYER
                // ====================================

                const player =
                    roomData.players[
                        socket.id
                    ];

                if (!player) {

                    return;

                }


                // ====================================
                // PICK CHARACTER
                // ====================================

                character.pickedBy =
                    socket.id;

                player.team.push(
                    character
                );

                roomData.pickedCharacters.push(
                    character.id
                );


                console.log(
                    `${player.username} picked ${character.name}`
                );


                // ====================================
                // BROADCAST PICK
                // ====================================

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


                // ====================================
                // CHECK ROUND COMPLETE
                // ====================================

                if (
                    allPlayersPicked(
                        room
                    )
                ) {

                    setTimeout(
                        () => {

                            if (
                                rooms[room] &&
                                rooms[room].state ===
                                    "drafting"
                            ) {

                                nextRound(
                                    room
                                );

                            }

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

                let playerRoom =
                    null;


                // ====================================
                // FIND PLAYER'S ROOM
                // ====================================

                for (
                    const roomName in rooms
                ) {

                    if (
                        rooms[roomName]
                            .players[
                                socket.id
                            ]
                    ) {

                        playerRoom =
                            roomName;

                        break;

                    }

                }


                if (!playerRoom) {
                    return;
                }


                const roomData =
                    rooms[playerRoom];

                const player =
                    roomData.players[
                        socket.id
                    ];


                console.log(
                    `${player.username} left room ${playerRoom}`
                );


                // ====================================
                // REMOVE PLAYER
                // ====================================

                delete roomData.players[
                    socket.id
                ];


                // ====================================
                // UPDATE REMAINING PLAYERS
                // ====================================

                io.to(playerRoom).emit(
                    "room-update",
                    {
                        players:
                            Object.values(
                                roomData.players
                            )
                    }
                );


                // ====================================
                // DELETE EMPTY ROOM
                // ====================================

                if (
                    Object.keys(
                        roomData.players
                    ).length === 0
                ) {

                    delete rooms[
                        playerRoom
                    ];

                    console.log(
                        `Room ${playerRoom} deleted`
                    );

                }

            }
        );

    }
);


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