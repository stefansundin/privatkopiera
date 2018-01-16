var version = `v${chrome.runtime.getManifest().version}`
var matchers = []

function flatten(arr) {
  return arr.reduce(function(a, b) {
    if (!b) {
      return a;
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
  var obj = {}
  arr.forEach(function(e) {
    obj[e[0]] = e[1]
  })
  return obj
}

function fmt_filesize(bytes, digits=2) {
  var units = ['B', 'kiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB', 'ZiB', 'YiB']
  var i = 0
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
  var elements = document.querySelectorAll.apply(document, arguments)
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
  var fn = extract_filename(url)
  var dot = fn.lastIndexOf(".")
  if (dot != -1) {
    return fn.substr(dot+1)
  }
}

function add_param(url, param) {
  if (url.indexOf("?") == -1) {
    return `${url}?${param}`
  }
  else {
    return `${url}&${param}`
  }
}

function update_filename(fn) {
  // replace illegal characters
  $("#filename").value = fn.replace(/[/\\:]/g, '-').replace(/[*?"<>|]/g, '').replace(/\t+/, ' ')
}

function error(text) {
  var el = $("#info")
  while (el.hasChildNodes()) {
    el.removeChild(el.firstChild)
  }
  el.appendChild(document.createTextNode(text))
}

function api_error(url, code) {
  var el = $("#info")
  while (el.hasChildNodes()) {
    el.removeChild(el.firstChild)
  }
  el.appendChild(document.createTextNode("Fel: "))
  var a = document.createElement("a")
  a.target = "_blank"
  a.href = url
  a.appendChild(document.createTextNode("API"))
  el.appendChild(a)
  el.appendChild(document.createTextNode(` svarade med ${code}`))
}

function download_info(program) {
  var el = $("#info")
  while (el.hasChildNodes()) {
    el.removeChild(el.firstChild)
  }
  el.appendChild(document.createTextNode("För att ladda ned den här strömmen krävs "))
  var a = document.createElement("a")
  a.target = "_blank"
  a.href = `https://stefansundin.github.io/privatkopiera/#${program.toLowerCase()}`
  a.appendChild(document.createTextNode(program))
  el.appendChild(a)
  el.appendChild(document.createTextNode(`.`))
}

function update_cmd(e) {
  var filename = $("#filename")
  var select = $("#streams")
  if ((e && e.target == select) || filename.value == "") {
    var option = select.selectedOptions[0]
    var fn = option.getAttribute("data-filename")
    if (fn) {
      update_filename(fn)
    }
  }

  var cmd = $("#cmd")
  var url = select.value
  var fn = filename.value
  var stream_fn = extract_filename(url)
  var stream_ext = extract_extension(url)
  select.title = stream_fn
  if (stream_ext == "f4m") {
    cmd.value = `php AdobeHDS.php --delete --manifest "${url}" --outfile "${fn}"`
  }
  else if (stream_ext == "webvtt" || stream_ext == "wsrt") {
    fn = fn.replace(".mp4", ".srt")
    cmd.value = `ffmpeg -i "${url}" "${fn}"`
  }
  else if (stream_ext == "m4a" || stream_ext == "mp3" || /^https?:\/\/http-live\.sr\.se/.test(url)) {
    cmd.value = url
    $("#copy").classList.add("hidden")
    $("#download").classList.remove("hidden")
    label = $("label[for='cmd']")[0]
    while (label.hasChildNodes()) {
      label.removeChild(label.firstChild)
    }
    label.appendChild(document.createTextNode("URL"))
  }
  else {
    cmd.value = `ffmpeg -i "${url}" -acodec copy -vcodec copy -absf aac_adtstoasc "${fn}"`
  }

  if (cmd.value.startsWith("ffmpeg")) {
    download_info("FFmpeg")
  }
  else if (cmd.value.startsWith("php AdobeHDS.php")) {
    download_info("AdobeHDS")
  }
}

function master_callback(length, fn, base_url) {
  return function() {
    console.log(this)
    if (this.status != 200) {
      api_error(this.responseURL, this.status)
      return
    }

    var header = "#EXT-X-STREAM-INF:"
    var streams = []
    var params
    this.responseText.split("\n").forEach(function(line) {
      if (line.length == 0) {
        return;
      }
      if (line.startsWith(header)) {
        params = toObject(line.substr(header.length).match(/[A-Z\-]+=("[^"]*"|[^,]*)/g).map((arg) => arg.split("=")))
      }
      else if (!line.startsWith("#")) {
        var url = line
        if (!/^https?:\/\//.test(url)) {
          url = base_url+url
        }
        streams.push({
          bitrate: parseInt(params["BANDWIDTH"], 10),
          resolution: params["RESOLUTION"],
          url: url,
        })
      }
    })
    console.log(streams)

    var dropdown = $("#streams")
    var default_option = dropdown.getElementsByTagName("option")[0]

    streams.sort(function(a,b) { return b.bitrate-a.bitrate }).forEach(function(stream) {
      var kbps = stream.bitrate / 1000
      var option = document.createElement("option")
      option.value = stream.url
      option.setAttribute("data-filename", fn)
      var info = stream.resolution
      if (length) {
        // the calculation is off by about 5%, probably because of audio and overhead
        info += `, ~${fmt_filesize(1.05*length*stream.bitrate/8)}`
      }
      option.appendChild(document.createTextNode(`${kbps} kbps (${info})`))
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
    $("#expand").textContent = document.body.classList.contains("expand") ? "»" : "«"
  })

  $("#copy").addEventListener("click", function() {
    cmd = $("#cmd")
    cmd.select()
    document.execCommand("copy")
    cmd.blur()
  })

  $("#download").addEventListener("click", function() {
    chrome.downloads.download({
      url: $("#cmd").value,
      filename: $("#filename").value
    })
  })

  $("#filename").addEventListener("change", update_cmd)
  $("#streams").addEventListener("change", update_cmd)

  chrome.tabs.query({ active: true, lastFocusedWindow: true }, function(tabs) {
    var url = tabs[0].url
    $("#url").value = url

    var matched = matchers.find(function(m) {
      if (ret = m.re.exec(url)) {
        m.func(ret)
        return true
      }
    })

    if (!matched) {
      error("Fel: Den här hemsidan stöds ej.")
    }
  })
})
