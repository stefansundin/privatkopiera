version = "v#{chrome.runtime.getManifest().version}"

$ = ->
  elements = document.querySelectorAll.apply(document, arguments)
  if arguments[0][0] == "#"
    elements[0]
  else
    elements

extract_filename = (url) ->
  url.substr(url.lastIndexOf("/")+1).replace(/[?#].*/, "")

update_filename = (fn) ->
  # replace illegal characters
  $("#filename").value = fn.replace(/[:*?"<>|]/, '.').replace(/\t+/, ' ')

error = (text) ->
  el = $("#error")
  el.removeChild(el.firstChild) while el.hasChildNodes()
  el.appendChild document.createTextNode(text)

api_error = (url, code) ->
  el = $("#error")
  el.removeChild(el.firstChild) while el.hasChildNodes()
  el.appendChild document.createTextNode("Fel: ")
  a = document.createElement("a")
  a.target = "_blank"
  a.href = url
  a.appendChild document.createTextNode("API")
  el.appendChild a
  el.appendChild document.createTextNode(" svarade med #{code}")

update_cmd = ->
  select = $("#streams")
  url = select.value
  stream_fn = extract_filename(url)
  select.title = stream_fn
  filename = $("#filename").value
  if stream_fn.indexOf(".f4m") != -1
    $("#cmd").value = "php AdobeHDS.php --delete --manifest \"#{url}\" --outfile \"#{filename}\""
  else if stream_fn.indexOf(".webvtt") != -1
    filename = filename.replace(".mp4", ".srt")
    $("#cmd").value = "ffmpeg -i \"#{url}\" \"#{filename}\""
  else
    $("#cmd").value = "ffmpeg -i \"#{url}\" -acodec copy -vcodec copy -absf aac_adtstoasc \"#{filename}\""

master_callback = ->
  console.log(this)
  if this.status != 200
    api_error(this.responseURL, this.status)
    return

  data = this.responseText
  dropdown = $("#streams")

  streams = []
  re = /^#EXT-X-STREAM-INF:.*BANDWIDTH=(\d+),RESOLUTION=(\d+x\d+).*\n(.+)$/gm

  while (ret = re.exec(data)) != null
    streams.push
      bitrate: parseInt(ret[1], 10)
      resolution: ret[2]
      url: ret[3]

  default_option = dropdown.getElementsByTagName("option")[0]
  kbps = streams[0].bitrate / 1000
  default_option.appendChild document.createTextNode(" (#{kbps} kbps)")
  base_url = default_option.value.replace(/master\.m3u8.*$/, "")

  streams.sort((a,b) -> b.bitrate-a.bitrate).forEach (stream) ->
    kbps = stream.bitrate / 1000
    option = document.createElement("option")
    if /^https?:\/\//.test(stream.url)
      url = stream.url
    else
      url = base_url+stream.url
    option.value = url
    option.appendChild document.createTextNode("#{kbps} kbps (#{stream.resolution})")
    dropdown.insertBefore option, default_option
  dropdown.getElementsByTagName("option")[0].selected = true
  update_cmd()

video_callback = ->
  console.log(this)
  if this.status != 200
    api_error(this.responseURL, this.status)
    return

  data = JSON.parse(this.responseText)
  update_filename("#{data.context.title}.mp4")
  stream = data.video.videoReferences.find (stream) -> stream.url.indexOf(".m3u8") != -1
  m3u8_url = stream.url.replace(/\?.+/, "")

  option = document.createElement("option")
  option.value = m3u8_url
  option.appendChild document.createTextNode(extract_filename(m3u8_url))
  $("#streams").appendChild option

  update_cmd()
  console.log(m3u8_url)

  xhr = new XMLHttpRequest()
  xhr.addEventListener("load", master_callback)
  xhr.open("GET", m3u8_url)
  xhr.send()

live_callback = ->
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
  xhr.addEventListener("load", master_callback)
  xhr.open("GET", m3u8_url)
  xhr.send()

tv4play_callback = ->
  console.log(this)
  if this.status != 200
    api_error(this.responseURL, this.status)
    return

  parser = new window.DOMParser()
  data = parser.parseFromString(this.responseText, "text/xml")

  title = data.getElementsByTagName("title")[0].textContent
  update_filename("#{title}.mp4")

  streams = []
  for item in data.getElementsByTagName("item")
    mediaFormat = item.getElementsByTagName("mediaFormat")[0].textContent
    console.log(mediaFormat)
    if mediaFormat == "wvm" or mediaFormat == "mp4" or mediaFormat == "webvtt"
      url = item.getElementsByTagName("url")[0].textContent
      if mediaFormat == "mp4"
        url += "?hdcore=3.5.0" # ¯\_(ツ)_/¯
      streams.push
        url: url
        mediaFormat: mediaFormat

  dropdown = $("#streams")
  order = "wvm,mp4,webvtt".split(",")
  streams = streams.sort (a,b) -> order.indexOf(a.mediaFormat) > order.indexOf(b.mediaFormat)
  for stream in streams
    option = document.createElement("option")
    option.value = stream.url
    option.appendChild document.createTextNode("#{stream.mediaFormat}")
    if stream.mediaFormat == "webvtt"
      option.appendChild document.createTextNode(" (undertexter)")
    dropdown.appendChild option

  update_cmd()
  console.log(url)

document.addEventListener "DOMContentLoaded", ->
  $("#extension_version").textContent = version

  $("#copy").addEventListener "click", ->
    cmd = $("#cmd")
    cmd.select()
    document.execCommand("copy")
    cmd.blur()

  $("#filename").addEventListener "change", update_cmd
  $("#streams").addEventListener "change", update_cmd

  chrome.tabs.query { active: true, lastFocusedWindow: true }, (tabs) ->
    url = tabs[0].url
    $("#url").value = url

    if ret = /^https?:\/\/(?:www\.)?svtplay\.se\/video\/(\d+)(?:\/([^/]+)\/([^/?#]+))?/.exec(url)
      video_id = ret[1]
      serie = ret[2]
      json_url = "http://www.svtplay.se/video/#{video_id}?output=json"
      update_filename("#{ret[3] || ret[2] || ret[1]}.mp4")
      $("#open_json").href = json_url

      xhr = new XMLHttpRequest()
      xhr.addEventListener("load", video_callback)
      xhr.open("GET", json_url)
      xhr.send()
    else if ret = /^https?:\/\/(?:www\.)?svtplay\.se\/kanaler(?:\/([^/]+))?/.exec(url)
      channel = ret[1]
      json_url = "http://www.svtplay.se/api/channel_page"
      json_url += ";channel=#{channel}" if channel
      update_filename("#{channel || "svt1"}.mp4")
      $("#open_json").href = json_url

      console.log(json_url)
      xhr = new XMLHttpRequest()
      xhr.addEventListener("load", live_callback)
      xhr.open("GET", json_url)
      xhr.send()
    else if ret = /^https?:\/\/(?:www\.)?tv4(?:play)?\.se\/.*(?:video_id=|-)(\d+)/.exec(url)
      video_id = ret[1]
      data_url = "https://prima.tv4play.se/api/web/asset/#{video_id}/play"
      update_filename("#{video_id}.mp4")
      $("#open_json").href = data_url

      console.log(data_url)
      xhr = new XMLHttpRequest()
      xhr.addEventListener("load", tv4play_callback)
      xhr.open("GET", data_url)
      xhr.send()
    else if ret = /^https?:\/\/(?:www\.)?tv4play\.se\/kanaler(?:\/([^/]+))?/.exec(url)
      chrome.tabs.executeScript
        code: '(function(){ return document.getElementsByClassName("js-player-container")[0].getAttribute("data-asset") })()'
        , (result) ->
          data = JSON.parse(result[0])
          console.log(data)
          video_id = data.id
          data_url = "https://prima.tv4play.se/api/web/asset/#{video_id}/play"
          update_filename("#{video_id}.mp4")
          $("#open_json").href = data_url

          console.log(data_url)
          xhr = new XMLHttpRequest()
          xhr.addEventListener("load", tv4play_callback)
          xhr.open("GET", data_url)
          xhr.send()
    else
      error("Fel: Hittade ej video i URL.")
