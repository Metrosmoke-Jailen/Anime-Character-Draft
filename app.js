const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("static"));

const PORT = process.env.PORT || 3000;
const rooms = {};

const characters = [
    ["Goku", "Dragon Ball", 98, "⚡"],
    ["Luffy", "One Piece", 94, "🏴‍☠️"],
    ["Gojo", "Jujutsu Kaisen", 97, "👁️"],
    ["Naruto", "Naruto", 93, "🍥"],
    ["Ichigo", "Bleach", 95, "⚔️"],
    ["Tanjiro", "Demon Slayer", 89, "🔥"],
    ["Saitama", "One Punch Man", 99, "👊"],
    ["Eren", "Attack on Titan", 91, "🧱"],
    ["Denji", "Chainsaw Man", 88, "🪚"],
    ["Edward", "Fullmetal Alchemist", 90, "⚙️"],
    ["Levi", "Attack on Titan", 96, "🗡️"],
    ["Killua", "Hunter x Hunter", 92, "⚡"],
    ["Gon", "Hunter x Hunter", 87, "🎣"],
    ["Deku", "My Hero Academia", 91, "💥"],
    ["Bakugo", "My Hero Academia", 90, "💣"],
    ["Asta", "Black Clover", 89, "🗡️"],
    ["Yami", "Black Clover", 95, "🌑"],
    ["Sukuna", "Jujutsu Kaisen", 99, "👹"],
    ["Megumi", "Jujutsu Kaisen", 88, "🐺"],
    ["Zoro", "One Piece", 95, "⚔️"],
    ["Sanji", "One Piece", 92, "🔥"],
    ["Kakashi", "Naruto", 94, "🥷"],
    ["Madara", "Naruto", 98, "🌑"],
    ["Aizen", "Bleach", 97, "🌀"]
].map(([name, anime, power, icon], i) => ({
    id: i + 1,
    name,
    anime,
    power,
    icon
}));

function getRoom(socket) {
    return [...socket.rooms].find(
        room => room !== socket.id
    );
}

function broadcastPlayers(room) {
    io.to(room).emit("room-update", {
        players: Object.values(rooms[room].players)
    });
}

function allReady(room) {
    const players = Object.values(rooms[room].players);

    return players.length >= 2 &&
        players.every(player => player.ready);
}

function allPicked(room) {
    const data = rooms[room];

    return Object.values(data.players)
        .every(player => player.team.length === data.round);
}

function randomCharacters(amount, picked = []) {
    return characters
        .filter(character => !picked.includes(character.id))
        .sort(() => Math.random() - 0.5)
        .slice(0, amount);
}

function teamPower(team) {
    return team.reduce(
        (total, character) => total + character.power,
        0
    );
}

function clearRoundTimer(room) {
    const data = rooms[room];

    if (data?.roundTimer) {
        clearTimeout(data.roundTimer);
        data.roundTimer = null;
    }
}

function startDraft(room) {
    const data = rooms[room];

    data.state = "drafting";
    data.round = 1;
    data.currentCharacters = randomCharacters(
        3,
        data.pickedCharacters
    );

    io.to(room).emit("start-draft", {
        round: data.round,
        characters: data.currentCharacters
    });

    startRoundTimer(room);
}

function nextRound(room) {
    const data = rooms[room];

    data.round++;

    if (data.round > 5) {
        return endDraft(room);
    }

    data.currentCharacters = randomCharacters(
        3,
        data.pickedCharacters
    );

    io.to(room).emit("next-round", {
        round: data.round,
        characters: data.currentCharacters
    });

    startRoundTimer(room);
}

function startRoundTimer(room) {
    const data = rooms[room];

    if (!data || data.state !== "drafting") return;

    clearRoundTimer(room);

    io.to(room).emit("round-timer", {
        seconds: data.roundTimeLimit
    });

    data.roundTimer = setTimeout(
        () => handleTimeout(room),
        data.roundTimeLimit * 1000
    );
}

function handleTimeout(room) {
    const data = rooms[room];

    if (!data || data.state !== "drafting") return;

    const available = data.currentCharacters.filter(
        character => !character.pickedBy
    );

    Object.values(data.players).forEach(player => {
        if (player.team.length >= data.round) return;

        const character = available.shift();

        if (!character) return;

        pickCharacter(room, player.id, character, true);
    });

    if (allPicked(room)) {
        clearRoundTimer(room);

        setTimeout(() => {
            if (rooms[room]?.state === "drafting") {
                nextRound(room);
            }
        }, 1000);
    }
}

function pickCharacter(room, playerId, character, automatic = false) {
    const data = rooms[room];
    const player = data?.players[playerId];

    if (!data || !player || character.pickedBy) return;

    character.pickedBy = playerId;
    player.team.push(character);
    data.pickedCharacters.push(character.id);

    data.draftHistory.push({
        round: data.round,
        playerId,
        username: player.username,
        characterId: character.id,
        characterName: character.name,
        automatic
    });

    io.to(room).emit("draft-update", {
        characterId: character.id,
        playerId,
        username: player.username,
        automatic
    });
}

function endDraft(room) {
    const data = rooms[room];

    if (!data) return;

    clearRoundTimer(room);
    data.state = "finished";

    const results = Object.values(data.players).map(player => ({
        id: player.id,
        username: player.username,
        team: player.team,
        score: teamPower(player.team)
    }));

    const highest = Math.max(
        ...results.map(player => player.score)
    );

    const winners = results.filter(
        player => player.score === highest
    );

    io.to(room).emit("draft-ended", {
        results,
        winners
    });
}

io.on("connection", socket => {
    console.log("Connected:", socket.id);

    socket.on("join-room", ({ username = "", room = "" }) => {
        username = username.trim();
        room = room.trim().toUpperCase();

        if (!username || !room) {
            return socket.emit("lobby-error", {
                message: "Username and room code are required."
            });
        }

        if (!rooms[room]) {
            rooms[room] = {
                players: {},
                round: 1,
                state: "waiting",
                currentCharacters: [],
                pickedCharacters: [],
                draftHistory: [],
                roundTimer: null,
                roundTimeLimit: 15
            };
        }

        const data = rooms[room];

        if (data.state !== "waiting") {
            return socket.emit("lobby-error", {
                message: "This draft has already started."
            });
        }

        if (Object.keys(data.players).length >= 4) {
            return socket.emit("lobby-error", {
                message: "This room is full."
            });
        }

        const taken = Object.values(data.players).some(
            player =>
                player.username.toLowerCase() ===
                username.toLowerCase()
        );

        if (taken) {
            return socket.emit("lobby-error", {
                message: "That username is already taken in this room."
            });
        }

        data.players[socket.id] = {
            id: socket.id,
            username,
            room,
            team: [],
            ready: false
        };

        socket.join(room);
        broadcastPlayers(room);
    });

    socket.on("player-ready", () => {
        const room = getRoom(socket);
        const data = rooms[room];

        if (!data || data.state !== "waiting") return;

        const player = data.players[socket.id];

        if (!player || player.ready) return;

        player.ready = true;
        broadcastPlayers(room);

        if (allReady(room)) {
            startDraft(room);
        }
    });

    socket.on("pick-character", ({ characterId }) => {
        const room = getRoom(socket);
        const data = rooms[room];

        if (!data || data.state !== "drafting") return;

        const player = data.players[socket.id];

        if (!player) return;

        const character = data.currentCharacters.find(
            character => character.id === characterId
        );

        if (!character || character.pickedBy) return;

        if (player.team.length >= data.round) return;

        pickCharacter(
            room,
            socket.id,
            character
        );

        if (allPicked(room)) {
            clearRoundTimer(room);

            setTimeout(() => {
                if (rooms[room]?.state === "drafting") {
                    nextRound(room);
                }
            }, 1000);
        }
    });

    socket.on("disconnect", () => {
        console.log("Disconnected:", socket.id);

        let room = null;

        for (const roomName in rooms) {
            if (rooms[roomName].players[socket.id]) {
                room = roomName;
                break;
            }
        }

        if (!room) return;

        const data = rooms[room];
        const player = data.players[socket.id];

        delete data.players[socket.id];

        if (data.state === "drafting") {
            io.to(room).emit("player-disconnected", {
                username: player.username
            });

            if (Object.keys(data.players).length < 2) {
                clearRoundTimer(room);
                data.state = "finished";

                io.to(room).emit("draft-cancelled", {
                    message:
                        "Not enough players remain to continue the draft."
                });
            }
        }

        broadcastPlayers(room);

        if (Object.keys(data.players).length === 0) {
            clearRoundTimer(room);
            delete rooms[room];
        }
    });
});

server.listen(PORT, () => {
    console.log(
        `Anime Character Draft running on port ${PORT}`
    );
});