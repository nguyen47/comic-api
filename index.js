const fetch = require('node-fetch');
const cheerio = require('cheerio');
const express = require('express');
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
    res.send('Welcome to Comic API');
});

app.get('/search/:title', async(req, res) => {
    const title = req.params.title;
    const url = `https://readcomicsonline.ru/search?query=${title}`;
    const response = await fetch(url);
    const suggestions = await response.json();
    const results = suggestions['suggestions'];

    if (results.length > 0) {
        const comics = [];

        for (let i = 0; i < results.length; i++) {
            const comic = {
                title: results[i].value,
                link: `https://read-comimc.herokuapp.com/comic/${results[i].data}`
            }
            comics.push(comic);
        }

        res.send(comics);
    } else {
        res.status('404').send('Comic Not Found !');
        return;
    }

});

app.get('/comic/:title', async(req, res) => {
    const title = req.params.title;
    const url = `https://readcomicsonline.ru/comic/${title}`;
    const response = await fetch(url);
    const body = await response.text();
    const $ = cheerio.load(body);

    const errorPage = $('.error-content p').text();

    if (errorPage === "We could not find the page you were looking for.") {
        res.status('404').send('Comic Not Found');
        return;
    }

    const comics = [];

    const getTitle = $('.listmanga-header').eq(0).text().trim();
    const getSummary = $('div.manga.well p').text().trim().replace(/\r?\n|\r/g, " ");
    const getImage = $('.boxed img').attr('src');
    const getAuthors = $('.dl-horizontal dd').eq(3).text().trim();

    // Chapters Object
    const chapters = [];
    const listChapters = $('ul.chapters li').each((i, item) => {
        const $item = $(item);
        const chapterTitle = $item.find('.chapter-title-rtl').text().trim();
        const chapterLink = $item.find('.chapter-title-rtl a').attr('href');
        const link = `https://read-comimc.herokuapp.com/comic/${title}/${chapterLink.substr(chapterLink.lastIndexOf('/') + 1)}`;
        const uploadDate = $item.find('.date-chapter-title-rtl').text().trim()
        const chapter = {
            title: chapterTitle,
            link: link,
            uploadDate: uploadDate
        }
        chapters.push(chapter);
    });

    // Tags Object
    const tags = [];

    const listTags = $('.tag-links a').each((i, item) => {
        const $item = $(item);
        const tagName = $item.text();

        const tag = {
            name: tagName
        }

        tags.push(tag);
    });


    const comic = {
        title: getTitle,
        image: getImage,
        authors: getAuthors,
        tags: tags,
        summary: getSummary,
        chapters,
    };

    comics.push(comic);

    res.send(comics);

});

app.get('/comic/:title/:chapter', async(req, res) => {
    const title = req.params.title;
    const chapter = req.params.chapter;

    const url = `https://readcomicsonline.ru/comic/${title}/${chapter}`;

    const response = await fetch(url);
    const body = await response.text();
    const $ = cheerio.load(body);

    const errorPage = $('h1.break-long-words').text();

    if (errorPage === "Whoops, looks like something went wrong.") {
        res.status('404').send('Comic Not Found');
        return;
    }

    const pages = [];
    const listPages = $('#all img').each((i, item) => {
        const $item = $(item);
        const id = i;
        const image = $item.attr('data-src').trim();
        const page = {
            id,
            image
        }
        pages.push(page);
    });
    res.send(pages);
})


var server = app.listen(process.env.PORT || 3000, function() {
    var port = server.address().port;
    console.log("Server is working on port " + port);
});