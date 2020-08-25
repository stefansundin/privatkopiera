// SVT Play:
// Example URL:
// https://www.svtplay.se/video/25786024/veckans-brott/veckans-brott-redaktionen-skandiamannen-det-hetaste-palmesparet-del-2-av-2
// Data URL:
// https://api.svt.se/video/jVk9NXV
//
// SVT Play Live:
// Example URL:
// https://www.svtplay.se/kanaler/svt1
// Data URL:
// https://api.svt.se/video/ch-svt1
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
//
// https://www.oppetarkiv.se/video/3192653/pippi-langstrump-avsnitt-2-av-13
// https://api.svt.se/videoplayer-api/video/1120284-002OA


function svt_callback(data) {
  console.log(data)
  let fn
  if (data.programTitle) {
    fn = `${data.programTitle} - ${data.episodeTitle}.mp4`
  }
  else {
    fn = `${data.episodeTitle}.mp4`
  }

  const dropdown = $("#streams")
  const formats = "hls,hds,websrt,webvtt".split(",")
  let streams = data.videoReferences
  if (data.subtitleReferences) {
    streams = streams.concat(data.subtitleReferences)
  }
  console.log(streams)
  streams.filter(function(stream) {
    return (formats.includes(stream.format))
  })
  .sort(function(a,b) {
    return (formats.indexOf(a.format) - formats.indexOf(b.format))
  })
  .forEach(function(stream) {
    if (stream.format == "hds") {
      stream.url = add_param(stream.url, "hdcore=3.5.0") // ¯\_(ツ)_/¯
    }

    const option = document.createElement("option")
    option.value = stream.url
    option.setAttribute("data-filename", fn)
    option.appendChild(document.createTextNode(extract_filename(stream.url)))
    if (stream.format == "websrt" || stream.format == "webvtt") {
      option.appendChild(document.createTextNode(" (undertexter)"))
    }
    dropdown.appendChild(option)

    if (stream.format == "hls") {
      const base_url = stream.url.replace(/\/[^/]+$/, "/")
      fetch(stream.url).then(get_text).then(master_callback(data.contentDuration, fn, base_url)).catch(api_error)
    }
  })

  update_filename(fn)
  update_cmd()
}

matchers.push({
  re: /^https?:\/\/(?:www\.)?svtplay\.se\.?\//,
  func: (_, url) => {
    chrome.tabs.executeScript({
      code: `(function(){
        var scripts = document.getElementsByTagName("script");
        for (var i=0; i < scripts.length; i++) {
          var re = /root\\['__svtplay_apollo'\\] = ({.+})/.exec(scripts[i].textContent);
          if (!re) {
            continue;
          }
          return re[1];
        }
      })()`
    }, (ret) => {
      console.log(ret)
      flatten(ret).forEach((json) => {
        const apollo = JSON.parse(json)
        console.log(apollo)

        for (const [key, value] of Object.entries(apollo["ROOT_QUERY"])) {
          if (!key.startsWith("listablesByEscenicId")) {
            continue
          }
          value.forEach((v) => {
            const variant = apollo[v.id]
            if (!variant) {
              return
            }
            console.log(variant)
            const svtId = variant.svtId
            const data_url = `https://api.svt.se/video/${svtId}`
            update_filename(`${svtId}.mp4`)
            update_json_url(data_url)
            console.log(data_url)
            fetch(data_url).then(get_json).then(svt_callback).catch(api_error)
          })
        }
      })
    })
  }
})

matchers.push({
  re: /^https?:\/\/(?:www\.)?oppetarkiv\.se\.?\//,
  func: function(_, url) {
    chrome.tabs.executeScript({
      code: `(function(){
        var ids = [];
        var article = document.querySelectorAll("article.svtArticleOpen")[0] || document.querySelectorAll("article[role='main']")[0] || document;
        var videos = article.getElementsByTagName("video");
        for (var i=0; i < videos.length; i++) {
          var id = videos[i].getAttribute("data-video-id");
          if (id) {
            ids.push(id);
          }
        }
        var links = article.getElementsByTagName("a");
        for (var i=0; i < links.length; i++) {
          var href = links[i].getAttribute("data-json-href");
          var ret;
          if (ret = /articleId=(\\d+)/.exec(href)) {
            ids.push(parseInt(ret[1], 10));
          }
        }
        var iframes = article.getElementsByTagName("iframe");
        for (var i=0; i < iframes.length; i++) {
          var src = iframes[i].getAttribute("src");
          var ret;
          if (ret = /articleId=(\\d+)/.exec(src)) {
            ids.push(parseInt(ret[1], 10));
          }
        }
        return ids;
      })()`
    }, function(ids) {
      console.log(ids)
      flatten(ids).forEach(function(video_id) {
        const data_url = `https://api.svt.se/videoplayer-api/video/${video_id}`
        update_filename(`${video_id}.mp4`)
        update_json_url(data_url)
        console.log(data_url)
        fetch(data_url).then(get_json).then(svt_callback).catch(api_error)
      })
    })
  }
})

matchers.push({
  re: /^https?:\/\/(?:www\.)?svt\.se\.?\//,
  func: async function(_, url) {
    if (ret = /^(?:\/barnkanalen)?\/barnplay\/([^/]+)\/([^/?]+)/.exec(url.pathname)) {
      const data_url = `https://api.svt.se/video/${ret[2]}`
      update_filename(`${ret[1]}.mp4`)
      update_json_url(data_url)
      console.log(data_url)
      fetch(data_url).then(get_json).then(svt_callback).catch(api_error)
      return
    }

    const data = await fetch(`https://api.svt.se/nss-api/page${url.pathname}?q=articles`).then(get_json).catch(api_error)
    console.log(data)
    if (!data) return

    let ids = flatten(data.articles.content.filter(a => a.media).map(article => article.media.filter(m => m.image && m.image.isVideo && m.image.svtId).map(m => m.image.svtId)))
    console.log(ids)

    ids.forEach(function(svtId) {
      const data_url = `https://api.svt.se/video/${svtId}`
      update_filename(`${svtId}.mp4`)
      update_json_url(data_url)
      console.log(data_url)
      fetch(data_url).then(get_json).then(svt_callback).catch(api_error)
    })
  }
})
