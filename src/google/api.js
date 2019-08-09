const fs = require('fs');
const readline = require('readline');
const {google} = require('googleapis');
const moment = require('moment');

// If modifying these scopes, delete token.json.
const SCOPES = ['https://www.googleapis.com/auth/calendar.events'];
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const TOKEN_PATH = 'token.json';

const CACHE_EXPIRATION_MINUTES = 15;
let eventCache = {};

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 * @param params
 */
function authorize(credentials, callback, params) {
    const {client_secret, client_id, redirect_uris} = credentials.installed;
    const oAuth2Client = new google.auth.OAuth2(
        client_id, client_secret, redirect_uris[0]);

    // Check if we have previously stored a token.
    fs.readFile(TOKEN_PATH, (err, token) => {
        if (err) return getAccessToken(oAuth2Client, callback, params);
        oAuth2Client.setCredentials(JSON.parse(token));
        callback(oAuth2Client, params);
    });
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 * @param {google.auth.OAuth2} oAuth2Client The OAuth2 client to get token for.
 * @param callback
 * @param params
 */
function getAccessToken(oAuth2Client, callback, params) {
    const authUrl = oAuth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES,
    });
    console.log('Authorize this app by visiting this url:', authUrl);
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });
    rl.question('Enter the code from that page here: ', (code) => {
        rl.close();
        oAuth2Client.getToken(code, (err, token) => {
            if (err) return console.error('Error retrieving access token', err);
            oAuth2Client.setCredentials(token);
            // Store the token to disk for later program executions
            fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
                if (err) return console.error(err);
                console.log('Token stored to', TOKEN_PATH);
            });
            callback(oAuth2Client, params);
        });
    });
}

function listEventsInternal(auth, params) {
    const calendar = google.calendar({version: 'v3', auth});

    let now = new Date();

    if (
        params.forceCacheMiss !== true
        && params.calendarId in eventCache && eventCache[params.calendarId].expiration > now
    ) {
        // HIT: Use cache
        console.debug("Cache hit");
        params.callback(eventCache[params.calendarId].events);
    } else {
        // MISS: fetch from Google & update cache

        if (params.forceCacheMiss === true) {
            console.debug("Forced cache miss");
        } else {
            console.debug("Cache miss");
        }

        calendar.events.list({
            calendarId: params.calendarId,
            timeMin: now.toISOString(),
            maxResults: 11,
            singleEvents: true,
            orderBy: 'startTime',
        }, (err, res) => {
            if (err) return console.log('The API returned an error: ' + err);

            let events = res.data.items;

            if (events.length) {
                for (let i = 0; i < events.length; i++) {
                    events[i].start.dateTime = new Date(events[i].start.dateTime);
                    events[i].end.dateTime = new Date(events[i].end.dateTime);
                }
            } else {
                console.log('No upcoming events found.');
            }

            eventCache[params.calendarId] = {
                expiration: moment().add(CACHE_EXPIRATION_MINUTES, 'm').toDate(),
                events: events
            };

            params.callback(events);
        });
    }
}

function listEvents(calendarId, callback, forceCacheMiss)
{
    authorize(require('../../config/google-credentials'), listEventsInternal, {calendarId: calendarId, callback: callback, forceCacheMiss: forceCacheMiss});
}

module.exports = {
    listEvents: listEvents
};