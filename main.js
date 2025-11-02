
(async () => {
  const root = document.getElementById("root");
  const darkToggle = document.getElementById("darkToggle");
  const refreshBtn = document.getElementById("refreshBtn");

  const state = {
    dark: localStorage.getItem("darkMode") === "true",
    completed: JSON.parse(localStorage.getItem("completed") || "[]"),
    edits: JSON.parse(localStorage.getItem("edits") || "{}"),
  };

  const saveState = () => {
    localStorage.setItem("darkMode", state.dark);
    localStorage.setItem("completed", JSON.stringify(state.completed));
    localStorage.setItem("edits", JSON.stringify(state.edits));
  };

  const applyDark = () => {
    document.body.classList.toggle("dark", state.dark);
  };

  darkToggle.onclick = () => {
    state.dark = !state.dark;
    applyDark();
    saveState();
  };

  applyDark();

  let sheetData = [];

  const fetchSheet = async () => {
    const res = await fetch("https://gsx2json.com/api?id=19HocMTEu0Sf1QTj-bRzA84o9sTUaSyKg8hIry8AT1L8&sheet=Sheet1");
    const json = await res.json();
    sheetData = json.rows || [];
    renderWeek();
  };

  refreshBtn.onclick = () => fetchSheet();

  const getDayData = (day) => {
    const fromSheet = sheetData.filter(row => row.Day === day);
    const custom = state.edits[day] || [];
    return [...fromSheet, ...custom];
  };

  const renderWeek = () => {
    root.innerHTML = "<div class='container'><h2>Weekly Plan</h2><button onclick='resetAll()'>🔁 Reset All</button></div>";
    const container = root.querySelector(".container");
    const days = ["Monday", "Wednesday", "Friday"];
    days.forEach(day => {
      const all = getDayData(day);
      const done = all.filter((_, i) => state.completed.includes(`${day}-${i}`));
      const percent = Math.round((done.length / all.length) * 100) || 0;
      const div = document.createElement("div");
      div.className = "day-box";
      div.innerHTML = `
        <h3>${day}</h3>
        <div class='progress-bar'><div style='width:${percent}%'></div></div>
        <button onclick="viewDay('${day}')">View Workouts</button>
      `;
      container.appendChild(div);
    });
  };

  window.resetAll = () => {
    if (confirm("Reset all progress?")) {
      state.completed = [];
      saveState();
      renderWeek();
    }
  };

  window.viewDay = (day) => {
    const container = document.createElement("div");
    container.className = "container";
    container.innerHTML = `
      <h2>${day}'s Workouts</h2>
      <button onclick="fetchSheet()">← Back</button>
      <button onclick="resetDay('${day}')">🔁 Reset Day</button>
      <ul></ul>
      <div>
        <h3>Add Workout</h3>
        <input placeholder="Workout" id="w" />
        <input placeholder="Category" id="c" />
        <input placeholder="Link to Video" id="v" />
        <textarea placeholder="Notes" id="n"></textarea>
        <button onclick="addWorkout('${day}')">➕ Add</button>
      </div>
    `;
    const ul = container.querySelector("ul");
    const workouts = getDayData(day);
    workouts.forEach((w, i) => {
      const id = `${day}-${i}`;
      const li = document.createElement("li");
      li.className = state.completed.includes(id) ? "done-workout" : "";
      li.innerHTML = `
        <strong>${w.Workout}</strong> (${w.Category || ""})
        <br/>${w.Notes || ""}
        ${w["Link to Video"] ? `<div class='video-container'><iframe src='https://www.youtube.com/embed/${(new URL(w["Link to Video"])).searchParams.get("v")}' allowfullscreen></iframe></div>` : ""}
        <br/>
        <button onclick="toggleDone('${id}')">✔ Done</button>
        <button onclick="deleteWorkout('${day}', ${i})">🗑 Delete</button>
      `;
      ul.appendChild(li);
    });
    root.innerHTML = "";
    root.appendChild(container);
  };

  window.toggleDone = (id) => {
    const idx = state.completed.indexOf(id);
    if (idx >= 0) state.completed.splice(idx, 1);
    else state.completed.push(id);
    saveState();
    fetchSheet();
  };

  window.resetDay = (day) => {
    state.completed = state.completed.filter(id => !id.startsWith(day));
    saveState();
    fetchSheet();
  };

  window.deleteWorkout = (day, i) => {
    const originals = sheetData.filter(r => r.Day === day);
    if (i >= originals.length) {
      const idx = i - originals.length;
      state.edits[day].splice(idx, 1);
      saveState();
      fetchSheet();
    } else {
      alert("Cannot delete workouts from original sheet.");
    }
  };

  window.addWorkout = (day) => {
    const w = document.getElementById("w").value;
    const c = document.getElementById("c").value;
    const v = document.getElementById("v").value;
    const n = document.getElementById("n").value;
    const entry = { Day: day, Workout: w, Category: c, "Link to Video": v, Notes: n };
    if (!state.edits[day]) state.edits[day] = [];
    state.edits[day].push(entry);
    saveState();

    fetch("{sheet_post_url}", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(entry)
    }).then(r => r.text()).then(console.log).catch(console.error);

    fetchSheet();
  };

  
  window.editWorkout = (day, i) => {
    const originals = sheetData.filter(r => r.Day === day);
    if (i < originals.length) {
      alert("Cannot edit original Sheet data.");
      return;
    }
    const idx = i - originals.length;
    const w = state.edits[day][idx];
    const name = prompt("Edit workout name:", w.Workout);
    const cat = prompt("Edit category:", w.Category);
    const link = prompt("Edit video link:", w["Link to Video"]);
    const notes = prompt("Edit notes:", w.Notes);
    if (name) {
      state.edits[day][idx] = {
        Workout: name,
        Category: cat,
        "Link to Video": link,
        Notes: notes,
        Day: day
      };
      saveState();
      // Sync update to Sheet
      fetch("https://script.google.com/macros/s/AKfycbzt0WU6KPVlF6LIXCKO57dUse5-Er_m-yBch-C5nChqwb2hlERhSzULjG3_O0--RUSF/exec", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(state.edits[day][idx])
      }).then(r => r.text()).then(console.log).catch(console.error);
      fetchSheet();
    }
  };

  await fetchSheet();
})();
