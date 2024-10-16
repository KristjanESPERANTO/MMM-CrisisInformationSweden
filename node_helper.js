/* node_helper.js
 *
 * MagicMirror² module - News feed from the Swedish Government Crisis Information (Krisinformation.se).
 *
 * Module: MMM-CrisisInformationSweden
 *
 * MagicMirror² by Michael Teeuw https://michaelteeuw.nl
 * MIT Licensed.
 *
 * Module MMM-CrisisInformationSweden by Anders Boghammar
 */
const Log = require("logger");
const NodeHelper = require("node_helper");

module.exports = NodeHelper.create({
    // --------------------------------------- Start the helper
    start () {
        Log.log(`Starting helper: ${this.name}`);
        this.started = false;
    },

    // --------------------------------------- Schedule a feed update
    scheduleUpdate () {
        const self = this;
        this.updatetimer = setInterval(() => { // This timer is saved in uitimer so that we can cancel it
            self.getFeed();
        }, self.config.updateInterval);
    },

    // --------------------------------------- Retrive new feed
    async getFeed () {
        const self = this;
        Log.log(`${new Date(Date.now()).toLocaleTimeString()}: Getting feed for module ${this.name}`);
        const opt = {
            uri: "https://api.krisinformation.se/v3/news/?includeTest=0&allCounties=True",
            qs: {
            },
            json: true
        };
        Log.log(`Calling ${opt.uri}`);

        try {
            const response = await fetch(opt.uri, {method: "GET"});
            const resp = await response.json();
            Log.debug(resp);
            const feeds = self.filterFeed(resp);
            Log.log(`${self.name} - Sending NEW_FEED count: ${feeds.length} Org: ${resp.length}`);
            self.sendSocketNotification("NEW_FEED", feeds); // Send feed to module
        } catch (err) {
            Log.log(`Problems with ${self.name}: ${err}`);
            self.sendSocketNotification("SERVICE_FAILURE", {resp: {StatusCode: 600, Message: err}});
        }
    },

    // --------------------------------------- Filter feeds according to config
    filterFeed (resp) {
        if (this.config.areas === undefined || this.config.areas.length < 1) return resp;
        const feeds = [];
        for (let ix = 0; ix < resp.length; ix++) {
            Log.debug("MSB: " + ix);
            let inc = false;
            const feed = resp[ix];
            const areas = feed.Area;
            Log.debug("Looking at "+ feed.Identifier);
            if (areas === undefined || areas === null) inc = true; // Always include iof there's no area defined
            else {
                for (let ia = 0; ia < areas.length; ia++) {
                    Log.debug("filter: " + JSON.stringify(areas[ia]));
                    for (let iad = 0; iad < this.config.areas.length; iad++) {
                        if (areas[ia].Type == "County" && areas[ia].Description == this.config.areas[iad]) inc = true;
                    }
                    if (this.config.alwaysNational && areas[ia].Type === "Country" && areas[ia].Description === "Sverige") inc = true;
                }
            }
            if (inc) feeds.push(feed);
        }
        return feeds;
    },

    // --------------------------------------- Handle notifications
    socketNotificationReceived (notification, payload) {
        const self = this;
        if (notification === "CONFIG" && this.started === false) {
            this.config = payload;
            this.started = true;
            self.scheduleUpdate();
            self.getFeed(); // Get it first time
        }
    }

});
