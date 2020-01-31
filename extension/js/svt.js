// SVT Play:
// Example URL:
// https://www.svtplay.se/video/21564078/veckans-brott/veckans-brott-avsnitt-7
// Data URL:
// https://api.svt.se/video/K5w23M5
//
// SVT Play Live:
// Example URL:
// https://www.svtplay.se/kanaler/svt1
// Data URL:
// https://api.svt.se/video/ch-svt1
//
// SVT
// Example URL:
// https://www.svt.se/nyheter/vetenskap/1700-tals-instrumentet-som-raddade-astronauterna-pa-den-forsta-manresan
// Find <video data-video-id='21472022'> in source code.
// Data URL:
// https://api.svt.se/videoplayer-api/video/21472022
//
// https://www.oppetarkiv.se/video/3192653/pippi-langstrump-avsnitt-2-av-13
// https://api.svt.se/videoplayer-api/video/1120284-002OA


function svt_callback() {
  console.log(this)
  if (this.status == 404 && this.responseURL.startsWith("https://api.svt.se/video/")) {
    // Somewhat ugly fix until I can figure out a better way to determine where to send the request to in the first place...
    var data_url = this.responseURL.replace("https://api.svt.se/video/", "https://api.svt.se/videoplayer-api/video/")
    $("#open_json").href = data_url
    console.log(data_url)
    var xhr = new XMLHttpRequest()
    xhr.addEventListener("load", svt_callback)
    xhr.open("GET", data_url)
    xhr.send()
    return
  }
  if (this.status != 200) {
    api_error(this.responseURL, this.status)
    return
  }

  var data = JSON.parse(this.responseText)
  console.log(data)
  if (data.programTitle) {
    var fn = `${data.programTitle} - ${data.episodeTitle}.mp4`
  }
  else {
    var fn = `${data.episodeTitle}.mp4`
  }

  var dropdown = $("#streams")
  var formats = "hls,hds,websrt,webvtt".split(",")
  var streams = data.videoReferences
  if (data.subtitleReferences) {
    streams = streams.concat(data.subtitleReferences)
  }
  console.log(streams)
  streams.filter(function(stream) {
    return (formats.indexOf(stream.format) != -1)
  })
  .sort(function(a,b) {
    return (formats.indexOf(a.format) > formats.indexOf(b.format))
  })
  .forEach(function(stream) {
    if (stream.format == "hds") {
      stream.url = add_param(stream.url, "hdcore=3.5.0") // ¯\_(ツ)_/¯
    }

    var option = document.createElement("option")
    option.value = stream.url
    option.setAttribute("data-filename", fn)
    option.appendChild(document.createTextNode(extract_filename(stream.url)))
    if (stream.format == "websrt" || stream.format == "webvtt") {
      option.appendChild(document.createTextNode(" (undertexter)"))
    }
    dropdown.appendChild(option)

    if (stream.format == "hls") {
      var base_url = stream.url.replace(/\/[^/]+$/, "/")
      var xhr = new XMLHttpRequest()
      xhr.addEventListener("load", master_callback(data.contentDuration, fn, base_url))
      xhr.open("GET", stream.url)
      xhr.send()
    }
  })

  update_cmd()
  update_filename(fn)
}

matchers.push({
  re: /^https?:\/\/(?:www\.)?(?:svt|svtplay|oppetarkiv)\.se\//,
  func: function(ret) {
    // look for <video data-video-id='7779272'> and <a data-id="7748504"> and <iframe src="articleId=7748504">
    // video ids contain characters on oppetarkiv.se
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
        var data_url = `https://api.svt.se/video/${video_id}`
        update_filename(`${video_id}.mp4`)
        $("#open_json").href = data_url

        console.log(data_url)
        var xhr = new XMLHttpRequest()
        xhr.addEventListener("load", svt_callback)
        xhr.open("GET", data_url)
        xhr.send()
      })
    })
  }
})
