// Your web app's Firebase configuration
var firebaseConfig = {
apiKey: "AIzaSyDaGfUexg19qSUPkBnO010Xh8a6j01yTYw",
authDomain: "summarizer-3bca9.firebaseapp.com",
databaseURL: "https://summarizer-3bca9.firebaseio.com",
projectId: "summarizer-3bca9",
storageBucket: "summarizer-3bca9.appspot.com",
messagingSenderId: "264613843539",
appId: "1:264613843539:web:363d4bd5c03dfa1973aca6"
};
// Initialize Firebase
firebase.initializeApp(firebaseConfig);

firebase.auth().signInAnonymously().catch(error => {
    console.log(error);
});

firebase.auth().onAuthStateChanged(user => {
    if(user) {
        // signed in
        var isAnonymous = user.isAnonymous;
        var uid = user.uid;
    } else {
        // signed out
        console.log('signed out');
    }
})

chrome.runtime.onMessage.addListener(function(request,sender,sendResponse) {
    if (request.message == "query") {
        fetchLink(request.articleUrl)
            .then(function(summary) {
                sendResponse({summary: summary, rowId: request.rowId});
            })
            .catch(error => {
                console.log(error);
                sendResponse({error: error, rowId: request.rowId});
            });
        return true;
    }
});

// fetch the dom for the requested link
async function fetchLink(url) {
    let response = await fetch(url);
    let html = await response.text();
    let doc = parseDomFromText(html);
    let summary = await handleRequest(doc);
    console.log(summary);
    return summary;
}

async function handleRequest(doc) {
    let article = simplifyDom(doc); // simplify dom with readability.js
    let articleTitle = article.title;
    let articleHtml = article.content;
    let articleDoc = parseDomFromText(articleHtml); // parse simplified dom from text
    let articleText = getArticleText(articleDoc, articleTitle);
    let summary = await getSummary(articleText, articleTitle);
    return summary;
}

async function getSummary(articleText, articleTitle) {
    let baseURL = 'https://us-central1-summarizer-3bca9.cloudfunctions.net/gpt';
    console.log('getting article summary...');
    let token = await firebase.auth().currentUser.getIdToken();
    let response = await fetch(baseURL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + token
        },
        body: JSON.stringify({text: articleText})
    });
    if (response.ok) {
        let data = await response.json();
        let summary = data.response;
        summary = cleanText(summary);
        return summary;
    } else {
        throw new Error('fetch failed');
    }
}
