//Content.js => Logic for page


class Content{
    constructor(){
        this.url = window.location.href;

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
            let youtubeInstance = new YoutubeInstance();
        }
    }
}


class YoutubeInstance{
    constructor(){
        this.videoElement = document.querySelector('.html5-video-container video');
        this.progressBar = document.querySelector('.ytp-progress-bar');
        this.controlsContainer = document.querySelector('.ytp-left-controls');
        this.player = document.querySelector('#player');

        if(!this.progressBar || !this.videoElement || !this.controlsContainer){
            console.log('No Elements for Extension');
            return;
        } else {
            this.setupEvents();
            this.placeButtons();
            new MessagePanel(this.player);

            // this.fetchVideo().then((data)=>{
            //     this.setupVideo(data);
            //     new MessagePanel(this.player);
            // }).catch(()=>{
            //     console.log('Can not initialze extension. Request to server failed.');
            // });
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

    placeButtons(){
         // Check if the controls container exists
        if (this.controlsContainer) {

            let extensionControlsDiv = document.querySelector('.ytp-extension-controls');
            
            if(!extensionControlsDiv){
                // Create a new div for the extension controls
                extensionControlsDiv = document.createElement('div');
                extensionControlsDiv.className = 'ytp-extension-controls';
            } else {
                extensionControlsDiv.innerHTML = "";
            }

            // Create a plus icon element (you may need to replace this with your desired icon)
            let plusIcon = document.createElement('div');
            plusIcon.className = 'plus-icon'; // You can customize this class for styling
            plusIcon.innerHTML = '&#x2795;'; // You can replace this with an actual icon or use an <img> tag
            
            // Append the plus icon to the extension controls div
            extensionControlsDiv.appendChild(plusIcon);
            this.controlsContainer.appendChild(extensionControlsDiv);


            plusIcon.addEventListener('click',()=>{
                this.placeMarker(this.videoElement.currentTime);
            });
        }
    }

    placeMarker(currentTime){
        let leftPercentage = this.convertTimeToPercent(currentTime);

        let marker = document.createElement('div');
        marker.className = 'marker';
        marker.style.left = leftPercentage + '%';


        console.log(leftPercentage);

        this.progressBar.appendChild(marker);
    }

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
}

class MessagePanel{
    constructor(playerContainer,data=null){
        this.playerContainer = playerContainer;
        this.data = data;
        this.render();
    }

    render(){
        let messagePanelContainer = document.createElement('div');
        messagePanelContainer.className = 'message-panel';

        messagePanelContainer.innerHTML = `

                <div class="dragger">\u2630</div>
                <div class="container">
                    <div class="item"></div>
                    <div class="item"></div>
                    <div class="item"></div>
                </div>
        
        `;

        document.body.append(messagePanelContainer);
        this.makeDraggable(messagePanelContainer);
    }

    makeDraggable(el){
        let isDragging = false;
        let offsetX, offsetY;
        el.addEventListener('mousedown', (e) => {
            isDragging = true;
            offsetX = e.clientX - el.getBoundingClientRect().left;
            offsetY = e.clientY - el.getBoundingClientRect().top;
            el.style.cursor = 'grabbing';
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;

            const x = e.clientX - offsetX;
            const y = e.clientY - offsetY;

            el.style.left = `${x}px`;
            el.style.top = `${y}px`;
        });

        document.addEventListener('mouseup', () => {
            isDragging = false;
            el.style.cursor = 'grab';
        });
    }

    expand(el,width){
        el.style.width = width;
    }

}

window.onload = () => {
    setTimeout(()=>{
        new Content();        
    },5000);
};