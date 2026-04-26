document.addEventListener("DOMContentLoaded", async function() {
	document.getElementById("emotionForm").addEventListener("submit", async function(e) {
	    e.preventDefault();
	
	    const text = document.getElementById("textToAnalyze").value;
				
	    if (!text.trim()) {
            document.getElementById("result").innerHTML =
                '<div class="alert alert-warning">Please enter text.</div>';
            return;
        }
			    
		const response = await fetch("/emotion/", {
		    method: "POST",
		    headers: {
		    "Content-Type": "application/json"
		    },
		    body: JSON.stringify({ text: text })
		});
			    	
		const data = await response.json()
    
        document.getElementById("result").innerHTML = `
            <div class="alert alert-info">
                <strong>Emotion:</strong> ${data.emotion}<br>
		        <strong>Sentiment:</strong> ${data.sentiment}
		    </div>
		`;
	});
	
	const response = await fetch("/entries/");
	
	const data = await response.json();
	
	const historyDiv = document.getElementById("history");
	
	historyDiv.innerHTML = "";
	
	data.forEach(entry => {
		
		let emotionClass = "";
		
		if (entry.emotion === "happy") {
			emotionClass = "bg-success";
		}
		else if (entry.emotion === "anger") {
			emotionClass = "bg-danger";
		}
		else if (entry.emotion === "sad") {
			emotionClass = "bg-primary";
		}
		else if (entry.emotion === "fear") {
			emotionClass = "bg-warning text-dark";
		}
		else if (entry.emotion === "disgust") {
			emotionClass = "bg-dark";
		}
		else {
			emotionClass = "bg-secondary";
		}
		
		let sentimentClass = "";
		
		if (entry.sentiment === "positive") {
			sentimentClass = "bg-success";
		}
		else if (entry.sentiment === "negative") {
			sentimentClass = "bg-danger";
		}
		else {
			sentimentClass = "bg-secondary";
		}
		
		const localTime = new Date(entry.timestamp + "Z").toLocaleString("en-US", {
            dateStyle: "medium",
            timeStyle: "short"
        });
		
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
						<div class="col-sm-6"></div>
						<div class="col-sm-2">
						    <button onclick="deleteEntry(${entry.id})" type="button" class="btn btn-danger">DELETE</button>
						</div>
					</div>
                    <p class="card-text">${entry.text}</p>
					<small class="text-muted">${localTime}</small>
                </div>
            </div>
        `;
		
	});
});

async function deleteEntry(id) {
			
	await fetch(`/entries/${id}`, {
	    method: "DELETE"
	});
			
	location.reload();
}