import axios from "axios";
import * as cheerio from "cheerio";
import express from "express";

let url = {
  main: "https://3asq.org/",
  manga: "https://3asq.org/manga",
  search: "https://3asq.org/?s=",
};

const header = { "Accept-Encoding": "gzip, deflate" };

const latest = async (url) => {
  const data = await axios.get(url, {
    headers: header,
  });
  const res = await data.data;
  const $ = cheerio.load(res);
  $(".post-title > h3 > a > span").remove();
  let results = [];
  const $divs = $("div.page-item-detail");
  $divs.each((i, div) => {
    const id = $(div).find("div:first").prop("attribs")["data-post-id"];
    const img = $(div).find("img").prop("src");
    const title = $(div).find(".post-title > h3 > a").text();
    const searchTitle = title
      .replace(/[^\w\s]/g, "")
      .replace(/\s+/g, "-")
      .toLowerCase();
    const score = $(div).find("span.score").text();
    const chapter = $(div).find("span.chapter:first > a").text().trim();
    if (img === undefined) return;
    results.push({
      key: i,
      id: id,
      searchId: searchTitle,
      img: img,
      title: title,
      score: score,
      chapter: chapter,
    });
  });
  return results;
};

const detailManga = async (url, name) => {
  const data = await axios.get(`${url}/${name}/`, {
    headers: header,
    timeout: 5000,
  });
  const res = await data.data;
  const $ = cheerio.load(res);

  let results = [];
  $(".site-content").each((i, div) => {
    const poster = $(div)
      .find(".tab-summary > .summary_image > a > img")
      .prop("src")
      .trim();
    const title = $(div).find(".post-title > h1").text().trim();
    const writer = $(div).find(".author-content > a").text().trim();
    const rating = $(div).find("span#averagerate").text().trim();
    const artist = $(div).find(".artist-content").text().trim();
    const description = $(".manga-excerpt > p > span").text().trim();
    const lastchapter = parseInt(
      $(div).find("ul.main > li:first > a").text().match(/\d+/)[0],
      10,
    );
    const firstchapter = parseInt(
      $(div).find("ul.main > li:last-child").text().match(/\d+/)[0],
      10,
    );
    results.push({
      title: title,
      poster: poster,
      writer: writer,
      rating: rating,
      artist: artist,
      lastchapter: lastchapter,
      firstchapter: firstchapter,
      description: description,
    });
  });
  return results;
};

const readManga = async (url, name, chapter) => {
  const req = await axios.get(`${url}/${name}/${chapter}/`, {
    headers: header,
  });
  const res = await req.data;
  const $ = cheerio.load(res);
  let data = [];
  $(".page-break").each((i, div) => {
    const img = $(div).find("img").prop("src").trim();
    data.push({ page: img });
  });
  if (!$(".page-break").html()) return { error: "there is no chapter" };
  return data;
};

const searchByName = async (url, name) => {
  const req = await axios.get(`${url}${name}&post_type=wp-manga`, {
    headers: header,
    timeout: 5000,
  });
  const res = await req.data;
  const $ = cheerio.load(res);
  const data = [];
  $(".c-tabs-item__content").each((i, div) => {
    const img = $(div).find("a > img").prop("src");
    const title = $(div).find(".post-title > h3 > a").text().trim();
    const searchTitle = title
      .replace(/[^\w\s]/g, "")
      .replace(/\s+/g, "-")
      .toLowerCase();
    if (img === undefined) return;
    data.push({ img: img, title: title, searchId: searchTitle });
  });
  return data;
};

const app = express();
const port = 8080;
app.get("/latest", async (req, res) => {
  const data = await latest(url.main);
  res.json(data);
});
app.get("/read/:title", async (req, res) => {
  let id = req.params.title;
  const read = await readManga(url.manga, id, req.query.chapter);
  res.json(read);
});

app.get("/search", async (req, res) => {
  const search = await searchByName(url.search, req.query.title.toString());
  res.json(search);
});

app.get("/detail/:id", async (req, res) => {
  let search = await detailManga(url.manga, req.params.id);
  res.json(search);
});

app.listen(port, () => {
  console.log(`Server running on port: http://localhost:${port}`);
  console.log(`Latest manga in: http://localhost:${port}/latest`);
  console.log(
    `Read manga in: http://localhost:${port}/read/vinland-saga?chapter=5`,
  );
  console.log(`Read manga in: http://localhost:${port}/search?title=vi`);
  console.log(`Read manga in: http://localhost:${port}/detail/vinland-saga`);
});
