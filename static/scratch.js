const emotion = document.getElementById("emotionFilter").value;
	
	const sentiment = document.getElementById("sentimentFilter").value;
	
	let url = "/entries/?";
	
	if (!emotion === "Any") {
		url += `emotion=${emotion}&`;
	} else {
		url += `emotion=&`;
	}
	if (!sentiment === "Any") {
		url += `emotion=${sentiment}`;
	} else {
		url += `sentiment=`;
	}
	
	const response = await fetch(url)
	const data = await response.json()
	
	
	
function filterParams() {
	const emotion = document.getElementById("emotionFilter").value;
	const sentiment = document.getElementById("sentimentFilter").value;
	
	let url = "/entries/";
	
	if (emotion) {
		url += `emotion=${emotion}&`;
	}
	
	if (sentiment) {
		url += `sentiment=${sentiment}`;
	}
	
	return url
}