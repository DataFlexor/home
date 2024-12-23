import { app } from './fire_initialize.js';
import { getFirestore, doc, setDoc, getDoc, updateDoc, deleteField, arrayUnion, Timestamp, onSnapshot } from 'https://www.gstatic.com/firebasejs/10.12.3/firebase-firestore.js';
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-auth.js";
import { drawGraph, dragElement} from './graphs.js';

const db = getFirestore(app);
const auth = getAuth(app);

const chooseRowCol = document.getElementById('choose-row-col');
const sendLayoutBtn = document.getElementById('send-layout');
const newTableDiv = document.getElementById('new-table');
const titleInput = document.getElementById('main-title');
const individualTableName = document.getElementById('individualTableName');
const profileBtn = document.getElementById("profileButton")


let numRows = 1;
let numCols = 1;
let autoSaveTimeout = null;
let activeCell = null;

document.addEventListener('DOMContentLoaded', () => {
  auth.onAuthStateChanged(async user => {
    if (!user) {
      window.location = 'login.html';
      return;
    }

    const urlParams = new URLSearchParams(window.location.search);
    const userId = urlParams.get('userId');
    const docId = urlParams.get('docId');

    if (!userId || !docId) {
      console.error('userId or docId is missing or invalid.');
      return;
    }

    const tableRef = doc(db, `tables`, docId);

    try {
      const docSnapshot = await getDoc(tableRef);
      if (docSnapshot.exists()) {
        const tableData = docSnapshot.data();

        if ((user.uid !== tableData.owner) && !(tableData.collaborators.includes(user.uid))) {
          window.location = 'restricted.html';
          return;
        }

        titleInput.value = tableData.name;
        if (tableData && tableData.tables && Object.keys(tableData.tables).length > 0) {
          const tableNames = Object.keys(tableData.tables);
          tableNames.forEach(tableName => {
            displayTable(tableData.tables[tableName].data, tableName);
          });
        } else {
          displayNoTablesMessage();
        }
      } else {
        console.error('Document does not exist');
        displayNoTablesMessage(); // Show a message if the document itself doesn't exist
      }
    } catch (error) {
      console.error('Error fetching table document: ', error);
      displayNoTablesMessage();
    }
    if (profileBtn) {
      profileBtn.addEventListener('click', async (event) => {
          event.preventDefault();
          window.location = 'profile.html';
      });
    }
  });

  function displayNoTablesMessage() {
    newTableDiv.innerHTML = '<p>No tables available! Create a new table to continue.</p>';
  }

  sendLayoutBtn.addEventListener('click', async () => {
    chooseRowCol.style.display = 'none';
    numRows = parseInt(document.getElementById('rows').value) || 1;
    numCols = parseInt(document.getElementById('columns').value) || 1;
    const tableName = individualTableName.value || `table-${Date.now()}`;

    const urlParams = new URLSearchParams(window.location.search);
    const docId = urlParams.get('docId');

    const tableRef = doc(db, `tables`, docId);

    const docSnapshot = await getDoc(tableRef);
    if (docSnapshot.exists()) {
        const tablesMap = docSnapshot.data().tables;

        // Check if the tableName already exists in the tables map
        if (tablesMap && tablesMap.hasOwnProperty(tableName)) {
            // If the table name exists, show an alert or handle the logic accordingly
            alert('This table name already exists. Please choose a different name.');
            document.getElementById('rows').value = '';
            document.getElementById('columns').value = '';
            individualTableName.value = "";
            return; // Exit the function to prevent table creation
        } else {
          createTable(numRows, numCols, tableName);
          addAutoSaveListeners();
        }
      }
    
    // createWindows(tableName);
    // Add event listeners to each input for auto-save
    document.getElementById('rows').value = '';
    document.getElementById('columns').value = '';
    individualTableName.value = "";
  });

  $('#sendCollab').click(function () {
    $('#share-menu').hide();
    shareTable();
  });

  $(document).ready(function() {
    // Show the share menu
    $('#shareBtn').click(function(e) {
      e.stopPropagation(); // Prevent click event from bubbling up to document
      // Close the new table menu if it's open
      $('#graph-popup').hide();
      $('#choose-row-col').hide();
      $('#share-menu').toggle();
    });
  
    // Show the new table menu
    $('#new-table-btn').click(function(e) {
      e.stopPropagation(); // Prevent click event from bubbling up to document
      // Close the share menu if it's open
      $('#graph-popup').hide();
      $('#share-menu').hide();
      $('#choose-row-col').toggle();
    });

    $('#graph-popup-x').click(function(e) {
      e.stopPropagation();
      $('#graph-popup').hide();
      if ( $('#graph-popup').is(":hidden")) {
        $('#graph-popup').css({
          'top': '50vh',
          'left': '50vw'
        })
      }
    });

    $('#change-graph-btn').click(function(e) {
      e.stopPropagation(); // Prevent click event from bubbling up to document
      // Close the share menu if it's open
      $('#choose-row-col').hide();
      $('#share-menu').hide();
      $('#graph-popup').show();
      $('#draggable-graph-menu').toggle();
    });

    // Hide the open menu when clicking outside of it
    $(document).click(function(e) {
      if (!$(e.target).closest('#share-menu, #shareBtn').length) {
        $('#share-menu').hide();
      }
      if (!$(e.target).closest('#choose-row-col, #new-table-btn').length) {
        $('#choose-row-col').hide();
      }
      if (!$(e.target).closest('#draggable-graph-menu, #change-graph-btn').length) {
        $('#draggable-graph-menu').hide();
      }
    });
  });
});


function createTable(rows, cols, tableName) {
  const tableWrapper = document.createElement("div")
  tableWrapper.classList.add('single-table-wrapper');
  tableWrapper.id = `container-${tableName}`;

  const table = document.createElement('table');
  table.classList.add('table-container');
  table.id = tableName; // Use the provided table name

  for (let i = 0; i < rows; i++) {
    const row = document.createElement('tr');

    for (let j = 0; j < cols; j++) {
      const cell = document.createElement('td');
      const input = document.createElement('input');

      // Set the first cell to an editable table name
      if (i === 0 && j === 0) {
        input.setAttribute('type', 'text');
        input.value = tableName;
        input.classList.add('table-name-input');
        input.disabled = true;
      } else {
        input.setAttribute('type', (i === 0 || j === 0) ? 'text' : 'text');
      }

      cell.appendChild(input);
      row.appendChild(cell);
    }
    table.appendChild(row);
  }

  const addRowButton = document.createElement('button');
  addRowButton.textContent = '+ Row';
  addRowButton.classList.add('add-row-btn');
  addRowButton.addEventListener('click', () => addRow(tableName));

  const removeRowButton = document.createElement('button');
  removeRowButton.textContent = '- Row';
  removeRowButton.classList.add('remove-row-btn');
  removeRowButton.addEventListener('click', () => removeRow(tableName));

  const addColButton = document.createElement('button');
  addColButton.textContent = '+ Col';
  addColButton.classList.add('add-col-btn');
  addColButton.addEventListener('click', () => addColumn(tableName));

  const removeColButton = document.createElement('button');
  removeColButton.textContent = '- Col';
  removeColButton.classList.add('remove-col-btn');
  removeColButton.addEventListener('click', () => removeColumn(tableName));

  // use tableName to put the single table name into the left menu
  tableWrapper.appendChild(addColButton);
  tableWrapper.appendChild(removeColButton);
  tableWrapper.appendChild(addRowButton);
  tableWrapper.appendChild(removeRowButton);
  tableWrapper.appendChild(table);
  
  newTableDiv.appendChild(tableWrapper);
  newTableDiv.style.display = 'block';

  addTableButton(tableName);
  addAutoSaveListeners();
  saveTableData();
}


function addAutoSaveListeners() {
  const inputs = newTableDiv.querySelectorAll('input');
  inputs.forEach(input => {
    input.addEventListener('input', handleInputChange);
  });
}

function handleInputChange() {
  if (autoSaveTimeout) clearTimeout(autoSaveTimeout);
  autoSaveTimeout = setTimeout(async () => {
    try {
      await saveTableData();
      await updateLastAccessed();
    } catch (error) {
      console.error('Error during save or update:', error);
    }
  }, 500); 
}

async function updateLastAccessed() {
  try {
    const user = auth.currentUser;
    if (!user) {
      console.error('User not authenticated');
      return;
    }

    const urlParams = new URLSearchParams(window.location.search);
    const docId = urlParams.get('docId');

    if (!docId) {
      console.error('Document ID is missing');
      return;
    }

    const tableRef = doc(db, `tables`, docId);

    await updateDoc(tableRef, {
      lastAccessed: Timestamp.now(),
    });

    console.log('lastAccessed updated successfully');
  } catch (e) {
    console.error('Error updating lastAccessed: ', e);
  }
}

async function saveTableData() {
  try {
    const user = auth.currentUser;
    if (!user) {
      console.error('User not authenticated');
      return;
    }

    const urlParams = new URLSearchParams(window.location.search);
    const docId = urlParams.get('docId');

    if (!docId) {
      console.error('Document ID is missing');
      return;
    }

    const tableRef = doc(db, `tables`, docId);

    const tableDataObject = {
      name: titleInput.value || "Untitled Table",
      tables: {}
    };

    // rest of the table data
    const tableElements = newTableDiv.querySelectorAll('table');
    tableElements.forEach(tableElement => {
      const tableName = tableElement.id;
      const individualTableData = {
        individualTableName: tableName,
        id: docId,
        data: [],
        headers: []
      };

      // just to save rows and columns
      const rows = tableElement.querySelectorAll('tr');
      rows.forEach((row, rowIndex) => {
        const cells = row.querySelectorAll('td');
        cells.forEach((cell, colIndex) => {
          const input = cell.querySelector('input');
          if (input) {
            const hexColor = input.style.color || 'rgb(0, 0, 0)';
            const cellData = {
              text: input.value || '',
              row: rowIndex + 1, // Adjust for 1-based indexing
              column: colIndex + 1, // Adjust for 1-based indexing
              color: hexColor,
            };
            individualTableData.data.push(cellData);
            if (rowIndex === 0) {
              individualTableData.headers[colIndex] = input.value;
            }
          }
        });
      });

      tableDataObject.tables[tableName] = individualTableData;
    });

    // this line puts all of the arrays into the firebase document
    await setDoc(tableRef, tableDataObject, { merge: true });

    console.log('Table data saved successfully');
  } catch (e) {
    console.error('Error saving table data: ', e);
  }
}

titleInput.addEventListener('input', handleInputChange);

function displayTable(tableData, tableName) {
  const tableWrapper = document.createElement("div")
  tableWrapper.classList.add('single-table-wrapper');
  tableWrapper.id = `container-${tableName}`;

  const tableElement = document.createElement('table');
  tableElement.classList.add('table-container');
  tableElement.id = tableName; // Set the ID to the table name
  tableElement.style.display = 'block';

  let maxRow = 0;
  let maxCol = 0;

  tableData.forEach(cellData => {
    if (cellData.row > maxRow) maxRow = cellData.row;
    if (cellData.column > maxCol) maxCol = cellData.column;
  });

  for (let i = 1; i <= maxRow; i++) {
    const row = document.createElement('tr');

    for (let j = 1; j <= maxCol; j++) {

      const cell = document.createElement('td');
      const input = document.createElement('input');
      input.setAttribute('type', 'text');
      
      const cellData = tableData.find(cell => cell.row === i && cell.column === j);
      if (cellData) {
        input.value = cellData.text;
        input.style.color = cellData.color || 'rgb(0, 0, 0)';
        input.dataset.color = cellData.color || 'rgb(0, 0, 0)';
      } else {
        input.value = '';
        input.dataset.color = 'rgb(0, 0, 0)';
        input.dataset.color = 'rgb(0, 0, 0)';
      }

      input.addEventListener('focus', () => {
        activeCell = input;
      });

      cell.appendChild(input);
      row.appendChild(cell);
    }

    tableElement.appendChild(row);
  }


  const firstRow = tableElement.querySelector('tr');
  const firstCell = firstRow ? firstRow.querySelector('td') : null;
  
  if (firstCell) {
    firstCell.innerHTML = ''; // Clear any existing content
    const input = document.createElement('input');
    input.setAttribute('type', 'text');
    input.disabled = true;
    input.value = tableName;
    input.classList.add('table-name-input');
    firstCell.appendChild(input);
  }
  const addRowButton = document.createElement('button');
  addRowButton.textContent = '+ Row';
  addRowButton.classList.add('add-row-btn');
  addRowButton.addEventListener('click', () => addRow(tableName));

  const removeRowButton = document.createElement('button');
  removeRowButton.textContent = '- Row';
  removeRowButton.classList.add('remove-row-btn');
  removeRowButton.addEventListener('click', () => removeRow(tableName));

  const addColButton = document.createElement('button');
  addColButton.textContent = '+ Col';
  addColButton.classList.add('add-col-btn');
  addColButton.addEventListener('click', () => addColumn(tableName));

  const removeColButton = document.createElement('button');
  removeColButton.textContent = '- Col';
  removeColButton.classList.add('remove-col-btn');
  removeColButton.addEventListener('click', () => removeColumn(tableName));

  // use tableName to put the single table name into the left menu
  tableWrapper.appendChild(addColButton);
  tableWrapper.appendChild(removeColButton);
  tableWrapper.appendChild(addRowButton);
  tableWrapper.appendChild(removeRowButton);
  tableWrapper.appendChild(tableElement);
  
  newTableDiv.appendChild(tableWrapper);
  // newTableDiv.appendChild(tableElement);

  addTableButton(tableName);
  addAutoSaveListeners();
}

const pickr = Pickr.create({
  el: '#color-picker',
  theme: 'classic', // or 'monolith', or 'nano'
  useAsButton: true,
  position: 'bottom-start',
  components: {
    hue: true,

    // Input / output Options
    interaction: {
      hex: true,
      input: true,
    },
  },
});

document.querySelector('#color-picker').addEventListener('click', () => {
  if (!activeCell) {
    console.log('No cell selected');
    return;
  }
  pickr.show();
});

pickr.on('change', async (color) => {
  if (!activeCell) {
    console.log('No cell selected');
    return;
  }

  const selectedColor = color.toHEXA().toString(); // Get selected color in HEX
  activeCell.style.color = selectedColor; // Update active cell color
  activeCell.dataset.color = selectedColor; // Store color for Firebase

  try {
    await saveTableData();
    console.log('Color change saved successfully');
  } catch (err) {
    console.log('Error saving color change:', err);
  }
});

document.querySelector('#italicButton').addEventListener('click', () => {
  if (!activeCell) {
    console.log('No cell selected');
    return;
  }
  activeCell.style.fontStyle = 'italic';
});

document.querySelector('#boldButton').addEventListener('click', () => {
  if (!activeCell) {
    console.log('No cell selected');
    return;
  }
  activeCell.style.fontWeight = 'bold';
});


async function shareTable() {
  const email = $('#single-collab').val(); // get the value from the input
  if (!email) {  // check if the value is empty
    console.error('No email provided');
    return;
  }

  const urlParams = new URLSearchParams(window.location.search); // get the userid and docid from the link
  const userId = urlParams.get('userId'); // store the userid from link
  const docId = urlParams.get('docId'); // store docid from link

  if (!docId) {  // check if the doc is wrong (unlikely)
    console.error('Document ID is missing');
    return;
  }

  const tableRef = doc(db, `tables`, docId); 
  

  try {
    const userSnapshot = await getDoc(doc(db, 'users', email)); // get all the way in the email values
    if (!userSnapshot.exists()) {  // if the email doc doesn't exists do this
      console.error('User with the provided email does not exist');
      return;
    }

    const collaboratorUid = userSnapshot.data().uid; // get the uid from email doc

    await updateDoc(tableRef, {  // enter the uid from the line above into the array of collaborators updating not replacing
      collaborators: arrayUnion(collaboratorUid) // arrayUnion basically says to put the value in the array if there are no duplicates
    });

    console.log('Collaborator added successfully');
    $('#single-collab').val(''); // Clear the input after successful sharing
  } catch (error) {
    console.error('Error adding collaborator: ', error); // error if not successful
  }
}

function addTableButton(tableName) {

  const urlParams = new URLSearchParams(window.location.search);
  const docId = urlParams.get('docId');

  const modalSheet = document.getElementById("sideBarMenuSingleTable");

  const newButton = document.createElement('button');
  newButton.classList.add('tab-border');
  newButton.textContent = tableName;

  newButton.addEventListener('click', () => {
    const table = document.getElementById(`container-${tableName}`);
    if (table) {
      table.style.display = table.style.display === 'none' ? 'block' : 'none';
    }
  });

  newButton.addEventListener('contextmenu', function(e) {
    e.preventDefault();
    e.stopPropagation();

    const existingMenu = document.getElementById('button-rightclick-menu');
    if (existingMenu) {
      existingMenu.remove();
    };

    const customMenu = document.createElement('div');
    customMenu.setAttribute('id', 'button-rightclick-menu')
    customMenu.innerHTML = 
    `<ul class="list-group" style="border: none; text-decoration: none">
      <li id="renameSingleTable" class="list-group-item" >Rename</li>
      <li id="graphSingleTable" class="list-group-item" >Graph</li>
      <li id="deleteSingleTable" class="list-group-item" style="border: none;">Delete</li>
    </ul>
    `
    customMenu.style.position = 'absolute';
    customMenu.style.left = e.clientX + 'px';
    customMenu.style.top = e.clientY + 'px';
    customMenu.style.border = '1px solid #ccc';
    customMenu.style.zIndex = '1000';

    document.body.appendChild(customMenu);

    // rename a table
    const renameButton = document.getElementById('renameSingleTable');
    renameButton.addEventListener('click', async function() {
      const newName = prompt('Enter new table name: ', tableName);
      if (newName && newName !== tableName) {
        try {
          const tableDocRef = doc (db, `tables`, docId);
          const tableDocSnap = await getDoc(tableDocRef);

          if (tableDocSnap.exists()) {
            const tables = tableDocSnap.data().tables;

            if(tables[newName]) {
              alert("A table with this name already exists. Please choose a different name.");
              return;
            }
            const tableData = tables[tableName];

            await updateDoc(tableDocRef, {
              [`tables.${tableName}`]: deleteField(),
              [`tables.${newName}`] : tableData
            });

          }
          newButton.textContent = newName;
          newButton.setAttribute('id', newName);
          tableName = newName;

        } catch (error) {
          console.error("Error renaming table:", error);
        }
      }
      customMenu.remove()
    });

    // delete a table

    const deleteButton = document.getElementById('deleteSingleTable');
    deleteButton.addEventListener('click', async function () {
      const confirmation = confirm(`Are you sure you want to delete the table "${tableName}"?`);

      if (confirmation) {
        try {
          const tableDocRef = doc(db, `tables`, docId);
          const tableDocSnap = await getDoc(tableDocRef);

          if (tableDocSnap.exists()) {
            await updateDoc(tableDocRef, {
              [`tables.${tableName}`]: deleteField()
            });
            newButton.remove();

            const table = document.getElementById(tableName);
            const tableWrapper = document.getElementById(`container-${tableName}`);
            if (table) {
              table.remove();
              tableWrapper.remove();
            }

            console.log(`Table "${tableName}" deleted successfully.`);
          }
        } catch (error) {
          console.log("Error delete table:", error)
        }
      }
      customMenu.remove();

    });

    // graph for each table
    const graphButton = document.getElementById('graphSingleTable');
    graphButton.addEventListener('click', async function() {
      try {
        const tableDocRef = doc(db, `tables`, docId);
        const tableDocSnap = await getDoc(tableDocRef);

        if (tableDocSnap.exists()) {
          const tableData = tableDocSnap.data().tables[tableName];
          
          drawGraph(tableData, tableName);

          $('#graph-popup').css({
            'top': '50vh',
            'left': '50vw'
          });

          $('#graph-popup').show();

          dragElement(document.getElementById("graph-popup"));
        }

      } catch (error) {
        console.log('Error generation graph:', error)
      }
      customMenu.remove
    });

    document.addEventListener('click', function(event) {
      if (!customMenu.contains(event.target)) {
        customMenu.remove();
      }
    });
  });

  modalSheet.appendChild(newButton);
}

function addRow(tableName) {
  const table = document.getElementById(tableName);
  if (!table) {
    console.error('Table not found:', tableName);
    return;
  }
  
  const colCount = table.rows.length > 0 ? table.rows[0].cells.length : 1;
  const newRow = document.createElement('tr');

  for (let i = 0; i < colCount ; i++){
    const newCell = document.createElement('td')
    const input = document.createElement('input')
    input.type = 'text';
    newCell.appendChild(input);
    newRow.appendChild(newCell);
  }
  table.appendChild(newRow)

  saveTableData();
}

function removeRow(tableName) {
  const table = document.getElementById(tableName);

  if (!table) {
    console.error('Table not found:', tableName);
  }

  if (table.rows.length <= 1) {
    console.warn('Cannot remove the last row');
    return;
  }

  table.deleteRow(table.rows.length - 1);
  console.log('Table row removed.')

  saveTableData();
}

function addColumn(tableName) {
  const table = document.getElementById(tableName);
  if (!table) return;

  for (const row of table.rows) {
    const newCell = document.createElement('td');
    const input = document.createElement('input');
    input.type = 'text';
    newCell.appendChild(input);
    row.appendChild(newCell);
  }

  saveTableData();
}

function removeColumn(tableName) {
  const table = document.getElementById(tableName);
  if (!table || table.rows[0].cells.length <= 1) return;

  for (const row of table.rows) {
    row.deleteCell(row.cells.length - 1);
  }

  saveTableData();
}


// function updateCurrentEditPosition(row, column) {
//   const userId = auth.currentUser.uid;  // Get the current user's ID
//   const tableRef = doc(db, 'tables', docId);  // Reference to the specific table document

//   // Update Firestore with the user's current editing position
//   updateDoc(tableRef, {
//       [`currentEdits.${userId}`]: { row: row, column: column }
//   });
// }

// // Event listener for when a user selects a cell
// document.querySelectorAll('td').forEach(cell => {
//   cell.addEventListener('click', () => {
//       const row = cell.dataset.row;
//       const column = cell.dataset.column;

//       updateCurrentEditPosition(row, column);  // Track the current user's position
//   });
// });

// // Reference to the specific table document in Firestore
// const tableRef = doc(db, 'tables', docId);

// // Real-time listener for collaborator edits
// onSnapshot(tableRef, (docSnapshot) => {
//     const data = docSnapshot.data();

//     if (data.currentEdits) {
//         updateCollaboratorCursors(data.currentEdits);  // Update UI with collaborator edits
//     }
// });

// function updateCollaboratorCursors(currentEdits) {
//     // Remove previous indicators
//     document.querySelectorAll('.collaborator-indicator').forEach(el => el.remove());

//     // Loop over each user's current editing position
//     Object.keys(currentEdits).forEach(userId => {
//         const { row, column } = currentEdits[userId];

//         // Find the cell being edited and show an indicator
//         const cell = document.querySelector(`[data-row="${row}"][data-column="${column}"]`);
//         if (cell) {
//             const indicator = document.createElement('div');
//             indicator.classList.add('collaborator-indicator');
//             indicator.style.position = 'absolute';
//             indicator.style.top = 0;
//             indicator.style.left = 0;
//             indicator.style.width = '100%';
//             indicator.style.height = '100%';
//             indicator.style.backgroundColor = 'rgba(0, 0, 255, 0.2)';  // Example: light blue highlight
//             cell.appendChild(indicator);
//         }
//     });
// }

// const colors = {
//   "user1": "rgba(255, 0, 0, 0.2)",  // Red
//   "user2": "rgba(0, 255, 0, 0.2)",  // Green
//   "user3": "rgba(0, 0, 255, 0.2)"   // Blue
// };

// function updateCollaboratorCursors(currentEdits) {
//   document.querySelectorAll('.collaborator-indicator').forEach(el => el.remove());

//   Object.keys(currentEdits).forEach(userId => {
//       const { row, column } = currentEdits[userId];
//       const cell = document.querySelector(`[data-row="${row}"][data-column="${column}"]`);

//       if (cell) {
//           const indicator = document.createElement('div');
//           indicator.classList.add('collaborator-indicator');
//           indicator.style.backgroundColor = colors[userId] || 'rgba(0, 0, 0, 0.2)';  // Default color
//           cell.appendChild(indicator);
//       }
//   });
// }
