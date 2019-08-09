var express = require('express');
var router = express.Router();
let eventManager = require('../src/manager/eventManager');
const moment = require('moment');

function selectRoom(roomId, rooms) {
    let room = null;

    for (let i = 0; i < rooms.length; i++) {
        if (rooms[i].id === roomId) {
            room = rooms[i];
            break;
        }
    }

    return room;
}

router.get('/', function (req, res, next) {
    let rooms = req.app.get('rooms');
    res.render('selectroom', {title: 'Select a room', rooms: rooms});
});

router.get('/room', function (req, res, next) {
    let room = selectRoom(req.query.roomId, req.app.get('rooms'));

    if (room === null) {
        res.send("Room not found", 404);

        return;
    }

    let callback = (events) => {
        res.render('mobileapp', {title: 'Room planning', events: events, moment: moment, room: room});
    };

    eventManager.getEventList(room.id, callback);
});

router.get('/room/force-sync', function (req, res, next) {
    let room = selectRoom(req.query.roomId, req.app.get('rooms'));

    if (room === null) {
        res.send("Room not found", 404);

        return;
    }

    let callback = (events) => {
        res.redirect("/room?roomId=" + room.id);
    };

    eventManager.getEventList(room.id, callback, true);
});

module.exports = router;
