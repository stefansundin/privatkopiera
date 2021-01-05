const version = `v${chrome.runtime.getManifest().version}`
const isFirefox = navigator.userAgent.includes("Firefox/")
let matchers = []
let tab_url, url, site

function flatten(arr) {
  if (!Array.isArray(arr)) return []
  return arr.reduce(function(a, b) {
    if (!b) {
      return a
    }
    else if (b.constructor == Array) {
      return a.concat(b)
    }
    else {
      return a.concat([b])
    }
  }, [])
}

function toObject(arr) {
  const obj = {}
  arr.forEach(function(e) {
    obj[e[0]] = e[1]
  })
  return obj
}

function fmt_filesize(bytes, digits=2) {
  const units = ['B', 'kiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB', 'ZiB', 'YiB']
  let i = 0
  while (bytes > 1024 && i < units.length) {
    bytes = bytes / 1024
    i++
  }
  if (i < 3) {
    digits = 0
  }
  if (i > 0) {
    size = bytes.toFixed(digits)
  }
  else {
    size = bytes
  }
  return `${size} ${units[i]}`
}

function $() {
  const elements = document.querySelectorAll.apply(document, arguments)
  if (arguments[0][0] == "#") {
    return elements[0]
  }
  else {
    return elements
  }
}

function extract_filename(url) {
  url = url.replace(/\?.+/, "")
  return url.substr(url.lastIndexOf("/")+1).replace(/[?#].*/, "")
}

function extract_extension(url) {
  const fn = extract_filename(url)
  const dot = fn.lastIndexOf(".")
  if (dot != -1) {
    return fn.substr(dot+1).toLowerCase()
  }
}

function add_param(url, param) {
  if (url.includes("?")) {
    return `${url}&${param}`
  }
  else {
    return `${url}?${param}`
  }
}

function parse_pt(pt) {
  const ret = /^PT(\d+H)?(\d+M)?(\d+(?:\.\d+)?S)?$/.exec(pt)
  if (ret == null) return 0
  let duration = 0
  if (ret[1]) {
    duration += 60 * 60 * parseInt(ret[1], 10)
  }
  if (ret[2]) {
    duration += 60 * parseInt(ret[2], 10)
  }
  if (ret[3]) {
    duration += parseFloat(ret[3])
  }
  return duration
}

function update_filename(fn) {
  // replace illegal characters
  $("#filename").value = fn.replace(/[/\\:]/g, '-').replace(/[*?"<>|!]/g, '').replace(/\t+/, ' ')
}

function update_json_url(url) {
  $("#open_json").href = url
  $("#open_json").classList.remove("d-none")
}

function call_func() {
  if (ret = site.re.exec(tab_url)) {
    site.func(ret, url)
  }
}

function get_json(response) {
  console.log(response)
  if (response.ok) {
    return response.json()
  }
  throw response
}

function get_text(response) {
  console.log(response)
  if (response.ok) {
    return response.text()
  }
  throw response
}

function error(text) {
  const el = $("#info")
  while (el.hasChildNodes()) {
    el.removeChild(el.firstChild)
  }
  el.appendChild(document.createTextNode(text))
}

function api_error(e) {
  console.log(e)
  const el = $("#info")
  while (el.hasChildNodes()) {
    el.removeChild(el.firstChild)
  }
  if (e instanceof Response) {
    el.appendChild(document.createTextNode("Fel: "))
    let a = document.createElement("a")
    a.target = "_blank"
    a.href = e.url
    a.appendChild(document.createTextNode("API"))
    el.appendChild(a)
    el.appendChild(document.createTextNode(` svarade med kod `))
    a = document.createElement("a")
    a.target = "_blank"
    a.href = `https://httpstatuses.com/${e.status}`
    a.appendChild(document.createTextNode(e.status))
    el.appendChild(a)
    el.appendChild(document.createTextNode("."))
  }
  else {
    el.appendChild(document.createTextNode(`Error: ${e.message}`))
  }
}

function download_info(program) {
  const el = $("#info")
  while (el.hasChildNodes()) {
    el.removeChild(el.firstChild)
  }
  el.appendChild(document.createTextNode("För att ladda ned den här strömmen krävs "))
  const a = document.createElement("a")
  a.target = "_blank"
  a.href = `https://stefansundin.github.io/privatkopiera/#${program.toLowerCase()}`
  a.appendChild(document.createTextNode(program))
  el.appendChild(a)
  el.appendChild(document.createTextNode(`.`))
}

function update_cmd(e) {
  const filename = $("#filename")
  const select = $("#streams")
  const option = select.selectedOptions[0]
  const audio_stream = option.getAttribute("data-audio-stream")

  if ((e && e.target == select) || filename.value == "") {
    const fn = option.getAttribute("data-filename")
    if (fn) {
      update_filename(fn)
    }
  }

  const cmd = $("#cmd")
  const url = select.value
  let fn = filename.value
  const ext = extract_extension(fn)
  const stream_fn = extract_filename(url)
  const stream_ext = extract_extension(url)
  select.title = stream_fn
  if (stream_ext == "f4m") {
    cmd.value = `php AdobeHDS.php --delete --manifest "${url}" --outfile "${fn}"`
  }
  else if (stream_ext == "webvtt" || stream_ext == "wsrt" || stream_ext == "vtt") {
    if (fn.endsWith(".mp4")) {
      fn = fn.replace(/\.mp4$/, ".srt")
    }
    else {
      fn += ".srt"
    }
    cmd.value = `ffmpeg -i "${url}" "${fn}"`
  }
  else if (stream_ext == "m4a" || stream_ext == "mp3" || /^https?:\/\/http-live\.sr\.se/.test(url)) {
    cmd.value = url
    $("#copy").classList.add("d-none")
    $("#download").classList.remove("d-none")
    label = $("label[for='cmd']")[0]
    while (label.hasChildNodes()) {
      label.removeChild(label.firstChild)
    }
    label.appendChild(document.createTextNode("URL"))
  }
  else if (ext == "m4a") {
    cmd.value = `ffmpeg -i "${url}" -acodec copy -absf aac_adtstoasc "${fn}"`
  }
  else if (audio_stream) {
    cmd.value = `ffmpeg -i "${url}" -i "${audio_stream}" -acodec copy -vcodec copy -absf aac_adtstoasc "${fn}"`
  }
  else {
    cmd.value = `ffmpeg -i "${url}" -acodec copy -vcodec copy -absf aac_adtstoasc "${fn}"`
  }
  cmd.setAttribute("data-url", url)

  if (cmd.value.startsWith("ffmpeg")) {
    download_info("FFmpeg")
  }
  else if (cmd.value.startsWith("php AdobeHDS.php")) {
    download_info("AdobeHDS")
  }
}

function master_callback(length, fn, base_url) {
  return function(text) {
    console.log(text)

    const ext_x_media = {}
    const streams = []
    let params
    text.split("\n").forEach(function(line) {
      if (line.length == 0) {
        return
      }
      console.log(line)
      if (line.startsWith("#")) {
        if (!line.includes(":")) return
        const type = line.substring(1, line.indexOf(":"))
        const args = line.substring(line.indexOf(":")+1).match(/[A-Z\-]+=(?:"[^"]*"|[^,]*)/g)
        if (!args) return
        const obj = toObject(args.map(function(arg) {
          const k = arg.substring(0, arg.indexOf("="))
          let v = arg.substring(arg.indexOf("=")+1)
          if (v.startsWith('"') && v.endsWith('"')) {
            v = v.substring(1, v.length-1)
          }
          return [k, v]
        }))
        console.log(obj)
        if (type == "EXT-X-MEDIA") { // && obj["TYPE"] == "AUDIO") {
          ext_x_media[obj["TYPE"]] = obj
        }
        else if (type == "EXT-X-STREAM-INF") {
          params = obj
        }
      }
      else {
        let url = line
        if (!/^https?:\/\//.test(url)) {
          url = base_url+url
        }
        streams.push({
          bitrate: parseInt(params["BANDWIDTH"], 10),
          params: params,
          url: url,
        })
      }
    })
    console.log(streams)

    const dropdown = $("#streams")
    const default_option = dropdown.getElementsByTagName("option")[0]

    streams.sort(function(a,b) { return b.bitrate-a.bitrate }).forEach(function(stream) {
      const kbps = Math.round(stream.bitrate / 1000)
      const option = document.createElement("option")
      option.value = stream.url
      option.appendChild(document.createTextNode(`${kbps} kbps`))
      option.setAttribute("data-filename", fn)
      if (ext_x_media["AUDIO"]) {
        option.setAttribute("data-audio-stream", base_url+ext_x_media["AUDIO"]["URI"])
      }
      if (stream.params["RESOLUTION"]) {
        let info = stream.params["RESOLUTION"]
        if (length) {
          // the calculation is off by about 5%, probably because of audio and overhead
          info += `, ~${fmt_filesize(1.05*length*stream.bitrate/8)}`
        }
        option.appendChild(document.createTextNode(` (${info})`))
      }
      dropdown.insertBefore(option, default_option)
    })
    dropdown.getElementsByTagName("option")[0].selected = true
    update_cmd()
  }
}

document.addEventListener("DOMContentLoaded", function() {
  $("#extension_version").textContent = version

  $("#expand").addEventListener("click", function() {
    document.body.classList.toggle("expand")
    const expanded = document.body.classList.contains("expand")
    $("#expand").textContent = expanded ? "»" : "«"
    localStorage.setItem("expanded", expanded.toString())
  })

  const expanded = (localStorage.getItem("expanded") == "true")
  if (expanded) {
    $("#expand").click()
  }

  $("#copy").addEventListener("click", function(e) {
    e.preventDefault()
    const cmd = $("#cmd")
    if (e.shiftKey) {
      // copy only the URL if the shift key is held
      const url = cmd.getAttribute("data-url")
      cmd.value = url
    }
    cmd.select()
    document.execCommand("copy")
    cmd.blur()
  })

  $("#grant_permissions").addEventListener("click", function(e) {
    chrome.permissions.request(site.permissions, function(granted) {
      // The popup is automatically closed, so this does not really matter
      // It stays open if "Inspect Popup" is used
      if (granted) {
        $("#copy").classList.remove("d-none")
        $("#grant_permissions").classList.add("d-none")
        $("#streams").disabled = false
        $("#filename").disabled = false
        $("#cmd").disabled = false
        call_func()
      }
      else {
        error("Fel: Behörigheter ej beviljade.")
      }
    })
  })

  $("#download").addEventListener("click", function() {
    chrome.permissions.request({
      permissions: ["downloads"]
    }, function(granted) {
      if (!granted) {
        return
      }
      chrome.downloads.download({
        url: $("#cmd").value,
        filename: $("#filename").value
      })
    })
  })

  const cmd = $("#cmd")
  const cmd_height = localStorage.getItem("cmd-height")
  if (cmd_height != undefined) {
    cmd.style.height = cmd_height
  }
  new ResizeObserver((entries) => {
    for (let entry of entries) {
      localStorage.setItem("cmd-height", entry.target.style.height)
    }
  }).observe(cmd)

  $("#streams").addEventListener("input", update_cmd)
  $("#filename").addEventListener("input", update_cmd)

  chrome.tabs.query({ active: true, lastFocusedWindow: true }, function(tabs) {
    tab_url = tabs[0].url
    if (!tab_url) {
      return
    }
    if (tab_url.startsWith("chrome-extension://klbibkeccnjlkjkiokjodocebajanakg/suspended.html")) {
      // Tab suspended with The Great Suspender. Your mileage may vary.
      tab_url = tab_url.split("&uri=")[1]
    }
    url = new URL(tab_url)
    $("#url").value = tab_url
    console.log(tab_url)

    if (site = matchers.find(m => m.re.test(tab_url))) {
      if (site.permissions) {
        chrome.permissions.contains(site.permissions, function(result) {
          if (result) {
            call_func()
          }
          else {
            $("#copy").classList.add("d-none")
            $("#grant_permissions").classList.remove("d-none")
            $("#streams").disabled = true
            $("#filename").disabled = true
            $("#cmd").disabled = true
          }
        })
        return true
      }
      call_func()
    }
    else {
      error("Fel: Den här hemsidan stöds ej.")
    }
  })
})
