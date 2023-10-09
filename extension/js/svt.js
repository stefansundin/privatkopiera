// SVT Play:
// Example URL:
// https://www.svtplay.se/video/e7Yd7x9/rapport/igar-22-00?id=e7Yd7x9
// Data URL:
// https://api.svt.se/video/e7Yd7x9
//
// Example URL:
// https://www.svtplay.se/video/2520376/pippi-langstrump/pippi-langstrump-sasong-1-avsnitt-1
// Data URL:
// https://api.svt.se/video/2520376
//
// https://www.svtplay.se/klipp/22725758/har-ar-historien-bakom-sma-grodorna
// https://api.svt.se/video/22725758
//
// SVT Play Live:
// Example URL:
// https://www.svtplay.se/kanaler/svt1
// https://www.svtplay.se/kanaler/svt2
// https://www.svtplay.se/kanaler/svtbarn
// https://www.svtplay.se/kanaler/kunskapskanalen
// https://www.svtplay.se/kanaler/svt24
// https://www.svtplay.se/kanaler?selectedChannel=svt1
// Data URL:
// https://api.svt.se/video/ch-svt1
// https://api.svt.se/video/ch-svt2
// https://api.svt.se/video/ch-barnkanalen
// https://api.svt.se/video/ch-kunskapskanalen
// https://api.svt.se/video/ch-svt24
//
// SVT:
// Example URL:
// https://www.svt.se/nyheter/utrikes/har-ar-bron-som-nastan-snuddar-husen
// Article Data URL:
// https://api.svt.se/nss-api/page/nyheter/utrikes/har-ar-bron-som-nastan-snuddar-husen?q=articles
// Media Data URL:
// https://api.svt.se/video/jE4x6LA
//
// https://www.svt.se/recept/julvort
// Trasig!
//
// https://www.svt.se/recept/saffransrisotto-med-artor-och-vitt-vin
// https://api.svt.se/videoplayer-api/video/27121781
//
// Example URL:
// https://www.svt.se/barnkanalen/barnplay/gamingdrommar-live/j1a3m2y/
// Media Data URL:
// https://api.svt.se/video/j1a3m2y

function svt_callback(data) {
  console.log(data);

  const formats = 'hls,hds'.split(',');
  const streams = $('#streams');
  data.videoReferences
    .filter(function (stream) {
      return formats.includes(stream.format);
    })
    .sort(function (a, b) {
      return formats.indexOf(a.format) - formats.indexOf(b.format);
    })
    .forEach(function (stream) {
      if (stream.format == 'hds') {
        stream.url = add_param(stream.url, 'hdcore=3.5.0'); // ¯\_(ツ)_/¯
      }

      const option = document.createElement('option');
      option.value = stream.url;
      option.appendChild(document.createTextNode(extract_filename(stream.url)));
      streams.appendChild(option);

      if (stream.format == 'hls') {
        const base_url = stream.url.replace(/\/[^/]+$/, '/');
        fetch(stream.url)
          .then(get_text)
          .then(master_callback(data.contentDuration, base_url))
          .catch(api_error);
      }
    });

  if (data.subtitleReferences) {
    subtitles.push(...data.subtitleReferences.map((s) => s.url));
    data.subtitleReferences.forEach((s) => {
      const option = document.createElement('option');
      option.value = s.url;
      option.appendChild(document.createTextNode(extract_filename(s.url)));
      streams.appendChild(option);
    });
  }

  if (
    data.programTitle &&
    data.episodeTitle &&
    data.programTitle != data.episodeTitle
  ) {
    update_filename(
      `${data.programTitle.trim()} - ${data.episodeTitle.trim()}.${
        options.default_video_file_extension
      }`,
    );
  } else if (data.programTitle) {
    update_filename(
      `${data.programTitle.trim()}.${options.default_video_file_extension}`,
    );
  } else if (data.episodeTitle) {
    update_filename(
      `${data.episodeTitle.trim()}.${options.default_video_file_extension}`,
    );
  }
  update_cmd();
}

matchers.push({
  re: /^https?:\/\/(?:www\.)?svtplay\.se\.?\/kanaler(?:\/([^\/?]+)|\?selectedChannel=([^\/?]+))/,
  func: (ret, _) => {
    let ch = ret[1] || ret[2];
    if (ch == 'svtbarn') {
      ch = 'barnkanalen';
    }
    const data_url = `https://api.svt.se/video/ch-${ch}`;
    update_json_url(data_url);
    fetch(data_url).then(get_json).then(svt_callback).catch(api_error);
  },
});

matchers.push({
  re: /^https?:\/\/(?:www\.)?svtplay\.se\.?\/(?:video|klipp)\/([a-zA-Z0-9]+)\//,
  func: (ret, _) => {
    console.log(ret);
    const videoId = ret[1];
    const data_url = `https://api.svt.se/video/${videoId}`;
    update_filename(`${videoId}.${options.default_video_file_extension}`);
    update_json_url(data_url);
    console.log(data_url);
    fetch(data_url).then(get_json).then(svt_callback).catch(api_error);
  },
});

matchers.push({
  re: /^https?:\/\/(?:www\.)?svt\.se\.?\/videoplayer-embed\/(\d+)/,
  func: function (ret, _) {
    const video_id = ret[1];
    const data_url = `https://api.svt.se/videoplayer-api/video/${video_id}`;
    update_filename(`${video_id}.mp4`);
    update_json_url(data_url);
    console.log(data_url);
    fetch(data_url).then(get_json).then(svt_callback).catch(api_error);
  },
});

matchers.push({
  re: /^https?:\/\/(?:www\.)?svt\.se\.?\/recept\//,
  func: function (_, url) {
    chrome.tabs.executeScript(
      {
        code: `(function(){
          const ids = [];
          const videos = document.querySelectorAll("[data-video-id]");
          for (let i=0; i < videos.length; i++) {
            const id = videos[i].getAttribute("data-video-id");
            if (id) {
              ids.push(id);
            }
          }
          return ids;
        })()`,
      },
      function (ids) {
        console.log(ids);
        ids = flatten(ids);
        ids.forEach(function (video_id) {
          const data_url = `https://api.svt.se/videoplayer-api/video/${video_id}`;
          update_filename(`${video_id}.mp4`);
          update_json_url(data_url);
          console.log(data_url);
          fetch(data_url).then(get_json).then(svt_callback).catch(api_error);
        });
        if (ids.length == 0) {
          error('Hittade ingen video.');
        }
      },
    );
  },
});

matchers.push({
  re: /^https?:\/\/(?:www\.)?svt\.se\.?\//,
  func: async function (_, url) {
    if (
      (ret = /^(?:\/barnkanalen)?\/barnplay\/([^/]+)\/([^/?]+)/.exec(
        url.pathname,
      ))
    ) {
      const data_url = `https://api.svt.se/video/${ret[2]}`;
      update_filename(`${ret[1]}.${options.default_video_file_extension}`);
      update_json_url(data_url);
      console.log(data_url);
      fetch(data_url).then(get_json).then(svt_callback).catch(api_error);
      return;
    }

    const data = await fetch(
      `https://api.svt.se/nss-api/page${url.pathname}?q=articles`,
    )
      .then(get_json)
      .catch(api_error);
    console.log(data);
    if (!data) return;

    let ids = flatten(
      data.articles.content
        .filter((a) => a.media)
        .map((article) =>
          article.media
            .filter((m) => m.image && m.image.isVideo && m.image.svtId)
            .map((m) => m.image.svtId),
        ),
    );
    console.log(ids);

    ids.forEach(function (svtId) {
      const data_url = `https://api.svt.se/video/${svtId}`;
      update_filename(`${svtId}.${options.default_video_file_extension}`);
      update_json_url(data_url);
      console.log(data_url);
      fetch(data_url).then(get_json).then(svt_callback).catch(api_error);
    });
  },
});
