const axios = require('axios'); // Promise based HTTP client for the browser and node.js
const cheerio = require('cheerio'); // Fast, flexible, and lean implementation of core jQuery designed specifically for the server.

const bodyParser = require('body-parser'); // Node.js body parsing middleware.
const cors = require('cors'); // CORS is a node.js package for providing a Connect/Express middleware that can be used to enable CORS with various options.

const express = require('express');
const app = express();
const port = 3000;
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cors());

// Confirms that the server is running
app.listen(port, () => {
  console.log(`RequestData app is listening on port ${port}`);
});

//deals with http GET request to the endpoint /api/scrape
//extract the search keywords using request.query
app.get('/api/scrape', async (req, res) => {
  try {
    let keyword = req.query.keyword;
    let asin = req.query.asin;
    console.log('/api/scrape/keyword: ' + keyword);
    console.log('/api/scrape/asin: ' + asin);
    response = await searchAndExtractFromWeb(keyword, asin);
    res.send(response);
  } catch (error) {
    console.log('Error: ' + error);
    res.send('Error: ' + error);
  }
});

// Get the HTML code from the given URL
// returns a string
async function getHTML(URL) {
  try {
    const { data: html } = await axios
      .get(URL, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/42.0.2311.90 Safari/537.36',
        },
      })
      .catch(function (error) {
        console.log('Error: ' + error);
      });
    return html;
  } catch (error) {
    console.error('Error: ' + error);
    return null;
  }
}

// Remove the unnecessary white spaces inside text string
// Returns a string
function removeUnnecessaryWhiteSpaces(text) {
  let result = '';
  let isSpace = false;
  for (let i = 0; i < text.length; i++) {
    if (text[i] == ' ') {
      if (!isSpace) {
        result += text[i];
        isSpace = true;
      }
    } else {
      result += text[i];
      isSpace = false;
    }
  }
  return result;
}

// Search into text string for the sub-text between the strings beginDelimiter and endDelimiter
// returns a string
function searchAndExtractInnerText(text, beginDelimiter, endDelimiter) {
  let beginIndex = text.indexOf(beginDelimiter);
  if (beginIndex < 0) return null;
  beginIndex += beginDelimiter.length;
  let endIndex =
    beginIndex + text.substring(beginIndex, text.length).indexOf(endDelimiter);
  return text.substring(beginIndex, endIndex);
}

// Designed for the amazon.com search page as in 2023-11-09
// search for the product name inside a html code
function searchProductName(htmlCode) {
  let searchText = null;
  let textFromMultipleColumns = searchAndExtractInnerText(
    htmlCode,
    '<span class="a-size-base-plus a-color-base a-text-normal">',
    '</span>'
  );
  let textFromSingleColumn = searchAndExtractInnerText(
    htmlCode,
    '<span class="a-size-medium a-color-base a-text-normal">',
    '</span>'
  );
  // console.log('textFromMultipleColumns: ' + textFromMultipleColumns);
  // console.log('textFromSingleColumn: ' + textFromSingleColumn);
  if (textFromMultipleColumns != null) {
    searchText = textFromMultipleColumns;
  }
  if (textFromSingleColumn != null) {
    searchText = textFromSingleColumn;
  }
  if (searchText == null) {
    return null;
  }
  // console.log('searchText: ' + searchText);

  return removeUnnecessaryWhiteSpaces(searchText.replace(/\n/g, ''));
}

// search for the review stars inside a html code
function searchProductReviewStars(htmlCode) {
  let textSearchResult = searchAndExtractInnerText(
    htmlCode,
    '<span class="a-icon-alt">',
    '</span>'
  );
  if (textSearchResult == null) {
    return null;
  }
  return removeUnnecessaryWhiteSpaces(textSearchResult.replace(/\n/g, ''));
}

// search for the number of revies inside a html code
function searchProductNumberOfReviews(htmlCode) {
  let textSearchResult = searchAndExtractInnerText(
    htmlCode,
    '<span class="a-size-base s-underline-text">',
    '</span>'
  );
  if (textSearchResult == null) {
    return null;
  }
  return Number(textSearchResult.replace(',', ''));
}

// search inside a html code for the url of the product image
function searchProductImageUrl(htmlCode) {
  return searchAndExtractInnerText(htmlCode, '<img class="s-image" src="', '"');
}

// generate a list of the required informations for all products returned from the amazon.com search page
function extractListOfProducts(htmlCode, page) {
  let _listOfProducts = [];
  // console.log('**********************************************************');

  // deals with a null html code
  if (htmlCode == null) {
    return null;
  }

  // load the html content to cheerio
  let $ = cheerio.load(htmlCode);

  // console.log($('div[data-asin]'));

  // loop through all products divs within the amazon.com search html code
  $('div[data-asin]').each(function (i, elem) {
    // checks if the extracted block has a data-asin attribute
    if ($(this).attr('data-asin') != '') {
      let atributo = $(this).attr('data-asin');
      // console.log('atributo.attribs ' + atributo.attribs);
      if (atributo.attribs == undefined) {
        // console.log(atributo);
        let _product = {
          page: 0,
          asin: '',
          name: '',
          stars: '',
          reviews: 0,
          imageUrl: '',
        };

        let htmlCode = cheerio.load($(this).html()).html();
        let __productName = searchProductName(htmlCode);
        // create a product list item only if the product name is not null
        if (__productName != null) {
          _product.page = page;
          _product.asin = atributo;
          _product.name = __productName;
          _product.stars = searchProductReviewStars(htmlCode);
          _product.reviews = searchProductNumberOfReviews(htmlCode);
          _product.imageUrl = searchProductImageUrl(htmlCode);
          _listOfProducts.push(_product);
        }
      }
    }
  });
  return _listOfProducts;
}

// implements an async function to deal with all the process
// from request de amazon.com search results and the
// post processing of the returned data
async function searchAndExtractFromWeb(keyword, asin) {
  keyword = keyword.replace(' ', '+');
  let lista = [];
  // loop through the first 5 pages of the amazon.com search results
  for (let inc = 1; inc <= 5; inc++) {
    let url = 'https://www.amazon.com/s?k=' + keyword + '&page=' + inc;
    let result = await getHTML(url).then(async (htmlCode) => {
      // console.log(htmlCode);
      return await extractListOfProducts(htmlCode, inc);
    });
    if (result != null) {
      // console.log('result.length: ' + result.length);
      lista = lista.concat(result);
    } else {
      // breaks the loop if the result is null, meaning that the page is not available
      break;
    }
    // console.log('list.length: ' + lista.length);
  }
  let response = {};
  // loop to search for the asin in the returned list of products
  lista.forEach((element, i) => {
    if (element.asin == asin) {
      response = {
        position: i,
        asin: element.asin,
        page: element.page,
        name: element.name,
        stars: element.stars,
        reviews: element.reviews,
        imageUrl: element.imageUrl,
        message: '',
      };
      console.log(response);
    }
  });
  if (response == {}) {
    return { message: 'ASIN not found' };
  }
  return response;
}
