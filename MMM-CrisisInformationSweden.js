/* MMM-CrisisInformationSweden.js
 *
 * Magic Mirror module - News feed from the Swedish Government Crisis Information (Krisinformation.se). 
 * 
 * Magic Mirror
 * Module: MMM-CrisisInformationSweden
 * 
 * Magic Mirror By Michael Teeuw http://michaelteeuw.nl
 * MIT Licensed.
 * 
 * Module MMM-CrisisInformationSweden By Anders Boghammar
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
        updateInterval: 10*60*1000,     // Optional. Number of ms between API updates. Not implemented yet.
        uiUpdateInterval: 10*1000,      // Optional. Number of ms between changing to next announcement. Not implemented yet.
        areas: [],                      // Optional. An array of strings with area names. 
                                        // Only those messages aimed at the areas listed in the array are shown. 
                                        // If empty or undefined show all messages. Not implemented yet.
        showDescription: true,          // Optional. Show message description. Not yet implemented.
        oldest: 7,                      // Optional. Dont show messages older then this number of days. Not yet implemented.
    },
    
    // --------------------------------------- Define required scripts
    getScripts: function() {
		return ['moment.js'];
	},

    // --------------------------------------- Start the module
    start: function() {
        Log.info("Starting module: " + this.name);

        // Set locale.
        moment.locale(config.language);

        this.loaded = false;
        this.sendSocketNotification('CONFIG', this.config); // Send config to helper and initiate an update
        this.currentFeedIndex = 0;

        // Start timer for ui-updates
        var self = this;
        this.uitimer = setInterval(function() { // This timer is saved in uitimer so that we can cancel it
            self.updateDom();
        }, self.config.uiUpdateInterval);
    },

    // --------------------------------------- Generate dom for module
    getDom: function() {
        var wrapper = document.createElement("div");

        if (!this.loaded) {
			wrapper.innerHTML = this.name + " loading feeds ...";
			wrapper.className = "dimmed light small";
			return wrapper;
		}

        // ------ Display a selected message in the feed
        if (this.currentFeedIndex >= this.currentFeed.length) this.currentFeedIndex = 0;
        if (this.currentFeed.length > 0) { // We have messages display the one up for displaying
            var dt = moment(this.currentFeed[this.currentFeedIndex].Published);
            if (moment().diff(dt) > this.config.oldest*24*60*60*1000) this.currentFeedIndex = 0;

            var msg = this.currentFeed[this.currentFeedIndex];

            var tdiv = document.createElement("div");
            tdiv.className = 'align-left';
            var spant = document.createElement("div");
            spant.innerHTML = moment(msg.Published).fromNow() + " "; // TODO Format the time according to how long ago it was
            spant.className = 'dimmed xsmall';
            tdiv.appendChild(spant);

            var spanh = document.createElement("div");
            spanh.innerHTML = msg.InfoData[0].Headline;
            spanh.className = 'small align-left';
            tdiv.appendChild(spanh);
            wrapper.appendChild(tdiv);

            if (this.config.showDescription) {
                var ddiv = document.createElement("div");
                ddiv.innerHTML = msg.InfoData[0].Description;
                ddiv.className = 'dimmed xsmall align-left';
                wrapper.appendChild(ddiv);
            }
            var bdiv = document.createElement("div");
            bdiv.className = 'dimmed xsmall';
            // TODO use style instead
            bdiv.style.marginTop = '5px';
            bdiv.style.borderTopWidth = '1px';
            bdiv.style.borderTopColor = '#666';
            bdiv.style.borderTopStyle = 'dotted';
            if (msg.InfoData[0].Area !== undefined && msg.InfoData[0].Area != null && msg.InfoData[0].Area.length > 0) {
                var adiv = document.createElement("span");
                adiv.innerHTML = '<b>Area(s):</b> ';
                for (var ia = 0 ; ia < msg.InfoData[0].Area.length; ia++) {
                    adiv.innerHTML = adiv.innerHTML + (ia > 0 ? ', ' : '') + msg.InfoData[0].Area[ia].AreaDesc;
                }
                adiv.className = 'align-left';
                adiv.style.cssFloat = 'left';
                bdiv.appendChild(adiv);
            }
            if (msg.InfoData[0].SenderName !== undefined && msg.InfoData[0].SenderName != null && msg.InfoData[0].SenderName != '') {
                var sdiv = document.createElement("span");
                sdiv.innerHTML = '<b>From:</b> ' + msg.InfoData[0].SenderName;
                sdiv.className = 'align-right';
                sdiv.style.cssFloat = 'right';
                bdiv.appendChild(sdiv);
            }
            wrapper.appendChild(bdiv);
        }

        this.currentFeedIndex++;

        // ----- Show service failure if any
        if (this.failure !== undefined) {
            var div = document.createElement("div");
            div.innerHTML = "Service: "+this.failure.StatusCode + '-' + this.failure.Message;
            div.style.color = "red"; // TODO Change this to a custom style
            wrapper.appendChild(div);
        }

        return wrapper;
    },

    // --------------------------------------- Handle socketnotifications
    socketNotificationReceived: function(notification, payload) {
        if (notification === "NEW_FEED") {
            this.loaded = true;
            this.failure = undefined;
            // Handle payload
            this.currentFeed = payload;
            Log.info("New feed updated: "+ this.currentFeed.length);
            this.updateDom();
        }
        if (notification == "SERVICE_FAILURE") {
            this.failure = payload;
            Log.info("Service failure: "+ this.failure.StatusCode + ':' + this.failure.Message);
            this.updateDom();
        }
    },

})
