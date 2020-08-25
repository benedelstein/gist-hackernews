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

async function fetchLink(url) {
    // fetch the dom for the requested link
    try {
        let response = await fetch(url);
        let html = await response.text();
        let doc = parseDomFromText(html);
        let summary = await handleRequest(doc);
        console.log(summary);
        return summary;
    } catch(error) {
        chrome.runtime.sendMessage({
            msg: "error",
            errorMessage: error
        });
        console.log(error);
    }
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
    try {
        let response = await fetch(baseURL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({text: articleText})
        });
        let data = await response.json();
        let summary = data.response;
        console.log(summary);
        // summary = cleanText(summary);
        // chrome.notifications.create('', {
        //     title: 'Your Summary!',
        //     message: articleTitle + '\n' + summary,
        //     iconUrl: 'images/icon_128.png',
        //     type: 'basic'
        // });
        return summary;
    } catch(error) {
        console.log(error);
        chrome.runtime.sendMessage({
            msg: "error",
            errorMessage: error
        });
    }
}
