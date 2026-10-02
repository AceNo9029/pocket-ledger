const L = { get u() { return JSON.parse(localStorage.getItem("mock-users") || "{}"); }, set u(v) { localStorage.setItem("mock-users", JSON.stringify(v)); } };
let cbs = [];
const cur = () => { const e = localStorage.getItem("mock-cur"); return e ? { uid: "uid_" + e.replace(/\W/g, ""), email: e } : null; };
const fire = () => { const u = cur(); auth.currentUser = u; cbs.forEach(cb => cb(u)); };
const auth = { currentUser: null };
const err = c => { const e = new Error(c); e.code = c; return e; };
export function getAuth() { auth.currentUser = cur(); return auth; }
export function onAuthStateChanged(a, cb) { cbs.push(cb); setTimeout(() => cb(cur()), 30); }
export async function signInWithEmailAndPassword(a, email, pw) { const u = L.u; if (!u[email] || u[email] !== pw) throw err("auth/invalid-credential"); localStorage.setItem("mock-cur", email); fire(); }
export async function createUserWithEmailAndPassword(a, email, pw) { const u = L.u; if (u[email]) throw err("auth/email-already-in-use"); if ((pw || "").length < 6) throw err("auth/weak-password"); u[email] = pw; L.u = u; localStorage.setItem("mock-cur", email); fire(); }
export async function signOut() { localStorage.removeItem("mock-cur"); fire(); }
export async function sendPasswordResetEmail() {}
