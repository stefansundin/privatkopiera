// SVT Play:
// Example URL:
// https://www.svtplay.se/video/2520376/pippi-langstrump/pippi-langstrump-sasong-1-avsnitt-1
// Data URL:
// https://api.svt.se/video/jBDqx98
//
// SVT Play Live:
// Example URL:
// https://www.svtplay.se/kanaler/svt1
// https://www.svtplay.se/kanaler/svt2
// https://www.svtplay.se/kanaler/svtbarn
// https://www.svtplay.se/kanaler/kunskapskanalen
// https://www.svtplay.se/kanaler/svt24
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
// Example URL:
// https://www.svt.se/barnkanalen/barnplay/bolibompa-drakens-tradgard/KG5RQPG
// Clicking play on the main episode redirects to this URL that is missing "/barnkanalen" (probably a react bug?)
// https://www.svt.se/barnplay/bolibompa-drakens-tradgard/KG5RQPG
// Media Data URL:
// https://api.svt.se/video/KG5RQPG

function svt_callback(data) {
  console.log(data);

  if (data.subtitleReferences) {
    subtitles.push(...data.subtitleReferences.map(s => s.url));
  }

  const formats = "hls,hds".split(",");
  const streams = $("#streams");
  data.videoReferences.filter(function(stream) {
    return (formats.includes(stream.format));
  })
  .sort(function(a,b) {
    return (formats.indexOf(a.format) - formats.indexOf(b.format));
  })
  .forEach(function(stream) {
    if (stream.format == "hds") {
      stream.url = add_param(stream.url, "hdcore=3.5.0"); // ¯\_(ツ)_/¯
    }

    const option = document.createElement("option");
    option.value = stream.url;
    option.appendChild(document.createTextNode(extract_filename(stream.url)));
    streams.appendChild(option);

    if (stream.format == "hls") {
      const base_url = stream.url.replace(/\/[^/]+$/, "/");
      fetch(stream.url).then(get_text).then(master_callback(data.contentDuration, base_url)).catch(api_error);
    }
  });

  if (data.programTitle && data.programTitle != data.episodeTitle) {
    update_filename(`${data.programTitle} - ${data.episodeTitle}.mp4`);
  }
  else {
    update_filename(`${data.episodeTitle}.mp4`);
  }
  update_cmd();
}

matchers.push({
  re: /^https?:\/\/(?:www\.)?svtplay\.se\.?\/kanaler\/([^\/?]+)/,
  func: (ret, _) => {
    let ch = ret[1];
    if (ch == "svtbarn") {
      ch = "barnkanalen";
    }
    const data_url = `https://api.svt.se/video/ch-${ch}`;
    update_json_url(data_url);
    fetch(data_url).then(get_json).then(svt_callback).catch(api_error);
  }
});

matchers.push({
  re: /^https?:\/\/(?:www\.)?svtplay\.se\.?\//,
  permissions: isFirefox ? {
    origins: ["https://www.svtplay.se/"],
  } : null,
  func: (_, url) => {
    fetch(url.toString()).then(get_text).then((text) => {
      const re = /root\['__svtplay_apollo'\] = ({.+})/.exec(text);
      if (!re) {
        return
      }
      const apollo = JSON.parse(re[1]);
      console.log(apollo);
      const root = apollo["ROOT_QUERY"];
      console.log(root);

      const ids = Array.from(new Set(flatten(
        Object.entries(root).filter(([key, value]) => {
          return key.startsWith("listablesByEscenicId");
        }).map(([key, value]) => {
          console.log(key,value);
          return value.map(v => v.id);
        }))));
      console.log(ids);
      ids.map(id => apollo[id]).filter(v => v !== undefined).forEach((variant) => {
        console.log(variant);
        const svtId = variant.svtId;
        const data_url = `https://api.svt.se/video/${svtId}`;
        update_filename(`${svtId}.mp4`);
        update_json_url(data_url);
        console.log(data_url);
        fetch(data_url).then(get_json).then(svt_callback).catch(api_error);
      });
    });
  }
});

matchers.push({
  re: /^https?:\/\/(?:www\.)?svt\.se\.?\//,
  func: async function(_, url) {
    if (ret = /^(?:\/barnkanalen)?\/barnplay\/([^/]+)\/([^/?]+)/.exec(url.pathname)) {
      const data_url = `https://api.svt.se/video/${ret[2]}`;
      update_filename(`${ret[1]}.mp4`);
      update_json_url(data_url);
      console.log(data_url);
      fetch(data_url).then(get_json).then(svt_callback).catch(api_error);
      return;
    }

    const data = await fetch(`https://api.svt.se/nss-api/page${url.pathname}?q=articles`).then(get_json).catch(api_error);
    console.log(data);
    if (!data) return;

    let ids = flatten(data.articles.content.filter(a => a.media).map(article => article.media.filter(m => m.image && m.image.isVideo && m.image.svtId).map(m => m.image.svtId)));
    console.log(ids);

    ids.forEach(function(svtId) {
      const data_url = `https://api.svt.se/video/${svtId}`;
      update_filename(`${svtId}.mp4`);
      update_json_url(data_url);
      console.log(data_url);
      fetch(data_url).then(get_json).then(svt_callback).catch(api_error);
    });
  }
});
