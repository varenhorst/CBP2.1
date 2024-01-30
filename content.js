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
        this.fetchVideo();
    }

    async fetchVideo(){
        let xhr = new XMLHttpRequest();

        // Configure it: GET-request for the URL
        xhr.open('GET', 'https://catfact.ninja/fact', true);
      
        // Setup a callback function to handle the response
        xhr.onreadystatechange = function() {
          // Check if the request is complete (readyState 4) and if the status is OK (status 200)
          if (xhr.readyState === 4 && xhr.status === 200) {
            // Parse the JSON response
            let response = JSON.parse(xhr.responseText);
      
            // Log the cat fact to the console (you can do whatever you want with the data here)
            console.log('Cat Fact:', response.fact);
            alert(response.fact);
          }
        };
      
        // Send the request
        xhr.send();
    }

    



}







let content = new Content();