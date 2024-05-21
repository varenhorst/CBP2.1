class Content{
    constructor(){
        this.instance = null;
        this.previousUrl = null;
        this.settings = null;
        this.currentUrl = window.location.href;

        this.initializeApp();
    }

    initializeApp(){
        chrome.runtime.sendMessage({request: "settings"}, function(response) {
            this.settings = response;
            if(!this.settings){return false;} // failed to setup application
            this.determineInstance();
            this.listenForLocationChange();
        });
    }

    listenForLocationChange(){
        navigation.addEventListener("navigate", e => {
            this.previousUrl = this.currentUrl;            
            this.currentUrl = e.destination.url;

            if(!this.instance){
                this.determineInstance();
            } else {
                this.instance.update(this.currentUrl,this.previousUrl);
            }
        });
    }

    determineInstance(){
        if(this.currentUrl.contains('youtube')){
            this.instance = new YoutubeInstance(this);
        } else {
            this.instance = new StandardInstance(this);
        }
    }
}

const videoElementClass = '.html5-video-container video';
const progressBarClass = '.ytp-progress-bar';
const playerClass = '#player';
//TODO: FADED TEXT ON VIDEO ELEMENTS
class YoutubeInstance{
    constructor(Content){
        this.Content = Content; //Content
        this.settings = Content.settings; //App Settings
        this.helper = new Helper(); //Helper function
        this.api = new CheeseBlockApi(this.settings.uuid); //API
        this.panel = null; // Panel Class

        this.findElements().then(()=>{
            this.init();       
        }).catch(()=>{
            helper.showErrorMessage('CheeseBlock can not initialize on this page.');
        });      
    }

    //url changes
    update(previousUrl,newUrl){
        this.uploadSkips(previousUrl);
        this.updatePanel(newUrl);
        this.setElements();
        this.generateHeatmap(newUrl,true);
    }

    findElements(){
        let attemptCount = 0;

        return new Promise((resolve,reject)=>{
            let interval = setInterval(()=>{
                let video = document.querySelector(videoElementClass);
                if(video !== null){
                    resolve();
                    clearInterval(interval);
                }
                if(attemptCount >= 10){
                    reject();
                }
            },1000)
        })
    }

    setElements(){
        this.videoElement = document.querySelector(videoElementClass);
        this.progressBar = document.querySelector(progressBarClass);
        this.player = document.querySelector(player);
    }

    init(){
        this.setElements();
        this.setupEvents();
        this.generateHeatmap(this.Content.currentUrl);
        this.createNewPanel();
    }

    setupEvents(){
        
    }

    generateHeatmap(url,isUpdate = false){
        if(isUpdate){
            document.getElementById('heatmapCheeseBlock') && document.getElementById('heatmapCheeseblock').remove();
        }
        if(this.settings.ShowHeatMap){
            this.api.getTimes(url).then((values)=>{
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
            }).catch((e)=>{
                this.helper.showErrorMessage('Error Generating Heatmap')
            });
        }
    }

    createNewPanel(){
        this.panel = new Panel(this,this.player);
    }

    updatePanel(url){
        this.panel.clear();
        this.panel.update(url);
    }
}

class Panel{
    constructor(instance,player){
        this.instance = instance;
        this.player = player;
        this.initDom();
        this.setupEvents();

        this.container = null;
        this.playerIcon = null;
    }

    initDom(){
        //Define Panel element and append to player
        let html = `
        <div class="cb-panel">
            <div class="comments-container">
            </div>
        </div>
        `;

        //comment element
    //     <div class="cb-comment">
    //     <div class="cb-comment-info">
    //       10:20
    //     </div>
    //     <div class="cb-comment-text">
    //       test Comments here asdasd asd asd 
    //     </div>
    //   </div>
        
        this.player.insertAdjacentHTML('beforend',html);
        this.container = document.querySelector('.cb-player-panel');
        this.playerIcon = document.querySelector('.cb-player-icon');

        this.update(this.instance.Content.currentUrl);
    }

    renderData(data){
        renderComments(data.comments);
        renderSlices(data.slices);
    }

    renderComments(comments){

    }

    renderSlices(slices){
        
    }

    setupEvents(){
        
    }

    update(url,filters = null){
        this.instance.helper.showLoader(this.container,'Loading..');
        // let payload = {url:url,filters:filters}
        
        this.instance.api.getPanelData(url).then((data)=>{
            this.instance.helper.hideLoader();
            this.renderData(data);
        }).catch((e)=>{
            this.instance.helper.showErrorMessage('Error updating panel');
            this.instance.helper.hideLoader();
        });
    }

    clear(){
        
    }
}

class StandardInstance{
    constructor(Content){
        this.Content = Content;
        this.settings = Content.settings;
    }
}

class CheeseBlockApi{
    constructor(uuid){
        this.uuid = uuid; //store uuid for api
    }

    //returns comments and slices;
    getPanelData(url){
        return new Promise((resolve,reject)=>{
            let xhr = new XMLHttpRequest();

            xhr.open('GET',`http://127.0.0.1:5000/panelData?url=${encodeURIComponent(url)}?uuid=${uuid}`);

            xhr.onreadystatechange = function() {
                if(xhr.readyState === 4){
                    if(xhr.status === 200){
                        let response = JSON.parse(xhr.response);
                        resolve(response);
                    } else {
                        reject(`Error: ${xhr.status}`);
                    }
                }
            }
        });
    }

    postComments(url,payload){
        
    }

    postSlice(url,payload){
        
    }

    getTimes(url){
        return new Promise((resolve,reject)=>{
            let xhr = new XMLHttpRequest();

            xhr.open('GET',`http://127.0.0.1:5000/times?url=${encodeURIComponent(url)}`);

            xhr.onreadystatechange = function() {
                if(xhr.readyState === 4){
                    if(xhr.status === 200){
                        let response = JSON.parse(xhr.response);
                        resolve(response);
                    } else {
                        reject(`Error: ${xhr.status}`);
                    }
                }
            }
        });
    }

    postTimes(){

    }
}

class Helper{
    constructor(){
            
    }   
    
    showErrorMessage(message){
        alert(message);
    }

    showLoader(container,message){
        let defaultLoaderClass = '.cheeseBlockLoader';

        let html = `
            <div class="${cheeseBlockLoader}">
                <!-- Loader Icon -->
            </div>
        `
    }

    hideLoader(){

    }
}