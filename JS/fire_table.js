import { app } from './fire_initialize.js';
import { getFirestore, doc, setDoc, Timestamp, getDoc } from 'https://www.gstatic.com/firebasejs/10.12.3/firebase-firestore.js';
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-auth.js";

const db = getFirestore(app);
const auth = getAuth(app);

const newTableBtn = document.getElementById('new-table-btn');
const chooseRowCol = document.getElementById('choose-row-col');
const sendLayoutBtn = document.getElementById('send-layout');
const newTableDiv = document.getElementById('new-table');
const titleInput = document.getElementById('main-title');
const saveBtn = document.getElementById('saveBtn');
const individualTableName = document.getElementById('individualTableName');

let numRows = 1;
let numCols = 1;
let autoSaveTimeout = null;

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

    const tableRef = doc(db, `tables/${userId}/tables`, docId);

    try {
      const docSnapshot = await getDoc(tableRef);
      titleInput.value = docSnapshot.exists() ? docSnapshot.data().name : '';

      if (docSnapshot.exists()) {
        const tableData = docSnapshot.data();
        if (!tableData.cells || !Array.isArray(tableData.cells) || tableData.cells.length === 0) {
          console.log('No data in cells field or cells field is not an array.');
          return;
        }

        displayTable(tableData);
      } else {
        console.error('Document does not exist');
      }
    } catch (error) {
      console.error('Error fetching table document: ', error);
    }
  });

  newTableBtn.addEventListener('click', () => {
    chooseRowCol.style.display = 'inline-block';
  });

  sendLayoutBtn.addEventListener('click', () => {
    chooseRowCol.style.display = 'none';
    numRows = parseInt(document.getElementById('rows').value);
    numCols = parseInt(document.getElementById('columns').value);

    const table = document.createElement('table');
    table.classList.add('table-container');

    for (let i = 0; i < numRows; i++) {
      const row = document.createElement('tr');

      for (let j = 0; j < numCols; j++) {
        const cell = document.createElement('td');
        const input = document.createElement('input');
        input.setAttribute('type', (i === 0 || j === 0) ? 'text' : 'number');
        cell.appendChild(input);
        row.appendChild(cell);
      }

      table.appendChild(row);
    }

    const firstCellInput = table.querySelector('tr:first-child td:first-child input');
    console.log(individualTableName.value)
    firstCellInput.value = individualTableName.value;

    newTableDiv.innerHTML = '';
    newTableDiv.appendChild(table);

    newTableDiv.style.display = 'block';

    // Add event listeners to each input for auto-save
    addAutoSaveListeners();
  });

  saveBtn.addEventListener('click', async () => {
    await saveTableData();
  });
});

function addAutoSaveListeners() {
  const inputs = newTableDiv.querySelectorAll('input');
  inputs.forEach(input => {
    input.addEventListener('input', handleInputChange);
  });
}

function handleInputChange() {
  // give the saveTableData some time to save the data before it triggers again
  if (autoSaveTimeout) clearTimeout(autoSaveTimeout);
  autoSaveTimeout = setTimeout(async () => {
    await saveTableData();
  }, 500); 
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

    const tableRef = doc(db, `tables/${user.uid}/tables`, docId);

    const tableDataObject = {
      name: titleInput.value || "Untitled Table",
      date: Timestamp.now(),
      cells: []
    };

    const table = newTableDiv.querySelector('table');
    table.querySelectorAll('input').forEach((input, index) => {
      const cellData = {
        text: input.value,
        row: Math.floor(index / numCols) + 1,
        column: (index % numCols) + 1
      };
      tableDataObject.cells.push(cellData);
    });

    await setDoc(tableRef, tableDataObject, { merge: true });

    console.log('Table data saved successfully');
  } catch (e) {
    console.error('Error saving table data: ', e);
  }
}

titleInput.addEventListener('input', handleInputChange);

function displayTable(tableData) {
  newTableDiv.innerHTML = '';
  const tableElement = document.createElement('table');
  tableElement.classList.add('table-container');

  let maxRow = 0;
  let maxCol = 0;

  tableData.cells.forEach(cellData => {
    if (cellData.row > maxRow){
      maxRow = cellData.row;
      numRows = maxRow;
    } 
    if (cellData.column > maxCol) {
      maxCol = cellData.column;
      numCols = maxCol;
    } 
  });

  for (let i = 1; i <= maxRow; i++) {
    const row = document.createElement('tr');

    for (let j = 1; j <= maxCol; j++) {
      const cell = document.createElement('td');
      const input = document.createElement('input');
      input.setAttribute('type', 'text');

      const cellData = tableData.cells.find(cell => cell.row === i && cell.column === j);
      if (cellData) {
        input.value = cellData.text;
      } else {
        input.value = '';
      }

      cell.appendChild(input);
      row.appendChild(cell);
    }

    tableElement.appendChild(row);
  }

  newTableDiv.appendChild(tableElement);
  newTableDiv.style.display = 'block';
  // Add event listeners to each input for auto-save
  addAutoSaveListeners();
}