/* ============ ItalyTrip iOS PWA · app logic ============ */
(function () {
  'use strict';

  var APP = document.getElementById('app');
  var viewer = document.getElementById('viewer');
  var viewerBody = document.getElementById('viewerBody');
  var viewerTitle = document.getElementById('viewerTitle');

  var TRIP = null;
  var tab = 'home';
  var tripsDay = 0;
  var outingItems = null;
  var outingDone = {};

  /* ---------- storage helpers ---------- */
  var DONE = {};
  function loadDone() {
    try { DONE = JSON.parse(localStorage.getItem('it_done') || '{}'); } catch (e) { DONE = {}; }
  }
  function saveDone() { try { localStorage.setItem('it_done', JSON.stringify(DONE)); } catch (e) {} }
  function isDone(key) { return !!DONE[key]; }
  function toggleDone(key) { DONE[key] = !DONE[key]; saveDone(); }

  var GROUPS = ['证件 · 票券', '电子设备', '随身 · 穿戴', '药品', '洗护 · 日用', '其他'];
  var GROUP_ICON = { '证件 · 票券': '📄', '电子设备': '📱', '随身 · 穿戴': '👓', '药品': '💊', '洗护 · 日用': '🧴', '其他': '🧳' };
  function defaultOuting() {
    return [
      ['护照', '随身包固定位置；出发前拍照备份'], ['身份证', ''], ['签证及相关打印件', ''], ['机票/酒店/火车票 PDF', 'App「票券中心」已离线内置，出发前确认可用'], ['保险单与紧急联系人', '存一份电子版在手机相册'], ['退税材料', '购物小票集中收纳，回国机场用'],
      ['手机', '充好电，确认国际漫游/eSIM 可用'], ['充电宝', '≤20000mAh 才可随身登机'], ['充电线', '至少带 2 根，防丢防坏'], ['欧标转换插头', '意大利为欧标两圆脚'], ['耳机', ''], ['相机 + 电池 + 存储卡', '出发前清空存储卡并充满电'],
      ['眼镜 / 隐形眼镜', '护理液别忘'], ['墨镜', ''], ['帽子', ''], ['轻便外套', '早晚凉、海边风大，10 月意大利温差明显'], ['舒适鞋', '每天两万步，鞋一定要舒服'],
      ['晕车 / 晕船药', '卡普里往返船班当天用'], ['肠胃药', '异国饮食肠胃易不适'], ['感冒药 / 退烧药', ''], ['创可贴', ''], ['个人常备处方药', '带足行程天数用量'],
      ['牙具', '牙刷牙膏'], ['洗护小样', '洗发/沐浴/护肤品'], ['防晒霜', ''], ['纸巾 / 湿巾', ''],
      ['行李锁', ''], ['折叠购物袋', '米兰购物日当天带'], ['颈枕 + 眼罩', '去程红眼航班用'], ['欧元现金 + 银行卡', '分开放，现金少量即可'],
    ];
  }
  function loadOutingGroups() {
    // built-in defaults grouped per category
    var groups = ['证件 · 票券','证件 · 票券','证件 · 票券','证件 · 票券','证件 · 票券','证件 · 票券',
      '电子设备','电子设备','电子设备','电子设备','电子设备','电子设备',
      '随身 · 穿戴','随身 · 穿戴','随身 · 穿戴','随身 · 穿戴','随身 · 穿戴',
      '药品','药品','药品','药品','药品','洗护 · 日用','洗护 · 日用','洗护 · 日用','洗护 · 日用',
      '其他','其他','其他','其他'];
    var raw = localStorage.getItem('it_outing');
    if (raw) {
      try { outingItems = JSON.parse(raw); return; } catch (e) {}
    }
    outingItems = defaultOuting().map(function (x, i) {
      return { uid: 'd' + (i + 100), name: x[0], note: x[1], group: groups[i], builtin: true };
    });
    saveOuting();
  }
  function saveOuting() { try { localStorage.setItem('it_outing', JSON.stringify(outingItems)); } catch (e) {} }
  function loadOutingDone() {
    try { outingDone = JSON.parse(localStorage.getItem('it_outing_done') || '{}'); } catch (e) { outingDone = {}; }
  }
  function saveOutingDone() { try { localStorage.setItem('it_outing_done', JSON.stringify(outingDone)); } catch (e) {} }

  /* ---------- tiny helpers ---------- */
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function ticketMeta(kind) {
    if (kind === 'train') return { tile: '🚄', cls: 'train' };
    if (kind === 'arena') return { tile: '🏛️', cls: 'arena' };
    if (kind === 'image') return { tile: '🍷', cls: 'image' };
    return { tile: '🖼️', cls: 'museum' };
  }
  function intensityPill(level, text) {
    return '<span class="pill ' + (level === 'low' ? 'green' : level === 'mid' ? 'gold' : 'soft') + '">⚡ ' + esc(text) + '</span>';
  }
  function tripStatus() {
    var now = new Date();
    var s = new Date(TRIP.start + 'T00:00:00');
    var e = new Date(TRIP.end + 'T00:00:00');
    if (now < s) {
      var d = Math.round((s - now) / 86400000);
      return { label: '距出发还有 ' + d + ' 天', progress: 0 };
    }
    if (now > e) return { label: '行程已圆满结束', progress: TRIP.days.length };
    var n = Math.min(Math.round((now - s) / 86400000) + 1, TRIP.days.length);
    return { label: '正在旅途 · 第 ' + n + ' / ' + TRIP.days.length + ' 天', progress: n };
  }

  /* ---------- views ---------- */
  function homeView() {
    var st = tripStatus();
    var html = '<div class="hero"><div class="eyebrow">ITALY · OFFLINE GUIDE</div>' +
      '<h1>' + esc(TRIP.title) + '</h1>' +
      '<div class="sub">' + esc(TRIP.days[0].dateCn) + ' — ' + esc(TRIP.days[TRIP.days.length - 1].dateCn) + ' · ' + TRIP.days.length + ' 天</div>' +
      '<div class="status">' + esc(st.label) + '</div>' +
      '<div class="track">' + TRIP.days.map(function (_, i) { return '<i class="' + (i < st.progress ? 'on' : '') + '"></i>'; }).join('') + '</div>' +
      '<div class="track-label">行程进度 ' + st.progress + ' / ' + TRIP.days.length + ' 天</div></div>';

    html += '<div class="search"><span>🔍</span><input id="hsearch" placeholder="搜索景点、车次、酒店或关键词…" value="' + esc(searchQuery) + '"><button class="x hidden" id="hclear">✕</button></div>';
    html += '<div id="homeBody">' + homeBody() + '</div>';
    return html;
  }

  var searchQuery = '';
  function homeBody() {
    var html = '';
    if (searchQuery.trim()) {
      var q = searchQuery.trim().toLowerCase();
      var hits = TRIP.days.filter(function (d) { return dayText(d).toLowerCase().indexOf(q) >= 0; });
      html += '<div class="card tint-soft"><div class="search-result-head">' + (hits.length ? '找到 ' + hits.length + ' 个相关行程日' : '没有找到相关内容，换个关键词试试') + '</div>' +
        hits.map(function (d) {
          return '<div class="day-row" data-act="openday" data-day="' + d.day + '"><div class="num">' + d.day + '</div><div class="info"><div class="route">' + esc(d.route) + '</div><div class="meta">Day ' + d.day + ' · ' + esc(d.dateCn) + '</div></div><div class="arrow">›</div></div>';
        }).join('') + '</div>';
      return html;
    }

    // outing quick card
    var items = outingItems || [];
    var doneCnt = items.filter(function (it) { return outingDone[it.uid]; }).length;
    var total = items.length;
    var complete = total > 0 && doneCnt === total;
    html += '<div class="quick gold" data-act="outing"><div class="qico">🧳</div><div>' +
      '<div class="qt">' + (complete ? '出门检查 · 全部确认 ✓' : '出门检查 · 别丢三落四') + '</div>' +
      '<div class="qd">' + (complete ? '今天可以放心出门了' : '还有 ' + (total - doneCnt) + ' 项必需品未确认，出发前点进来打勾') + '</div>' +
      '</div><div class="arrow">›</div></div>';

    // focus day
    var st = tripStatus();
    var focus = 0;
    if (st.progress > 0 && st.progress <= TRIP.days.length) focus = st.progress - 1;
    var fd = TRIP.days[focus];
    html += '<div class="card" style="border-color:rgba(201,155,63,.55)" data-act="openday" data-day="' + fd.day + '"><div class="card-title" style="margin-bottom:6px"><span class="num" style="width:40px;height:40px;border-radius:50%;background:var(--surface2);display:inline-flex;align-items:center;justify-content:center;font-family:Georgia,serif;font-weight:800">' + fd.day + '</span><span>' + focusLabel(st) + '</span></div><div style="font-size:16px;font-weight:800">' + esc(fd.route) + '</div><div class="muted" style="font-size:13px;margin-top:4px">' + esc(fd.dateCn) + ' · ' + esc(fd.intensityText) + '</div></div>';

    // route overview
    html += '<div class="card tint-soft"><div class="card-title">🗺 路线总览</div><div class="muted" style="font-size:13.5px">' + esc(TRIP.overview) + '</div></div>';

    html += '<div class="section-head"><b>全部行程日</b><span>共 ' + TRIP.days.length + ' 天</span></div>';
    html += TRIP.days.map(function (d) {
      return '<div class="day-row" data-act="openday" data-day="' + d.day + '"><div class="num">' + d.day + '</div><div class="info"><div class="route">' + esc(d.route) + (d.tickets.length ? ' 🎫' : '') + '</div><div class="meta">Day ' + d.day + ' · ' + esc(d.dateCn) + ' · ' + esc(d.intensityText) + '</div></div><div class="arrow">›</div></div>';
    }).join('');
    return html;
  }

  function focusLabel(st) {
    if (st.progress === 0) return '第一个行程日';
    if (st.progress > TRIP.days.length) return '最后一站回顾';
    return '今日行程';
  }

  function dayText(d) {
    var parts = [d.route, d.dateCn].concat(d.pack).concat(d.tickets.map(function (t) { return t.title + ' ' + t.note; }))
      .concat(d.transport.map(function (t) { return t.label + ' ' + t.detail + ' ' + t.tip; }))
      .concat(d.timeline.map(function (t) { return t.time + ' ' + t.event; }))
      .concat((d.decision || []).map(function (x) { return x.title + ' ' + x.desc; }));
    return parts.join(' ');
  }

  function tripsView() {
    var d = TRIP.days[tripsDay];
    var tabs = TRIP.days.map(function (x, i) {
      return '<button class="day-tab' + (i === tripsDay ? ' active' : '') + '" data-act="daytab" data-day="' + x.day + '">Day ' + x.day + '</button>';
    }).join('');
    var html = '<div class="trips-head"><button class="back" data-act="back">‹</button><div><div class="t1">行程计划 · DAY ' + d.day + ' / ' + TRIP.days.length + '</div><div class="t2">' + esc(d.dateCn) + ' · ' + esc(d.route) + '</div></div></div>';
    html += '<div class="day-tabs" id="daytabs">' + tabs + '</div>';
    html += '<div class="day-viewport" id="dayviewport">' + TRIP.days.map(function (x) {
      return '<div class="day-page">' + dayPage(x) + '</div>';
    }).join('') + '</div>';
    return html;
  }

  function dayPage(d) {
    var pm = d.pack.length, td = d.timeline.length;
    var pDone = 0, tDone = 0, i;
    for (i = 0; i < pm; i++) if (isDone('p:' + d.day + ':' + i)) pDone++;
    for (i = 0; i < td; i++) if (isDone('t:' + d.day + ':' + i)) tDone++;
    var doneAll = pDone + tDone;
    var totalAll = pm + td;

    var html = '<div class="dhero"><div class="eyebrow">DAY ' + d.day + '</div><div class="date">' + esc(d.dateCn) + '</div><div class="route">' + esc(d.route) + '</div>' +
      '<div class="chips"><span class="chip-w chip">⚡ ' + esc(d.intensityText) + '</span>' +
      (d.tickets.length ? '<span class="chip-w chip">🎫 ' + d.tickets.length + ' 张票券</span>' : '') +
      '<span class="chip chip-gold">✓ ' + doneAll + ' / ' + totalAll + ' 已完成</span></div></div>';

    html += '<div class="card"><div class="card-title">🎒 当日建议携带</div><div class="hint">点击条目可打勾，进度会自动保存</div><div class="chips">';
    html += d.pack.map(function (p, idx) {
      var k = 'p:' + d.day + ':' + idx;
      return '<span class="chip' + (isDone(k) ? ' done' : '') + '" data-act="toggle" data-key="' + k + '">' + (isDone(k) ? '✓ ' : '') + esc(p) + '</span>';
    }).join('');
    html += '</div></div>';

    if (d.tickets.length) {
      html += '<div class="card" style="background:var(--terra-soft);border-color:rgba(180,85,45,.25)"><div class="card-title">🎫 本日票券 / 离线文件</div>';
      html += d.tickets.map(function (t) {
        var m = ticketMeta(t.kind);
        return '<button class="doc-row" data-act="open" data-file="' + esc(t.file) + '"><span class="tile ' + m.cls + '">' + m.tile + '</span><span class="info"><span class="t">' + esc(t.title) + '</span><br><span class="n">' + esc(t.note) + '</span></span><span class="go">打开</span></button>';
      }).join('');
      html += '</div>';
    }

    if (d.transport.length) {
      html += '<div class="card"><div class="card-title">🚕 当日交通</div>';
      html += d.transport.map(function (t) {
        return '<div class="tr-item"><span class="bar"></span><div class="body"><div class="label">' + esc(t.label) + '</div><div class="detail">' + esc(t.detail) + '</div>' + (t.tip ? '<div class="tip">' + esc(t.tip) + '</div>' : '') + '</div></div>';
      }).join('');
      html += '</div>';
    }

    if (d.stay) {
      var st = d.stay;
      html += '<div class="card"><div class="card-title">🏠 ' + (st.kind === 'same' ? '住宿' : '住宿转换 / 住宿信息') + '</div>';
      if (st.kind === 'same') html += '<div class="muted">' + esc(st.note || '') + '</div>';
      else if (st.kind === 'flight') html += '<div class="stay-name">' + esc(st.name || '') + '</div><div class="muted" style="font-size:13px">' + esc(st.note || '') + '</div>';
      else html += '<div class="stay-name">' + esc(st.name || '') + '</div><div class="stay-addr">📍 ' + esc(st.address || '') + '</div><div class="tags">' +
        (st.checkIn ? '<span class="pill green">入住 ' + esc(st.checkIn) + '</span>' : '') +
        (st.checkOut ? '<span class="pill soft">退房 ' + esc(st.checkOut) + '</span>' : '') + '</div>';
      html += '</div>';
    }

    html += '<div class="card"><div class="card-title">🕒 时间节点与游览安排</div><div class="hint">点击条目打勾追踪进度（' + tDone + '/' + td + ' 已完成）</div><div class="timeline">';
    html += d.timeline.map(function (t, idx) {
      var k = 't:' + d.day + ':' + idx;
      var done = isDone(k);
      return '<div class="t-row' + (done ? ' done' : '') + '"><div class="t-time">' + esc(t.time) + '</div><div class="t-node"><i></i><span></span></div><div class="t-card" data-act="toggle" data-key="' + k + '">' + esc(t.event) + '</div></div>';
    }).join('');
    html += '</div></div>';

    if (d.decision && d.decision.length) {
      html += '<div class="card"><div class="card-title">🧭 当天决策规则</div><div class="hint">当天遇到不确定的情况，按这几条规则快速做决定</div>';
      html += d.decision.map(function (x) {
        return '<div class="dec-row"><span class="tag">' + esc(x.tag) + '</span><div><div style="font-weight:750;font-size:14px">' + esc(x.title) + '</div><div class="muted" style="font-size:12.5px">' + esc(x.desc) + '</div></div></div>';
      }).join('');
      html += '</div>';
    }

    html += '<div class="card nightly"><div class="card-title">🌙 每晚固定提醒</div><div class="muted" style="font-size:13.5px">' + esc(TRIP.nightly) + '</div></div>';

    var prev = d.day > 1 ? '<button class="pn-btn" data-act="daytab" data-day="' + (d.day - 1) + '">← 前一日</button>' : '<button class="pn-btn" disabled>← 前一日</button>';
    var next = d.day < TRIP.days.length ? '<button class="pn-btn" data-act="daytab" data-day="' + (d.day + 1) + '">后一日 →</button>' : '<button class="pn-btn" disabled>后一日 →</button>';
    html += '<div class="prev-next">' + prev + next + '</div>';
    return html;
  }

  function ticketsView() {
    var total = TRIP.days.reduce(function (a, d) { return a + d.tickets.length; }, 0);
    var html = '<div class="hero"><div class="eyebrow">TICKETS · 票券中心</div><h1>门票与车票 · ' + total + ' 份</h1><div class="sub">全部文件已随 App 离线内置，无网络也能随时打开查验</div></div>';
    TRIP.days.forEach(function (d) {
      if (!d.tickets.length) return;
      html += '<div class="card"><div class="card-title" style="margin-bottom:2px">' + d.day + ' <span style="font-size:12px;color:var(--primary)">' + esc(d.dateCn) + '</span></div><div class="muted" style="font-size:12px;margin-bottom:4px">' + esc(d.route) + '</div>';
      html += d.tickets.map(function (t) {
        var m = ticketMeta(t.kind);
        return '<button class="doc-row" data-act="open" data-file="' + esc(t.file) + '"><span class="tile ' + m.cls + '">' + m.tile + '</span><span class="info"><span class="t">' + esc(t.title) + '</span><br><span class="n">' + esc(t.note) + '</span></span><span class="go">打开</span></button>';
      }).join('');
      html += '</div>';
    });
    html += '<div class="card tint-soft"><div class="card-title">💡 使用提示</div><div class="muted" style="font-size:13px">· 打开后支持单指滑动翻页、双指缩放；<br>· 检票时出示屏幕即可，无需联网；<br>· 出行前请再次核对票面时间，实际信息以票面与官方渠道为准。</div></div>';
    return html;
  }

  function outingView() {
    var items = outingItems || [];
    if (!items.length) { loadOutingGroups(); items = outingItems; }
    var total = items.length;
    var doneCnt = items.filter(function (it) { return outingDone[it.uid]; }).length;
    var complete = total > 0 && doneCnt === total;

    var html = '<div class="hero"><div class="eyebrow">OUTING CHECK · 出门检查</div>' +
      '<h1>' + (complete ? '全部检查完毕 🎉' : total === 0 ? '添加几样必需品吧' : '还有 ' + (total - doneCnt) + ' 项未确认') + '</h1>' +
      '<div class="sub">' + (complete ? '每一样都已放进包里，放心出门' : '挨个打勾，全部确认后才能出门，别落下东西') + '</div>' +
      '<div class="track">' + items.map(function (it) { return '<i class="' + (outingDone[it.uid] ? 'on' : '') + '"></i>'; }).join('') + '</div>' +
      '<div class="track-label">已确认 ' + doneCnt + ' / ' + total + '</div>' +
      '<div class="chips" style="margin-top:12px">' +
      (complete ? '<span class="chip chip-gold" data-act="recheck">🔄 重新检查一次</span>' : '') +
      '<span class="chip chip-gold" data-act="additem">+ 添加物品</span></div></div>';

    if (complete) html += '<div class="card" style="background:var(--primary-soft)"><div style="font-weight:800;font-size:17px">🎉 可以出门啦！</div><div class="muted" style="font-size:13px;margin-top:3px">必需品全部确认完毕。把手机、钥匙带好，旅途愉快！</div></div>';

    if (!total) html += '<div class="card"><div class="center">🧳<br>清单还是空的，点上方「+ 添加」建一项吧</div></div>';

    // pending groups
    groupsLoop:
    for (var gi = 0; gi < GROUPS.length; gi++) {
      var g = GROUPS[gi];
      var pend = items.filter(function (it) { return it.group === g && !outingDone[it.uid]; });
      if (!pend.length) continue;
      html += '<div class="ogroup-head">' + GROUP_ICON[g] + ' ' + esc(g) + '<span class="cnt">' + pend.length + ' 项待确认</span></div>';
      html += pend.map(function (it) { return outingRow(it, false); }).join('');
    }
    // unknown groups
    items.filter(function (it) { return GROUPS.indexOf(it.group) < 0 && !outingDone[it.uid]; }).forEach(function (it) {
      html += outingRow(it, false);
    });

    var doneItems = items.filter(function (it) { return outingDone[it.uid]; });
    if (doneItems.length) {
      html += '<div class="card o-done-sec"><div class="o-done-head" data-act="toggledone">✅ 已完成 ' + doneItems.length + ' 项<span class="caret" id="doneCaret">查看 ▾</span></div><div id="doneList" class="hidden">';
      html += doneItems.map(function (it) { return outingRow(it, true); }).join('');
      html += '<div class="muted" style="font-size:12px;padding-top:4px">点击已确认项可取消勾选</div></div></div>';
    }

    html += '<div class="o-foot"><button data-act="resetdefault">重置为默认清单（清除勾选与自定义项）</button></div>';
    return html;
  }

  function outingRow(it, done) {
    return '<div class="o-item' + (done ? ' done' : '') + '" data-act="otoggle" data-uid="' + esc(it.uid) + '">' +
      '<span class="check">✓</span><span class="body"><span class="name">' + esc(it.name) + '</span>' +
      (it.note && !done ? '<br><span class="note">' + esc(it.note) + '</span>' : '') + '</span>' +
      '<button class="del" data-act="odel" data-uid="' + esc(it.uid) + '">✕</button></div>';
  }

  /* ---------- render / routing ---------- */
  function render() {
    APP.innerHTML = '<div class="app-shell"><div class="screen" id="view"></div></div>' +
      '<nav class="tabbar">' +
      '<button class="tab" data-act="tab" data-tab="home"><span class="ico">🏠</span>首页</button>' +
      '<button class="tab" data-act="tab" data-tab="trips"><span class="ico">📅</span>行程</button>' +
      '<button class="tab" data-act="tab" data-tab="tickets"><span class="ico">🎫</span>票券</button>' +
      '<button class="tab" data-act="tab" data-tab="outing"><span class="ico">✅</span>出门</button>' +
      '</nav>';
    document.getElementById('view').innerHTML =
      tab === 'home' ? homeView() : tab === 'trips' ? tripsView() : tab === 'tickets' ? ticketsView() : outingView();
    document.querySelectorAll('.tab').forEach(function (b) { b.classList.toggle('active', b.dataset.tab === tab); });
    var q = document.getElementById('hsearch');
    if (q) {
      q.addEventListener('input', function () { searchQuery = q.value; document.getElementById('homeBody').innerHTML = homeBody(); syncClear(); });
    }
    syncClear();
    if (tab === 'trips') scrollDay(tripsDay, false);
  }
  function syncClear() {
    var c = document.getElementById('hclear');
    if (c) { c.classList.toggle('hidden', !searchQuery); }
  }
  function scrollDay(idx, smooth) {
    var vp = document.getElementById('dayviewport');
    tripsDay = idx;
    if (vp) {
      vp.scrollTo({ left: vp.clientWidth * idx, behavior: smooth ? 'smooth' : 'auto' });
    }
    var tabs = document.querySelectorAll('.day-tab');
    tabs.forEach(function (b, i) { b.classList.toggle('active', i === idx); });
    var head = document.querySelector('.trips-head .t1');
    if (head) head.textContent = '行程计划 · DAY ' + (idx + 1) + ' / ' + TRIP.days.length;
    var head2 = document.querySelector('.trips-head .t2');
    if (head2) head2.textContent = TRIP.days[idx].dateCn + ' · ' + TRIP.days[idx].route;
  }

  /* ---------- viewer ---------- */
  var PDF_STATE = null; // {pdf, strip, canvases, gscale, gtx, gty, pinching, pinch}

  function openViewer(file) {
    viewerTitle.textContent = file;
    if (/\.(png|jpe?g)$/i.test(file)) {
      viewerBody.innerHTML = '<div class="img-wrap"><img src="tickets/' + encodeURIComponent(file) + '" alt=""></div>';
      document.getElementById('pdfFoot').classList.add('hidden');
    } else {
      renderPdfViewer(file);
    }
    viewer.classList.remove('hidden');
  }

  function renderPdfViewer(file) {
    var foot = document.getElementById('pdfFoot');
    viewerBody.innerHTML = '<div class="pdf-strip" id="pdfStrip"><div class="pdf-loading">正在渲染票券…</div></div>';
    foot.classList.remove('hidden');
    foot.textContent = '加载中…';
    PDF_STATE = null;
    if (!window.pdfjsLib) {
      viewerBody.innerHTML = '<div class="pdf-loading">PDF 组件加载失败，请检查网络后重试</div>';
      return;
    }
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'vendor/pdf.worker.min.js';
    var loadDoc = function () {
      pdfjsLib.getDocument('tickets/' + encodeURIComponent(file)).promise.then(function (pdf) {
        var strip = document.getElementById('pdfStrip');
        if (!strip) return;
        strip.innerHTML = '';
        var canvases = [];
        var i = 0;
        function renderOne() {
          if (i >= pdf.numPages) {
            if (canvases.length) { foot.textContent = '第 1 / ' + canvases.length + ' 页 · 单指左右滑动翻页 · 双指放大缩小'; }
            setupPdfGestures(strip, canvases, foot);
            return;
          }
          var n = i + 1;
          pdf.getPage(n).then(function (page) {
            var vp = page.getViewport({ scale: 2 });
            var wrap = document.createElement('div');
            wrap.className = 'pdf-page';
            var canvas = document.createElement('canvas');
            canvas.width = vp.width;
            canvas.height = vp.height;
            wrap.appendChild(canvas);
            strip.appendChild(wrap);
            canvases.push(canvas);
            page.render({ canvasContext: canvas.getContext('2d'), viewport: vp }).promise.then(function () {
              i++;
              renderOne();
            }).catch(function () { i++; renderOne(); });
          }).catch(function () { i++; renderOne(); });
        }
        renderOne();
      }).catch(function (e) {
        viewerBody.innerHTML = '<div class="pdf-loading">无法解析这份票券</div>';
        foot.textContent = '加载失败（' + (e && e.message ? e.message : e) + '）';
      });
    };
    // load worker via Blob URL: most reliable across Safari / WebViews
    fetch('vendor/pdf.worker.min.js').then(function (r) { return r.text(); }).then(function (txt) {
      try {
        pdfjsLib.GlobalWorkerOptions.workerSrc = URL.createObjectURL(new Blob([txt], { type: 'text/javascript' }));
      } catch (e) { /* fall back to plain workerSrc */ }
      loadDoc();
    }).catch(function () {
      loadDoc();
    });
  }

  function setupPdfGestures(strip, canvases, foot) {
    var st = { gscale: 1, gtx: 0, gty: 0, pinching: null, pinch: null, pan: null };
    PDF_STATE = st;

    function apply() {
      canvases.forEach(function (c) {
        c.style.transform = 'translate(' + st.gtx + 'px,' + st.gty + 'px) scale(' + st.gscale + ')';
      });
      strip.classList.toggle('zoomed', st.gscale > 1.02);
    }
    function dist(t) { var dx = t[0].clientX - t[1].clientX, dy = t[0].clientY - t[1].clientY; return Math.sqrt(dx * dx + dy * dy); }
    function mid(t) { return { x: (t[0].clientX + t[1].clientX) / 2, y: (t[0].clientY + t[1].clientY) / 2 }; }

    strip.addEventListener('touchstart', function (e) {
      if (e.touches.length === 2) {
        st.pinching = true;
        st.pinch = { d0: dist(e.touches), x0: mid(e.touches).x, y0: mid(e.touches).y, sx: st.gtx, sy: st.gty, s0: st.gscale };
      } else if (e.touches.length === 1 && st.gscale > 1.02) {
        st.pan = { x0: e.touches[0].clientX, y0: e.touches[0].clientY, sx: st.gtx, sy: st.gty };
      }
    }, { passive: true });

    strip.addEventListener('touchmove', function (e) {
      if (st.pinching && e.touches.length >= 2) {
        e.preventDefault();
        var d = dist(e.touches), m = mid(e.touches);
        st.gscale = Math.min(5, Math.max(1, st.pinch.s0 * d / st.pinch.d0));
        if (st.gscale <= 1.02) { st.gtx = 0; st.gty = 0; }
        else {
          st.gtx = st.pinch.sx + (m.x - st.pinch.x0);
          st.gty = st.pinch.sy + (m.y - st.pinch.y0);
        }
        apply();
      } else if (st.pan && e.touches.length === 1 && st.gscale > 1.02) {
        e.preventDefault();
        st.gtx = st.pan.sx + (e.touches[0].clientX - st.pan.x0);
        st.gty = st.pan.sy + (e.touches[0].clientY - st.pan.y0);
        apply();
      }
    }, { passive: false });

    function endTouch() {
      st.pinching = false;
      st.pan = null;
      if (st.gscale <= 1.02) { st.gscale = 1; st.gtx = 0; st.gty = 0; apply(); }
      else { st.gtx = Math.max(-1000, Math.min(1000, st.gtx)); st.gty = Math.max(-2000, Math.min(2000, st.gty)); }
    }
    strip.addEventListener('touchend', endTouch, { passive: true });
    strip.addEventListener('touchcancel', endTouch, { passive: true });

    // page indicator
    strip.addEventListener('scroll', function () {
      var idx = Math.round(strip.scrollLeft / strip.clientWidth);
      if (foot) foot.textContent = '第 ' + (idx + 1) + ' / ' + canvases.length + ' 页 · 单指左右滑动翻页 · 双指放大缩小';
    }, { passive: true });

    PDF_STATE = st;
    apply();
  }

  function closeViewer() {
    viewer.classList.add('hidden');
    viewerBody.innerHTML = '';
    document.getElementById('pdfFoot').classList.add('hidden');
    PDF_STATE = null;
  }

  /* ---------- modals ---------- */
  function modal(html) {
    var mask = document.createElement('div');
    mask.className = 'modal-mask';
    mask.innerHTML = '<div class="modal">' + html + '</div>';
    mask.addEventListener('click', function (e) { if (e.target === mask) mask.remove(); });
    document.body.appendChild(mask);
    return mask;
  }
  function addItemModal() {
    var html = '<h3>添加必需品</h3><input id="oiName" placeholder="如：保温杯 / 钥匙 / 小剪刀…" maxlength="24">' +
      '<div class="group-chips">' + GROUPS.map(function (g, i) {
        return '<span class="chip' + (i === GROUPS.length - 1 ? ' sel' : '') + '" data-group="' + esc(g) + '">' + GROUP_ICON[g] + ' ' + esc(g) + '</span>';
      }).join('') + '</div><div class="actions"><button class="cancel" data-m="cancel">取消</button><button class="ok" id="oiOk" data-m="ok" disabled>添加</button></div>';
    var mask = modal(html);
    var inp = mask.querySelector('#oiName');
    var sel = mask.querySelector('.chip.sel');
    var ok = mask.querySelector('#oiOk');
    inp.addEventListener('input', function () { ok.disabled = !inp.value.trim(); });
    mask.querySelectorAll('.chip[data-group]').forEach(function (c) {
      c.addEventListener('click', function () {
        mask.querySelectorAll('.chip.sel').forEach(function (x) { x.classList.remove('sel'); });
        c.classList.add('sel'); sel = c;
      });
    });
    mask.querySelector('[data-m="cancel"]').addEventListener('click', function () { mask.remove(); });
    ok.addEventListener('click', function () {
      var name = inp.value.trim();
      if (!name) return;
      outingItems.push({ uid: 'c' + Date.now(), name: name, note: '', group: sel ? sel.dataset.group : GROUPS[GROUPS.length - 1], builtin: false });
      saveOuting();
      mask.remove();
      render();
    });
    setTimeout(function () { inp.focus(); }, 60);
  }
  function confirmModal(title, text, okLabel, danger, onOk) {
    var html = '<h3>' + esc(title) + '</h3><div class="muted">' + esc(text) + '</div><div class="actions"><button class="cancel" data-m="cancel">取消</button><button class="ok' + (danger ? ' danger' : '') + '" data-m="ok">' + esc(okLabel) + '</button></div>';
    var mask = modal(html);
    mask.querySelector('[data-m="cancel"]').addEventListener('click', function () { mask.remove(); });
    mask.querySelector('[data-m="ok"]').addEventListener('click', function () { mask.remove(); onOk(); });
  }

  /* ---------- delegation ---------- */
  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-act]');
    if (!el) return;
    var act = el.dataset.act;
    if (act === 'tab') { tab = el.dataset.tab; render(); return; }
    if (act === 'back') { tab = 'home'; render(); return; }
    if (act === 'openday') { tab = 'trips'; tripsDay = (parseInt(el.dataset.day, 10) - 1); render(); return; }
    if (act === 'daytab') { scrollDay(parseInt(el.dataset.day, 10) - 1, true); return; }
    if (act === 'toggle') { toggleDone(el.dataset.key); render(); return; }
    if (act === 'open') { openViewer(el.dataset.file); return; }
    if (act === 'outing') { tab = 'outing'; render(); return; }
    if (act === 'otoggle') {
      var uid = el.dataset.uid;
      outingDone[uid] = !outingDone[uid];
      saveOutingDone();
      render();
      return;
    }
    if (act === 'odel') {
      e.stopPropagation();
      var item = outingItems.find(function (x) { return x.uid === el.dataset.uid; });
      if (!item) return;
      confirmModal('移除「' + item.name + '」？', item.builtin ? '它是内置默认项，移除后可用「重置为默认清单」找回。' : '自定义项移除后无法恢复。', '移除', true, function () {
        outingItems = outingItems.filter(function (x) { return x.uid !== el.dataset.uid; });
        delete outingDone[el.dataset.uid];
        saveOuting(); saveOutingDone(); render();
      });
      return;
    }
    if (act === 'additem') { addItemModal(); return; }
    if (act === 'recheck') {
      outingDone = {};
      saveOutingDone();
      render();
      return;
    }
    if (act === 'resetdefault') {
      confirmModal('重置为默认清单？', '将恢复全部内置必需品，并清除所有勾选与自定义添加的物品。', '重置', false, function () {
        localStorage.removeItem('it_outing');
        outingDone = {};
        loadOutingGroups();
        saveOutingDone();
        render();
      });
      return;
    }
    if (act === 'toggledone') {
      var dl = document.getElementById('doneList');
      var caret = document.getElementById('doneCaret');
      if (dl) {
        dl.classList.toggle('hidden');
        if (caret) caret.textContent = dl.classList.contains('hidden') ? '查看 ▾' : '收起 ▴';
      }
      return;
    }
  });
  document.getElementById('viewerBack').addEventListener('click', closeViewer);

  /* ---------- boot ---------- */
  loadDone();
  loadOutingGroups();
  loadOutingDone();
  if (window.TRIP_DATA) {
    TRIP = window.TRIP_DATA;
    // normalize optional per-day fields
    TRIP.days.forEach(function (d) {
      if (!d.tickets) d.tickets = [];
      if (!d.transport) d.transport = [];
      if (!d.pack) d.pack = [];
      if (!d.timeline) d.timeline = [];
      if (!d.decision) d.decision = [];
    });
    render();
  } else {
    APP.innerHTML = '<div class="app-shell"><div class="screen"><div class="card"><div class="center">😥<br>行程数据加载失败，请确认文件完整后用浏览器打开。</div></div></div></div>';
  }
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(function () {});
  }
})();
