version = "v#{chrome.runtime.getManifest().version}"

$ = ->
  document.querySelectorAll.apply(document, arguments)

update_cmd = ->
  url = $("#streams")[0].value
  filename = $("#filename")[0].value
  $("#cmd")[0].value = "ffmpeg -i \"#{url}\" -acodec copy -vcodec copy -absf aac_adtstoasc \"#{filename}\""

master_callback = ->
  console.log(this)
  if this.status != 200
    $("#error")[0].innerHTML = "Fel: <a target='_blank' href='#{this.responseURL}'>API</a> svarade med #{this.status}."
    return

  data = this.responseText
  dropdown = $("#streams")[0]

  streams = []
  re = /^#EXT-X-STREAM-INF:PROGRAM-ID=1,BANDWIDTH=(\d+),RESOLUTION=(\d+x\d+).*\n(.+)$/gm
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
    $("#error")[0].innerHTML = "Fel: <a target='_blank' href='#{this.responseURL}'>API</a> svarade med #{this.status}."
    return

  data = JSON.parse(this.responseText)
  filename = "#{data.context.title}.mp4"
  $("#filename")[0].value = filename

  stream = data.video.videoReferences.find (stream) -> stream.url.indexOf(".m3u8") != -1
  m3u8_url = stream.url.replace(/\?.+/, "")
  option = $("#streams")[0].getElementsByTagName("option")[0]
  option.value = m3u8_url

  update_cmd()
  console.log(m3u8_url)

  xhr = new XMLHttpRequest()
  xhr.addEventListener("load", master_callback)
  xhr.open("GET", m3u8_url)
  xhr.send()

document.addEventListener "DOMContentLoaded", ->
  $("#extension_version")[0].textContent = version

  $("#copy")[0].addEventListener "click", ->
    cmd = $("#cmd")[0]
    cmd.select()
    document.execCommand("copy")
    cmd.blur()

  $("#filename")[0].addEventListener "input", update_cmd
  $("#streams")[0].addEventListener "input", update_cmd

  chrome.tabs.query { active: true, lastFocusedWindow: true }, (tabs) ->
    url = tabs[0].url
    $("#url")[0].value = url

    ret = /^https?:\/\/(?:www\.)?svtplay\.se\/video\/(\d+)(?:\/([^/]+)\/([^/?#]+))?/.exec(url)
    if ret
      video_id = ret[1]
      serie = ret[2]
      filename = "#{ret[3] || ret[2] || ret[1]}.mp4"
      json_url = "http://www.svtplay.se/video/#{video_id}?output=json"
      $("#filename")[0].value = filename
      $("#open_json")[0].href = json_url

      xhr = new XMLHttpRequest()
      xhr.addEventListener("load", video_callback)
      xhr.open("GET", json_url)
      xhr.send()
    else
      $("#error")[0].innerHTML = "Fel: Hittade ej video id i URL."
