/**
 * グループ分け — random / size-based grouping
 */
(function () {
  "use strict";

  var membersEl = document.getElementById("members");
  var modeEl = document.getElementById("mode");
  var numEl = document.getElementById("num");
  var numLabel = document.getElementById("num-label");
  var shuffleEl = document.getElementById("shuffle");
  var balanceEl = document.getElementById("balance");
  var resultArea = document.getElementById("result-area");
  var groupsEl = document.getElementById("groups");
  var toastEl = document.getElementById("toast");
  var toastTimer = null;
  var lastGroups = null;

  var SAMPLE = [
    "田中", "佐藤", "鈴木", "高橋", "伊藤", "渡辺",
    "山本", "中村", "小林", "加藤", "吉田", "山田",
    "佐々木", "山口", "松本", "井上", "木村", "林"
  ].join("\n");

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

  function parseMembers() {
    return membersEl.value
      .split(/\r?\n/)
      .map(function (s) { return s.trim(); })
      .filter(Boolean);
  }

  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i];
      a[i] = a[j];
      a[j] = t;
    }
    return a;
  }

  function divide(list, groupCount, balanced) {
    var n = list.length;
    if (groupCount < 1) groupCount = 1;
    if (groupCount > n) groupCount = n;
    var groups = [];
    for (var g = 0; g < groupCount; g++) groups.push([]);

    if (balanced) {
      var base = Math.floor(n / groupCount);
      var rem = n % groupCount;
      var idx = 0;
      for (var i = 0; i < groupCount; i++) {
        var size = base + (i < rem ? 1 : 0);
        for (var k = 0; k < size; k++) {
          groups[i].push(list[idx++]);
        }
      }
    } else {
      for (var j = 0; j < n; j++) {
        groups[j % groupCount].push(list[j]);
      }
    }
    return groups;
  }

  function run() {
    var members = parseMembers();
    if (members.length < 2) {
      showToast("メンバーを2人以上入力してください");
      return;
    }

    var mode = modeEl.value;
    var num = parseInt(numEl.value, 10) || 2;
    if (mode === "size") {
      num = Math.max(1, Math.min(50, num));
    } else {
      num = Math.max(2, Math.min(50, num));
    }
    numEl.value = num;

    var list = shuffleEl.checked ? shuffle(members) : members.slice();
    var groups;

    if (mode === "size") {
      var sizeTarget = num;
      groups = [];
      var temp = list.slice();
      while (temp.length > 0) {
        groups.push(temp.splice(0, sizeTarget));
      }
    } else {
      var groupCount = Math.min(num, list.length);
      groups = divide(list, groupCount, balanceEl.checked);
    }

    lastGroups = groups;
    render(groups);
    resultArea.classList.remove("hidden");
    showToast(groups.length + " グループに分けました");
  }

  function render(groups) {
    groupsEl.innerHTML = "";
    var colors = ["var(--cyan)", "var(--pink)", "var(--gold)", "var(--purple)"];
    groups.forEach(function (g, i) {
      var card = document.createElement("div");
      card.className = "group-card";
      var title = document.createElement("div");
      title.className = "group-title";
      title.innerHTML =
        '<span style="color:' + colors[i % colors.length] + '">グループ ' + (i + 1) + "</span>" +
        '<span class="group-count">' + g.length + " 人</span>";
      var ul = document.createElement("ul");
      ul.className = "group-members";
      g.forEach(function (name) {
        var li = document.createElement("li");
        li.textContent = name;
        ul.appendChild(li);
      });
      card.appendChild(title);
      card.appendChild(ul);
      groupsEl.appendChild(card);
    });
  }

  function copyResult() {
    if (!lastGroups || !lastGroups.length) {
      showToast("コピーする結果がありません");
      return;
    }
    var lines = lastGroups.map(function (g, i) {
      return "【グループ " + (i + 1) + "】(" + g.length + "人)\n" + g.join("\n");
    });
    var text = lines.join("\n\n");
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(
        function () { showToast("結果をコピーしました"); },
        function () { fallbackCopy(text); }
      );
    } else {
      fallbackCopy(text);
    }
  }

  function fallbackCopy(t) {
    var ta = document.createElement("textarea");
    ta.value = t;
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand("copy");
      showToast("結果をコピーしました");
    } catch (e) {
      showToast("コピーに失敗しました");
    }
    document.body.removeChild(ta);
  }

  function updateModeLabel() {
    if (modeEl.value === "size") {
      numLabel.childNodes[0].textContent = "1グループの人数 ";
      numEl.min = 1;
      if (parseInt(numEl.value, 10) < 1) numEl.value = 2;
    } else {
      numLabel.childNodes[0].textContent = "グループ数 ";
      numEl.min = 2;
      if (parseInt(numEl.value, 10) < 2) numEl.value = 2;
    }
  }

  modeEl.addEventListener("change", updateModeLabel);
  document.getElementById("btn-run").addEventListener("click", run);
  document.getElementById("btn-rerun").addEventListener("click", run);
  document.getElementById("btn-copy").addEventListener("click", copyResult);
  document.getElementById("btn-clear").addEventListener("click", function () {
    membersEl.value = "";
    resultArea.classList.add("hidden");
    lastGroups = null;
    membersEl.focus();
  });
  document.getElementById("btn-sample").addEventListener("click", function () {
    membersEl.value = SAMPLE;
    showToast("サンプルを入力しました");
  });

  updateModeLabel();
})();
