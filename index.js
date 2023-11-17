//Frontend JS for the index page

// Monitor the DOM for the submit event of the search form
let btnSearch = document.getElementById('btn-search');
let keyword = document.getElementById('keyword');
let asin = document.getElementById('asin');
let btnClear = document.getElementById('btn-clear');

btnClear.addEventListener('click', function (e) {
  e.preventDefault();
  console.log('btnClear.addEventListener');
  keyword.value = '';
  asin.value = '';
  document.getElementById('result').innerHTML =
    'Results will be displayed here!!';
});

// Add an event listener to the search button
btnSearch.addEventListener('click', function (e) {
  console.log('btnSearch.addEventListener');
  e.preventDefault();
  // Get the search term from the input field
  let searchKeyword = keyword.value;
  let searchAsin = asin.value;
  //   console.log('search input: ' + search);
  // Check if the search term is empty
  if (searchKeyword == '' || searchAsin == '') {
    alert('Please enter both ASIN and Keyword are required');
    return;
  }
  // Replace the spaces with + signs
  searchKeyword = searchKeyword.replace(' ', '+');

  // Fetch the search data from the backend
  fetch(
    'http://localhost:3000/api/scrape/?keyword=' +
      searchKeyword +
      '&asin=' +
      searchAsin
  )
    .then((response) => {
      return response.json();
    })
    .then((data) => {
      console.log(data);
      // Check if the backend returned any results
      if (data.message != '') {
        document.getElementById('result').innerHTML =
          'Results will be displayed here!!';
        alert('No results found');
        return;
      }

      let html = '<h2>Position: ' + data.position + '</h2><br>';
      html += 'ASIN: ' + data.asin + '<br>';
      html += 'Page: ' + data.page + '<br>';
      html += 'Name: ' + data.name + '<br>';
      html += 'Stars: ' + data.stars + '<br>';
      html += 'Reviews: ' + data.reviews + '<br>';

      // Insert the HTML code into the table body
      document.getElementById('result').innerHTML = html;
    });
});
