new Background();

class Background{
    constructor(){
        this.api = new BackgroundApi();
        this.settings = null;

        this.getSettings();
        this.listenForMessages();
    }

    async getSettings(){
        let uuid = chrome.localStorage.get('cbkey');

        if(!uuid){
            uuid = this.generateUUID();
            chrome.localStorage.set('cbkey',uuid);
        }

        await this.api.getUser(uuid).then((data)=>{
            this.settings = data.settings;
        }).catch((e)=>{
            console.error('Failed to get user/create user');
        });
    }

    listenForMessages(){
        chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
            if (message.request === "settings") {
                sendResponse(this.settings);
            }
        });        
    }
}


class BackgroundApi{
    constructor(){}
    /* 
        Returns User Account
        If uuid exists, returns existing record.
        If uuid doesn't exist, returns new reocrd.
    */
    getUser(uuid){
        
    }
}


