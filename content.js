//Content.js => Logic for page


class Content{
    constructor(){
        this.url = location;

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
            console.log('initting new instance');
        }
    }
}


class YoutubeInstance{
    constructor(){
        alert('test');
        this.videoElement = document.querySelector('.html5-video-container video');
        this.progressBar = document.querySelector('ytp-progress-bar');
        this.fetchVideo().then((data)=>{
            
        }).catch(()=>{
            console.warn('Can not initialze extension. Request to server failed.');
        });
    }


    //Get Content from video
    async fetchVideo(){
        return new Promise((resolve,reject)=>{
            let xhr = new XMLHttpRequest();

            xhr.open('GET', 'https://catfact.ninja/fact', true);
          
            xhr.onreadystatechange = function() {
              if (xhr.readyState === 4 && xhr.status === 200) {
                // Parse the JSON response
                let response = JSON.parse(xhr.responseText);
          
                console.log('Cat Fact:', response.fact);
                alert(response.fact);
                resolve(response);
              } else{
                  reject(`Error : ${xhr.status}`);
              }
            };
          
            // Send the request
            xhr.send();
        });
    }


}







let content = new Content();