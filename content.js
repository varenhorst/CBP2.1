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
                this.instance = new YoutubeInstance();
            } else {
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
    }


    update(){
        //update other things/
        this.setElements();
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
                        
                        if(innerMatches){
                            comment.href = match;
                            comment.text = element.textContent;
                            comment.time = innerMatches[0].replace('s','').replace('t=','');
                        }

                        comments.push(comment);
                    });
                }
            }
        });

        console.log(comments);
    }
}

class MessagePanel{
    constructor(Content, playerContainer,data=null){
        this.content = Content;
        this.playerContainer = playerContainer;
        this.data = data;
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
                    <li data-tab-target="#pricing" class="tab"><img alt="pointer" src="https://www.svgrepo.com/show/430210/cheese-line.svg" /></li>
                    <li data-tab-target="#timesPanel" class="tab" id="timesTab"><img alt="times" src="https://www.svgrepo.com/show/460711/chat-alt.svg" /></li>
                </ul>
                <div class="tab-content">
                    <div id="test1" data-tab-content>
                        <h1>Test</h1>
                        <p>TestTestTestTestTestTestTestTestTestTest</p>
                    </div>
                    <div id="pricing" data-tab-content>
                        <h1>Test</h1>
                        <p>Some TestTestTestTestTestTestTestTestTestTestTestTestTestTestTestTestTestTestTestTest on pricing</p>
                    </div>
                    <div id="timesPanel" data-tab-content>
                        <h1>Timestamps</h1>
                        <div id="timestamps">
                            <!-- Comments go in here -->
                            No Timestamps
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.append(messagePanelContainer);

        this.timestampContainer = document.querySelector('#timestamps');
        this.timestampTab = document.querySelector('#timesTab');

        this.timestampTab.addEventListener('click',()=>{
            this.updateMessages();
        });

        this.setupTabs();
        this.makeDraggable(document.querySelector('.grabber'),messagePanelContainer, this.content.videoElement,10);
    }


    updateMessages(){
        this.timestampContainer.innerHTML = ``;

        let localMessages =  [{'text':'alex is awesome is asd as asd a this is along message. asda idk what thjis asdadf , asdf a.sdf a.sdf a.dfsdf this is along emsas aTEST. 1:21', 'time': 120},{'text':'test 123 1:21 Lex is awesome', 'time': 125}];

        let htmlContent = ``;
    
        for(let comment of localMessages){
            htmlContent += `
            <div class = "timestamp-container">
                <div class = "message-container">
                    <div class="time-ref">
                        @${comment.time}
                    </div>
                    <div class="message">
                        ${comment.text}
                    </div>
                </div>
            </div>`;
        }

        this.timestampContainer.innerHTML = htmlContent;
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