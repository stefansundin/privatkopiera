// Example URL:
// https://tv.nrk.no/serie/ardna-tv/SAPP67004716/16-05-2016
// https://tv.nrk.no/serie/lindmo/MUHU12005817/14-10-2017
// https://tv.nrk.no/program/KOID75000216/bitcoineksperimentet
// Data URL:
// https://psapi-ne.nrk.no/mediaelement/SAPP67004716
// https://undertekst.nrk.no/prod/SAPP67/00/SAPP67004716AA/NOR/SAPP67004716AA.vtt



function nrk_callback() {
  console.log(this)
  if (this.status != 200) {
    api_error(this.responseURL, this.status)
    return
  }

  var data = JSON.parse(this.responseText)
  console.log(data)
  var fn = `${data.title}.mp4`
  if (data.preplay && data.preplay.titles) {
    fn = `${data.preplay.titles.title} - ${data.preplay.titles.subtitle}.mp4`
  }

  var dropdown = $("#streams")
  var streams = []
  data.playable.parts.forEach(function(part) {
    streams = streams.concat(part.assets).concat(part.subtitles)
  })
  console.log(streams)
  streams.forEach(function(stream) {
    var option = document.createElement("option")
    option.value = stream.url || stream.webVtt
    option.setAttribute("data-filename", fn)
    option.appendChild(document.createTextNode(extract_filename(option.value)))
    if (stream.webVtt) {
      option.appendChild(document.createTextNode(` (undertexter ${stream.label})`))
    }
    dropdown.appendChild(option)

    if (stream.format == "HLS") {
      var base_url = stream.url.replace(/\/[^/]+$/, "/")
      var xhr = new XMLHttpRequest()
      xhr.addEventListener("load", master_callback(null, fn, base_url))
      xhr.open("GET", stream.url)
      xhr.send()
    }
  })

  update_cmd()
  update_filename(fn)
}

matchers.push({
  re: /^https?:\/\/tv\.nrk\.no\/(?:program|serie\/[^/]+)\/([^/?]+)/,
  func: function(ret) {
    var video_id = ret[1]
    var data_url = `https://psapi-ne.nrk.no/mediaelement/${video_id}`
    update_filename(`${video_id}.mp4`)
    $("#open_json").href = data_url

    console.log(data_url)
    var xhr = new XMLHttpRequest()
    xhr.addEventListener("load", nrk_callback)
    xhr.open("GET", data_url)
    xhr.setRequestHeader("Accept", "application/vnd.nrk.psapi+json; version=9; ludo-client=true; psapi=snapshot");
    xhr.send()
  }
})
