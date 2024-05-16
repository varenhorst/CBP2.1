



class AccountPage{
	constructor(){
		this.setUpEvents();
		this.container = document.querySelector('#choice-container');
	}

	setUpEvents(){
		this.captchaChoice = document.querySelector('#captcha-user-choice');
		// this.userChoice = document.querySelector('#user-choice');

		// this.userChoice.addEventListener('click',()=>{
		// 	this.showUserForm();
		// });

		this.captchaChoice.addEventListener('click',()=>{
			this.notifyBackgroundOfCaptchaUser('captcha');
		});
	}

	notifyBackgroundOfCaptchaUser(choice){
		chrome.runtime.sendMessage({type:'captchaUser'},(response)=> {
		  	console.log("Received response from background script:", response);


		  	console.log(response);
			if(response.response.status === 'success'){
				this.showUserCompleted('Captcha');
			}
		});
	}

	notifyBackgroundOfSignUp(username,email){
		chrome.runtime.sendMessage({type:'signUp',data: {username:username, email:email}},(response)=> {
		  	console.log("Received response from background script:", response);

			if(response.response.status === 'success'){
				//Show email verification
				this.promptForEmailVerification();
			} else {
				if(Object.keys(response.response).includes('error')){
					alert(response.response.error);
				}
			}


			//hide any loaders
		});
	}

	showUserCompleted(type){
		let html = `
		<div class="user-created-message">
			<div class="user-created-title">${type} account has been created 
			</div>
			<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" enable-background="new 0 0 64 64"><path d="M32,2C15.431,2,2,15.432,2,32c0,16.568,13.432,30,30,30c16.568,0,30-13.432,30-30C62,15.432,48.568,2,32,2z M25.025,50  l-0.02-0.02L24.988,50L11,35.6l7.029-7.164l6.977,7.184l21-21.619L53,21.199L25.025,50z" fill="#43a047"/></svg>
		</div>`;

		this.container.innerHTML += html;
	}

	showUserForm(){
		let html = `
		<div class="user-created-message">
			<div class="user-created-title">Create your account or <span id="newUserSignIn">Sign in</span></div>

			<div class="form-container">
			    <form action="#" method="post" id="newUserForm">
			        <div class="form-group">
			            <label for="username">Username:</label>
			            <input type="text" id="username" name="username" required>
			        </div>
			        <div class="form-group">
			            <label for="email">Email:</label>
			            <input type="email" id="email" name="email" required>
			        </div>
			        <div class="form-group" id="submitNewUserButton">
			            <input type="submit" value="Sign Up">
			        </div>
			    </form>
			</div>
		</div>`;

		this.container.innerHTML += html;

		let form = document.querySelector('#newUserForm');	
		let newUserSubmitButton = document.querySelector('#submitNewUserButton');

		form.addEventListener('submit',(e)=>{
			e.preventDefault();
			const formData = new FormData(form);

			const userName = formData.get('username');
			const email = formData.get('email');

			//show loader
			this.notifyBackgroundOfSignUp(userName,email);
		});
	}

	promptForEmailVerification(){
		this.container.innerHTML += `
		<div class="user-created-message">
			<div class="user-created-title">Account has been created. Please click the verification link sent to your email.</div>
		</div>`
	}
}


window.onload = ()=>{
	new AccountPage();
}