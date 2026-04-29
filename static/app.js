document.addEventListener("DOMContentLoaded", function() {
	document.getElementById("emotionForm").addEventListener("submit", async function(e) {
	    e.preventDefault();
		
		const button = e.target.querySelector("button[type='submit']");
	
	    try {
	        const text = document.getElementById("textToAnalyze").value;
				
	        if (!text.trim()) {
                document.getElementById("result").innerHTML =
                    '<div class="alert alert-warning">Please enter text.</div>';
                return;
            }
			
			button.disabled = true;
		    button.textContent = "Analyzing...";
	    
		    const response = await fetch("/emotion/", {
		        method: "POST",
		        headers: {
		        "Content-Type": "application/json"
		        },
		        body: JSON.stringify({ text: text })
		    });
			    	
		    const data = await response.json();
    
            document.getElementById("result").innerHTML = `
                <div class="alert alert-info">
                    <strong>Emotion:</strong> ${data.emotion}<br>
		            <strong>Sentiment:</strong> ${data.sentiment}
		        </div>
		    `;
		
		    document.getElementById("textToAnalyze").value = "";
		
		    await loadHistory();
		} finally {
			button.disabled = false;
			button.textContent = "SUBMIT";
		}
	});
    
	document.getElementById("emotionFilter").addEventListener("change", loadHistory)
	document.getElementById("sentimentFilter").addEventListener("change", loadHistory)
	
    loadHistory();
	
	document.getElementById("saveEditBtn").addEventListener("click", async function () {
	    const text = document.getElementById("updateText").value;
	
	    await updateEntry(currentEditId, text);
    });
	
});

async function loadHistory() {
	const url = filterParams();
	
	const response = await fetch(url);
	const data = await response.json();
	
	renderCards(data);
}

function renderCards(data) {
	
    const historyDiv = document.getElementById("history");
	
    historyDiv.innerHTML = "";
	
	if (data.length === 0) {
		historyDiv.innerHTML = `
		    <div class="alert alert-secondary">
			    No entries match the selected filters.
			</div>
	    `;
		return;
	}

    data.forEach(entry => {
	
	    const emotionClass = getEmotionClass(entry.emotion);
		
		const sentimentClass = getSentimentClass(entry.sentiment);
	
	    const localTime = new Date(entry.timestamp + "Z").toLocaleString("en-US", {
            dateStyle: "medium",
            timeStyle: "short"
        });
		
		let updatedTime = "";
		
		if (entry.updated_at) {
		    updatedTime = new Date(entry.updated_at + "Z").toLocaleString("en-US", {
			    dateStyle: "medium",
			    timeStyle: "short"
		    });
		}
		
	    historyDiv.innerHTML += `
            <div class="card mb-3">
                <div class="card-body">
    	            <div class="row">
			            <div class="col-sm-2">
				            <h3><span class="badge ${emotionClass} me-2">${entry.emotion}</span></h3>
				        </div>
				        <div class="col-sm-2">
				            <h3><span class="badge ${sentimentClass}">${entry.sentiment}</span></h3>
				        </div>
				        <div class="col-sm-5"></div>
						<div class="col-sm-1">
						    <button
							    class="btn btn-warning"
								onclick="openEditModal(${entry.id}, \`${entry.text}\`)"
								data-bs-toggle="modal"
								data-bs-target="#editScreen">
								EDIT
							</button>
						</div>
				        <div class="col-sm-2">
				            <button onclick="deleteEntry(${entry.id})" type="button" class="btn btn-danger">DELETE</button>
				        </div>
			        </div>
                    <p class="card-text">${entry.text}</p>
		    	    <small class="text-muted">${localTime}</small>
		`
		
		if (updatedTime) {
		    historyDiv.innerHTML += `<small class="text-muted">Edited at: ${updatedTime}</small>`;
	    }
		
		historyDiv.innerHTML += `
                </div>
            </div>
        `;
		
	});
}

function getEmotionClass(emotion) {
	
	let emotionClass = "";
	
	if (emotion === "happy") {
		emotionClass = "bg-success";
	}
	else if (emotion === "anger") {
	    emotionClass = "bg-danger";
	}
	else if (emotion === "sad") {
	    emotionClass = "bg-primary";
	}
	else if (emotion === "fear") {
	    emotionClass = "bg-warning text-dark";
	}
	else if (emotion === "disgust") {
	    emotionClass = "bg-dark";
	}
	else {
	    emotionClass = "bg-secondary";
	}
	
	return emotionClass;
}

function getSentimentClass(sentiment) {
	
	let sentimentClass = "";
	
	if (sentiment === "positive") {
		sentimentClass = "bg-success";
    }
	else if (sentiment === "negative") {
	    sentimentClass = "bg-danger";
	}
	else {
	    sentimentClass = "bg-secondary";
	}
	
	return sentimentClass;
}

function filterParams() {
	const emotion = document.getElementById("emotionFilter").value;
	const sentiment = document.getElementById("sentimentFilter").value;
	
	const params = new URLSearchParams();
	
	if (emotion) {
		params.append("emotion", emotion)
	}
	
	if (sentiment) {
		params.append("sentiment", sentiment)
	}
	
	const queryString = params.toString();
	
	return queryString
	    ? `/entries/?${queryString}`
		: "/entries/";
}

let currentEditId = null;

function openEditModal(id, text) {
	
	document.getElementById("editResult").innerHTML = "";
	document.getElementById("saveEditBtn").textContent = "Update";
	
	currentEditId = id;
	document.getElementById("updateText").value = text;
}

function closeEditModal() {
	const modalElement = document.getElementById("editScreen");
	const modal = 
	    bootstrap.Modal.getInstance(modalElement) ||
	    new bootstrap.Modal(modalElement);
		
	modal.hide();
}

async function deleteEntry(id) {
			
	await fetch(`/entries/${id}`, {
	    method: "DELETE"
	});
			
	await loadHistory();
}

async function updateEntry(id, text) {
	
	const button = document.getElementById("saveEditBtn")
	
	try {
	    if (!text.trim()) {
            document.getElementById("editResult").innerHTML =
                '<div class="alert alert-warning">Please enter text.</div>';
		    return;
        }
		
		button.disabled = true;
		button.textContent = "Updating...";
	
	    await fetch(`/entries/${id}`, {
		    method: "PUT",
		    headers: {"Content-Type":"application/json"},
		    body: JSON.stringify({ text: text })
	    });
		
		closeEditModal();
		await loadHistory();
		
		document.getElementById("updateText").value = "";
        document.getElementById("editResult").innerHTML = "";
        currentEditId = null;
		
	}
	finally {
		button.disabled = false;
		button.textContent = "Update";
	}
}