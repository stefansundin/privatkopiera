version = "v#{chrome.runtime.getManifest().version}"

$ = ->
  elements = document.querySelectorAll.apply(document, arguments)
  if arguments[0][0] == "#"
    elements[0]
  else
    elements

update_cmd = ->
  select = $("#streams")
  select.title = select.value.substr(select.value.lastIndexOf("/")+1).replace(/[?#].+/, "")
  url = select.value
  filename = $("#filename").value
  $("#cmd").value = "ffmpeg -i \"#{url}\" -acodec copy -vcodec copy -absf aac_adtstoasc \"#{filename}\""

master_callback = ->
  console.log(this)
  if this.status != 200
    $("#error").innerHTML = "Fel: <a target='_blank' href='#{this.responseURL}'>API</a> svarade med #{this.status}."
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
    $("#error").innerHTML = "Fel: <a target='_blank' href='#{this.responseURL}'>API</a> svarade med #{this.status}."
    return

  data = JSON.parse(this.responseText)
  filename = "#{data.context.title}.mp4"
  $("#filename").value = filename

  stream = data.video.videoReferences.find (stream) -> stream.url.indexOf(".m3u8") != -1
  m3u8_url = stream.url.replace(/\?.+/, "")
  option = $("#streams").getElementsByTagName("option")[0]
  option.value = m3u8_url

  update_cmd()
  console.log(m3u8_url)

  xhr = new XMLHttpRequest()
  xhr.addEventListener("load", master_callback)
  xhr.open("GET", m3u8_url)
  xhr.send()

live_callback = ->
  console.log(this)
  if this.status != 200
    $("#error").innerHTML = "Fel: <a target='_blank' href='#{this.responseURL}'>API</a> svarade med #{this.status}."
    return

  data = JSON.parse(this.responseText)
  filename = "#{data.video.title}.mp4"
  $("#filename").value = filename

  stream = data.video.videoReferences.find (stream) -> stream.url.indexOf(".m3u8") != -1
  m3u8_url = stream.url
  option = $("#streams").getElementsByTagName("option")[0]
  option.value = m3u8_url

  update_cmd()
  console.log(m3u8_url)

  xhr = new XMLHttpRequest()
  xhr.addEventListener("load", master_callback)
  xhr.open("GET", m3u8_url)
  xhr.send()

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
      filename = "#{ret[3] || ret[2] || ret[1]}.mp4"
      json_url = "http://www.svtplay.se/video/#{video_id}?output=json"
      $("#filename").value = filename
      $("#open_json").href = json_url

      xhr = new XMLHttpRequest()
      xhr.addEventListener("load", video_callback)
      xhr.open("GET", json_url)
      xhr.send()
    else if ret = /^https?:\/\/(?:www\.)?svtplay\.se\/kanaler(?:\/([^/]+))?/.exec(url)
      channel = ret[1]
      filename = "#{channel || "svt1"}.mp4"
      json_url = "http://www.svtplay.se/api/channel_page"
      json_url += ";channel=#{channel}" if channel
      $("#filename").value = filename
      $("#open_json").href = json_url

      console.log(json_url)
      xhr = new XMLHttpRequest()
      xhr.addEventListener("load", live_callback) #(channel))
      xhr.open("GET", json_url)
      xhr.send()
    else
      $("#error").innerHTML = "Fel: Hittade ej video i URL."
