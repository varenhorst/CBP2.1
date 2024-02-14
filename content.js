//Content.js => Logic for page
//TEST CASE Multiple times in comments.

class Content {
    constructor(){
        this.url = window.location.href;
        this.instance = null;
        this.api = new CheeseBlockRequestor();

        this.initNewSettings(this.url); // check url, and init setting based on this. 
        this.listenForLocationChange(); // listen for url change (not DOM reload)
    }

    listenForLocationChange(){
        navigation.addEventListener("navigate", e => {            
            this.initNewSettings(e.destination.url);
        });
    }

    initNewSettings(url){
        this.url = url;

        if(url.includes('youtube')){
            if(!this.instance){
                console.log('creating new instance');
                this.instance = new YoutubeInstance(this);
            } else {
                console.log('updating instance');
                this.instance.update();
            }
        }
    }    
}

class YoutubeInstance {
    constructor(parent){
        this.parent = parent;
        this.isSkipManifest = true;
        this.skipManifest = {'url':this.parent.url,'skip_times':[]};
        this.skipThreshold = 5;

        this.setElements();
        this.retreiveData();

        if(!this.progressBar || !this.videoElement || !this.controlsContainer){
            console.log('No Elements for Extension');
            return;
        } else {
            this.setupEvents();
            this.messagePanel = new MessagePanel(this,this.player);
        }
    }

    setElements(){
        this.videoElement = document.querySelector('.html5-video-container video');
        this.progressBar = document.querySelector('.ytp-progress-bar');
        this.controlsContainer = document.querySelector('.ytp-left-controls');
        this.player = document.querySelector('#player');

        if(!this.progressBar || !this.videoElement || !this.controlsContainer){
            alert('No elements');
        }
    }

    //get skips, and comments from the API
    //Set skip manifest skip times
    retreiveData(){
        this.comments = this.parent.api.getComments(this.parent.url).then((data)=>{
            //do something with the comments here
        });


        this.skipManifest.skip_times = this.parent.api.getTimes(this.parent.url).the((data)=>{
            //do something with the times here 
        });
    }

    update(){
        if(this.skipManifest.skip_times.length > 0){
            this.uploadSkips(); //upload skips on page change
        }

        //reset skip
        //reset comments
        this.skipManifest = {'url':this.parent.url,'skip_times':[]};
        this.skipManifest.skip_times = null;

        this.retreiveData();
        
        //update other things/
        this.setElements();
        if(this.messagePanel){
            this.messagePanel.resetMessages();
        }
    }

    setupEvents(){
        let lastFiredPosition = 0;
        document.addEventListener('scroll',()=>{
            const currentPosition = window.scrollY;

            let nextInterval = lastFiredPosition + 1500;
            
            if (currentPosition > lastFiredPosition && currentPosition >= nextInterval) {
                lastFiredPosition = nextInterval;
                this.messagePanel.updateMessages();
            }
        });

        if(this.isSkipManifest){
            let currentTime = 0;
            this.videoElement.addEventListener('timeupdate',()=>{
                currentTime = this.videoElement.currentTime;
            });

            this.progressBar.addEventListener('click',()=>{
                let seekingToTime = this.videoElement.currentTime;
                
                this.skipManifest.skip_times.push({'from':currentTime,'to':seekingToTime});
            });
        }
    }

    uploadSkips(){
        let filteredSkips = this.skipFinder(this.skipManifest.skip_times,this.skipThreshold)
        let skipArray = this.transformSkipArray(filteredSkips,this.videoElement.duration);


        this.parent.api.postTimes(this.parent.url,skipArray);
    }

    skipFinder(arr,threshold = 5){
		for(var i = 0; i < arr.length; i++){
		    if(typeof arr[i+1] === 'undefined'){
        		break;
		    } else {
		      if(Math.abs(arr[i]['to'] - arr[i+1]['from']) <= threshold){
		        var x = arr[i];
		        var y = arr[i+1];
		        arr[i+1] = {from:x['from'], to: y['to']};
		        arr.splice(i, 1);
		        i--;
		      }
		    }
		}
		return this.removeUnwantedSkips(arr);
	}


	//removes skips that do not really make any sense, such as skipping back
	//or something else kinda dumb.
	removeUnwantedSkips(arr){
		for(var i = 0; i<arr.length; i++){
		  	if(arr[i]['from'] - arr[i]['to'] > 0){
		    	arr.splice(i, 1);
		    	i--;
		    }
	  	}
		return arr;
	}


    transformSkipArray(skips,duration){
        console.log(skips,duration);
        let dataArray = [] /// [0,0,0,1,1,1,1,2,2,2,3,3,3,2,2,2,1,1,1,1,1,0,0,0,0]
        for (let i = 1; i <= duration; i++) {
            let count = 0;
            for(let skip of skips){
                if(skip.from <= i && skip.to >= i){
                    count++;
                }
            }
            dataArray[i] = count;
        }


        return dataArray;
    }

    isValueInRange(value, range) {
        return value >= range.from && value <= range.to;
    }    

    convertTimeToPercent(time){
        let totalTime = parseInt(this.videoElement.duration);
        console.log(time,totalTime)

        let ratio = time / totalTime;

        return ratio * 100; //convert to percent
    }


    //Scrape Comments, and send to backend
    //Backend should compare comments with existing, and only upload new comments
    //After upload, get all the comments back
    retreiveComments(){
        let commentElements = document.querySelectorAll('yt-formatted-string.ytd-comment-renderer:not(.cheese-blocked)');
        let comments = [];
        
        var regexPattern = /href=["'](.*?)["']/g;
        commentElements.forEach((element)=>{
            element.classList.add('cheese-blocked');
            if(element.id === 'content-text'){
                let innerContent = element.innerHTML;

                let matches = innerContent.match(regexPattern);
            
                if(matches){
                    let comment = {};
                    matches.forEach((match)=>{
                        let innerMatches = match.match(/t=\d+s/);
                        
                        if(innerMatches && typeof innerMatches !== 'undefined'){
                            comment.href = match;
                            comment.text = element.textContent;
                            let secondsFromHref = innerMatches[0].replace('s','').replace('t=','');
                            comment.time = secondsFromHref;
                            comment.formattedTime = this.formatSecondsToHHMMSS(secondsFromHref);
                            comment.html = element.innerHTML;
                        }

                        if(Object.keys(comment).length !== 0){
                            comments.push(comment);
                        }
                    });
                }
            }
        });

        return comments;
    }

    formatSecondsToHHMMSS(secondsString) {
        // Convert string to number
        const seconds = parseInt(secondsString);
    
        // Calculate hours, minutes, and remaining seconds
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const remainingSeconds = seconds % 60;
    
        // Prepare formatted time parts
        let formattedTimeParts = [];
    
        // Add hours part if it's not zero
        if (hours > 0) {
            formattedTimeParts.push(hours.toString().padStart(2, '0'));
        }
    
        // Add minutes and seconds parts
        formattedTimeParts.push(minutes.toString());
        formattedTimeParts.push(remainingSeconds.toString().padStart(2, '0'));
    
        // Join time parts with ":" and return
        return formattedTimeParts.join(':');
    }
}

class MessagePanel{
    constructor(Content, playerContainer,data=null){
        this.content = Content;
        this.playerContainer = playerContainer;
        this.data = data;
        this.currentCommentCount = 0;
        this.render();

        this.markerCounter = 0;
    }

    render(){
        let messagePanelContainer = document.createElement('div');
        messagePanelContainer.className = 'tool-container';

        messagePanelContainer.innerHTML = `
            <div class="message-panel-container">
                <ul class="tabs">
                    <div class="grabber"><img alt="grip" src="http://demo.vee24.com/anton/assets/grip-vertical.svg" /></div>
                    <li data-tab-target="#test1" class="tab" id="test1"><img alt="select" src="https://www.svgrepo.com/show/487899/timeline.svg" /></li>
                    <li data-tab-target="#timesPanel" class="tab" id="timesTab"><img alt="times" src="https://www.svgrepo.com/show/460711/chat-alt.svg" /></li>
                </ul>
                <div class="tab-content">
                    <div id="loader" style="width:100%;height: 100%;background:black;"></div>
                    <div id="test1" data-tab-content>
                        <h1>Test</h1>
                        <p>TestTestTestTestTestTestTestTestTestTest</p>
                    </div>
                    <div id="pricing" data-tab-content>
                        <h1>Test</h1>
                        <p>Some TestTestTestTestTestTestTestTestTestTestTestTestTestTestTestTestTestTestTestTest on pricing</p>
                    </div>
                    <div id="timesPanel" data-tab-content>
                        <h3 style="text-align:center">Timestamps</h1>
                        <div id="timestamps">
                            <span id="noTimestamps">No Timestamps</div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.append(messagePanelContainer);

        this.timestampContainer = document.querySelector('#timestamps');
        this.timestampTab = document.querySelector('#timesTab');
        this.timesPanel = document.querySelector('#timesPanel');
        this.noTimestamps = document.querySelector('#noTimestamps');

        this.timestampTab.addEventListener('click',()=>{
            this.updateMessages();
        });

        this.timesPanel.addEventListener('click',(e)=>{
            if(e.target.classList.contains('time-ref')){
                let goToTime = e.target.getAttribute('data-time');
                this.content.videoElement.currentTime = goToTime;
            }
        });

        this.setupTabs();
        this.makeDraggable(document.querySelector('.grabber'),messagePanelContainer, this.content.videoElement,10);
    }


    updateMessages(){
        this.showLoader();
        let localMessages = this.content.retreiveComments();
        
        let htmlContent = ``;
    
        for(let comment of localMessages){
            this.currentCommentCount++;
            let url = window.location.href + '&t=' + comment.time;
            htmlContent += `
            <div class = "timestamp-container">
                <div class = "message-container">
                    <div class="message">
                        ${comment.text}
                    </div>
                </div>
            </div>`;
        }

        if(this.currentCommentCount == 0){
            document.getElementById('noTimestamps').style.display = 'block';
        } else {
            document.getElementById('noTimestamps').style.display = 'none';
        }

        this.timestampContainer.innerHTML += htmlContent;
        this.hideLoader();
    }

    
    showLoader() {
        // Show loader
        document.getElementById('loader').style.display = 'block';
    }

    hideLoader() {
        // Hide loader
        document.getElementById('loader').style.display = 'none';
    }

    resetMessages(){
        this.timestampContainer.innerHTML = `<span id="noTimestamps">No Timestamps</div>`;
        this.currentCommentCount = 0;
        document.getElementById('noTimestamps').style.display = 'block';

        let elements = document.querySelectorAll('.cheese-blocked');


        elements.forEach(function(element) {
            element.classList.remove('cheese-blocked');
        });
    }


    setupTabs(){
        const tabs = document.querySelectorAll('[data-tab-target]')
        const tabContents = document.querySelectorAll('[data-tab-content]')
        
        let activeTab = null;
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const target = document.querySelector(tab.dataset.tabTarget);
                tabContents.forEach(tabContent => {
                    tabContent.classList.remove('active')
                })
                tabs.forEach(tab => {
                    tab.classList.remove('active')
                });
                
                if (activeTab === target) {
                    activeTab = null;
                } else {
                    tab.classList.add('active');
                    target.classList.add('active');
                    activeTab = target;
                }
            })
        });
    }

    makeDraggable(dragger, el, snapElement, snapThreshold) {
        let isDragging = false;
        let offsetX, offsetY;
        dragger.addEventListener('mousedown', (e) => {
            isDragging = true;
            offsetX = e.clientX - el.getBoundingClientRect().left;
            offsetY = e.clientY - el.getBoundingClientRect().top;
            dragger.style.cursor = 'grabbing';
        });
    
        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
    
            const x = e.clientX - offsetX;
            const y = e.clientY - offsetY;
    
            el.style.left = `${x}px`;
            el.style.top = `${y}px`;
    
            // Check if the draggable element should snap
            if (snapElement) {
                const snapBounds = snapElement.getBoundingClientRect();
    
                // Check if the draggable element should snap to the right edge
                // if (x + el.offsetWidth >= snapBounds.left - snapThreshold &&
                //     x + el.offsetWidth <= snapBounds.right + snapThreshold) {
                //     el.style.left = `${snapBounds.right - el.offsetWidth}px`;
                // }
    
                // Check if the draggable element should snap to the left edge
                if (x <= snapBounds.right + snapThreshold &&
                    x >= snapBounds.left - snapThreshold) {
                    el.style.left = `${snapBounds.left}px`;
                }
            }
        });
    
        document.addEventListener('mouseup', () => {
            isDragging = false;
            dragger.style.cursor = 'grab';
        });
    }

    placeMarkers(currentTime){
        this.markerCounter++;
        let leftPercentage = this.content.convertTimeToPercent(currentTime);

        let marker1 = document.createElement('div');
        marker1.className = 'marker';
        marker1.style.left = leftPercentage + '%';

        let marker2 = document.createElement('div');
        marker2.className = 'marker';
        marker2.style.left = leftPercentage + 10 + '%';

        let markerHTML =  `
            <div class="marker-top triangle">
                <span> ${this.markerCounter} </span>
            </div> 
            <div class="marker-line"></div>
            `;   
        
        marker1.innerHTML = markerHTML;
        marker2.innerHTML = markerHTML;

        this.content.controlsContainer.appendChild(marker1);
        this.content.controlsContainer.appendChild(marker2);

        this.makeDraggableX(marker1,this.content.progressBar);
        this.makeDraggableX(marker2,this.content.progressBar);
    }

    makeDraggableX(element, container) {
      var isDragging = false;
      var containerRect = container.getBoundingClientRect();

      element.addEventListener('mousedown', function(event) {
        isDragging = true;
        var offsetX = event.clientX - element.getBoundingClientRect().left;
        
        document.addEventListener('mousemove', drag);
        document.addEventListener('mouseup', function() {
          isDragging = false;
          document.removeEventListener('mousemove', drag);
        });
        
        function drag(event) {
          var newPosition = event.clientX - containerRect.left - offsetX;
          var maxPosition = containerRect.width - element.offsetWidth;
          newPosition = Math.max(0, Math.min(maxPosition, newPosition));
          element.style.left = newPosition + 'px';
        }
      });
    }
}

class CheeseBlockRequestor{
    getComments(url){
        return new Promise((resolve,reject)=>{
            let xhr = new XMLHttpRequest();

            xhr.open('GET', `localhost:7000/comments?url=${encodeURIComponent(url)}`, true);
            
            xhr.onreadystatechange = function() {
                if (xhr.readyState === 4 && xhr.status === 200) {
                    let response = JSON.parse(xhr.responseText);
                
                    resolve(response);
                } else{
                    reject(`Error : ${xhr.status}`);
                }
            };
            
            // Send the request
            xhr.send();
        });
    }

    postComments(url, payload) {
        return new Promise((resolve, reject) => {
            let xhr = new XMLHttpRequest();
    
            xhr.open('POST', 'http://localhost:7000/comments', true);
            xhr.setRequestHeader('Content-Type', 'application/json');
    
            xhr.onreadystatechange = function () {
                if (xhr.readyState === 4) {
                    if (xhr.status === 200) {
                        let response = JSON.parse(xhr.responseText);
                        resolve(response);
                    } else {
                        reject(`Error : ${xhr.status}`);
                    }
                }
            };
    
            xhr.onerror = function () {
                reject('Error occurred during the request.');
            };
    
            xhr.send(JSON.stringify({ url: url, payload: payload }));
        });
    }
    

    getTimes(url){
        return new Promise((resolve,reject)=>{
            let xhr = new XMLHttpRequest();

            xhr.open('GET', `localhost:7000/times?url=${encodeURIComponent(url)}`, true);
            
            xhr.onreadystatechange = function() {
                if (xhr.readyState === 4 && xhr.status === 200) {
                    let response = JSON.parse(xhr.responseText);
                
                    resolve(response);
                } else{
                    reject(`Error : ${xhr.status}`);
                }
            };
            
            // Send the request
            xhr.send();
        });
    }

    postTimes(url,payload){
        return new Promise((resolve, reject) => {
            let xhr = new XMLHttpRequest();
    
            xhr.open('POST', 'http://localhost:7000/times', true);
            xhr.setRequestHeader('Content-Type', 'application/json');
    
            xhr.onreadystatechange = function () {
                if (xhr.readyState === 4) {
                    if (xhr.status === 200) {
                        let response = JSON.parse(xhr.responseText);
                        resolve(response);
                    } else {
                        reject(`Error : ${xhr.status}`);
                    }
                }
            };
    
            xhr.onerror = function () {
                reject('Error occurred during the request.');
            };
    
            xhr.send(JSON.stringify({ url: url, payload: payload }));
        });
    }
}

window.onload = () => {
    setTimeout(()=>{
        new Content();        
    },5000);
};