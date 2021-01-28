const express = require("express")
const {v4: uuidv4} = require("uuid")

const port = 4000
var app = express()
const server = app.listen(port, () => {
    console.log(`Listening on port ${port}`)
})
const io = require("socket.io")(server)

app.use(express.static("public"))
app.set("view engine", "ejs")

app.get("/", function(req, res){
    res.render("index")
})

io.on("connection", socket => {
    console.log(`New Connection ${socket.id}`)

})
