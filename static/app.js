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
			
			const emotions = data.emotion ? data.emotion.split(",") : [];
			
			const cleanEmotions = emotions.filter(e => e && e.trim() !== "");
    
            document.getElementById("result").innerHTML = `
                <div class="alert alert-info">
                    <strong>Emotion:</strong> ${cleanEmotions.length > 1
					                            ? "Tie: "
												: ""}
											${cleanEmotions.length
											    ? cleanEmotions.map(formatEmotion)
												    .join(" • ")
											    : "Not Detected"}<br>
		            <strong>Sentiment:</strong> ${formatEmotion(data.sentiment)}
		        </div>
		    `;
		
		    document.getElementById("textToAnalyze").value = "";
		
		    await refreshUI();
			
		} finally {
			button.disabled = false;
			button.textContent = "SUBMIT";
		}
	});
    
	document.getElementById("emotionFilter").addEventListener("change", refreshUI)
	document.getElementById("sentimentFilter").addEventListener("change", refreshUI)
	
    loadStats();
	loadHistory(true);
	
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
	
	const loadMoreBtn = document.getElementById("loadMoreBtn")
	
	document.getElementById("loadMoreBtn").addEventListener("click", async () => {
		try {
			loadMoreBtn.disabled = true;
			loadMoreBtn.textContent = "Loading...";
			
		    await loadHistory(false);
		} finally {
			loadMoreBtn.disabled = false;
			loadMoreBtn.textContent = "Load More";
		}
	});
	
});

let offset = 0;
const limit = 10;

async function loadHistory(reset = false) {
	let url = filterParams();
	
	if (reset) offset = 0;
	
	if (url === "/entries/") {
		url += `?limit=${limit}&offset=${offset}`;
	} else {
		url += `&limit=${limit}&offset=${offset}`;
	}
	
	const response = await fetch(url);
	const data = await response.json();
	
	if (reset) {
		document.getElementById("history").innerHTML = "";
	}
	
	renderCards(data, !reset);
	
	offset += data.length;
	
	if (data.length < limit) {
		document.getElementById("loadMoreBtn").style.display = "none";
	}
}

async function loadStats() {
	const response = await fetch("/stats/");
	const stats = await response.json();
	
	renderStats(stats);
}

async function refreshUI() {
	await loadHistory(true);
	await loadStats();
}

function formatEmotion(e) {
	return e.charAt(0).toUpperCase() + e.slice(1);
}

function renderCards(data, append=false) {
	
    const historyDiv = document.getElementById("history");
	
	if (!append) {
		historyDiv.innerHTML = "";
	}
	
	if (data.length === 0) {
		historyDiv.innerHTML = `
		    <div class="alert alert-secondary">
			    No entries match the selected filters.
			</div>
	    `;
		return;
	}

    data.forEach(entry => {
	
	    const emotionClasses = getEmotionClasses();
		
		const sentimentClass = getSentimentClass(entry.sentiment);
		
		const emotions = entry.emotion
		    ? entry.emotion.split(",")
			: [];
		
		let badgeString = "";
		
		if (emotions.length > 0 && emotions[0] !== "") {
			badgeString = emotions.reduce((acc, emotion) => {
				const cls = emotionClasses[emotion] || "bg-secondary-subtle text-dark";
				const label = formatEmotion(emotion);
				
				return acc + `<span class="badge ${cls} me-2" style="min-width: 6vw">${label}</span>`;
			}, "");
		} else {
			badgeString = `<span class="badge bg-secondary-subtle text-dark me-2" style="min-width: 6vw">Not Detected</span>`
		}
	
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
				    <div class="d-flex flex-wrap gap-2 mb-2">
    	                <div class="row mb-2">
			                <div class="col-sm-8">
						        <div class="d-flex align-items-center gap-3">
							        <div class="d-flex flex-wrap gap-2">
				                        <h3>${badgeString}</h3>
								    </div>
								    <span class="text-muted small mx-1">•</span>
								    <div class="d-flex gap-2">
								        <h3><span class="badge ${sentimentClass}" style="min-width: 6vw">${formatEmotion(entry.sentiment)}</span></h3>
								    </div>
							    </div>
				            </div>
				        <div class="col-sm-4"></div>
					    </div>
					</div>
					    <div class="p-2 flex-grow-1">
					        <p class="card-text">${entry.text}</p>
						</div>
					<div class="d-flex align-items-center justify-content-end h-100">
						<div class="d-flex gap-2">
						    <button
						        class="btn btn-warning mb-3 text-nowrap"
							    onclick="openEditModal(${entry.id}, \`${entry.text}\`)"
							    data-bs-toggle="modal"
							    data-bs-target="#editScreen"
							    style="min-width: 6vw">
							    EDIT
						    </button>
						    <div class="p-2"></div>
				            <button onclick="deleteEntry(${entry.id})" type="button" class="btn btn-danger mb-3 text-nowrap" style="min-width: 6vw">DELETE</button>
						</div>
			        </div>
		    	    <small><small class="text-muted d-block mb-2">Created: ${localTime} ${editedHtml}</small></small>
                </div>
            </div>
        `;
		
	});
}

async function renderStats(stats) {
	
	const cleanTopEmotions = stats.top_emotions.filter(
	    e => e && e !== "not detected"
	);
	    
	
	document.getElementById("stats").innerHTML = `
	    <div class="row mb-4">
		    
			<div class="col-md-4">
			    <div class="card shadow-sm text-center h-100">
				    <div class="card-body">
					    <h6 class="text-muted">Total Entries</h6>
						<h3>${stats.total}</h3>
					</div>
				</div>
			</div>
			
			<div class="col-md-2">
			    <div class="card shadow-sm text-center h-100">
				    <div class="card-body">
					    <h6 class="text-muted">Positive</h6>
						<h3 class="text-success">${stats.positive}</h3>
					</div>
				</div>
			</div>
			
			<div class="col-md-2">
			    <div class="card shadow-sm text-center h-100">
				    <div class="card-body">
					    <h6 class="text-muted">Negative</h6>
						<h3 class="text-danger">${stats.negative}</h3>
					</div>
				</div>
			</div>
			
			<div class="col-md-2">
			    <div class="card shadow-sm text-center h-100">
				    <div class="card-body">
					    <h6 class="text-muted">Neutral</h6>
						<h3 class="text-primary">${stats.neutral}</h3>
					</div>
				</div>
			</div>
			
			<div class="col-md-2">
			    <div class="card shadow-sm text-center h-100">
				    <div class="card-body">
					    <h6 class="text-muted">Mixed Sentiment</h6>
						<h3 class="text-info">${stats.mixed}</h3>
					</div>
				</div>
			</div>
			
			<div class="col-12 mb-5">
			    <div class="card shadow-sm text-center h-100">
				    <div class="card-body">
					    <h6 class="text-muted">Top Emotion</h6>
						<h2 class="text-success mt-2">${cleanTopEmotions.length > 1
						                            ? "Tie: "
						                            : ""} 
						                        ${cleanTopEmotions.length
						                            ? cleanTopEmotions
												       .map(formatEmotion)
													   .join(" • ")
													: "-"}</h2>
					</div>
				</div>
			</div>
			
		</div>
	`;
}

function getEmotionClasses() {
	
	let emotionClasses = {
		happy: "bg-success",
		anger: "bg-danger",
		sad: "bg-primary",
		fear: "bg-warning text-dark",
		disgust: "bg-dark",
	};
	
	return emotionClasses;
}

function getSentimentClass(sentiment) {
	
	let sentimentClass = "";
	
	if (sentiment === "positive") {
		sentimentClass = "bg-success";
    }
	else if (sentiment === "negative") {
	    sentimentClass = "bg-danger";
	}
	else if (sentiment === "mixed") {
		sentimentClass = "bg-info text-dark";
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