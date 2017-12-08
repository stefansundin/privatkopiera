// TV4
// Example URL:
// https://www.tv4.se/nyhetsmorgon/klipp/n%C3%A4men-h%C3%A4r-sover-peter-dalle-under-tommy-k%C3%B6rbergs-framtr%C3%A4dande-3349622
// Data URL:
// https://prima.tv4play.se/api/web/asset/3349622/play.json?protocol=HLS3
//
// TV4 Play
// Example URL:
// https://www.tv4play.se/program/nyheterna/3349759
// Data URL:
// https://prima.tv4play.se/api/web/asset/3349759/play.json?protocol=HLS3
//
// Multiple items:
// https://www.tv4play.se/program/jul-med-ernst/3946707
// https://prima.tv4play.se/api/web/asset/3946707/play.json?protocol=HLS3


function tv4play_callback() {
  console.log(this)
  if (this.status != 200) {
    api_error(this.responseURL, this.status)
    return
  }

  var data = JSON.parse(this.responseText)
  update_filename(`${data.playback.title}.mp4`)

  var streams = []
  var items = data.playback.items.item
  if (!(items instanceof Array)) {
    items = [items]
  }
  items.forEach(function(item) {
    console.log(item.mediaFormat)
    if (item.mediaFormat == "wvm" || item.mediaFormat == "mp4" || item.mediaFormat == "webvtt") {
      streams.push({
        url: item.url,
        mediaFormat: item.mediaFormat,
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
  re: /^https?:\/\/(?:www\.)?tv4(?:play)?\.se\/.*(?:-|\/)(\d+)/,
  func: function(ret) {
    var video_id = ret[1]
    var data_url = `https://prima.tv4play.se/api/web/asset/${video_id}/play.json?protocol=HLS3`
    update_filename(`${video_id}.mp4`)
    $("#open_json").href = data_url

    console.log(data_url)
    var xhr = new XMLHttpRequest()
    xhr.addEventListener("load", tv4play_callback)
    xhr.open("GET", data_url)
    xhr.send()
  }
})
