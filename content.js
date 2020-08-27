$(document).ready(function() {
    $('tr.athing').each(function() {
        let rowId = $(this).attr('id');
        let linkTitle = $(this).find("td.title > a").text();
        let linkUrl = $(this).find("td.title > a").attr('href');
        console.log(linkUrl);
        // filter out HN non-article links
        // TODO: filter out stuff like pdfs
        if(!linkTitle.startsWith("Launch HN") && !linkTitle.startsWith("Show HN")
                && !linkTitle.startsWith("Ask HN") && !linkUrl.endsWith(".pdf")
                && !linkTitle.endsWith('[video]')) {
            iconSrc = chrome.runtime.getURL("images/hnbutton.png"); // must get url from chrome runtime
            $(this).find("td.title > span.sitebit").after(`<img src="${iconSrc}" class="get-gist">`);
        }
    });

    $('.get-gist').click(function() {
        console.log('gist click');
        event.stopPropagation();
        event.stopImmediatePropagation();
        $(this).parent().parent().next().next('.summary').remove();
        $(this).parent().parent().next('tr').after('<tr class="loader-row"><td colspan="2"></td><td><div class="loader"></div></td></tr>');
        let $titleTd = $(this).parent();
        let articleUrl = $titleTd.children("a.storylink").attr('href');
        let articleName = $titleTd.children("a.storylink").text();
        let rowId = $(this).parent().parent().attr('id');
        console.log(rowId);
        console.log(articleUrl);
        chrome.runtime.sendMessage(
            {
                message: "query",
                articleUrl: articleUrl,
                rowId: rowId
            },
            function(response) {
                if(response.summary) {
                    console.log(response.summary);
                    insertSummary(response.rowId, response.summary);
                } else if (response.error) {
                    console.log(response.error);
                    insertSummary(response.rowId, "could not get your summary :( pls try again");
                }
            }
        );
    });
});

function insertSummary(rowId, summary) {
    let summaryHtml = '<tr class="summary"><td colspan="2"></td><td><div class="summary-wrapper"><div class="vl"><p>' + summary + '</p></div></div></td></tr>';
    // let summaryHtml = '<div class="summary">' + summary + '</div>';
    $(`#${rowId}`).next('tr').after(summaryHtml);
    $(`#${rowId}`).nextAll('.loader-row').first().remove(); // remove the loader
}
