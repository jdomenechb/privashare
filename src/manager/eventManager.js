const googleapi = require('../google/api');
const moment = require('moment');

// --- CONFIG ---
// TODO: Move to config file
const DAY_START_TIME_HOUR = 6;
const DAY_START_TIME_MINUTES = 0;

const DAY_END_TIME_HOUR = 21;
const DAY_END_TIME_MINUTES = 0;

const EVENT_MIN_PERIOD_MINUTES = 5;

const eventManager = {
    /**
     * Passes to the given callback the list of events from the Google Calendar identified by the given calendarId.
     *
     * @param {string} calendarId
     * @param {callback} callback
     */
    getEventList: (calendarId, callback, forceCacheMiss) => {
        let callbackInternal = (events) => {
            let now = new Date();

            let lastEventTreated = null;
            let eventsTreated = {current: null, next: []};

            for (let i = 0; i < events.length; i++) {
                if (lastEventTreated) {
                    // Calculate if we need to add Free time in-between events
                    let diff = events[i].start.dateTime - lastEventTreated.end.dateTime > 0;

                    if (diff > 0) {
                        let presentedEvent = {
                            name: "Free",
                            isFree: true
                        };

                        if (events[i].start.dateTime.getDay() === lastEventTreated.end.dateTime.getDay()) {
                            // Both are on the same day: add a Free time that starts at end of event 1, and ends at
                            // start of event 2
                            presentedEvent.start = lastEventTreated.end.dateTime;
                            presentedEvent.end = events[i].start.dateTime;

                            eventsTreated.next.push(presentedEvent);
                        } else {
                            // Add Free time for each different day between the two events
                            let days = Math.ceil(diff / (3600 * 24 * 1000));

                            let dayStartTimeDate = moment(lastEventTreated.end.dateTime);
                            dayStartTimeDate.hour(DAY_START_TIME_HOUR);
                            dayStartTimeDate.minute(DAY_START_TIME_MINUTES);

                            let dayEndTimeDate = moment(lastEventTreated.end.dateTime);
                            dayEndTimeDate.hour(DAY_END_TIME_HOUR);
                            dayEndTimeDate.minute(DAY_END_TIME_MINUTES);

                            for (let j = 0; j <= days; j++) {
                                presentedEvent = JSON.parse(JSON.stringify(presentedEvent));
                                if (j === 0) {
                                    presentedEvent.start = lastEventTreated.end.dateTime;
                                    presentedEvent.end = dayEndTimeDate.toDate();
                                } else if (j === days) {
                                    presentedEvent.start = dayStartTimeDate.toDate();
                                    presentedEvent.end = events[i].start.dateTime
                                } else {
                                    presentedEvent.start = dayStartTimeDate.toDate();
                                    presentedEvent.end = dayEndTimeDate.toDate();
                                }

                                eventsTreated.next.push(presentedEvent);

                                dayStartTimeDate.add(1, 'd');
                                dayEndTimeDate.add(1, 'd');
                            }
                        }
                    }
                }

                // Add the event to the list
                let presentedEvent = {
                    name: events[i].summary,
                    isFree: false,
                    start: events[i].start.dateTime,
                    end: events[i].end.dateTime,
                };

                if (events[i].start.dateTime <= now && now < events[i].end.dateTime) {
                    // The event is happening right now
                    eventsTreated.current = presentedEvent;
                    eventsTreated.current.startedIn = calculateStartedIn(events[i].start.dateTime, now);
                    eventsTreated.current.endsIn = calculateEndsIn(now, events[i].end.dateTime);
                } else {
                    // Future event
                    eventsTreated.next.push(presentedEvent);
                }

                lastEventTreated = events[i];
            }

            callback(eventsTreated)
        };


        googleapi.listEvents(calendarId, callbackInternal, forceCacheMiss)
    }
};

/**
 * Generates a text with the difference of time from the start of an event and the current time.
 * @param date
 * @param now
 * @returns {string}
 */
function calculateStartedIn(date, now) {
    let diff = new Date(now - date);
    let result = "";

    let hours = diff.getUTCHours();
    let minutes = Math.floor(diff.getUTCMinutes() / EVENT_MIN_PERIOD_MINUTES) * EVENT_MIN_PERIOD_MINUTES;

    if (minutes >= 60) {
        hours += 1;
        minutes -= 60;
    }

    if (hours) {
        result += " " + hours + " hour" + (hours > 1? "s": "");
    }

    if (minutes) {
        result += " " + minutes + " minutes"
    }

    return result;
}

/**
 * Generates a text with the difference of time from the current time and the end of an event.
 * @param date
 * @param now
 * @returns {string}
 */
function calculateEndsIn(now, date) {
    let diff = new Date(date - now);
    let result = "";

    let hours = diff.getUTCHours();
    let minutes = Math.ceil(diff.getUTCMinutes() / EVENT_MIN_PERIOD_MINUTES) * EVENT_MIN_PERIOD_MINUTES;

    if (minutes >= 60) {
        hours += 1;
        minutes -= 60;
    }

    if (hours) {
        result += " " + hours + " hour" + (hours > 1? "s": "");
    }

    if (minutes) {
        result += " " + minutes + " minutes"
    }

    return result;
}

module.exports = eventManager;