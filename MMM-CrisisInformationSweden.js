/* MMM-CrisisInformationSweden.js
 *
 * MagicMirror² module - News feed from the Swedish Government Crisis Information (Krisinformation.se).
 *
 * Module: MMM-CrisisInformationSweden
 *
 * MagicMirror² by Michael Teeuw https://michaelteeuw.nl
 * MIT Licensed.
 *
 * Module MMM-CrisisInformationSweden by Anders Boghammar
 *
 * Notifications:
 *      CONFIG: Sent to update any listeners of the current configuration.
 *      NEW_FEED: Received when a new feed is available.
 *      SERVICE_FAILURE: Received when the service access failed.
 */
Module.register("MMM-CrisisInformationSweden", {
    // --------------------------------------- Define module defaults
    defaults: {
        alwaysNational: true,           // Optional, Regardless of other settings always show national info. Not implemented yet
        updateInterval: 30*60*1000,     // Optional. Number of ms between API updates.
        uiUpdateInterval: 10*1000,      // Optional. Number of ms between changing to next announcement.
        areas: [],                      // Optional. An array of strings with area names.
                                        // Only those messages aimed at the areas listed in the array are shown.
                                        // If empty or undefined show all messages.
        showDescription: true,          // Optional. Show message description. Not yet implemented.
        oldest: 7,                      // Optional. Dont show messages older then this number of days.
        silent: false,                  // Optional. If enabled no messages are shown if therer are no
                                        // messages younger then 'oldest' setting

    },

    // --------------------------------------- Define required scripts
    getScripts () {
        return ["moment.js"];
    },

    // --------------------------------------- Start the module
    start () {
        Log.info(`Starting module: ${this.name}`);

        // Set locale.
        moment.locale(config.language);

        this.loaded = false;
        this.sendSocketNotification("CONFIG", this.config); // Send config to helper and initiate an update
        this.currentFeedIndex = 0;

        // Start timer for ui-updates
        const self = this;
        this.uitimer = setInterval(() => { // This timer is saved in uitimer so that we can cancel it
            self.updateDom();
        }, self.config.uiUpdateInterval);
    },

    // --------------------------------------- Generate dom for module
    getDom () {
        const wrapper = document.createElement("div");

        if (!this.loaded) {
            wrapper.innerHTML = `${this.name} loading feeds ...`;
            wrapper.className = "dimmed light small";
            return wrapper;
        }

        // ------ Display a selected message in the feed
        if (this.currentFeedIndex >= this.currentFeed.length) this.currentFeedIndex = 0;
        if (this.currentFeed.length > 0) { // We have messages display the one up for displaying
            this.debug(`Trying to display feed ix: ${this.currentFeedIndex}`);
            let noFeedsToDisplay = false;
            const dt = moment(this.currentFeed[this.currentFeedIndex].Published);
            if (moment().diff(dt) > this.config.oldest*24*60*60*1000) {
                noFeedsToDisplay = this.currentFeedIndex == 0;
                this.currentFeedIndex = 0;
            }
            this.debug(`Feed ix: ${this.currentFeedIndex} noFeedsToDisplay: ${noFeedsToDisplay}`);
            if (noFeedsToDisplay) {
                if (!this.config.silent) {
                    var div = document.createElement("div");
                    div.innerHTML = `${this.name}: There are no messages younger than ${this.config.oldest} days`;
                    //div.style.color = "red"; // TODO Change this to a custom style
                    div.className = "dimmed xsmall";
                    wrapper.appendChild(div);
                }
            } else {
                this.debug(`Display feed ix: ${this.currentFeedIndex}`);

                const msg = this.currentFeed[this.currentFeedIndex];

                const tdiv = document.createElement("div");
                tdiv.className = "align-left";
                const spant = document.createElement("div");
                spant.innerHTML = `${moment(msg.Published).fromNow()} ${// TODO Format the time according to how long ago it was
                    this.config.debug
                        ? moment().format("HH:mm:ss") + " Ix:"+ this.currentFeedIndex + " Pub: "+msg.Published
                        :""}`;
                spant.className = "dimmed xsmall";
                tdiv.appendChild(spant);

                const spanh = document.createElement("div");
                spanh.innerHTML = msg.Headline;
                spanh.className = "small align-left";
                tdiv.appendChild(spanh);
                wrapper.appendChild(tdiv);

                if (this.config.showDescription) {
                    const ddiv = document.createElement("div");
                    ddiv.innerHTML = msg.Preamble;
                    ddiv.className = "dimmed xsmall align-left";
                    wrapper.appendChild(ddiv);
                }
                const bdiv = document.createElement("div");
                bdiv.className = "dimmed xsmall";
                // TODO use style instead
                bdiv.style.marginTop = "5px";
                bdiv.style.borderTopWidth = "1px";
                bdiv.style.borderTopColor = "#666";
                bdiv.style.borderTopStyle = "dotted";
                if (msg.Area !== undefined && msg.Area != null && msg.Area.length > 0) {
                    const adiv = document.createElement("span");
                    adiv.innerHTML = "<b>Area(s):</b> ";
                    for (let ia = 0 ; ia < msg.Area.length; ia++) {
                        adiv.innerHTML = adiv.innerHTML + (ia > 0 ? ", " : "") + msg.Area[ia].Description;
                    }
                    adiv.className = "align-left";
                    adiv.style.cssFloat = "left";
                    bdiv.appendChild(adiv);
                }
                if (this.config.debug) {
                    var sdiv = document.createElement("span");
                    sdiv.innerHTML = `<b>Feeds:</b> ${this.currentFeed.length}`;
                    //sdiv.className = 'align-right';
                    //sdiv.style.cssFloat = 'right';
                    bdiv.appendChild(sdiv);
                }
                if (msg.SenderName !== undefined && msg.SenderName != "") {
                    var sdiv = document.createElement("span");
                    sdiv.innerHTML = `<b>From:</b> ${msg.SenderName}`;
                    sdiv.className = "align-right";
                    sdiv.style.cssFloat = "right";
                    bdiv.appendChild(sdiv);
                }
                wrapper.appendChild(bdiv);

                this.currentFeedIndex++; // On to next feed if any
            }
        }

        // ----- Show service failure if any
        if (this.failure !== undefined) {
            var div = document.createElement("div");
            div.innerHTML = `Service: ${this.failure.StatusCode}-${this.failure.Message}`;
            div.style.color = "red"; // TODO Change this to a custom style
            wrapper.appendChild(div);
        }

        return wrapper;
    },

    // --------------------------------------- Debug output
    debug (msg) {
        if (this.config.debug) Log.log(`${this.name}: ${msg}`);
    },

    // --------------------------------------- Handle socketnotifications
    socketNotificationReceived (notification, payload) {
        if (notification === "NEW_FEED") {
            this.loaded = true;
            this.failure = undefined;
            // Handle payload
            this.currentFeed = payload;
            Log.info(`New feed updated: ${this.currentFeed.length}`);
            this.updateDom();
        }
        if (notification === "SERVICE_FAILURE") {
            this.failure = payload;
            Log.info(`Service failure: ${this.failure.StatusCode}:${this.failure.Message}`);
            this.updateDom();
        }
    }

});
