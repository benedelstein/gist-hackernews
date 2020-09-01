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
        console.log(uid);
        var db = firebase.firestore();
        var docRef = db.collection("users").doc(uid);
        docRef.get().then(function(doc) {
            if (doc.exists) {
                console.log("Document data:", doc.data());
            } else {
                // doc.data() will be undefined in this case
                console.log("No such document!");
                // add user to firestore
                db.collection("users").doc(uid).set({
                    uid: uid,
                    summaryCount: 0
                })
                .then(function() {
                    console.log("user firestore created!");
                })
                .catch(function(error) {
                    console.error("Error adding user document: ", error);
                });
            }
        }).catch(function(error) {
            console.log("Error getting user document:", error);
        });
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
    let doc = parseDomFromText(html); // parse raw dom text from fetch
    let summary = await handleRequest(doc, url);
    console.log(summary);
    return summary;
}

async function handleRequest(doc, url) {
    let article = simplifyDom(doc); // simplify dom with readability.js
    let articleTitle = article.title;
    let articleHtml = article.content;
    let articleDoc = parseDomFromText(articleHtml); // parse simplified dom from text
    let articleText = getArticleText(articleDoc, articleTitle);
    let summary = await getSummary(articleText, articleTitle,url);
    // writeToFirestore(articleTitle, summary, url);
    return summary;
}

async function getSummary(articleText, articleTitle, url) {
    let baseURL = 'https://us-central1-summarizer-3bca9.cloudfunctions.net/gpt';
    console.log('getting article summary...');
    let token = await firebase.auth().currentUser.getIdToken();
    let response = await fetch(baseURL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + token
        },
        body: JSON.stringify({text: articleText, url: url})
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

// write article to firestore and update user's summary count
function writeToFirestore(articleTitle, articleSummary, url) {
    var db = firebase.firestore();
    db.collection("articles").add({
        title: articleTitle,
        summary: articleSummary,
        url: url,
        createdTime: firebase.firestore.FieldValue.serverTimestamp(),
        userId: firebase.auth().currentUser.uid
    })
    .then(function(docRef) {
        console.log("Document written with ID: ", docRef.id);
        db.collection("users").doc(firebase.auth().currentUser.uid).update({
            // increment user's summary count
            summaryCount: firebase.firestore.FieldValue.increment(1)
        })
        .then(function() {
            console.log("Document successfully updated!");
        })
        .catch(function(error) {
            // The document probably doesn't exist.
            console.error("Error updating document: ", error);
        });
    })
    .catch(function(error) {
        console.error("Error adding document: ", error);
    });
}
