const PARAGRAPH_WORDCOUNT_THRESHOLD = 6; // min paragraph length in words
const ARTICLE_LENGTH_THRESHOLD = 2000;
// given a string representing html, parse it into a document object
function parseDomFromText(htmlText) {
    let domparser = new DOMParser();
    let doc = domparser.parseFromString(htmlText,'text/html');
    return doc;
}

// run the doc object through readability to strip out extraneous elements
function simplifyDom(doc) {
    let article = (new Readability(doc)).parse();
    return article;
}

// extract the text from an article with dom content and title
function getArticleText(doc, articleTitle) {
    let articleText = articleTitle + '\n';
    // create jquery object for simplified dom
    let $doc = $(doc);
    console.log(typeof($doc));
    let headers = [];
    let paragraphs = [];
    $doc.find("body h3 + p, body h2 + p, body h4 + p").each(function() {
        let headerText = $(this).prev().text();
        headers.push(headerText);
    });
    $doc.find("body h3 + p, body h2 + p, body h4 + p").each(function() {
        // console.log(this.textContent);
        paragraphs.push(this.textContent);
    });
    console.log(headers.length,paragraphs.length);

    // parse outline if article follows header format.
    if (headers.length > 0 && headers.length == paragraphs.length) {
        console.log('outline parse');
        // articleText += $doc.find("body h1 ~ p").first().text() + '\n'; // first paragraph
        let firstPFound = false; // flag to see whether first valid p is found
        $doc.find('body p').each(function() {
            // TODO: throw out paragraphs that are short (likely to be bad)
            let pText = $(this).text();
            let pWordCount = countWords(pText);
            if (pWordCount > PARAGRAPH_WORDCOUNT_THRESHOLD && !firstPFound) {
                articleText += pText + '\n';
                firstPFound = true;
                console.log("first p:",pText);
            }
        });
        for(var i=0;i<headers.length;i++) {
            // TODO: throw out paragraphs that are short (likely to be bad)
            console.log(headers[i]);
            console.log(paragraphs[i]);
            let pWordCount = countWords(paragraphs[i]);
            if(pWordCount > PARAGRAPH_WORDCOUNT_THRESHOLD) {
                articleText += headers[i] + '\n';
                articleText += paragraphs[i] + '\n\n';
            } else {
                console.log('paragraph too short!');
            }
        }
    } else {
        console.log('full parse');
        // if not just pull the full paragraph body
        $doc.find('body p').each(function() {
            // TODO: throw out paragraphs that are short (likely to be bad)
            let pText = $(this).text();
            let pWordCount = countWords(pText);
            if (pWordCount > PARAGRAPH_WORDCOUNT_THRESHOLD) {
                articleText += pText + '\n';
            } else {
                console.log('paragraph too short!');
            }
        });
    }
    // TODO: TRIM BASED ON TOKENS, NOT CHARACTERS (MORE EXACT)
    if (articleText.length > ARTICLE_LENGTH_THRESHOLD) {
        articleText = articleText.substring(0,ARTICLE_LENGTH_THRESHOLD).trim();
        console.log('shortened');
    } else {
        console.log('not shortened');
    }
    console.log(articleText);
    articleText = cleanText(articleText);
    console.log(articleText);
    return articleText;
}

function cleanText(text) {
    // remove urls
    // trim to nearest sentence
    // https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)
    // remove characters like &raquo etc
    let punctuationMarks = ['.','?','!'];
    let lastPunctuation = 0;
    for (var i = 0; i < punctuationMarks.length; i++) {
        let lastOccurrence = text.lastIndexOf(punctuationMarks[i]);
        console.log(lastOccurrence);
        if (lastOccurrence !== -1) {
            lastPunctuation = Math.max(lastOccurrence,lastPunctuation);
        }
    }
    console.log(lastPunctuation);
    text = text.substring(0,lastPunctuation);
    text = text.replace(/https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/gi, " ");
    return text;
}

function countWords(text) {
	text = text.replace(/(^\s*)|(\s*$)/gi,"");
	text = text.replace(/[ ]{2,}/gi," ");
	text = text.replace(/\n /,"\n");
	return text.split(' ').length;
}
