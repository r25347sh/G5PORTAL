/**
 * IPアドレス情報 — public IP + geolocation via free APIs
 */
(function () {
  "use strict";

  var statusEl = document.getElementById("status");
  var infoGrid = document.getElementById("info-grid");
  var toastEl = document.getElementById("toast");
  var toastTimer = null;
  var currentIp = "";

  var fields = {
    ip: document.getElementById("ip"),
    country: document.getElementById("country"),
    city: document.getElementById("city"),
    region: document.getElementById("region"),
    postal: document.getElementById("postal"),
    coords: document.getElementById("coords"),
    timezone: document.getElementById("timezone"),
    isp: document.getElementById("isp"),
    asn: document.getElementById("asn")
  };

  function showToast(msg) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.remove("hidden");
    toastEl.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      toastEl.classList.remove("show");
      setTimeout(function () {
        toastEl.classList.add("hidden");
      }, 280);
    }, 1800);
  }

  function setStatus(text, cls) {
    statusEl.textContent = text;
    statusEl.className = "status " + (cls || "");
  }

  function fill(data) {
    currentIp = data.ip || data.query || "";
    fields.ip.textContent = currentIp || "—";
    fields.country.textContent = [data.country_name || data.country, data.country_code || data.countryCode]
      .filter(Boolean).join(" · ") || "—";
    fields.city.textContent = data.city || "—";
    fields.region.textContent = data.region || data.regionName || "—";
    fields.postal.textContent = data.postal || data.zip || "—";
    var lat = data.latitude != null ? data.latitude : data.lat;
    var lon = data.longitude != null ? data.longitude : data.lon;
    fields.coords.textContent = (lat != null && lon != null) ? lat + ", " + lon : "—";
    fields.timezone.textContent = data.timezone || "—";
    fields.isp.textContent = data.org || data.isp || data.organization || "—";
    fields.asn.textContent = data.asn || data.as || "—";
    infoGrid.classList.remove("hidden");
  }

  function fetchJson(url) {
    return fetch(url, { cache: "no-store" }).then(function (r) {
      if (!r.ok) throw new Error("HTTP " + r.status);
      return r.json();
    });
  }

  function lookup(ip) {
    setStatus("取得中…", "loading");
    infoGrid.classList.add("hidden");

    var target = (ip || "").trim();
    var url;

    if (target) {
      url = "https://ipapi.co/" + encodeURIComponent(target) + "/json/";
    } else {
      url = "https://ipapi.co/json/";
    }

    fetchJson(url)
      .then(function (data) {
        if (data.error) throw new Error(data.reason || data.error || "API error");
        fill(data);
        setStatus("取得完了 · " + new Date().toLocaleTimeString("ja-JP"), "ok");
      })
      .catch(function () {
        // fallback: ipify + ip-api
        var ipPromise = target
          ? Promise.resolve(target)
          : fetchJson("https://api.ipify.org?format=json").then(function (d) { return d.ip; });

        ipPromise
          .then(function (ipAddr) {
            return fetchJson("https://ip-api.com/json/" + encodeURIComponent(ipAddr) + "?fields=status,message,query,country,countryCode,regionName,city,zip,lat,lon,timezone,isp,org,as");
          })
          .then(function (data) {
            if (data.status === "fail") throw new Error(data.message || "fail");
            fill({
              ip: data.query,
              country_name: data.country,
              country_code: data.countryCode,
              region: data.regionName,
              city: data.city,
              postal: data.zip,
              latitude: data.lat,
              longitude: data.lon,
              timezone: data.timezone,
              org: data.org || data.isp,
              asn: data.as
            });
            setStatus("取得完了（フォールバック） · " + new Date().toLocaleTimeString("ja-JP"), "ok");
          })
          .catch(function (err) {
            console.error(err);
            setStatus("取得に失敗しました。ネットワークを確認してください。", "error");
            showToast("IP情報の取得に失敗しました");
          });
      });
  }

  document.getElementById("btn-refresh").addEventListener("click", function () {
    lookup("");
  });

  document.getElementById("btn-lookup").addEventListener("click", function () {
    var v = document.getElementById("lookup-ip").value.trim();
    lookup(v);
  });

  document.getElementById("lookup-ip").addEventListener("keydown", function (e) {
    if (e.key === "Enter") {
      e.preventDefault();
      document.getElementById("btn-lookup").click();
    }
  });

  document.getElementById("btn-copy-ip").addEventListener("click", function () {
    if (!currentIp) {
      showToast("コピーする IP がありません");
      return;
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(currentIp).then(
        function () { showToast("IP をコピーしました"); },
        function () { showToast("コピーに失敗しました"); }
      );
    } else {
      showToast("クリップボードに対応していません");
    }
  });

  lookup("");
})();
