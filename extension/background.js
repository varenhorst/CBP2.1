const keyName = 'c-b-key';


class PermissionClass{
	constructor(){
		this.api = new BackgroundApi();
		this.tabId = null;
		this.key = null;
		this.permissions = {
			access:false,
			uuid: null
		};

		this.verifyKey();
		this.setupListeners();
	}

	setupListeners(){
		// Listen for messages sent from content scripts
		chrome.runtime.onMessage.addListener((message, sender, sendResponse)=> {
			if(message.type === 'captchaUser'){
				this.setupCaptchaUser().then((data)=>{
					sendResponse({response: data});
				});
			} else if(message.type === 'signUp'){
				let userData = message.data;
				this.setupUserAccount(userData).then((data)=>{
					sendResponse({response: data});
				});
			} else if(message.type === 'getPermissions'){
				this.getPermissions().then((data)=>{
					sendResponse({response: data});
				});
			}
			return true;
		});
	}

	setupCaptchaUser(){
		let uuid = this.generateUUID();

		return new Promise((resolve,reject)=>{
			this.createCaptchaAccount(uuid).then((data)=>{
				chrome.storage.local.set({"c-b-key":uuid});
				this.key = uuid;
				if(this.tabId){
					chrome.tabs.remove(this.tabId);
				}
				this.permissions['uuid'] = uuid;
				this.permissions['access'] = true;
				resolve(data);
			}).catch((data)=>{
				console.log(data);
				reject(data);
			});
		});
	}

	setupUserAccount(userData){
		let uuid = this.generateUUID();
		return new Promise((resolve,reject)=>{
			this.createUserAccount(uuid,userData.username,userData.email).then((data)=>{
				resolve(data);
			}).catch((data)=>{
				reject(data);
			});
		});
	}

	verifyKey(){
		chrome.storage.local.get(["c-b-key"]).then((result) => {
			if(!result || Object.keys(result).length === 0){
				chrome.tabs.create({url:chrome.runtime.getURL('accounts.html'),active:true},(tab)=>{
					this.tabId = tab.id;
				});
			} else {
				this.key = result['c-b-key'];
				//Validate key against the database
				if(this.api.verifyKeyAgainstRecords(result['c-b-key'])){
					this.permissions['uuid'] = result['c-b-key'];
					this.permissions['access'] = true;
				} else {
					this.permissions['uuid'] = result['c-b-key'];
					this.permissions['access'] = false;
				}
			}
		}); 
	}

	generateUUID(){
		let uuid = crypto.randomUUID();

		return uuid;
	}

	getPermissions(){
		return new Promise((resolve,reject)=>{
			resolve(this.permissions);
		});
	}

	createCaptchaAccount(uuid){
		return new Promise((resolve,reject)=>{
			this.api.createCaptchaAccount(uuid).then((data)=>{
				resolve(data);
			}).catch((data)=>{
				reject(data);
			})
		})
	}

	createUserAccount(uuid,username,email){
		return new Promise((resolve,reject)=>{
			this.api.createUserAccount(uuid,username,email).then((data)=>{
				resolve(data);
			}).catch((data)=>{
				reject(data);
			})
		})
	}
}


class Emailer{
	constructor(email){
		this.email = email;
	}

	sendEmail(username,email){

		//send email to user with verification key locahost/user/KEY.com
	}
}


class BackgroundApi{
	constructor(){
	}

	createCaptchaAccount(uuid){
		return new Promise((resolve,reject)=>{
			fetch('http://localhost:3000/captchaUser', {
				method: 'POST',
				headers: {
					'Access-Control-Allow-Origin': '*',
					'Content-Type': 'application/json'
				},

				body: JSON.stringify({uuid:uuid})
		    }).then(res => {
		    	resolve(res.json());
		    }).catch(res => {
				reject('test');
		    })
		});
	}

	createUserAccount(uuid,username,email){
		return new Promise((resolve,reject)=>{
			fetch('http://localhost:3000/createUser', {
				method: 'POST',
				headers: {
					'Access-Control-Allow-Origin': '*',
					'Content-Type': 'application/json'
				},

				body: JSON.stringify({uuid:uuid,username:username,email:email})
		    }).then(res => {
		    	resolve(res.json());
		    }).catch(res => {
				reject('test');
		    })
		});
	}

	//Check if user with UUID exists
	//If exists return true, if not return false
	verifyKeyAgainstRecords(uuid){
		return true;
	}
}


console.log("Background script loaded!");

new PermissionClass();