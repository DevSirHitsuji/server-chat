const WebSocket = require('ws');
const shortid = require("shortid");

const server = new WebSocket.Server({port: 3000})

let sockets = new Set();
let exist = false;

let rooms = [
    {
        "id" : shortid(),
        "name" : "geral",
        "users" : new Set(),
        "messages" : []
    }
];
let users = [];

server.on("connection", (socket) => {
    socket.on("close", (event) => {
        console.log(socket.username + " disconnected");
        sockets.delete(socket)

        users = [];
        sockets?.forEach((user) => {
            users.push(user.username);
        })

        // remove from geral
        rooms[0].users.delete(socket);

        sockets?.forEach((user) => {
            if (user !== socket && user.username !== undefined) {
                console.log(user.username + " disconected")
                user.send(JSON.stringify({"type": "offline", "content" : socket.username})) 
            }    
        })

        sockets.forEach((user) => {
            user.send(JSON.stringify({"type": "users", "content" : users}));
        })
    })

    socket.on('message', async (message) => {
        let content = message.toString();
        let Message = await JSON.parse(content);
        
        if (Message.type == "username") {
            exist = false;
            sockets?.forEach((user) => {
                if (user?.username == Message.content) {
                    exist = true;
                    return socket.send(JSON.stringify({"type" : "failed", "content" : "Usuário ja existe"})); 
                }
            })

            if (!exist) {
                console.log(Message.content + " online");

                socket.username = Message.content;

                sockets.add(socket);

                rooms.forEach((room) => {
                    if (room.name == "geral") {
                       room.users.add(socket); 
                    } 
                })
                    
                users = [];
                sockets.forEach((user) => {
                    users.push(user.username);
                })

                let myRooms = [];
                rooms.forEach((room) => {
                    room.users.forEach((user) => {
                        if (user.username == socket.username) {
                            myRooms.push({
                                "room" : room, 
                                "lastMessage" : room.messages[room.messages.length - 1]
                            })
                        }
                    })
                })
                socket.send(JSON.stringify({"type" : "rooms", "content" : myRooms}));
                
                sockets.forEach((user) => {
                    user.send(JSON.stringify({"type": "users", "content" : users}));
                    if (user !== socket) {    
                        user.send(JSON.stringify({"type": "online", "content" : Message.content}))                    
                    }
                })

                return socket.send(JSON.stringify({"type" : "sucess", "content" : Message.content}));
            }
        }

        if (Message.type == "message") {
            rooms.map((room, index) => {
                if (room.id == Message.roomId) {
                   
                    rooms.splice(index, 1)
                    rooms.unshift(room);              
                    room.messages.push(Message)
                    room.users.forEach((user) => {
                        user.send(JSON.stringify({"type" : "message", "roomId" : Message.roomId,  "content" : Message.content, "username": Message.username, "date": Message.date}));
                    })

                    sockets.forEach((SOCKET) => {
                        let myRooms = [];
                        rooms.forEach((room) => {
                            room.users.forEach((user) => {
                                if (user.username == SOCKET.username) {
                                    myRooms.push({"room" : room, "lastMessage" : room.messages[room.messages.length - 1]});
                                }
                            })
                        })
                        SOCKET.send(JSON.stringify({"type" : "rooms", "content" : myRooms}));
                    })

                }
            }) 
        }

        if (Message.type == "getRoom") {
            rooms.forEach((room) => {
                if (Message.id == room.id) {
                    socket.send(JSON.stringify({"type" : "loadRoom", "content" : room.messages}))
                }
            })
        }

        if (Message.type == "createRoom") {

            let usersRoom = new Set();
            sockets.forEach((user) => {
                Message.users.forEach((member) => {
                    if (user.username == member) {
                        usersRoom.add(user);
                    }
                })
            })

            rooms.push({
                "id" : shortid(),
                "name" : Message.name,
                "users" : usersRoom,
                "messages" : []
            })

            sockets.forEach((SOCKET) => {
                let myRooms = [];
                rooms.forEach((room) => {
                    room.users.forEach((user) => {
                        if (user.username == SOCKET.username) {
                            myRooms.push({"room" : room, "lastMessage" : room.messages[room.messages.length - 1]});
                        }
                    })
                })
                SOCKET.send(JSON.stringify({"type" : "rooms", "content" : myRooms}));
            })
    
        }


        if (Message.type == "logout") {
            sockets.forEach((user) => {
                if (user !== socket) {
                   user.send(JSON.stringify({"type": "offline", "content" : Message.content})) 
                }    
            })
            socket.send(JSON.stringify({"type" : "logout", "content" : "Desconectado"}));
            socket.close();
        }
    })

})

