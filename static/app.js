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
		
		    await refreshUI();
			
		} finally {
			button.disabled = false;
			button.textContent = "SUBMIT";
		}
	});
    
	document.getElementById("emotionFilter").addEventListener("change", loadHistory)
	document.getElementById("sentimentFilter").addEventListener("change", loadHistory)
	
    refreshUI();
	
	document.getElementById("saveEditBtn").addEventListener("click", async function () {
	    const text = document.getElementById("updateText").value;
	
	    await updateEntry(currentEditId, text);
    });
	
	const editScreen = document.getElementById("editScreen");
	
	editScreen.addEventListener("shown.bs.modal", function () {
		const input = document.getElementById("updateText");
		input.focus();
		input.select();
	});
	
});

async function loadHistory() {
	const url = filterParams();
	
	const response = await fetch(url);
	const data = await response.json();
	
	renderCards(data);
}

async function loadStats() {
	const response = await fetch("/stats/");
	const stats = await response.json();
	
	renderStats(stats);
}

async function refreshUI() {
	await loadHistory();
	await loadStats();
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
		
		const editedHtml = updatedTime
		    ? `• Edited: ${updatedTime}`
			: "";
		
	    historyDiv.innerHTML += `
            <div class="card mb-3 shadow-sm">
                <div class="card-body">
    	            <div class="row">
			            <div class="col-sm-2">
				            <h3><span class="badge ${emotionClass} me-2" style="min-width: 8vw">${entry.emotion}</span></h3>
				        </div>
				        <div class="col-sm-2">
				            <h3><span class="badge ${sentimentClass}" style="min-width: 8vw">${entry.sentiment}</span></h3>
				        </div>
				        <div class="col-sm-8"></div>
					</div>
					<div class="d-flex align-items-center justify-content-end h-100">
					    <div class="p-2 flex-grow-1">
					        <p class="card-text">${entry.text}</p>
						</div>
						<button
						    class="btn btn-warning mb-3"
							onclick="openEditModal(${entry.id}, \`${entry.text}\`)"
							data-bs-toggle="modal"
							data-bs-target="#editScreen"
							style="min-width: 6vw">
							EDIT
						</button>
						<div class="p-2"></div>
				        <button onclick="deleteEntry(${entry.id})" type="button" class="btn btn-danger mb-3" style="min-width: 6vw">DELETE</button>
			        </div>
		    	    <small><small class="text-muted d-block mb-2">Created: ${localTime} ${editedHtml}</small></small>
                </div>
            </div>
        `;
		
	});
}

function formatEmotion(e) {
	return e.charAt(0).toUpperCase() + e.slice(1);
}

async function renderStats(stats) {
	
	document.getElementById("stats").innerHTML = `
	    <div class="row mb-4">
		    
			<div class="col-md-3">
			    <div class="card shadow-sm text-center h-100">
				    <div class="card-body">
					    <h6 class="text-muted">Total Entries</h6>
						<h3>${stats.total}</h3>
					</div>
				</div>
			</div>
			
			<div class="col-md-3">
			    <div class="card shadow-sm text-center h-100">
				    <div class="card-body">
					    <h6 class="text-muted">Positive</h6>
						<h3 class="text-success">${stats.positive}</h3>
					</div>
				</div>
			</div>
			
			<div class="col-md-3">
			    <div class="card shadow-sm text-center h-100">
				    <div class="card-body">
					    <h6 class="text-muted">Negative</h6>
						<h3 class="text-danger">${stats.negative}</h3>
					</div>
				</div>
			</div>
			
			<div class="col-md-3">
			    <div class="card shadow-sm text-center h-100">
				    <div class="card-body">
					    <h6 class="text-muted">Neutral</h6>
						<h3 class="text-primary">${stats.neutral}</h3>
					</div>
				</div>
			</div>
			
			<div class="col-12">
			    <div class="card shadow-sm text-center h-100">
				    <div class="card-body">
					    <h6 class="text-muted">Top Emotion</h6>
						<h2 class="text-success mt-3">${stats.top_emotions.length > 1
						                            ? "Tie: "
						                            : ""} 
						                        ${stats.top_emotions.length
						                            ? stats.top_emotions
												       .map(formatEmotion)
													   .join(" • ")
													: "-"}</h2>
					</div>
				</div>
			</div>
			
		</div>
	`;
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
	
	document.getElementById("updateText").value = "";
    document.getElementById("editResult").innerHTML = "";
    currentEditId = null;
		
}

async function deleteEntry(id) {
	
	const confirmed = confirm("Are you sure you want to delete this entry?");
	
	if (!confirmed) {
		return;
	}
			
	await fetch(`/entries/${id}`, {
	    method: "DELETE"
	});
			
	await refreshUI();
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
		await refreshUI();
	}
	finally {
		button.disabled = false;
		button.textContent = "Update";
	}
}