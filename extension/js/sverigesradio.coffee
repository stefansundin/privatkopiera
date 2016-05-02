# Example URL:
# https://sverigesradio.se/sida/artikel.aspx?programid=493&artikel=6411195
# Data URL:
# http://sverigesradio.se/sida/ajax/getplayerinfo?url=%2Fsida%2Fartikel.aspx%3Fprogramid%3D493%26artikel%3D6411195%26playaudio%3D5677543&isios=false&playertype=html5


sr_callback = ->
  console.log(this)
  if this.status != 200
    api_error(this.responseURL, this.status)
    return

  data = JSON.parse(this.responseText)
  update_filename("#{data.playerInfo.Title}.m4a")

  if data.playerInfo.AudioSources
    dropdown = $("#streams")
    data.playerInfo.AudioSources
    .sort (a,b) -> a.Quality < b.Quality
    .forEach (stream) ->
      kbps = stream.Quality
      kbps = kbps / 1000 if kbps > 1000
      ext = extract_extension(stream.Url) || "mp3"
      option = document.createElement("option")
      option.value = stream.Url
      option.setAttribute("data-filename", "#{data.playerInfo.Title}.#{ext}")
      option.appendChild document.createTextNode("#{data.playerInfo.Title} (#{kbps} kbps)")
      dropdown.appendChild option

    update_cmd()


matchers.push
  re: /^https?:\/\/(?:www\.)?sverigesradio\.se(\/.*)/
  func: (ret) ->
    path = ret[1]
    data_url = "https://sverigesradio.se/sida/ajax/getplayerinfo?url=#{encodeURIComponent(path)}&isios=false&playertype=html5"
    $("#open_json").href = data_url

    console.log(data_url)
    xhr = new XMLHttpRequest()
    xhr.addEventListener("load", sr_callback)
    xhr.open("GET", data_url)
    xhr.send()

    # Find related audio that do not have urls of their own
    chrome.tabs.executeScript
      code: '(function(){
        var urls = [];
        var related = document.getElementsByClassName("article-details__related-audios")[0];
        if (related) {
          var links = related.getElementsByTagName("a");
          for (var i=0; i < links.length; i++) {
            urls.push(links[i].href);
          }
        }
        return urls;
      })()'
      , (urls) ->
        console.log(urls)
        flatten(urls).forEach (url) ->
          path = url.replace(/^https?:\/\/[^/]+/, "")
          console.log(path)
          data_url = "https://sverigesradio.se/sida/ajax/getplayerinfo?url=#{encodeURIComponent(path)}&isios=false&playertype=html5"

          console.log(data_url)
          xhr = new XMLHttpRequest()
          xhr.addEventListener("load", sr_callback)
          xhr.open("GET", data_url)
          xhr.send()
