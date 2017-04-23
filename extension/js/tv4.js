// TV4
// Example URL:
// http://www.tv4.se/nyhetsmorgon/klipp/n%C3%A4men-h%C3%A4r-sover-peter-dalle-under-tommy-k%C3%B6rbergs-framtr%C3%A4dande-3349622
// Data URL:
// https://prima.tv4play.se/api/web/asset/3349622/play
//
// TV4 Play
// Example URL:
// http://www.tv4play.se/program/nyheterna?video_id=3349759
// Data URL:
// https://prima.tv4play.se/api/web/asset/3349759/play


function tv4play_callback() {
  console.log(this)
  if (this.status != 200) {
    api_error(this.responseURL, this.status)
    return
  }

  var parser = new window.DOMParser()
  var data = parser.parseFromString(this.responseText, "text/xml")

  var title = data.getElementsByTagName("title")[0].textContent
  update_filename(`${title}.mp4`)

  var streams = []
  toa(data.getElementsByTagName("item")).forEach(function(item) {
    var mediaFormat = item.getElementsByTagName("mediaFormat")[0].textContent
    console.log(mediaFormat)
    if (mediaFormat == "wvm" || mediaFormat == "mp4" || mediaFormat == "webvtt") {
      var url = item.getElementsByTagName("url")[0].textContent
      if (mediaFormat == "mp4") {
        url = add_param(url, "hdcore=3.5.0") // ¯\_(ツ)_/¯
      }
      streams.push({
        url: url,
        mediaFormat: mediaFormat
      })
    }
  })

  var dropdown = $("#streams")
  var order = "wvm,mp4,webvtt".split(",")
  streams.sort(function(a,b) {
    return order.indexOf(a.mediaFormat) > order.indexOf(b.mediaFormat)
  })
  .forEach(function(stream) {
    var option = document.createElement("option")
    option.value = stream.url
    option.appendChild(document.createTextNode(stream.mediaFormat))
    if (stream.mediaFormat == "webvtt") {
      option.appendChild(document.createTextNode(" (undertexter)"))
    }
    dropdown.appendChild(option)
  })

  update_cmd()
  console.log(url)
}

matchers.push({
  re: /^https?:\/\/(?:www\.)?tv4(?:play)?\.se\/.*(?:video_id=|-)(\d+)/,
  func: function(ret) {
    var video_id = ret[1]
    var data_url = `https://prima.tv4play.se/api/web/asset/${video_id}/play`
    update_filename(`${video_id}.mp4`)
    $("#open_json").href = data_url

    console.log(data_url)
    var xhr = new XMLHttpRequest()
    xhr.addEventListener("load", tv4play_callback)
    xhr.open("GET", data_url)
    xhr.send()
  }
})
