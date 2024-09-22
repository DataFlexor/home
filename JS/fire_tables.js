import { app } from './fire_initialize.js';
import { getFirestore, setDoc, doc, collection, getDocs, Timestamp } from 'https://www.gstatic.com/firebasejs/10.12.3/firebase-firestore.js';
import { getAuth, signOut } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-auth.js";

const db = getFirestore(app);
const auth = getAuth(app);


auth.onAuthStateChanged(user => {
    if (!user) {
        window.location = 'login.html';
    } else {

        const createTableButton = document.getElementById("create_table");

        if (createTableButton) {
            createTableButton.addEventListener('click', async (event) => {
              event.preventDefault();
          
              const defaultTableName = "Untitled Table"; // Default table name
          
              try {
                const tablesRef = collection(db, `tables`);
                const docRef = doc(tablesRef); // Firestore will generate a unique ID
          
                await setDoc(docRef, {
                  name: defaultTableName,
                  owner: user.uid,
                  collaborators: [],
                  date: Timestamp.now(),
                  lastAccessed: Timestamp.now(),
                });
          
                console.log("Table created successfully!");
          
                // After successfully setting the document, retrieve the document ID
                const docId = docRef.id;
          
                // Redirect to the table.html page with userId and docId parameters
                window.location.href = `./table.html?userId=${user.uid}&docId=${docId}`;
          
              } catch (error) {
                console.error("Error creating table: ", error);
              }
            });
          }
          
        const tableContainer = document.querySelector('#table_container');

        if (tableContainer) {
            // Clear existing table rows if any
            tableContainer.innerHTML = '';

            const tableRow = document.createElement('tr');  // Creating the table row
            tableRow.setAttribute('height', '50px') // put the height of the row in the tag
            tableRow.setAttribute('style', "border-bottom: 2px solid #dddddd;") // puts the style for the table row
            tableRow.innerHTML = `
                        <th class="fw-bold header-size noto-serif-ethiopic" style="width: 30%; padding-left: 20px;">Name of table</th>
                        <th class="fw-bold header-size noto-serif-ethiopic" style="width: 30%;">Owned By</th>
                        <th class="fw-bold header-size noto-serif-ethiopic" style="width: 20%;">Last Accessed</th>
                        <th class="fw-bold header-size noto-serif-ethiopic" style="width: 20%">Download</th>
                    `;  // putting the table headings into the table row
            tableContainer.appendChild(tableRow); // adding the table row to the table tag

            // Reference to the tables collection for the current user
            const tablesRef = collection(db, `tables`);
            const usersRef = collection(db, `users`);
            // Get all documents in the collection
            getDocs(tablesRef).then(querySnapshot => {
                querySnapshot.forEach(async doc => {

                    const tableData = doc.data();

                    if (tableData.owner === user.uid || tableData.collaborators.includes(user.uid)) {
                        const tableRow = document.createElement('tr');
                        const formattedDate = formatTimestamp(tableData.lastAccessed.toDate());
                        
                        const ownedBy = await retrieveEmail(usersRef, tableData);

                        tableRow.setAttribute('class', 'table-row');
                        tableRow.setAttribute('height', '40px');
                        
                        tableRow.innerHTML = `
                            <td style="padding-left: 20px">${tableData.name}</td>
                            <td>${ownedBy}</td>
                            <td>${formattedDate}</td>
                            <td>Icon/Download Link</td>
                        `;

                        // Append the row to the table container
                        tableContainer.appendChild(tableRow);
                        
                        tableRow.addEventListener('click', () => {
                            window.location.href = `./table.html?userId=${user.uid}&docId=${doc.id}`;
                        });
                    }
                });
            }).catch(error => {
                console.error("Error fetching tables: ", error);
            });
        }
        }
       
});

async function retrieveEmail(usersRef, tableData) {
    const querySnapshot = await getDocs(usersRef);
    let ownedBy = '';
    querySnapshot.forEach(doc => {
        const userEmails = doc.data();
        if (userEmails.uid === tableData.owner) {
            ownedBy = doc.id.split('@')[0];
        }
    });
    return ownedBy;
}


const signOutBtn = document.getElementById("signoutButton")
if (signOutBtn) {
    signOutBtn.addEventListener('click', async (event) => {
        event.preventDefault();
        signOut(auth).then(() => {
            window.location = 'index.html';
        }).catch((error) => {
            console.log("Error signing out:", error);
        });
    });
}


function formatTimestamp(timestamp) {
    const now = new Date();
    const secondsPast = (now.getTime() - timestamp.getTime()) / 1000;

    // If less than a minute ago
    if (secondsPast < 60) {
        return 'a few seconds ago';
    }
    // If less than an hour ago
    if (secondsPast < 3600) {
        const minutes = Math.round(secondsPast / 60);
        return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    }
    // If less than a day ago
    if (secondsPast < 86400) {
        const hours = Math.round(secondsPast / 3600);
        return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    }
    // If yesterday
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (timestamp.getDate() === yesterday.getDate()) {
        return 'yesterday';
    }
    // Otherwise, return the date
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return timestamp.toLocaleDateString(undefined, options);
}


const fontSizeBtn = document.getElementById("fontSize");
const upFont = document.getElementById("upFont");
const downFont = document.getElementById("downFont");

let fontSize = parseInt(fontSizeBtn.innerText);

upFont.addEventListener('click', () => {
    fontSize++;
    fontSizeBtn.innerText = fontSize;
})

downFont.addEventListener('click', () => {
    if (fontSize > 1) {     
    fontSize--;
    fontSizeBtn.innerText = fontSize;
    }
})

document.getElementById('color-hex').addEventListener('input', function() {
    const colorValue = this.value;
    const targetElement = document.getElementById('c1r1');
    
    targetElement.innerText = colorValue;
    targetElement.style.backgroundColor = colorValue;
});
