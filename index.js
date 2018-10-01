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
                link: `http://localhost:3000/comic/${results[i].data}`
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

    const getImage = $('.list-container').find('.img-responsive').attr('src');
    const getSummary = $('div.manga.well p').text().trim();

    const chapters = [];

    const listChapters = $('ul.chapters li').each((i, item) => {
        const $item = $(item);
        const chapterTitle = $item.find('.chapter-title-rtl').text().trim();
        const chapterLink = $item.find('.chapter-title-rtl a').attr('href');
        const link = `http://localhost:3000/comic/${title}/${chapterLink.substr(chapterLink.lastIndexOf('/') + 1)}`;
        const uploadDate = $item.find('.date-chapter-title-rtl').text().trim()
        const chapter = {
            title: chapterTitle,
            link: link,
            uploadDate: uploadDate
        }
        chapters.push(chapter);
    });

    const comic = {
        title: title,
        image: getImage,
        summary: getSummary,
        chapters
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
        const images = $item.attr('data-src').trim();
        pages.push(images);
    });
    res.send(pages);
})


app.listen(3000, () => {
    console.log('Server running ...');
});