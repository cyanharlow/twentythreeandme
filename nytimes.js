"use strict";

var categoriesData;
var overviewData;
var categoryData;
var bookData;
var bookDetailsData;

var templateContent;

var numImgsLoaded = 0;
var totalImagesNeeded = 0;

var loadOverlay = document.getElementById('load-container');
var pageContainer = document.getElementById('page-container');
var progressBar = document.getElementById('progress-bar');

// in lieu of an IE polyfill, we fake a custom event
var imageCounter = document.createElement('button');
imageCounter.addEventListener('click' , function (e) {
    var percentLoaded = numImgsLoaded / totalImagesNeeded * 100;
    progressBar.setAttribute('style', 'width: ' + percentLoaded + '%;');
    if (numImgsLoaded === totalImagesNeeded) {
        pageContainer.innerHTML = templateContent;
        loadOverlay.className = '';
    }
}, false);

function getCategories() {
    var request = new XMLHttpRequest();
    request.open('GET', 'https://api.nytimes.com/svc/books/v3/lists/names.json' + '?api-key=957474c975634cc7a01a8a3ada453a94', true);
    request.onload = function() {
        if (request.status >= 200 && request.status < 400) {
            var data = JSON.parse(request.responseText)
            categoriesData = data;
            renderStaticContent();
        }
    };
    request.send();
};

function getOverview() {
    var request = new XMLHttpRequest();
    request.open('GET', 'http://api.nytimes.com/svc/books/v3/lists/overview?format=json&api-key=957474c975634cc7a01a8a3ada453a94', true);
    request.onload = function() {
        if (request.status >= 200 && request.status < 400) {
            var data = JSON.parse(request.responseText)
            overviewData = data;
            renderMainPage();
        }
    };
    request.send();
};

function getCategory(list) {
    var listName = list.replace(/-/g, ' ');

    return new Promise(function(resolve, reject) {

        var request = new XMLHttpRequest();
        request.open('GET', 'http://api.nytimes.com/svc/books/v3/lists.json?list=' + listName + '&api-key=957474c975634cc7a01a8a3ada453a94', true);
        request.onload = function() {
            if (request.status >= 200 && request.status < 400) {
                var data = JSON.parse(request.responseText)
                categoryData = data;
                resolve(data)
            }
        };
        request.send();
    });
};

function getDetailedCategories() {
    var bookCalls = [];
    for (var c = 0; c < categoryData.results.length; c++) {
        var isbn = categoryData.results[c].isbns[0] ? categoryData.results[c].isbns[0].isbn10 : categoryData.results[c].book_details[0].primary_isbn13;
        bookCalls.push(getBook(isbn));
    }

    Promise.all(bookCalls).then(function(responses) {
        bookDetailsData = responses;
        renderCategoryPage();
    });
}

function getBook(isbn) {
    return new Promise(function(resolve, reject) {
        var request = new XMLHttpRequest();
        request.open('GET', 'https://www.googleapis.com/books/v1/volumes?key=AIzaSyBAtwEZ2P-qF313gFfdKknKoh2UVKqAqkk&q=isbn:' + isbn, true);
        request.onload = function() {
            if (request.status >= 200 && request.status < 400) {
                var data = JSON.parse(request.responseText)
                resolve(data);
            } else {
                resolve(true);
            }
        };
        request.onerror = function() {
            resolve(true);
        }
        request.send();
    });
};

function getWeeks(weeks) {
    if (weeks && weeks > 1) {
        return weeks + ' weeks on the list';
    }
    return 'New this week';
}

function getReview(review) {
    if (review) {
        return '<a class="review-link" href="' + review + '" target="_blank">Read Review</a>';
    }
    return '';
}

function getBuyOptions(buy) {
    var buyHTML = '<div class="buy"><div><a class="buy-button">Buy</a><div class="buy-options"><div class="arrow"><div class="innerarrow"></div></div>';
    for (var o = 0; o < buy.length; o++) {
        buyHTML += '<a href="' + buy[o].url + '" target="_blank">' + buy[o].name + '</a>';
    }
    buyHTML += '</div></div></div>';
    return buyHTML;
}

window.onhashchange = function() {
    parseHash();
};

document.body.addEventListener("click", function(event) {
    if (event.target.className === 'buy-button') {
        event.target.parentElement.className = 'buy-showing';
    } else if (document.getElementsByClassName('buy-showing').length > 0) {
        for (var f = 0; f < document.getElementsByClassName('buy-showing').length; f++) {
            document.getElementsByClassName('buy-showing')[0].className = '';
        }
    }
});

function categoryChange() {
    var caturl = document.getElementById('category-change').value;
    window.location.hash = caturl;
};

function parseHash() {
    // first set the loader
    progressBar.setAttribute('style', 'width: 10%;');
    loadOverlay.className = 'loading';
    // reset our image loaded values, if hash has changed
    numImgsLoaded = 0;
    totalImagesNeeded = 0;

    var hash = window.location.hash;
    var secondaryIdentifier;
    var identifier = hash.replace('#', '').split('_')[0];
    if (identifier === 'book') {
        secondaryIdentifier = hash.split('_')[1];
        getBook(secondaryIdentifier).then(function(data) {
            bookData = data;
            renderBookPage();
        });
    } else if (identifier === 'category') {
        secondaryIdentifier = hash.split('_')[1];
        getCategory(secondaryIdentifier).then(function(catData) {
            categoryData = catData;
            getDetailedCategories()
        });
    } else {
        getOverview();
    }
    window.scrollTo(0,0);
}

function renderStaticContent() {
    // these are the parts of the page that won't change after navigation/hash changes
    var menuChoices = categoriesData.results;
    // var year = loadedData.results.published_date.substring(0, 4);
    // var dayDate = Number(loadedData.results.published_date.substring(8,10));
    // var monthNum = Number(loadedData.results.published_date.substring(5,7)) - 1;
    // var months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    var headerHTML = '' +
        '<div class="menu-bar"><div class="page-width"><select class="menu-toggle" id="category-change" onchange="categoryChange()"><option selected disabled>See all categories</option>';
    for (var m = 0; m < menuChoices.length; m++) {
        headerHTML += '<option value="#category_' +
        menuChoices[m].list_name_encoded +
        '">' +
        menuChoices[m].list_name +
        '</option>';
    }
    headerHTML += '</select>';
    // headerHTML += '<p class="published-date">' + months[monthNum] + ' ' + dayDate + ', ' + year + '</p>';
    headerHTML += '<div class="clear"></div></div></div>';

    var footerHTML = '<div class="footer"><div class="page-width">' + categoriesData.copyright + '</div></div>';
    document.getElementById('header').innerHTML = headerHTML;
    document.getElementById('footer').innerHTML = footerHTML;
};

function renderCategoryPage() {
    // start page
    var html = '';

    // category view, list all books in this one category
    var catBooks = categoryData.results;

    // breadcrumb
    html += '<div class="page-width"><div class="breadcrumb"><a href="#">All categories</a><span class="div">&gt;</span>' +
    catBooks[0].list_name +
    '</a></div></div>';


    for (var br = 0; br < bookDetailsData.length; br++) {
        var cBook = catBooks[br];
        var imgHref = '';
        var imgSrc = '';
        var isbnNum = '';
        if (bookDetailsData[br] && bookDetailsData[br].totalItems) {
            var gBookData = bookDetailsData[br].items[0];
            totalImagesNeeded++;

            var catBookImg = new Image();
            catBookImg.onload = function() {
                numImgsLoaded++;
                imageCounter.click();
            };

            isbnNum = cBook.isbns[0] ? cBook.isbns[0].isbn10 : cBook.book_details[0].primary_isbn13
            imgHref = 'href="#book_' + isbnNum + '"';
            imgSrc = gBookData.volumeInfo.imageLinks.smallThumbnail;
            catBookImg.src = gBookData.volumeInfo.imageLinks.smallThumbnail;
        }
        var arrowRank;
        if (cBook.rank_last_week === 0 || cBook.rank_last_week === cBook.rank) {
            arrowRank = '';
        } else if (cBook.rank_last_week < cBook.rank) {
            arrowRank = '&darr;';
        } else {
            arrowRank = '&uarr;';
        }

        // build display column
        html += '<div class="book-row"><div class="page-width"><a ' +
        imgHref + '><div class="rank"><span>' +
        cBook.rank +
        '</span><span class="arrow-rank">' +
        arrowRank +
        '</span></div>' +
        '<img src="' +
        imgSrc +
        '"><div class="book-content">' +
        '<p class="book-weeks">' +
        getWeeks(cBook.weeks_on_list) +
        '</p><h3 class="book-title">' +
        cBook.book_details[0].title +
        '</h3><h3 class="author">' +
        cBook.book_details[0].author +
        '</h3><p>' +
        cBook.book_details[0].description +
        '</p></a>' +
        '<a class="buy" href="' +
        cBook.amazon_product_url +
        '">Buy</a>' +
        // getBuyOptions(cBook.buy_links) +
        getReview(cBook.reviews[0].book_review_link) +
        '</div><div class="clear"></div></div></div>';
    }
    templateContent = html;
}

function renderBookPage() {
    var singleBook = bookData.items[0];
    var html = '';
    // preload book image
    totalImagesNeeded++;
    var singleBookImg = new Image();
    singleBookImg.onload = function() {
        numImgsLoaded++;
        imageCounter.click();
    };
    singleBookImg.src = singleBook.volumeInfo.imageLinks.thumbnail;

    // build display column
    html += '<div class="book-page"><div class="page-width">' +
    '<div class="breadcrumb"><a href="#">All categories</a><span class="div">&gt;</span><span class="cap-title">' +
    singleBook.volumeInfo.title.toLowerCase() +
    '</span></div>' +
    '<div class="book-content">' +
    '<p class="book-weeks">' +
    getWeeks(singleBook.weeks_on_list) +
    '</p><h1 class="book-title">' +
    singleBook.volumeInfo.title +
    '</h1><h3 class="author">' +
    singleBook.volumeInfo.authors[0] +
    '</h3>' +
    '<p>' +
    singleBook.volumeInfo.description +
    '</p>' +
    //getBuyOptions(singleBook.buy_links) +
    //getReview(singleBook.book_review_link) +
    '</div><img src="' +
    singleBook.volumeInfo.imageLinks.thumbnail +
    '"><div class="clear"></div></div></div>';
    templateContent = html;

}

function renderMainPage() {
    // generic homepage view, limited to first five categories (if we haven't specified view-all option)
    var lists = overviewData.results.lists;
    var html = '';

    for (var l = 0; l < lists.length; l++) {
        html += '<div class="page-width"><h2 class="category-title">' +
        '<a href="#category_' +
        lists[l].list_name_encoded + '">' +
        lists[l].list_name +
        ' <span class="small"> &#8250;</span></a></h2><div class="list">';
            // list books of each category
            var books = lists[l].books;
            for (var b = 0; b < books.length; b++) {
                // preload book image
                totalImagesNeeded++;
                var bookImg = new Image();
                bookImg.onload = function() {
                    numImgsLoaded++;
                    imageCounter.click();
                };
                bookImg.src = books[b].book_image;
                // build display column
                html += '<div class="book-column">' +
                '<div class="rank"><span>' +
                books[b].rank +
                '</span></div>' +
                '<img src="' +
                books[b].book_image +
               '"><div class="book-content">' +
                '<p class="book-weeks">' +
                getWeeks(books[b].weeks_on_list) +
                '</p><h3 class="book-title">' +
                books[b].title +
                '</h3><h3 class="author">' +
                books[b].author +
                '</h3><p>' +
                books[b].description +
                '</p>' +
                getBuyOptions(books[b].buy_links) +
                getReview(books[b].book_review_link) +
                '</div><div class="clear"></div></div>';
            }
            html += '<div class="clear"></div>' +
            '</div></div>';
            // end of list
    }

    html += '</div>';
    // end article content, set template value, hide loader
    templateContent = html;
};

// renderDynamicContent();
getCategories();
parseHash();
