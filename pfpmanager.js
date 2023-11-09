const users = JSON.parse(localStorage.getItem("users")) || [];

const signUpForm = document.getElementById("signup-form");
const signInForm = document.getElementById("signin-form");
const profile = document.getElementById("profile");
const profileUsername = document.getElementById("profile-username");

const signUpButton = document.getElementById("button");
const signInButton = document.getElementById("sign-in-button");
const signoutButton = document.getElementById("logout-button");

// Load user data on page load
loadUserData();

signUpButton.addEventListener("click", () => {
    const username = document.getElementById("email").value;
    const password = document.getElementById("passwordtwo").value;

    // Check if the username is not taken
    if (!users.some(user => user.username === username)) {
        users.push({ username, password });
        updateUserData();
        alert("Sign up successful!");
        showProfile(username);
    } else {
        alert("Username is already taken.");
    }

    signUpForm.reset();
});

signInButton.addEventListener("click", () => {
    const username = document.getElementById("sign-in-username").value;
    const password = document.getElementById("sign-in-password").value;

    const user = users.find(u => u.username === username && u.password === password);
    if (user) {
        showProfile(user.username);
    } else {
        alert("Invalid username or password.");
    }

    signInForm.reset();
});

signoutButton.addEventListener("click", () => {
    profile.classList.add("hidden");
});

function showProfile(username) {
    profileUsername.textContent = username;
    profile.classList.remove("hidden");
}

function updateUserData() {
    localStorage.setItem("users", JSON.stringify(users));
}

function loadUserData() {
    const savedUsers = JSON.parse(localStorage.getItem("users"));
    if (savedUsers) {
        users.push(...savedUsers);
    }
}
