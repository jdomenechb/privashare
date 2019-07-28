var express = require('express');
var router = express.Router();
let eventManager = require('../src/manager/eventManager');
const moment = require('moment');

router.get('/', function (req, res, next) {
    let rooms = req.app.get('rooms');
    res.render('selectroom', {title: 'Select a room', rooms: rooms});
});

router.get('/room', function (req, res, next) {
    let room = null;
    let rooms = req.app.get('rooms');

    for (let i = 0; i < rooms.length; i++) {
        if (rooms[i].id === req.query.roomId) {
            room = rooms[i];
            break;
        }
    }

    if (room === null) {
        res.send("Room not found", 404);

        return;
    }

    let callback = (events) => {
        res.render('mobileapp', {title: 'Room planning', events: events, moment: moment});
    };

    eventManager.getEventList(room.id, callback);
});

module.exports = router;
