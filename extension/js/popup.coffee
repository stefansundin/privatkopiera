version = "v#{chrome.runtime.getManifest().version}"
matchers = []

flatten = (arr) ->
  arr.reduce (a, b) ->
    if b.constructor == Array
      a.concat(b)
    else
      a.concat([b])
  , []

fmt_filesize = (bytes, digits=2) ->
  units = ['B', 'kiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB', 'ZiB', 'YiB'];
  i = 0
  while bytes > 1024 and i < units.length
    bytes = bytes / 1024
    i++
  digits = 0 if i < 3
  size = if i > 0 then bytes.toFixed(digits) else bytes
  "#{size} #{units[i]}"

$ = ->
  elements = document.querySelectorAll.apply(document, arguments)
  if arguments[0][0] == "#"
    elements[0]
  else
    elements

extract_filename = (url) ->
  url = url.replace(/\?.+/, "")
  url.substr(url.lastIndexOf("/")+1).replace(/[?#].*/, "")

extract_extension = (url) ->
  fn = extract_filename(url)
  dot = fn.lastIndexOf(".")
  if dot != -1
    fn.substr(dot+1)

add_param = (url, param) ->
  if url.indexOf("?") == -1
    "#{url}?#{param}"
  else
    "#{url}&#{param}"

update_filename = (fn) ->
  # replace illegal characters
  $("#filename").value = fn.replace(/[:*?"<>|]/g, '').replace(/\t+/, ' ')

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

update_cmd = (e) ->
  filename = $("#filename")
  select = $("#streams")
  if e?.target == select or filename.value == ""
    option = select.selectedOptions[0]
    fn = option.getAttribute("data-filename")
    update_filename fn if fn

  url = select.value
  fn = filename.value
  stream_fn = extract_filename(url)
  stream_ext = extract_extension(url)
  select.title = stream_fn
  if stream_ext == "f4m"
    $("#cmd").value = "php AdobeHDS.php --delete --manifest \"#{url}\" --outfile \"#{fn}\""
  else if stream_ext == "webvtt" or stream_ext == "wsrt"
    fn = fn.replace(".mp4", ".srt")
    $("#cmd").value = "ffmpeg -i \"#{url}\" \"#{fn}\""
  else if stream_ext == "m4a" or stream_ext == "mp3" or /^https?:\/\/http-live\.sr\.se/.test(url)
    $("#cmd").value = url
    $("#copy").className += " hidden"
    $("#download").className = "btn btn-primary"
    label = $("label[for='cmd']")[0]
    label.removeChild(label.firstChild) while label.hasChildNodes()
    label.appendChild document.createTextNode("URL")
  else
    $("#cmd").value = "ffmpeg -i \"#{url}\" -acodec copy -vcodec copy -absf aac_adtstoasc \"#{fn}\""

master_callback = (length, fn) -> ->
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
    stream.url = stream.url.replace(/[?#].*/, "")
    if /^https?:\/\//.test(stream.url)
      url = stream.url
    else
      url = base_url+stream.url
    option.value = url
    option.setAttribute("data-filename", fn)
    info = stream.resolution
    info += ", ~#{fmt_filesize(1.05*length*stream.bitrate/8)}" if length # the calculation is off by about 5%, probably because of audio and overhead
    option.appendChild document.createTextNode("#{kbps} kbps (#{info})")
    dropdown.insertBefore option, default_option
  dropdown.getElementsByTagName("option")[0].selected = true
  update_cmd()

document.addEventListener "DOMContentLoaded", ->
  $("#extension_version").textContent = version

  $("#copy").addEventListener "click", ->
    cmd = $("#cmd")
    cmd.select()
    document.execCommand("copy")
    cmd.blur()

  $("#download").addEventListener "click", ->
    chrome.downloads.download
      url: $("#cmd").value
      filename: $("#filename").value

  $("#filename").addEventListener "change", update_cmd
  $("#streams").addEventListener "change", update_cmd

  chrome.tabs.query { active: true, lastFocusedWindow: true }, (tabs) ->
    url = tabs[0].url
    $("#url").value = url

    matched = matchers.find (m) ->
      if ret = m.re.exec(url)
        m.func(ret)
        return true

    if !matched
      error("Fel: Den här hemsidan stöds ej.")
