const WebSocket = require('ws');

const server = new WebSocket.Server({port: 3000})

let sockets = new Set();
let exist = false;
let messages = [];
let users = [];

server.on("connection", (socket) => {
    socket.on("close", (event) => {
        console.log(socket.username + " disconnected");
        sockets.delete(socket)

        users = [];
        sockets.forEach((user) => {
            users.push(user.username);
        })

        sockets.forEach((user) => {
            user.send(JSON.stringify({"type": "users", "content" : users}));
        })
    })

    socket.on('message', (message) => {
        let content = message.toString();
        let Message = JSON.parse(content);
        
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

                messages.forEach((message) => {
                    socket.send(JSON.stringify({"type" : "message", "content" : message.content, "username" : message.username, "date": message.date}));
                })
    
                socket.username = Message.content;
                sockets.add(socket);

                users = [];
                sockets.forEach((user) => {
                    users.push(user.username);
                })
            
                sockets.forEach((user) => {
                    user.send(JSON.stringify({"type": "users", "content" : users}));
                })


                return socket.send(JSON.stringify({"type" : "sucess", "content" : Message.content})); 

            }
        }  

        if (Message.type == "message") {
            messages.push(Message);
            sockets.forEach((user) => {
                user.send(JSON.stringify({"type" : "message", "content" : Message.content, "username": Message.username, "date": Message.date}));
            })
        }
    })

})

