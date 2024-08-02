import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword} from "https://www.gstatic.com/firebasejs/10.12.3/firebase-auth.js";
import { getFirestore, setDoc, doc} from 'https://www.gstatic.com/firebasejs/10.12.3/firebase-firestore.js';
import { app } from "./fire_initialize.js";


const signUp = document.getElementById("registerButton")
const pass_verify = document.querySelector('#password_verify');

if (signUp) {
  signUp.addEventListener('click', async (event) => {
    event.preventDefault();
    pass_verify.innerHTML = '';
    const email = document.getElementById("floatingInput").value;
    const password = document.getElementById("floatingPassword").value;
    const password2 = document.getElementById("floatingPassword2").value;

    const auth = getAuth(app);

    if (password === password2) {
      createUserWithEmailAndPassword(auth, email, password)
    .then( async (userCredential) => {
      const user = userCredential.user;

      // Add user data to Firestore
      const db = getFirestore(app);
      console.log(db);
      const newUserDoc = await setDoc(doc(db, "tables", user.uid),{
        tables: [],
      });
      console.log(newUserDoc);

      window.location.href = "login.html";
    })
    .catch((error) => {
      const errorCode = error.code;
      const errorMessage = error.message;
      console.log("User not created");
      // 
    });
    }

    else {

      pass_verify.innerHTML = "Passwords don't match.";

    }

  });
}

const logIn = document.getElementById("loginButton")
if (logIn) {
  logIn.addEventListener('click', (event) => {
    event.preventDefault();
    const email = document.getElementById("emailInput").value;
    const password = document.getElementById("passwordInput").value;
  
    const auth = getAuth(app);
  
    signInWithEmailAndPassword(auth, email, password)
    .then((userCredential) => {
      // Signed up 
      const user = userCredential.user;
      window.location.href = "tables_list.html";
      // ...
    })
    .catch((error) => {
      const errorCode = error.code;
      const errorMessage = error.message;
      console.log("User doesn't exist");
      // ..
    });
  })
}
