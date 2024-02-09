//Content.js => Logic for page


//TEST CASE Multiple Comments in videos.


class Content{
    constructor(){
        this.url = window.location.href;
        this.instance = null;

        this.initNewSettings(this.url);
        this.listenForLocationChange();
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
                this.instance = new YoutubeInstance();
            } else {
                console.log('updating instance');
                this.instance.update();
            }
        }
    }
}


class YoutubeInstance {
    constructor(){
        this.setElements();

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


    update(){
        //update other things/
        this.setElements();
        if(this.messagePanel){
            this.messagePanel.resetMessages();
        }
    }


    // //Get Content from video
    // async fetchVideo(){
    //     return new Promise((resolve,reject)=>{
    //         let xhr = new XMLHttpRequest();

    //         xhr.open('GET', 'https://catfact.ninja/fact', true);
          
    //         xhr.onreadystatechange = function() {
    //           if (xhr.readyState === 4 && xhr.status === 200) {
    //             // Parse the JSON response
    //             let response = JSON.parse(xhr.responseText);
          
    //             console.log('Cat Fact:', response.fact);
    //             resolve(response);
    //           } else{
    //               reject(`Error : ${xhr.status}`);
    //           }
    //         };
          
    //         // Send the request
    //         xhr.send();
    //     });
    // }

    setupEvents(){
        this.progressBar.addEventListener('click',()=>{
            console.log(this.videoElement.currentTime);
        });

        let lastFiredPosition = 0;
        document.addEventListener('scroll',()=>{
            const currentPosition = window.scrollY;

            let nextInterval = lastFiredPosition + 1500;
            
            console.log(currentPosition, lastFiredPosition, nextInterval);
            if (currentPosition > lastFiredPosition && currentPosition >= nextInterval) {
                lastFiredPosition = nextInterval;
                this.messagePanel.updateMessages();
            }
        });

    }

    setupVideo(data){
        // let timeStampData = data['pois']
        // let messages = data['messages'];
    }

    sendData(data){

    }

    convertTimeToPercent(time){
        let totalTime = parseInt(this.videoElement.duration);
        console.log(time,totalTime)

        let ratio = time / totalTime;

        return ratio * 100; //convert to percent
    }

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
                    <div class="time-ref" data-time=${comment.time}>
                        ${comment.formattedTime}
                    </div>
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

window.onload = () => {
    setTimeout(()=>{
        new Content();        
    },5000);
};