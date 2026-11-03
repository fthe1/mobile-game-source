/* صديقي قلم — تبويب "الإعدادات" داخل ركن الأهل
 * يعتمد على واجهة التطبيق الموجودة في window.Q (Store, UI, Theme, Router).
 * كل التغييرات تُحفظ على الجهاز فقط.
 */
(function () {
  "use strict";
  var t = (window.Q = window.Q || {});
  var h = function () {
    return t.U.h.apply(null, arguments);
  };
  var CONFIRM_WORD = "نعم";
  var RATES = [
    { v: 0.6, label: "بطيء" },
    { v: 0.8, label: "عادي" },
    { v: 1.0, label: "سريع" },
  ];

  function toast(msg) {
    try {
      t.UI.toast(msg, 2800);
    } catch (e) {}
  }

  function settings() {
    return t.Store.settings || {};
  }

  function save() {
    try {
      t.Store.save();
    } catch (e) {
      toast("تعذّر حفظ الإعداد على هذا الجهاز");
    }
  }

  function card(title, children) {
    return h(
      "div",
      { class: "card ps-card" },
      h("h3", null, title),
      children,
    );
  }

  function toggleRow(label, key, onAfter) {
    var on = !!settings()[key];
    var btn = h(
      "button",
      {
        class: "btn " + (on ? "btn-good" : "btn-ghost"),
        "aria-pressed": on ? "true" : "false",
        onclick: function () {
          settings()[key] = !settings()[key];
          save();
          if (onAfter) onAfter();
          t.Router.render();
        },
      },
      on ? "✅ مفعّل" : "⬜ متوقّف",
    );
    return h("div", { class: "ps-row" }, h("span", null, label), btn);
  }

  // سطر تأكيد: زر الحذف لا يعمل إلا بعد كتابة «نعم»
  function confirmRow(buttonText, onConfirm, opts) {
    var input = h("input", {
      class: "ps-input",
      type: "text",
      placeholder: "اكتب «" + CONFIRM_WORD + "» للتأكيد",
      autocomplete: "off",
    });
    var go = h(
      "button",
      {
        class: "btn btn-danger",
        disabled: "disabled",
        onclick: function () {
          if (input.value.trim() !== CONFIRM_WORD) return;
          onConfirm(go);
        },
      },
      buttonText,
    );
    input.addEventListener("input", function () {
      if (opts && opts.needFile && !opts.getFile()) {
        go.disabled = true;
        return;
      }
      go.disabled = input.value.trim() !== CONFIRM_WORD;
    });
    if (opts && opts.onFileChange) {
      opts.onFileChange(function () {
        go.disabled = input.value.trim() !== CONFIRM_WORD || !opts.getFile();
      });
    }
    return h("div", { class: "ps-confirm" }, input, go);
  }

  // ---------- النسخ الاحتياطي ----------
  function backupName() {
    return "qalam-backup-" + new Date().toISOString().slice(0, 10) + ".json";
  }

  async function doBackup() {
    var txt;
    try {
      txt = t.Store.exportJSON();
    } catch (e) {
      toast("تعذّر تجهيز النسخة الاحتياطية");
      return;
    }
    var name = backupName();
    var cap = window.Capacitor;
    if (cap && cap.isNativePlatform && cap.isNativePlatform()) {
      try {
        var fileResult = await cap.Plugins.Filesystem.writeFile({
          path: "backups/" + name, recursive: true, data: txt, directory: "CACHE", encoding: "utf8"
        });
        await cap.Plugins.Share.share({title: name, files: [fileResult.uri], dialogTitle: "حفظ النسخة الاحتياطية"});
      } catch (error) { toast("لم تُحفظ النسخة الاحتياطية؛ أعد المحاولة واختر مكان الحفظ أو المشاركة"); }
      return;
    }
    try {
      var file = new File([txt], name, { type: "application/json" });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        navigator
          .share({ files: [file], title: name })
          .catch(function (error) {
            if (error.name !== "AbortError") toast("تعذّرت مشاركة النسخة الاحتياطية");
          });
        return;
      }
    } catch (e) {}
    try {
      var url = URL.createObjectURL(
        new Blob([txt], { type: "application/json" }),
      );
      var a = document.createElement("a");
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(function () {
        URL.revokeObjectURL(url);
      }, 4000);
      toast("تم تنزيل النسخة الاحتياطية");
    } catch (e) {
      try {
        navigator.clipboard.writeText(txt).then(function () {
          toast("تم نسخ النسخة الاحتياطية إلى الحافظة");
        }).catch(function () { toast("تعذّر الوصول إلى الحافظة"); });
      } catch (err) {
        toast("تعذّر إنشاء النسخة الاحتياطية");
      }
    }
  }

  // ---------- الاستعادة من ملف ----------
  function restoreSection() {
    var chosen = null;
    var picker = h("input", {
      type: "file",
      accept: "application/json,.json",
      class: "ps-file",
    });
    var status = h("p", { class: "note ps-status" }, "لم تختَر ملفًا بعد.");
    var listeners = [];
    picker.addEventListener("change", function () {
      chosen = picker.files && picker.files[0] ? picker.files[0] : null;
      status.textContent = chosen
        ? "الملف: " + chosen.name
        : "لم تختَر ملفًا بعد.";
      listeners.forEach(function (fn) {
        fn();
      });
    });
    var confirm = confirmRow(
      "♻️ استعادة الملف",
      function (button) {
        if (!chosen) return;
        if (chosen.size > 10 * 1024 * 1024) { toast("حجم النسخة أكبر من الحد المسموح (١٠ ميغابايت)"); return; }
        button.disabled = true;
        var reader = new FileReader();
        reader.onerror = function () { button.disabled = false; toast("تعذّرت قراءة الملف"); };
        reader.onabort = function () { button.disabled = false; };
        reader.onloadend = function () { button.disabled = false; };
        reader.onload = function () {
          try {
            var data = JSON.parse(String(reader.result));
            if (!data || typeof data.profiles !== "object") {
              throw new Error("bad");
            }
          } catch (e) {
            toast("هذا الملف ليس نسخة احتياطية صالحة");
            return;
          }
          try {
            t.Store.importJSON(String(reader.result));
            toast("تمت الاستعادة");
            setTimeout(function () {
              location.reload();
            }, 600);
          } catch (e) {
            toast("تعذّرت الاستعادة");
          }
        };
        reader.readAsText(chosen);
      },
      {
        needFile: true,
        getFile: function () {
          return chosen;
        },
        onFileChange: function (fn) {
          listeners.push(fn);
        },
      },
    );
    return h(
      "div",
      null,
      h("p", { class: "note" }, "⚠️ الاستعادة تستبدل كل البيانات الحالية بالنسخة."),
      picker,
      status,
      confirm,
    );
  }

  // ---------- حذف التقدّم ----------
  function resetAllProgress() {
    t.Store.profiles().forEach(function (p) {
      t.Store.resetProfile(p.id);
    });
    toast("تم تصفير تقدّم كل الأطفال");
    t.Router.render();
  }

  function deleteAllData() {
    try { t.Store.clearAll(); }
    catch (error) { toast("تعذّر حذف بعض البيانات من التخزين"); return; }
    location.hash = "#/welcome";
    location.reload();
  }

  // ---------- الشاشة ----------
  t.ParentSettings = function (u) {
    var s = settings();
    var rateButtons = RATES.map(function (r) {
      var on = Math.abs((s.rate || 0.8) - r.v) < 0.01;
      return h(
        "button",
        {
          class: "btn " + (on ? "btn-primary" : "btn-ghost"),
          onclick: function () {
            settings().rate = r.v;
            save();
            t.Router.render();
          },
        },
        r.label,
      );
    });

    var sound = card("🔊 الصوت والعرض", [
      toggleRow("المؤثرات الصوتية", "sound"),
      toggleRow("الموسيقى", "music", function () {
        if (settings().music) t.Audio.startMusic(); else t.Audio.stopMusic();
      }),
      toggleRow("القراءة بالصوت", "tts"),
      h(
        "div",
        { class: "ps-row" },
        h("span", null, "سرعة القراءة"),
        h("div", { class: "row gap" }, rateButtons),
      ),
      h(
        "div",
        { class: "ps-row" },
        h("span", null, "إظهار التشكيل (الحركات)"),
        h(
          "button",
          {
            class: "btn " + (s.marks === "show" ? "btn-good" : "btn-ghost"),
            onclick: function () {
              settings().marks = settings().marks === "show" ? "hide" : "show";
              save();
              t.Router.render();
            },
          },
          settings().marks === "show" ? "✅ ظاهر" : "⬜ مخفي",
        ),
      ),
      h(
        "div",
        { class: "ps-row" },
        h("span", null, "الوضع الليلي"),
        h(
          "button",
          {
            class: "btn btn-ghost",
            onclick: function () {
              t.Theme.toggle();
              t.Router.render();
            },
          },
          "🌙 تبديل",
        ),
      ),
    ]);

    var backup = card("💾 النسخ الاحتياطي", [
      h(
        "p",
        { class: "note" },
        "تحفظ النسخة كل الأطفال وتقدّمهم والإعدادات في ملف JSON على جهازك.",
      ),
      h(
        "div",
        { class: "row gap center wrap" },
        h(
          "button",
          { class: "btn btn-primary", onclick: doBackup },
          "💾 إنشاء نسخة احتياطية",
        ),
      ),
      h("hr", { class: "ps-hr" }),
      restoreSection(),
    ]);

    var reset = card("🗑️ حذف البيانات", [
      h(
        "p",
        { class: "note" },
        "تصفير التقدّم يُبقي أسماء الأطفال. حذف كل البيانات يمسح كل شيء نهائيًا.",
      ),
      h("p", { class: "ps-label" }, "تصفير تقدّم كل الأطفال"),
      confirmRow("🔄 تصفير التقدّم", resetAllProgress),
      h("hr", { class: "ps-hr" }),
      h("p", { class: "ps-label" }, "حذف كل البيانات"),
      confirmRow("🗑️ حذف كل شيء", deleteAllData),
    ]);

    var about = card("📄 عن التطبيق", [
      h(
        "div",
        { class: "ps-links" },
        h("a", { href: "privacy.html", target: "_blank", rel: "noopener" }, "سياسة الخصوصية"),
        h("a", { href: "terms.html", target: "_blank", rel: "noopener" }, "شروط الاستخدام"),
      ),
      h("p", { class: "note" }, "تُحفظ البيانات على هذا الجهاز فقط · بلا إعلانات · بلا إنترنت."),
    ]);

    u.appendChild(h("div", { class: "ps-wrap" }, sound, backup, reset, about));
  };
})();
