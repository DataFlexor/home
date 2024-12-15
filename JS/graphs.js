
let currentChart = 'bar';
let savedTableData = null;
let savedTableName = null;
let myChart;

export function drawGraph(tableData, tableName) {

  savedTableData = tableData;
  savedTableName = tableName;

  const graph_heading = document.getElementById('graph-heading');
  const labels = tableData.headers.slice(1) || [];
  graph_heading.innerText = tableName || 'Table data';
  
  let allTablesData = [];
  let currentRow = 1;
  let innerRow = [];

  for (let i = 0; i < tableData.data.length; i++) {
    if (tableData.data[i]['row'] === currentRow) {
      innerRow.push(tableData.data[i]['text']);
    } else {
      allTablesData.push(innerRow);
      innerRow = [];
      innerRow.push(tableData.data[i]['text']);
      currentRow++;
    }
  }
  allTablesData.push(innerRow);
  console.log(allTablesData);
  allTablesData = allTablesData.slice(1) || [];
  console.log(allTablesData);

  let tablesData = [];
  let tempData = {};
  let formatData= [];

  for (let i = 0; i < allTablesData.length; i++) {
    console.log("new for loop", allTablesData[i]);
    for (let j = 0; j < allTablesData[i].length; j++) {
      console.log(allTablesData[i][j]);
      if (j == 0) {
        tempData['label'] = allTablesData[i][j];
      } else {
        formatData.push(allTablesData[i][j]);
      }
    }
    tempData['data'] = formatData;
    tempData['borderWidth'] = 1;
    tablesData.push(tempData);

    tempData = {};
    formatData= [];
  }

  // chartjs package structure to get the graph and use it
  const ctx = document.getElementById('graph-div').getContext('2d');

  if (myChart) { // checks if a previous myChart instance exists
    myChart.destroy(); // destroys it if it does to clear way for the new chart
  }

  console.log(labels);
  myChart = new Chart(ctx, {
    type: currentChart,// graph type
    data: {
      labels: labels, // top labels for the graph
      datasets: tablesData, // data to be visualized
    },
    options: {
      scales: {
        y: {
          beginAtZero: true // start the y-axis at zero
        }
      }
    }
  });
}

// buttons that change the graph type in the menu inside the graph
$('#barChange').click(() => {
  currentChart = 'bar';
  $('#graph-popup').css({'width': '600px', 'height': '400'});
  drawGraph(savedTableData, savedTableName);
});
$('#lineChange').click(() => {
  currentChart = 'line';
  $('#graph-popup').css({'width': '600px', 'height': '400'});
  drawGraph(savedTableData, savedTableName);
});
$('#pieChange').click(() => {
  currentChart = 'pie';
  $('#graph-popup').css({'width': '420px', 'height': '500'});
  drawGraph(savedTableData, savedTableName);
});
$('#radarChange').click(() => {
  currentChart = 'radar';
  $('#graph-popup').css({'width': '420px', 'height': '500'});
  drawGraph(savedTableData, savedTableName);
});

// Code to make the window of the graphs draggable
export function dragElement(elmnt) {
  var pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
  if (document.getElementById(elmnt.id + "header")) {
    // if present, the header is where you move the DIV from:
    document.getElementById(elmnt.id + "header").onmousedown = dragMouseDown;
  } else {
    // otherwise, move the DIV from anywhere inside the DIV:
    elmnt.onmousedown = dragMouseDown;
  }

  function dragMouseDown(e) {
    e = e || window.event;
    e.preventDefault();
    // get the mouse cursor position at startup:
    pos3 = e.clientX;
    pos4 = e.clientY;
    document.onmouseup = closeDragElement;
    // call a function whenever the cursor moves:
    document.onmousemove = elementDrag;
  }

  function elementDrag(e) {
    e = e || window.event;
    e.preventDefault();
    // calculate the new cursor position:
    pos1 = pos3 - e.clientX;
    pos2 = pos4 - e.clientY;
    pos3 = e.clientX;
    pos4 = e.clientY;
    // set the element's new position:
    elmnt.style.top = (elmnt.offsetTop - pos2) + "px";
    elmnt.style.left = (elmnt.offsetLeft - pos1) + "px";
  }

  function closeDragElement() {
    // stop moving when mouse button is released:
    document.onmouseup = null;
    document.onmousemove = null;
  }
}