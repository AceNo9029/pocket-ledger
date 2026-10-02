// Savings goals: what you're saving for, how far along you are, and what it takes per month.
import { $, esc, money, num, sum, monthKey, monthName, monthsBetween, toast } from "../util.js";
import { state, ui, db, isGroup, isAll, people, pname, canEdit, visibleGoals, goalBalance, totalSavings, meId, groupName } from "../store.js";
import { focusAdd } from "./entries.js";

ui.goalEditId = null;
const ownerForNew = () => isGroup() ? "shared" : meId();

function resetGoalForm() {
  ui.goalEditId = null;
  ["gName", "gTarget", "gDate"].forEach(id => { $(id).value = ""; });
  $("goalErr").hidden = true; $("saveGoal").textContent = "Create goal"; $("goalFormTitle").textContent = "New goal"; $("cancelGoal").hidden = true;
}

export const page = {
  init() {
    $("saveGoal").addEventListener("click", () => {
      const name = $("gName").value.trim(), target = num($("gTarget").value), by = $("gDate").value;
      const err = m => { $("goalErr").textContent = m; $("goalErr").hidden = false; };
      if (!name) return err("Give the goal a name.");
      if (!(target > 0)) return err("Enter a target amount greater than zero.");
      const old = ui.goalEditId ? state.goals.find(g => g.id === ui.goalEditId) : null;
      const g = { name, target, by: by || "", owner: old ? old.owner : ownerForNew(), created: old ? old.created || Date.now() : Date.now() };
      db.saveGoal(ui.goalEditId, g); toast(old ? "Goal updated" : "Goal created");
      resetGoalForm();
    });
    $("cancelGoal").addEventListener("click", resetGoalForm);
    $("goals").addEventListener("click", ev => {
      const b = ev.target.closest("button"); if (!b) return;
      const d = b.dataset;
      if (d.gadd) focusAdd("save", d.gadd);
      else if (d.gedit) {
        const g = state.goals.find(x => x.id === d.gedit); if (!g) return;
        ui.goalEditId = g.id; $("gName").value = g.name; $("gTarget").value = g.target; $("gDate").value = g.by || "";
        $("saveGoal").textContent = "Save changes"; $("goalFormTitle").textContent = "Edit goal"; $("cancelGoal").hidden = false;
        $("goalForm").scrollIntoView({ behavior: "smooth", block: "start" }); $("gName").focus({ preventScroll: true });
      } else if (d.gask) { ui.confirm = "g:" + d.gask; page.render(); }
      else if (d.nodel) { ui.confirm = null; page.render(); }
      else if (d.gdel) {
        ui.confirm = null;
        // keep the money: move this goal's entries to general savings
        state.entries.filter(x => x.goalId === d.gdel && canEdit(x)).forEach(e => db.update(e.id, Object.assign({}, e, { goalId: "" })));
        db.removeDoc("goals", d.gdel); toast("Goal deleted");
      }
    });
  },
  render() {
    const nowK = monthKey(new Date()), vg = visibleGoals();
    $("goalHint").textContent = isGroup() ? "Goals here are shared with everyone in " + groupName() + ". Use Save on the Entries page to put money toward one." : "Use Save on the Entries page, or Add money below, to put money toward a goal.";
    if (!vg.length) {
      $("goals").innerHTML = `<div class="empty"><span>No goals yet.</span><span class="hint">Create one for a phone, a trip, or anything else, then put money toward it.</span></div>`;
    } else {
      $("goals").innerHTML = vg.slice().sort((a, b) => (a.created || 0) - (b.created || 0)).map(g => {
        const bal = goalBalance(g.id), tgt = +g.target || 0, pct = tgt ? Math.min(100, Math.round(bal / tgt * 100)) : 0, done = tgt && bal >= tgt;
        let plan;
        if (done) plan = "Goal reached";
        else if (g.by) { const m = monthsBetween(nowK, g.by); plan = m <= 0 ? "Target date passed" : money((tgt - bal) / m, { whole: true }) + "/month to make " + monthName(g.by, true); }
        else plan = money(Math.max(tgt - bal, 0), { whole: true }) + " to go";
        const asking = ui.confirm === "g:" + g.id, mine = canEdit(g);
        return `<div class="goal${done ? " done" : ""}">
          <div class="goal-top"><h3>${esc(g.name)}<span class="owner-tag">${esc(g.owner === "shared" ? "Shared" : g.owner === meId() ? "Yours" : pname(g.owner))}</span></h3><span class="pct num">${pct}%</span></div>
          <div class="meter" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}" aria-label="${esc(g.name)} progress"><div style="width:${pct}%"></div></div>
          <div class="goal-meta num"><span>${esc(money(bal, { whole: true }))} of ${esc(money(tgt, { whole: true }))}</span><span>${esc(plan)}</span></div>
          ${g.owner === "shared" && bal ? `<div class="split-by num">${people().map(x => esc(x.id === meId() ? "You" : x.name) + " " + esc(money(goalBalance(g.id, x.id), { whole: true }))).join(" · ")}</div>` : ""}
          ${state.readOnly ? "" : `<div class="goal-acts">${asking
            ? `<span class="hint">Delete this goal? Its saved entries stay in your total savings.</span><button type="button" class="ghost" data-gdel="${g.id}">Delete goal</button><button type="button" class="ghost" data-nodel="1">Keep</button>`
            : `<button type="button" class="ghost" data-gadd="${g.id}">Add money</button>${mine ? `<button type="button" class="ghost" data-gedit="${g.id}">Edit</button><button type="button" class="icon-btn" data-gask="${g.id}" aria-label="Delete goal">✕</button>` : ""}`}</div>`}
        </div>`;
      }).join("");
    }
    const inGoals = sum(vg, g => goalBalance(g.id, ui.view)), total = totalSavings();
    const pool = total - inGoals;
    $("pool").hidden = !(state.goals.length && Math.abs(pool) >= 0.005);
    $("poolV").textContent = money(pool);
    $("goalTotal").textContent = (isAll() ? "Total savings " : ui.view === meId() ? "Your savings " : pname(ui.view) + "'s savings ") + money(total, { whole: true });
    $("goalForm").hidden = state.readOnly;
  }
};
