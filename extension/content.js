//Content.js => Logic for page
//TEST CASE Multiple times in comments.

class Content {
    constructor(){
        this.permissions = null;
        this.url = window.location.href;
        this.instance = null;
        this.api = new CheeseBlockRequestor();

        this.initNewSettings(this.url); // check url, and init setting based on this. 
        this.listenForLocationChange(); // listen for url change (not DOM reload)

        chrome.runtime.sendMessage({type:'getPermissions'},(response)=> {
            this.permissions = response.response;
        });

        chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
            alert(request.message);
        });
    }

    listenForLocationChange(){
        navigation.addEventListener("navigate", e => {            
            this.initNewSettings(e.destination.url);
        });
    }

    initNewSettings(url){
        let newURL = url

        if(newURL.includes('youtube')){
            if(!this.instance){
                this.url = url;             
                this.instance = new YoutubeInstance(this);
            } else {
                this.instance.update(this.url,newURL);
                this.url = url;
            }
        } else {
            this.instance = new StandardInstance();
        }
    }
}

class StandardInstance{
    constructor(){
       this.setupEvents()
    }

    setupEvents(){
        
    }
}

class YoutubeInstance {
    constructor(parent){
        this.parent = parent;
        this.isSkipManifest = true;
        this.skipManifest = {'url':this.parent.url,'skip_times':[]};
        this.commentManifest = {'url':this.parent.url,'comments':[]};
        this.skipThreshold = 5;


        this.searchRequiredElements().then(()=>{
            this.setElements();
            this.retreiveData(this.parent.url); // on page load

            if(!this.progressBar || !this.videoElement || !this.controlsContainer){
                console.log('No Elements for Extension');
                return;
            } else {
                this.setupEvents();
                this.panel = new Panel(this,this.player);
            }
        }).catch(()=>{
            alert('required elements not found');
        });
    }

    searchRequiredElements(){
        let attemptCount = 0;

        return new Promise((resolve,reject)=>{
            let interval = setInterval(()=>{
                this.videoElement = document.querySelector('.html5-video-container video');
                if(this.videoElement !== null){
                    resolve();
                    clearInterval(interval);
                } 
                if(attemptCount >= 10){
                    reject();
                }
                attemptCount++;
            },1000)
        });
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
    retreiveData(url){
        // if(this.permissions['active']){
            this.parent.api.getTimes(url).then((data)=>{
                document.getElementById('heatmapCheeseblock') && document.getElementById('heatmapCheeseblock').remove();
                this.generateHeatmap(data.record.timeRepresentation);
            }).catch((e)=>{
                document.getElementById('heatmapCheeseblock') && document.getElementById('heatmapCheeseblock').remove();   
            });
        // }
    }

    async update(prevUrl,newUrl){
        if(this.skipManifest.skip_times.length > 0){
            this.uploadSkips(prevUrl); //upload skips on page change
        }

        //reset skip
        //reset comments
        this.skipManifest = {'url':newUrl,'skip_times':[]};
        this.commentManifest = {'url':newUrl,'comments':[]};
        this.nextInterval = 0;

        //update other things/
        this.setElements();
        if(this.panel){
            this.panel.clearPanel();
        }

        this.retreiveData(newUrl);
    }

    setupEvents(){
        let lastFiredPosition = 0;
        this.nextInterval  = 0;
        document.addEventListener('scroll',()=>{
            const currentPosition = window.scrollY;

            this.nextInterval = lastFiredPosition + 1500;
            
            if (currentPosition > lastFiredPosition && currentPosition >= this.nextInterval) {
                lastFiredPosition = this.nextInterval;
                this.retreiveComments();
                this.uploadComments(this.parent.url);
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


        this.videoElement.addEventListener('play',()=>{
            this.panel.togglePanel('hide');
        });
    }

    uploadSkips(url){
        let filteredSkips = this.skipFinder(this.skipManifest.skip_times,this.skipThreshold)
        let skipArray = this.transformSkipArray(filteredSkips,this.videoElement.duration);

        this.parent.api.postTimes(url,skipArray).then((data)=>{
            console.log('success');
        }).catch((e)=>{
            alert('error' + e);
        });
    }

    uploadComments(url){
        this.parent.api.postComments(url,this.commentManifest).then((data)=>{
            this.commentManifest = {'url':this.parent.url,'comments':[]};
        }).catch((e)=>{
            alert('error' + e);
        });
    }

    //Scrape Comments, and send to backend
    //Backend should compare comments with existing, and only upload new comments
    //After upload, get all the comments back
    retreiveComments(){
        let results = [];
        let commentElements = document.querySelectorAll('#comment:not(.cheese-blocked)');

        let getSeconds = function(timeString){
            const [minutes, seconds] = timeString.split(':').map(Number);
            let totalSeconds = 0;
            if (!isNaN(minutes)) {
                totalSeconds += minutes * 60;
            }
            if (!isNaN(seconds)) {
                totalSeconds += seconds;
            }
            return totalSeconds;
        }

        for(let element of commentElements){
            element.classList.add('cheese-blocked');
            let textElement = element.querySelector('#content-text');

            let comment = textElement.textContent;
            const timePattern = /\b\d{1,2}:\d{2}(?::\d{2})?\b/g;

            const matches = comment.match(timePattern) || [];

            if(matches.length > 0){
                for(let match of matches){
                    let seconds = getSeconds(match);
                    this.commentManifest.comments.push({'formattedTime':match,'seconds':seconds,'text':comment})
                }
            }
        }
    }

    generateHeatmap(values){
        const maxHeight = Math.max(...values); // max height
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('id', 'heatmapCheeseblock');
        svg.setAttribute('width', '100%'); // Set SVG width to 100% of container
        svg.setAttribute('height',maxHeight);
        svg.style.top = (-maxHeight) + 'px';

        const totalValues = values.length;
        const rectWidthPercentage = 100 / totalValues; // Width percentage of each rectangle

        values.forEach((value, index) => {
            const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            rect.setAttribute('x', `${index * rectWidthPercentage}%`);
            rect.setAttribute('y', 0);
            rect.setAttribute('width', `${rectWidthPercentage}%`); // Set width dynamically
            rect.setAttribute('height', value + 2);
            rect.setAttribute('fill', getColor(value));
            svg.appendChild(rect);
        });

        this.progressBar.appendChild(svg);

        function getColor(value) {
            const normalizedValue = value / 10;

            // Interpolate between red (255, 0, 0) and green (0, 255, 0)
            const r = Math.floor(normalizedValue * 255);
            const g = Math.floor((1 - normalizedValue) * 255);
            const b = 0; // No blue component for this gradient

            // Convert RGB values to a CSS color string
            return `rgb(${r}, ${g}, ${b})`;
        }
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
        for (let i = 0; i <= duration; i++) {
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

class Panel{
    constructor(Instance, player){
        this.instance = Instance;
        this.player = player;
        this.ytCardsContainer = document.querySelector('.ytp-chrome-top-buttons');
        this.panel = null;
        this.comments = null;
        this.uuid = this.instance.parent.permissions['uuid'];

        if(!this.ytCardsContainer){
            console.log('No cards container');
            return;
        }

        if(this.player){
            this.render();
        }
    }

    render(element) {
        let html = `<button class="block-bubble ytp-button ytp-cards-button" id="block-bubble" aria-label="CBP" aria-owns="iv-drawer" data-tooltip-opaque="false" style="" title="Details">
                        <svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512" version="1.1"><path d="M 187.135 133.086 C 188.005 134.414, 197.550 149.062, 208.348 165.638 L 227.980 195.776 228.240 242.061 L 228.500 288.347 255.750 297.410 L 283 306.473 283 347.641 L 283 388.809 304.083 414.155 C 315.678 428.095, 326.028 440.387, 327.083 441.472 C 328.973 443.417, 328.999 442.180, 328.963 353.972 L 328.926 264.500 306.400 238.521 C 294.011 224.232, 284.267 212.411, 284.746 212.251 C 285.225 212.092, 313.040 215.569, 346.558 219.978 C 380.076 224.387, 408.288 227.996, 409.250 227.997 C 410.870 228, 411 226.144, 411 203 C 411 189.250, 410.823 178, 410.607 178 C 410.391 178, 394.079 174.600, 374.357 170.445 C 354.636 166.290, 305.200 155.918, 264.500 147.397 C 223.800 138.875, 189.387 131.626, 188.027 131.287 C 185.618 130.687, 185.595 130.733, 187.135 133.086" stroke="none" fill="#fbe189" fill-rule="evenodd"/><path d="M 205 68.607 C 138.227 71.302, 79.690 81.549, 40.041 97.483 C 20.879 105.185, 8.918 112.957, 3.250 121.390 L -0 126.226 -0 214 L 0 301.774 3.250 306.609 C 13.231 321.458, 43.380 336.005, 86.615 346.832 C 123.853 356.158, 172.032 361.966, 212.341 361.990 L 229.183 362 228.464 278.750 L 227.746 195.500 206.936 163.520 C 195.491 145.931, 186.236 131.430, 186.370 131.296 C 186.505 131.162, 205.939 135.104, 229.557 140.058 C 303.649 155.595, 401.298 176.096, 406.250 177.152 L 411 178.166 411 203.083 C 411 226.148, 410.870 228, 409.250 227.997 C 408.288 227.996, 380.076 224.387, 346.558 219.978 C 313.040 215.569, 285.225 212.092, 284.746 212.251 C 284.267 212.411, 294.011 224.232, 306.400 238.521 L 328.926 264.500 328.963 354.310 L 329 444.120 340.750 443.573 C 347.212 443.271, 359.475 442.769, 368 442.456 C 417.948 440.624, 471.806 433.063, 503.628 423.417 L 511.755 420.954 512.447 300.727 C 512.828 234.602, 512.988 167.900, 512.803 152.500 C 512.618 137.100, 512.362 150.712, 512.234 182.750 C 512.008 239.011, 511.936 241, 510.120 241 C 509.086 241, 496.374 239.425, 481.870 237.501 C 467.367 235.576, 455.387 234.001, 455.250 234.001 C 455.113 234, 455 210.031, 455 180.735 L 455 127.469 452.633 122.985 C 439.992 99.034, 363.766 76.126, 276.500 70.051 C 260.706 68.952, 217.883 68.087, 205 68.607 M 0.479 214 C 0.479 262.675, 0.601 282.588, 0.750 258.250 C 0.899 233.913, 0.899 194.088, 0.750 169.750 C 0.601 145.413, 0.479 165.325, 0.479 214" stroke="none" fill="#f1ba47" fill-rule="evenodd"/></svg>
                    </button>`;

        this.ytCardsContainer.insertAdjacentHTML('beforeend', html);

        let button = document.querySelector('#block-bubble');

        button.addEventListener('click',()=>{
            this.togglePanel();
        });
    }   

    togglePanel(option=null){
        if(!this.panel){
            let html = `
            <div class="cheese-block-panel active" id="cheese-block-panel">
                <div id="panelLoader">
                    <svg version="1.1" id="L9" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" viewBox="0 0 100 100" enable-background="new 0 0 0 0" xml:space="preserve">
                        <path fill="#fff" d="M73,50c0-12.7-10.3-23-23-23S27,37.3,27,50 M30.9,50c0-10.5,8.5-19.1,19.1-19.1S69.1,39.5,69.1,50">
                          <animateTransform attributeName="transform" attributeType="XML" type="rotate" dur="1s" from="0 50 50" to="360 50 50" repeatCount="indefinite"></animateTransform>
                      </path>
                    </svg>
                </div>
                <div id="noComments"> No Comments. Be the first the contribute! </div> 
                <div class="sticky-buttons">
                    <div id="addCommentButton">+</div>
                </div>
            </div>`
            this.player.insertAdjacentHTML('beforeend',html);
            this.panel = document.querySelector('#cheese-block-panel');
            this.noCommentsStatus = document.querySelector('#noComments');
            this.addCommentsButton = document.querySelector('#addCommentButton');
            // this.submitCommentButton = document.querySelector('#submitComment');
            this.panelLoader = document.querySelector('#panelLoader');
            this.stickyButtonContainer = document.querySelector('.sticky-buttons');

            this.setPanelEvents();
            this.showComments();
        } else {
            if(this.panel.classList.contains('active')){
                this.panel.classList.remove('active');
            } else {
                if(!option || option !== 'hide'){
                    this.panel.classList.add('active');
                }
            }
        }
    }

    setPanelEvents(){
        this.panel.addEventListener('click',(e)=>{
            let clickedElement = e.target;

            if(clickedElement.classList.contains('comment') || clickedElement.parentElement.classList.contains('comment')){
                if(clickedElement.parentElement.classList.contains('comment')){
                    clickedElement = clickedElement.parentElement;
                }
                const time = clickedElement.getAttribute('data-time');
                this.instance.videoElement.currentTime = time;
            }
        });

        this.addCommentsButton.addEventListener('click',(e)=>{
            if(this.instance.parent.permissions['access']){
                this.addCommentsButton.style.display = 'none';
                this.showNewCommentPanel();
                this.toggleComments('hide');
            } else {
                //maybe send message to background script saying no permissions
                alert("You don't have permission to add a comment");
            }
        });
    }

    toggleComments(hideOrShow){
        let parentElement = document.querySelector('.cheese-block-panel');
    
        if (parentElement) {
            let comments = parentElement.querySelectorAll('.comment');
            comments.forEach(function(comment) {
                comment.style.display = (hideOrShow === 'hide' ? 'none' : 'flex');
            });
            this.stickyButtonContainer.style.display = (hideOrShow === 'hide' ? 'none' : '');
        } else {
            console.log("Parent element not found.");
        }
    }

    showComments(){
        this.showLoader();
        this.instance.parent.api.getComments(window.location.href).then((data)=>{
            this.comments = data.records; 

            if(this.panel){
                if(this.comments && this.comments.length > 0){
                    let html = ``;
                    let index = 0;
                    for(let comment of this.comments){
                        let className = '';
                        if(index === 0){
                            className = 'first-item';
                        }
                        html += `<div class="comment ${className}" data-time='${comment.seconds}'><span class="comment-formattedTime">${comment.formattedTime}</span><div style="align-self:center;">${comment.text}</div></div>`
                        index++;
                    }

                    this.panel.insertAdjacentHTML('beforeend',html);
                    this.noCommentsStatus.style.display = 'none';
                } else {
                    this.noCommentsStatus.style.display = 'block';
                }
            }

            this.hideLoader();
        });
    }

    showNewCommentPanel(){
        let html = `
        <div class="new-comment-panel">
            <div class="time-input-container">
                <div class="time-input">
                    <label for="time" class="time-label">@</label>
                    <input id="timeInput" name="time" disabled> 
                </div>
                <!-- <div class="create-time-segment">Create Segment</div> -->
            </div>
            <textarea id="newComment"> </textarea>
            <div class="new-comment-captcha-container" id="captcha-container"></div>
            <div class="new-comment-buttons">
                <div class="cancelCommentButton" id="cancelComment">Cancel</div>
                <div class="submitCommentButton" id="submitComment">Submit</div>
            </div>
        </div>`;

        this.panel.insertAdjacentHTML('beforeend',html);
        this.timeInput = document.querySelector('#timeInput');
        this.newComment = document.querySelector('#newComment');
        this.instance.videoElement.pause();
        this.newCommentTime = Math.ceil(this.instance.videoElement.currentTime);
        this.timeInput.value = this.instance.formatSecondsToHHMMSS(Math.ceil(this.instance.videoElement.currentTime));
        this.captchaContainer = document.querySelector('#captcha-container');

        this.submitCommentButton = document.querySelector('#submitComment');
        this.cancelCommentButton = document.querySelector('#cancelComment');

        //determine whether to show captcha based on user
        let captchaGenerator = new Captcha(this.captchaContainer,5);
        this.captchaInput = document.querySelector('#captchaInput');


        this.isCommentError = false;
        this.submitCommentButton.addEventListener('click',(e)=>{
            let verified = captchaGenerator.validateCaptcha(this.captchaInput);
            if(!verified){
                if(!this.isCommentError){
                    let errorElement = document.createElement('div');
                    errorElement.className = 'error-element';
                    errorElement.innerHTML = 'Invalid Captcha';
                    this.captchaContainer.appendChild(errorElement);

                    this.isCommentError = true;
                }
                return false;
            }

            if(this.timeInput && this.newCommentTime){
                let newComment = this.newComment.value;
                let formattedTime = this.instance.formatSecondsToHHMMSS(this.newCommentTime);
                this.showLoader();
                this.instance.parent.api.postComments(this.instance.parent.url, {'url':this.instance.parent.url,'comments':[{'formattedTime':formattedTime,'seconds':this.newCommentTime,'text':newComment}]},this.uuid).then((data)=>{
                    this.hideLoader();
                    this.clearPanel();
                    this.togglePanel();
                }).catch((error)=>{
                    alert(error);
                    this.hideLoader();
                });
            }
        });

        this.cancelCommentButton.addEventListener('click',(e)=>{
            this.toggleComments('show');
            this.stickyButtonContainer.style.display = 'sticky';
            this.hideNewCommentPanel();
            this.addCommentsButton.style.display = 'block';
        });
    }

    hideNewCommentPanel(){
        let newCommentPanel = document.querySelector('.new-comment-panel');
        newCommentPanel.remove();
    }

    clearPanel(){
        if(this.panel){
            this.panel.classList.remove('active');
            this.panel.remove();
        }
        this.panel = null;
        this.comments = null;
    }

    hideLoader(){
        this.panelLoader.classList.remove('active');
    }

    showLoader(){
        this.panelLoader.classList.add('active');
    }
}


class CheeseBlockRequestor{
    getTimes(url){
        return new Promise((resolve,reject)=>{
            let xhr = new XMLHttpRequest();

            xhr.open('GET', `http://localhost:3000/times?url=${encodeURIComponent(url)}`, true);
            
            xhr.onreadystatechange = function() {
                if (xhr.readyState === 4) {
                    if(xhr.status === 200) {
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
            
            // Send the request
            xhr.send();
        });
    }

    postTimes(url,payload){
        return new Promise((resolve, reject) => {
            let xhr = new XMLHttpRequest();
    
            xhr.open('POST', 'http://localhost:3000/times', true);
            xhr.setRequestHeader('Content-Type', 'application/json');
            xhr.setRequestHeader('Access-Control-Allow-Origin', '*');
    
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

    getComments(url){
        return new Promise((resolve,reject)=>{
            let xhr = new XMLHttpRequest();

            xhr.open('GET', `http://localhost:3000/comments?url=${encodeURIComponent(url)}`, true);
            
            xhr.onreadystatechange = function() {
                if (xhr.readyState === 4) {
                    if(xhr.status === 200) {
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
            
            // Send the request
            xhr.send();
        });
    }

    postComments(url,payload,uuid = null){
        return new Promise((resolve, reject) => {
            let xhr = new XMLHttpRequest();
    
            xhr.open('POST', 'http://localhost:3000/comments', true);
            xhr.setRequestHeader('Content-Type', 'application/json');
            xhr.setRequestHeader('Access-Control-Allow-Origin', '*');
    
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
    
            xhr.send(JSON.stringify({ url: url, payload: payload, uuid: uuid }));
        });
    }
}


class Captcha{
    constructor(container,numAttempts){
        this.maxAttemps = numAttempts;
        this.captchaLength = 5;
        this.container = container;
        this.canvasId = 'captchaCanvas';

        this.render();
    }

    render(){
         // Create canvas element
        var canvas = document.createElement('canvas');
        canvas.id = this.canvasId;
        canvas.width = 200;
        canvas.height = 50;
        canvas.className = 'captchaCanvas';

        // Append canvas to container
        this.container.innerHTML = ''; // Clear existing content
        this.container.appendChild(canvas);

        let input = document.createElement('input');
        input.id = 'captchaInput';
        input.placeholder = 'Enter Captcha';

        this.container.appendChild(input);

        this.generateCaptcha();
    }

    generateCaptcha(){
        var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

        var captchaLength = this.captchaLength;

        this.captcha = '';
        for (var i = 0; i < captchaLength; i++) {
            var index = Math.floor(Math.random() * characters.length);
            this.captcha += characters[index];
        }

        // Draw CAPTCHA on canvas
        var canvas = document.getElementById('captchaCanvas');
        var ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.font = 'bold 30px Arial';
        ctx.fillStyle = '#000';
        ctx.fillText(this.captcha, 10, 35);

        // Add noise to the CAPTCHA
        for (var i = 0; i < 30; i++) {
            ctx.fillStyle = this.getRandomColor();
            ctx.fillRect(Math.random() * canvas.width, Math.random() * canvas.height, 1, 1);
        }
    }

    getRandomColor() {
        var letters = '0123456789ABCDEF';
        var color = '#';
        for (var i = 0; i < 6; i++) {
            color += letters[Math.floor(Math.random() * 16)];
        }
        return color;
    }

    getCaptcha() {
        return this.captcha;
    }

    validateCaptcha(input) {
        var userInput = input.value.trim();
        var captcha = this.getCaptcha();
        if (userInput === captcha) {
            return true;
        } else {
            return false;
        }
    }

}

window.onload = () => {
    // setTimeout(()=>{
        new Content();        
    // },100);
};