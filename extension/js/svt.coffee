# SVT Play:
# Example URL:
# http://www.svtplay.se/video/5661566/leif-gw-persson-min-klassresa/leif-gw-persson-min-klassresa-leif-gw-persson-min-klassresa-avsnitt-2
# Data URL:
# http://www.svtplay.se/video/5661566?output=json

# SVT Play Live:
# Example URL:
# http://www.svtplay.se/kanaler/svt1
# Data URL:
# http://www.svtplay.se/api/channel_page;channel=svt2

# SVT
# Example URL:
# http://www.svt.se/nyheter/utrikes/trudeau-viral-efter-kvantforklaring
# Find <video data-video-id='7871492'> in source code.
# Data URL:
# http://www.svt.se/videoplayer-api/video/7871492


svtplay_callback = ->
  console.log(this)
  if this.status != 200
    api_error(this.responseURL, this.status)
    return

  data = JSON.parse(this.responseText)
  update_filename("#{data.context.title}.mp4")

  dropdown = $("#streams")
  order = "m3u8,f4m,wsrt".split(",")
  streams = data.video.videoReferences.concat(data.video.subtitleReferences)
  console.log(streams)
  streams.filter (stream) ->
    ext = extract_extension(stream.url)
    ext == "m3u8" or ext == "f4m" or ext == "wsrt"
  .sort (a,b) ->
    a_ext = extract_extension(a.url)
    b_ext = extract_extension(b.url)
    order.indexOf(a_ext) > order.indexOf(b_ext)
  .forEach (stream) ->
    stream.url = stream.url.replace(/[?#].*/, "")
    ext = extract_extension(stream.url)
    if ext == "f4m"
      stream.url += "?hdcore=3.5.0" # ¯\_(ツ)_/¯

    option = document.createElement("option")
    option.value = stream.url
    option.appendChild document.createTextNode(extract_filename(stream.url))
    if ext == "wsrt"
      option.appendChild document.createTextNode(" (undertexter)")
    dropdown.appendChild option

    if ext == "m3u8"
      xhr = new XMLHttpRequest()
      xhr.addEventListener("load", master_callback(data.video.materialLength))
      xhr.open("GET", stream.url)
      xhr.send()

  update_cmd()

svtplay_live_callback = ->
  console.log(this)
  if this.status != 200
    api_error(this.responseURL, this.status)
    return

  data = JSON.parse(this.responseText)
  update_filename("#{data.video.title}.mp4")
  stream = data.video.videoReferences.find (stream) -> stream.url.indexOf(".m3u8") != -1
  m3u8_url = stream.url

  option = document.createElement("option")
  option.value = m3u8_url
  option.appendChild document.createTextNode(extract_filename(m3u8_url))
  $("#streams").appendChild option

  update_cmd()
  console.log(m3u8_url)

  xhr = new XMLHttpRequest()
  xhr.addEventListener("load", master_callback())
  xhr.open("GET", m3u8_url)
  xhr.send()

svt_callback = ->
  console.log(this)
  if this.status != 200
    api_error(this.responseURL, this.status)
    return

  data = JSON.parse(this.responseText)
  update_filename("#{data.episodeTitle}.mp4")

  dropdown = $("#streams")
  order = "hls,hds".split(",")
  data.videoReferences.filter (stream) ->
    stream.format == "hds" or stream.format == "hls"
  .sort (a,b) ->
    order.indexOf(a.format) > order.indexOf(b.format)
  .forEach (stream) ->
    stream.url = stream.url.replace(/[?#].*/, "")
    if stream.format == "hds"
      stream.url += "?hdcore=3.5.0" # ¯\_(ツ)_/¯

    option = document.createElement("option")
    option.value = stream.url
    option.appendChild document.createTextNode(extract_filename(stream.url))
    dropdown.appendChild option

    if stream.format == "hls"
      xhr = new XMLHttpRequest()
      xhr.addEventListener("load", master_callback(data.contentDuration))
      xhr.open("GET", stream.url)
      xhr.send()

  update_cmd()


matchers.push
  re: /^https?:\/\/(?:www\.)?svtplay\.se\/video\/(\d+)(?:\/([^/]+)\/([^/?#]+))?/
  func: (ret) ->
    video_id = ret[1]
    serie = ret[2]
    json_url = "http://www.svtplay.se/video/#{video_id}?output=json"
    update_filename("#{ret[3] || ret[2] || ret[1]}.mp4")
    $("#open_json").href = json_url

    xhr = new XMLHttpRequest()
    xhr.addEventListener("load", svtplay_callback)
    xhr.open("GET", json_url)
    xhr.send()

matchers.push
  re: /^https?:\/\/(?:www\.)?svtplay\.se\/kanaler(?:\/([^/]+))?/
  func: (ret) ->
    channel = ret[1]
    json_url = "http://www.svtplay.se/api/channel_page"
    json_url += ";channel=#{channel}" if channel
    update_filename("#{channel || "svt1"}.mp4")
    $("#open_json").href = json_url

    console.log(json_url)
    xhr = new XMLHttpRequest()
    xhr.addEventListener("load", svtplay_live_callback)
    xhr.open("GET", json_url)
    xhr.send()

matchers.push
  re: /^https?:\/\/(?:www\.)?svt\.se\//
  func: (ret) ->
    # look for <video data-video-id='7779272'> and <a data-id="7748504"> and <iframe src="articleId=7748504">
    chrome.tabs.executeScript
      code: '(function(){
        var ids = [];
        var article = document.querySelectorAll("article.svtArticleOpen")[0] || document.querySelectorAll("article[role=\'main\']")[0] || document;
        var videos = article.getElementsByTagName("video");
        for (var i=0; i < videos.length; i++) {
          var id = videos[i].getAttribute("data-video-id");
          if (id) {
            ids.push(parseInt(id, 10));
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
      })()'
      , (ids) ->
        console.log(ids)
        ids[0].forEach (video_id) ->
          data_url = "http://www.svt.se/videoplayer-api/video/#{video_id}"
          update_filename("#{video_id}.mp4")
          $("#open_json").href = data_url

          console.log(data_url)
          xhr = new XMLHttpRequest()
          xhr.addEventListener("load", svt_callback)
          xhr.open("GET", data_url)
          xhr.send()
