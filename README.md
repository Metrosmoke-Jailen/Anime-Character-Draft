Anime Character Draft

Anime Character Draft is a multiplayer anime-themed drafting game built with Node.js, Express, and Socket.IO. Players join the same room, get ready, and compete across 5 rounds to build the strongest anime character team.

Each round gives players 3 characters to choose from. Once a character is selected, they are immediately locked and shown as claimed to all players. The player with the highest total team power wins.

Why WebSockets?

WebSockets are used through Socket.IO because the game requires real-time communication between players.

For example:

join-room → Player joins a room.
room-update → Server updates everyone with the current players.
player-ready → Player tells the server they are ready.
start-draft → Server starts the draft for everyone.
pick-character → Player sends their character selection.
draft-update → Server instantly broadcasts the selection to all players.
draft-ended → Server sends the final results.

Without WebSockets, players would need to constantly refresh or request updates from the server. Socket.IO allows the game state to update instantly.

Event Flow:
JOIN ROOM
   ->
SERVER
   ->
PLAYERS READY
   ->
SERVER
   ->
DRAFT
   ->
SERVER
   ->
ALL PLAYERS
   ->
5 ROUNDS
   ->
FINAL RESULTS

Installation & Running

1. Clone the repository

git clone https://github.com/Metrosmoke-Jailen/anime-character-draft.git

cd anime-character-draft

2. Install dependencies

npm install

3. Start the server

npm start

4. Open the app

Visit:

http://localhost:3000
