let eventListScroll = null;

$(document).ready(function () {
    // Refresh page every 5 minutes
    setTimeout(() => { location.reload() }, 60 * 5 * 1000);

    updateClock();
    eventListScrollToTop();

    // Go to top of event list after someone scrolled
    $('.next').scroll(e => {
        if (eventListScroll) {
            clearTimeout(eventListScroll);
        }

        eventListScroll = setTimeout(eventListScrollToTop, 15000)
    });
});

function updateClock()
{
    let now = new Date();

    $('.clock').html(moment().format('HH:mm'));

    setTimeout(updateClock, 60 * 1000);
}

function eventListScrollToTop() {
    $('.next').animate({ scrollTop: 0 });
}