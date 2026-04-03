import React, { useState, useMemo, useRef, useEffect } from "react";
import INIT_UCS from "./data/ucs_data.json";

const PASSWORD   = "AI@BEQ";
const ADMIN_PIN  = "AI@BEQ";

// ── HELPERS ───────────────────────────────────────────────────────────────
function toTitleCase(str) {
  const minor = new Set(["a","an","the","and","but","or","for","nor","on","at","to","by","in","of","up","as","is","it"]);
  return str.replace(/\w\S*/g, (w, i) => {
    if (i === 0 || !minor.has(w.toLowerCase())) return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
    return w.toLowerCase();
  });
}

// ── SHAREPOINT CONFIG ─────────────────────────────────────────────────────
const SP_SITE = "https://ts.accenture.com/sites/TheInnovationNest-nurturingideasintosolutions";
const DATA_URL = process.env.PUBLIC_URL + "/data.json";
const SP_LIST = "BEQAIPortal";
const SP_API  = `${SP_SITE}/_api/lists/getbytitle('${SP_LIST}')/items`;
const SP_HDR  = { "Accept": "application/json;odata=verbose", "Content-Type": "application/json;odata=verbose" };

// ── GITHUB CONFIG ─────────────────────────────────────────────────────────
const GH_REPO   = "shashankjohari/genai-hub-v5-modern";
const GH_API    = `https://api.github.com/repos/${GH_REPO}`;
const DATA_PATH = "public/data.json";

async function pushDataJson(updatedUcs) {
  const res = await fetch(
    `${GH_API}/dispatches`,
    { method: "POST", headers: { Accept: "application/vnd.github+json", "Content-Type": "application/json" },
      body: JSON.stringify({ event_type: "sync-data", client_payload: { ucs: updatedUcs } }) }
  );
  if (!res.ok) throw new Error("Dispatch failed: " + res.status);
}

function spToUC(item) {
  const parseJSON = (str, fallback) => { if (!str) return fallback; try { return JSON.parse(str); } catch { return fallback; } };
  const parseLines = str => str ? str.split("\n").map(l => l.trim()).filter(Boolean) : [];
  let toSteps = [];
  if (item.toSteps) { const parsed = parseJSON(item.toSteps, null); if (parsed?.steps) toSteps = parsed.steps; else toSteps = parseLines(item.toSteps).map(l => { const a = l.toUpperCase().startsWith("AGENT:"); return { l: a ? l.slice(6).trim() : l, a }; }); }
  return { id: item.Id.toString(), spId: item.Id, title: item.Title || "", dept: item.dept || "", domain: item.domain || "business", pillar: item.pillar || "speed", status: item.status || "Live", impact: item.impact || "", summary: item.summary || "", outcomes: parseLines(item.outcomes), fromTime: item.fromTime || "", toTime: item.toTime || "", fromSteps: parseLines(item.fromSteps), toSteps, financial: parseLines(item.financial), operational: parseLines(item.operational), governance: parseLines(item.governance), impactBadges: parseJSON(item.impactBadges, []), fteBefore: item.fteBefore || "", fteAfter: item.fteAfter || "", fteSavings: item.fteSavings || "", productivity: item.productivity || "" };
}

function ucToSP(uc) {
  return { __metadata: { type: "SP.Data.BEQAIPortalListItem" }, Title: uc.title, dept: uc.dept, domain: uc.domain, pillar: uc.pillar, status: uc.status, impact: uc.impact || "", summary: uc.summary || "", outcomes: (uc.outcomes || []).join("\n"), fromTime: uc.fromTime || "", toTime: uc.toTime || "", fromSteps: (uc.fromSteps || []).join("\n"), toSteps: JSON.stringify({ steps: uc.toSteps || [] }), financial: (uc.financial || []).join("\n"), operational: (uc.operational || []).join("\n"), governance: (uc.governance || []).join("\n"), impactBadges: JSON.stringify(uc.impactBadges || []), fteBefore: uc.fteBefore || "", fteAfter: uc.fteAfter || "", fteSavings: uc.fteSavings || "", productivity: uc.productivity || "" };
}

// ── THEME (BEQ Corporate) ─────────────────────────────────────────────────
const TH = {
  light: { bg:"#F5F6FA",bgCard:"#FFFFFF",bgDeep:"#EEF0F8",bgMuted:"#F0F2FA",bd:"rgba(0,0,0,0.08)",bdStrong:"rgba(0,0,0,0.16)",tx1:"#003057",tx2:"#4A5568",tx3:"#6B7280",tx4:"#D1D5DB",accent:"#009AE4",accentBg:"rgba(0,154,228,0.08)",accentBd:"rgba(0,154,228,0.25)",green:"#0B7B5C",greenBg:"#E7F7F3",greenBd:"rgba(11,123,92,0.2)",blue:"#1A5CB0",blueBg:"#E8F0FC",blueBd:"rgba(26,92,176,0.2)",purple:"#5738A8",purpleBg:"#EEE9FC",purpleBd:"rgba(87,56,168,0.2)",amber:"#8C5E00",amberBg:"#FEF6E4",amberBd:"rgba(140,94,0,0.2)",red:"#B52020",redBg:"#FCEAEA",nav:"#003057",navTx:"#FFFFFF",navTx2:"rgba(255,255,255,0.7)",navBd:"rgba(255,255,255,0.12)",navActive:"#009AE4",shadow:"0 1px 3px rgba(0,0,0,0.06),0 4px 16px rgba(0,0,0,0.04)",shadowHover:"0 4px 20px rgba(0,0,0,0.10),0 1px 4px rgba(0,0,0,0.06)" },
  dark: { bg:"#061222",bgCard:"#0A1E35",bgDeep:"#071829",bgMuted:"#0D2440",bd:"rgba(255,255,255,0.06)",bdStrong:"rgba(255,255,255,0.12)",tx1:"#EEF0F8",tx2:"rgba(255,255,255,0.6)",tx3:"rgba(255,255,255,0.4)",tx4:"rgba(255,255,255,0.15)",accent:"#4DC3FF",accentBg:"rgba(0,154,228,0.12)",accentBd:"rgba(0,154,228,0.28)",green:"#3ECBA0",greenBg:"rgba(62,203,160,0.10)",greenBd:"rgba(62,203,160,0.22)",blue:"#6BADF5",blueBg:"rgba(107,173,245,0.10)",blueBd:"rgba(107,173,245,0.22)",purple:"#9E80F5",purpleBg:"rgba(158,128,245,0.10)",purpleBd:"rgba(158,128,245,0.22)",amber:"#F0B040",amberBg:"rgba(240,176,64,0.10)",amberBd:"rgba(240,176,64,0.22)",red:"#F07070",redBg:"rgba(240,112,112,0.10)",nav:"#001428",navTx:"#EEF0F8",navTx2:"rgba(255,255,255,0.5)",navBd:"rgba(255,255,255,0.06)",navActive:"#4DC3FF",shadow:"0 1px 3px rgba(0,0,0,0.3),0 4px 16px rgba(0,0,0,0.2)",shadowHover:"0 4px 24px rgba(0,0,0,0.38)" }
};

// ── ICONS ─────────────────────────────────────────────────────────────────
const Icon = ({ name, size = 16, color = "currentColor", style: sx = {} }) => {
  const s = { width: size, height: size, display: "inline-block", flexShrink: 0, ...sx };
  const p = {
    home:<svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={s}><path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z"/><path d="M9 21V12h6v9"/></svg>,
    journey:<svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={s}><circle cx="5" cy="12" r="2"/><circle cx="19" cy="12" r="2"/><circle cx="12" cy="5" r="2"/><path d="M7 12h10M12 7v10"/><circle cx="12" cy="19" r="2"/></svg>,
    catalog:<svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={s}><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>,
    dashboard:<svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={s}><rect x="3" y="3" width="8" height="5" rx="1"/><rect x="13" y="3" width="8" height="9" rx="1"/><rect x="3" y="11" width="8" height="10" rx="1"/><rect x="13" y="15" width="8" height="6" rx="1"/></svg>,
    chat:<svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={s}><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>,
    search:<svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={s}><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.35-4.35"/></svg>,
    sun:<svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" style={s}><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>,
    moon:<svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" style={s}><path d="M21 12.79A9 9 0 1111.21 3a7 7 0 009.79 9.79z"/></svg>,
    upload:<svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={s}><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>,
    edit:<svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={s}><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
    trash:<svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={s}><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>,
    back:<svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={s}><polyline points="15 18 9 12 15 6"/></svg>,
    add:<svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" style={s}><circle cx="12" cy="12" r="9"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>,
    video:<svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={s}><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>,
    arrowUp:<svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={s}><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>,
    arrowDn:<svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={s}><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>,
    star:<svg viewBox="0 0 24 24" fill={color} stroke={color} strokeWidth="1" style={s}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
    bolt:<svg viewBox="0 0 24 24" fill={color} stroke="none" style={s}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>,
    target:<svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" style={s}><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1" fill={color}/></svg>,
    cost:<svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={s}><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 100 7h5a3.5 3.5 0 110 7H6"/></svg>,
    speed:<svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={s}><path d="M12 2a10 10 0 11-7.07 2.93"/><polyline points="12 6 12 12 16 14"/></svg>,
    quality:<svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={s}><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>,
    agent:<svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={s}><rect x="3" y="4" width="18" height="12" rx="2"/><circle cx="9" cy="10" r="1.5" fill={color}/><circle cx="15" cy="10" r="1.5" fill={color}/><path d="M8 16l-2 4M16 16l2 4M10 16h4"/></svg>,
    chart:<svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={s}><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/></svg>,
    roi:<svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={s}><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>,
    globe:<svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" style={s}><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 010 20M12 2a15.3 15.3 0 000 20"/></svg>,
    close:<svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" style={s}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
    person:<svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={s}><circle cx="12" cy="7" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>,
    check:<svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={s}><polyline points="20 6 9 17 4 12"/></svg>,
    table:<svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={s}><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="9" x2="9" y2="21"/></svg>,
    grid:<svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={s}><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>,
    send:<svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={s}><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>,
    attach:<svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={s}><path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66L9.41 17.41a2 2 0 01-2.83-2.83l8.49-8.48"/></svg>,
    image:<svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={s}><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5" fill={color} stroke="none"/><polyline points="21 15 16 10 5 21"/></svg>,
    play:<svg viewBox="0 0 24 24" fill={color} stroke="none" style={s}><polygon points="5 3 19 12 5 21 5 3"/></svg>,
    sync:<svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={s}><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/></svg>,
    lock:<svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={s}><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>,
    shield:<svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={s}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
  };
  return p[name] || null;
};

// ── PHASE ICONS ───────────────────────────────────────────────────────────
const PhaseIcon = ({ phase, color, size = 28 }) => {
  const s = { width: size, height: size, display: "block" };
  if (phase === 0) return <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={s}><circle cx="12" cy="4" r="2" fill={color} stroke="none"/><path d="M8 12l2-5h4l2 5"/><path d="M7 22l3-6"/><path d="M17 22l-3-6"/><path d="M5 14l3-2"/><path d="M19 14l-3-2"/></svg>;
  if (phase === 1) return <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={s}><circle cx="12" cy="4" r="2" fill={color} stroke="none"/><path d="M12 6v6l3 3"/><path d="M9 12l-2 2"/><path d="M8 22l3-7"/><path d="M16 22l-3-7"/></svg>;
  return <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={s}><rect x="7" y="3" width="10" height="9" rx="2" fill={color+"18"}/><circle cx="10" cy="7.5" r="1" fill={color} stroke="none"/><circle cx="14" cy="7.5" r="1" fill={color} stroke="none"/><path d="M10 10h4"/><path d="M12 2v1"/><path d="M12 12v3"/><path d="M8 22l2.5-7"/><path d="M16 22l-2.5-7"/><path d="M7 16h10"/></svg>;
};

// ── PILLARS & HELPERS ─────────────────────────────────────────────────────
const PILLARS = [
  { id: "cost", label: "Cost Reduction", iconName: "cost" },
  { id: "speed", label: "Speed & Efficiency", iconName: "speed" },
  { id: "quality", label: "Quality & Accuracy", iconName: "quality" },
];
const PC = (t, id) => {
  if (id === "cost") return { bg: t.greenBg, bd: t.greenBd, tx: t.green };
  if (id === "speed") return { bg: t.blueBg, bd: t.blueBd, tx: t.blue };
  if (id === "quality") return { bg: t.purpleBg, bd: t.purpleBd, tx: t.purple };
  return { bg: t.accentBg, bd: t.accentBd, tx: t.accent };
};
const SC = (t, s) => {
  if (s === "Live") return { bg: t.greenBg, tx: t.green };
  if (s === "In development") return { bg: t.blueBg, tx: t.blue };
  return { bg: t.purpleBg, tx: t.purple };
};
const SLabel = ({ t, children, color }) => (
  <div style={{ fontSize: 12, fontWeight: 600, color: color || t.tx3, letterSpacing: "0.1em", textTransform: "uppercase" }}>{children}</div>
);

// ── STATUS SORT ORDER ─────────────────────────────────────────────────────
const STATUS_ORDER = { "Live": 0, "In development": 1, "Roadmap": 2 };
function catalogSort(a, b) {
  const sa = STATUS_ORDER[a.status] ?? 9, sb = STATUS_ORDER[b.status] ?? 9;
  if (sa !== sb) return sa - sb;
  const pa = (a.pillar || "").toLowerCase(), pb = (b.pillar || "").toLowerCase();
  if (pa !== pb) return pa.localeCompare(pb);
  return (a.title || "").toLowerCase().localeCompare((b.title || "").toLowerCase());
}

// ── SOLUTIONS BY ROLE DATA ────────────────────────────────────────────────
const ROLE_CARDS = [
  { id:"underwriting", label:"Underwriting", img:"https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=900&q=80", headline:"Assess risk faster, bind with confidence", p1:"Manual underwriting buries teams in submission data when they should be focused on strategic risks, broker relationships and portfolio growth across the London market and beyond.", p2:"AI automates intake, scores risk against appetite and generates quote recommendations — so underwriters can price smarter, bind faster and compete from a position of strength." },
  { id:"claims", label:"Claims", img:"https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=900&q=80", headline:"Resolve claims smarter, settle faster", p1:"Claims teams juggle manual bordereaux, slow FNOL triage and fragmented invoice processing — costing time and accuracy at every stage of the lifecycle.", p2:"AI-powered classification, validation and agent-led settlement processing cut cycle times across NA and London market operations — letting adjusters focus on complex, high-value claims." },
  { id:"enterprise", label:"Enterprise function", img:"https://images.unsplash.com/photo-1552664730-d307ca884978?w=900&q=80", headline:"Empower every team with governed AI", p1:"Legal, Risk and Data Science teams resort to unsanctioned public LLMs — creating data leakage risk and zero audit trail across the enterprise.", p2:"Q-GPT delivers secure, persona-based AI with curated prompt libraries and full governance — reducing effort by 75% across 2,237 users without compromising data security." },
  { id:"technology", label:"Technology", img:"https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=900&q=80", headline:"Autonomous ops, intelligent delivery", p1:"Technology teams spend hours manually correlating events, diagnosing root cause and processing capacity data across disparate monitoring platforms.", p2:"Agentic AI ingests, deduplicates and correlates events in real time — cutting diagnosis from 5 hours to 30 minutes and auto-raising ServiceNow tickets at scale." },
];

// ── STATIC DATA ───────────────────────────────────────────────────────────
const METRICS = [
  { value: "~65%", label: "Reduction in time-to-quote", pillar: "speed" },
  { value: "100%", label: "Submissions assessed", pillar: "quality" },
  { value: "55%", label: "Increase in bound policies, NA", pillar: "speed" },
  { value: "~$10M", label: "NB GWP uplift, Cyber", pillar: "cost" },
  { value: "94%", label: "CSAT score (+9 pt uplift)", pillar: "quality" },
  { value: "112.75", label: "FTE productivity savings", pillar: "cost", icon: "person" },
];

const BAR_DATA = [
  { label: "Cyber UW", after: 35, desc: "Time-to-quote" },
  { label: "EventOps", after: 10, desc: "Diagnosis time" },
  { label: "Smart Cap", after: 6, desc: "Manual effort" },
  { label: "Q-GPT", after: 25, desc: "Team effort" },
];

const DEPLOYMENT = [
  { region: "Global", ucs: ["EventOps Agent", "AIOps — ATA", "AIOps — ATR", "Q-GPT"], status: "Live" },
  { region: "NAO", ucs: ["Smart Capacity Agent", "Cyber UW — NA"], status: "Live" },
  { region: "EO", ucs: ["Reverse Engineering — .Net", "Cyber UW — EO"], status: "Live" },
  { region: "GPLAT", ucs: ["Cognitive Data Mapping"], status: "Live" },
  { region: "AusPac / Asia", ucs: ["WC UW — Asia", "Property UW — AusPac", "Cyber UW — Asia"], status: "Live" },
];

const JOURNEY = [
  { phase: "2023", label: "GenAI Incubation", sub: "Mobilization", milestones: ["AI operating model & enterprise strategy established across BEQ","Client account campaign launched to co-innovate and prioritise AI opportunities","Executive GenAI curriculum and enterprise-wide awareness campaign delivered"], highlights: [{ tag: "Underwriting", icon: "quality", title: "Cyber UW Assistant (NA)", desc: "Streamline quote generation, enhance risk selection and accelerate speed-to-quote" },{ tag: "Platform", icon: "agent", title: "Q-GPT Launched", desc: "Secure, persona-based enterprise AI within BEQ network — 2,237 users across 912 teams" },{ tag: "Technology", icon: "speed", title: "AIOps Foundation", desc: "Intelligent analysis, automation orchestration and proactive monitoring at scale" }] },
  { phase: "2024–25", label: "Acceleration & Scale", sub: "Innovation across the value chain", milestones: ["UW assistant extended to A&H, Workers Comp, Property across NA, EO, AusPac, Asia","Claims strategy — automated FNOL and STP vs. critical claim classification","Q-GPT advanced — persona-based, faster response, improved chunking"], highlights: [{ tag: "TDLC", icon: "quality", title: "Quality Engineering Via GenWizard", desc: "Accelerate test execution and improve delivery quality across the TDLC" },{ tag: "TDLC", icon: "catalog", title: "Living Knowledge Base", desc: "Centralised run-and-change knowledge base across all BEQ workstreams" },{ tag: "Technology", icon: "speed", title: "Enhanced Service Management", desc: "AI-assisted workflows driving efficient operations at scale" }] },
  { phase: "2026+", label: "Optimize & Evolve", sub: "Agentic network expansion", milestones: ["Data Product Identifier & Designer agents to accelerate Data & AI product adoption","Agentic UW solution — minimise re-keying, prioritise submissions, optimise pricing","Autonomous Ops agent and orchestration framework across run and change"], highlights: [{ tag: "Underwriting", icon: "agent", title: "Agentic Underwriting", desc: "AI experts in non-linear workflow evaluating complex risks and recommending optimal pricing" },{ tag: "Technology", icon: "agent", title: "Autonomous Ops Agent", desc: "Full agent orchestration across service management with human-in-loop governance" },{ tag: "Technology", icon: "roi", title: "Forward/Reverse Engineering", desc: "Accelerate application transformation using AI-powered code analysis and generation" }] },
];

// ── STATIC FTE DATA ───────────────────────────────────────────────────────
const INIT_FTE_ROWS = [
  { id: "fte_eventops", label: "EventOps Agent", fte: 19.5 },
  { id: "fte_ata", label: "AIOps — ATA", fte: 14.5 },
  { id: "fte_atr", label: "AIOps — ATR", fte: 30 },
  { id: "fte_smartcap", label: "Smart Capacity Agent", fte: 3.5 },
  { id: "fte_cdm", label: "Cognitive Data Mapping", fte: 8.75 },
  { id: "fte_reveng", label: "Reverse Engineering — .Net", fte: 30 },
  { id: "fte_qgpt", label: "Q-GPT", fte: 6.5 },
];


// ── ROOT APP ──────────────────────────────────────────────────────────────
export default function App() {
  const [authed, setAuthed] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [pwd, setPwd] = useState("AI@BEQ");
  const [pin, setPin] = useState("AI@BEQ");
  const [pwdErr, setPwdErr] = useState(false);
  const [pinErr, setPinErr] = useState(false);
  const [dk, setDk] = useState(false);
  const [view, setView] = useState("home");
  const [ucs, setUcs] = useState(INIT_UCS);
  const [spLoading, setSpLoading] = useState(false);
  const [spError, setSpError] = useState(null);
  const [spStatus, setSpStatus] = useState("");
  const [selId, setSelId] = useState(null);
  const [fDomain, setFD] = useState("all");
  const [fPillar, setFP] = useState(["all"]);
  const [fStatus, setFS] = useState("all");
  const [search, setSearch] = useState("");
  const [showAdmin, setAdmin] = useState(false);
  const [editUC, setEditUC] = useState(null);
  const [videos, setVideos] = useState({});
  const [archs, setArchs] = useState({});
  const [uploadId, setUploadId] = useState(null);
  const [uploadType, setUploadType] = useState("video");
  const [chatOpen, setChat] = useState(false);
  const fileRef = useRef(null);
  const t = dk ? TH.dark : TH.light;

  const handleLogin = () => {
    if (pwd !== PASSWORD) { setPwdErr(true); return; }
    if (pin) { if (pin === ADMIN_PIN) { setAuthed(true); setIsAdmin(true); } else { setPinErr(true); } }
    else { setAuthed(true); setIsAdmin(false); }
  };

  useEffect(() => {
    if (!authed) return;
    setSpLoading(true); setSpError(null);
    fetch(process.env.PUBLIC_URL + "/data.json").then(r => r.json()).then(data => {
      if (data?.ucs?.length > 0) { const spTitles = new Set(data.ucs.map(u => u.title.toLowerCase())); const localOnly = INIT_UCS.filter(u => !spTitles.has(u.title.toLowerCase())); setUcs([...data.ucs, ...localOnly]); setSpStatus("synced"); }
      setSpLoading(false);
    }).catch(err => { console.error("data.json load failed:", err); setSpStatus(""); setSpLoading(false); });
  }, [authed]);

  const filtered = useMemo(() => {
    let r = ucs;
    if (fDomain !== "all") r = r.filter(u => u.domain === fDomain);
    const pillarActive = Array.isArray(fPillar) ? fPillar.filter(p => p !== "all") : (fPillar !== "all" ? [fPillar] : []);
    if (pillarActive.length) r = r.filter(u => pillarActive.includes(u.pillar));
    if (fStatus !== "all") r = r.filter(u => u.status === fStatus);
    if (search.trim()) { const q = search.toLowerCase(); r = r.filter(u => u.title.toLowerCase().includes(q) || u.dept.toLowerCase().includes(q) || u.summary.toLowerCase().includes(q)); }
    return [...r].sort(catalogSort);
  }, [ucs, fDomain, fPillar, fStatus, search]);

  if (!authed) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100vh", background:"#001428", fontFamily:"'Inter','Segoe UI',sans-serif" }}>
      <div style={{ background:"#0A1E35", border:"1px solid rgba(255,255,255,0.08)", borderRadius:16, padding:"52px 48px", width:420, textAlign:"center", boxShadow:"0 32px 80px rgba(0,0,0,0.6)" }}>
        <BEQLogo style={{ marginBottom:16 }} />
        <div style={{ fontSize:22, color:"#EEF0F8", marginBottom:5, fontWeight:700 }}>BEQ AI Innovation Studio</div>
        <div style={{ fontSize:12, color:"rgba(255,255,255,0.3)", fontFamily:"monospace", letterSpacing:"0.2em", marginBottom:36 }}>RESTRICTED ACCESS</div>
        <div style={{ marginBottom:pwdErr?4:12, textAlign:"left" }}>
          <label style={{ fontSize:12, color:"rgba(255,255,255,0.35)", fontWeight:600, letterSpacing:"0.08em", textTransform:"uppercase", display:"block", marginBottom:5 }}>Password</label>
          <input type="password" placeholder="Enter password" value={pwd} onChange={e=>{setPwd(e.target.value);setPwdErr(false);}} onKeyDown={e=>{if(e.key==="Enter")handleLogin();}} style={{ width:"100%", background:"#061222", border:`1px solid ${pwdErr?"#F07070":"rgba(255,255,255,0.08)"}`, borderRadius:8, padding:"13px 16px", color:"#EEF0F8", fontSize:15, outline:"none", boxSizing:"border-box", fontFamily:"monospace", letterSpacing:"0.06em" }}/>
        </div>
        {pwdErr && <div style={{ fontSize:13, color:"#F07070", marginBottom:12, fontFamily:"monospace", textAlign:"left" }}>Incorrect password</div>}
        <div style={{ marginBottom:pinErr?4:16, textAlign:"left" }}>
          <label style={{ fontSize:12, color:"rgba(255,255,255,0.35)", fontWeight:600, letterSpacing:"0.08em", textTransform:"uppercase", display:"block", marginBottom:5 }}>Admin PIN <span style={{ color:"rgba(255,255,255,0.15)", fontWeight:400, letterSpacing:0 }}>(optional)</span></label>
          <input type="password" placeholder="Enter PIN for admin access" value={pin} onChange={e=>{setPin(e.target.value);setPinErr(false);}} onKeyDown={e=>{if(e.key==="Enter")handleLogin();}} style={{ width:"100%", background:"#061222", border:`1px solid ${pinErr?"#F07070":"rgba(255,255,255,0.08)"}`, borderRadius:8, padding:"13px 16px", color:"#EEF0F8", fontSize:15, outline:"none", boxSizing:"border-box", fontFamily:"monospace", letterSpacing:"0.06em" }}/>
        </div>
        {pinErr && <div style={{ fontSize:13, color:"#F07070", marginBottom:12, fontFamily:"monospace", textAlign:"left" }}>Incorrect admin PIN — entering read-only mode</div>}
        <div style={{ display:"flex", gap:8, marginBottom:20 }}>
          <div style={{ flex:1, background:"rgba(0,154,228,0.06)", border:"1px solid rgba(0,154,228,0.12)", borderRadius:8, padding:"8px 10px", textAlign:"left" }}><div style={{ fontSize:11, fontWeight:700, color:"#4DC3FF", marginBottom:2 }}>READ-ONLY</div><div style={{ fontSize:12, color:"rgba(255,255,255,0.35)", lineHeight:1.5 }}>Password only — view all content</div></div>
          <div style={{ flex:1, background:"rgba(0,154,228,0.06)", border:"1px solid rgba(0,154,228,0.12)", borderRadius:8, padding:"8px 10px", textAlign:"left" }}><div style={{ fontSize:11, fontWeight:700, color:"#4DC3FF", marginBottom:2 }}>ADMIN</div><div style={{ fontSize:12, color:"rgba(255,255,255,0.35)", lineHeight:1.5 }}>Password + PIN — edit & manage</div></div>
        </div>
        <button onClick={handleLogin} style={{ width:"100%", background:"#009AE4", border:"none", borderRadius:24, padding:"14px", color:"#fff", fontSize:14, fontWeight:700, cursor:"pointer", letterSpacing:"0.1em", fontFamily:"monospace" }}>ENTER →</button>
      </div>
    </div>
  );

  const selUC = ucs.find(u => u.id === selId);
  const isCat = view === "catalog" || view === "detail";
  const go = (v, id) => { setView(v); if (id !== undefined) setSelId(id); };
  const handleUpload = (e, id) => { if (!isAdmin) return; e.stopPropagation(); setUploadId(id); setUploadType("video"); fileRef.current.click(); };
  const handleArchUpload = (e, id) => { if (!isAdmin) return; e.stopPropagation(); setUploadId(id); setUploadType("arch"); fileRef.current.click(); };
  
  // const handleFile = e => { const f = e.target.files[0]; if (!f || !uploadId) return; const id = uploadId; setUploadId(null); if (uploadType === "arch") setArchs(p => ({ ...p, [id]: { name: f.name, url: URL.createObjectURL(f), mime: f.type } })); else setVideos(p => ({ ...p, [id]: { name: f.name, url: URL.createObjectURL(f) } })); e.target.value = ""; };
  
  const handleFile = async e => {
        const f = e.target.files[0];
        if (!f || !uploadId) return;
        const id = uploadId;
        setUploadId(null);

        // Get a short-lived upload URL from your Function
        const ext  = f.name.split(".").pop();
        const blob = `${id}-${uploadType}-${Date.now()}.${ext}`;
        const res  = await fetch(`/api/GetSasToken?blobName=${blob}`);
        const { uploadUrl, readUrl } = await res.json();

        // Upload directly to Blob Storage
        await fetch(uploadUrl, {
          method: "PUT",
          headers: { "x-ms-blob-type": "BlockBlob", "Content-Type": f.type },
          body: f
        });

        // Store the permanent read URL instead of the local object URL
        if (uploadType === "arch") {
          setArchs(p => ({ ...p, [id]: { name: f.name, url: readUrl, mime: f.type } }));
        } else {
          setVideos(p => ({ ...p, [id]: { name: f.name, url: readUrl } }));
        }
        e.target.value = "";
  };

  const removeVideo = (e, id) => { if (!isAdmin) return; e.stopPropagation(); setVideos(p => { const n={...p}; delete n[id]; return n; }); };
  const removeArch = (e, id) => { if (!isAdmin) return; e.stopPropagation(); setArchs(p => { const n={...p}; delete n[id]; return n; }); };

  const saveUC = async uc => {
    if (!isAdmin) return; setSpStatus("saving"); let finalUcs;
    try { const i = ucs.findIndex(u => u.id === uc.id); if (i >= 0) { const n = [...ucs]; n[i] = uc; finalUcs = n; } else { finalUcs = [...ucs, uc]; } setUcs(finalUcs); await pushDataJson(finalUcs); setSpStatus("synced"); }
    catch (err) { console.error("Save error:", err); setSpStatus("error"); }
    setEditUC(null); setAdmin(false);
  };

  const deleteUC = async id => {
    if (!isAdmin) return; setSpStatus("saving"); let finalUcs;
    try { finalUcs = ucs.filter(u => u.id !== id); setUcs(finalUcs); await pushDataJson(finalUcs); setSpStatus("synced"); }
    catch (err) { console.error("Delete error:", err); setSpStatus("error"); }
    setEditUC(null); setAdmin(false); if (selId === id) go("catalog");
  };

  const css = `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
    @keyframes fadeIn { from { opacity:0; transform:translateY(8px) } to { opacity:1; transform:translateY(0) } }
    @keyframes pulse { 0%,100% { opacity:1 } 50% { opacity:0.35 } }
    @keyframes ticker { 0% { transform:translateX(0) } 100% { transform:translateX(-50%) } }
    @keyframes spin { to { transform:rotate(360deg) } }
    * { box-sizing:border-box; margin:0 }
    button,input,select,textarea { font-family:inherit; cursor:pointer }
    input,select,textarea { cursor:text }
    .fade { animation:fadeIn 0.3s ease both }
    .card { background:${t.bgCard}; border:1px solid ${t.bd}; border-radius:14px; transition:box-shadow 0.2s,border-color 0.2s,transform 0.2s }
    .card-hover:hover { box-shadow:${t.shadowHover}; border-color:${t.bdStrong}; transform:translateY(-2px); cursor:pointer }
    ::placeholder { color:${t.tx3} }
    ::-webkit-scrollbar { width:4px; height:4px }
    ::-webkit-scrollbar-track { background:transparent }
    ::-webkit-scrollbar-thumb { background:${t.tx4}; border-radius:2px }
    .tbtn { background:transparent; border:1px solid ${t.bd}; border-radius:20px; padding:6px 15px; font-size:13px; color:${t.tx2}; transition:all 0.15s }
    .tbtn:hover { border-color:${t.accent}; color:${t.accent} }
    .tbtn.on { background:${t.nav}; color:#fff; border-color:${t.nav}; font-weight:500 }
    .pill-primary { background:${t.nav}; color:#fff; border:none; border-radius:24px; padding:11px 24px; font-size:14px; font-weight:600; cursor:pointer; display:flex; align-items:center; gap:7px }
    .pill-secondary { background:transparent; color:${t.nav}; border:1.5px solid ${t.nav}; border-radius:24px; padding:11px 24px; font-size:14px; font-weight:500; cursor:pointer; display:flex; align-items:center; gap:7px }
    .pill-ghost { background:transparent; color:${t.tx2}; border:1px solid ${t.bd}; border-radius:24px; padding:11px 24px; font-size:14px; cursor:pointer; display:flex; align-items:center; gap:7px }
    .role-img:hover { transform:scale(1.03) }
  `;

  return (
    <div style={{ fontFamily:"'Inter','Segoe UI',system-ui,sans-serif", background:t.bg, minHeight:"100vh", color:t.tx1, transition:"background 0.3s,color 0.3s" }}>
      <style>{css}</style>
      {spLoading && <div style={{ background:t.accentBg, borderBottom:`1px solid ${t.accentBd}`, padding:"8px 24px", display:"flex", alignItems:"center", gap:8, fontSize:13, color:t.accent }}><Icon name="sync" size={13} color={t.accent} style={{ animation:"spin 1s linear infinite" }} />Loading use cases…</div>}
      {!spLoading && spError && <div style={{ background:t.redBg, borderBottom:`1px solid ${t.red}44`, padding:"8px 24px", fontSize:13, color:t.red }}>⚠ {spError}</div>}
      {!spLoading && spStatus==="saving" && <div style={{ background:t.amberBg, borderBottom:`1px solid ${t.amberBd}`, padding:"8px 24px", display:"flex", alignItems:"center", gap:8, fontSize:13, color:t.amber }}><Icon name="sync" size={13} color={t.amber} style={{ animation:"spin 1s linear infinite" }} />Saving…</div>}
      <Nav t={t} dk={dk} setDk={setDk} view={view} go={go} isCat={isCat} isAdmin={isAdmin} onAdmin={()=>{setEditUC(null);setAdmin(true);}} search={search} setSearch={s=>{setSearch(s);if(view!=="catalog")go("catalog");}} chatOpen={chatOpen} setChat={setChat} spStatus={spStatus} />
      <div style={{ maxWidth:1160, margin:"0 auto", padding:"0 clamp(16px,3vw,40px)" }}>
        {view==="home" && <HomePage t={t} dk={dk} ucs={ucs} videos={videos} archs={archs} isAdmin={isAdmin} onUpload={handleUpload} onArchUpload={handleArchUpload} go={go} />}
        {view==="journey" && <JourneyPage t={t} dk={dk} go={go} />}
        {view==="catalog" && <CatalogPage t={t} dk={dk} ucs={filtered} allUcs={ucs} videos={videos} archs={archs} isAdmin={isAdmin} onUpload={handleUpload} onArchUpload={handleArchUpload} search={search} setSearch={setSearch} fDomain={fDomain} setFD={setFD} fPillar={fPillar} setFP={setFP} fStatus={fStatus} setFS={setFS} go={go} onEdit={uc=>{setEditUC(uc);setAdmin(true);}} />}
        {view==="detail" && selUC && <DetailPage t={t} dk={dk} uc={selUC} videos={videos} archs={archs} isAdmin={isAdmin} onUpload={handleUpload} onArchUpload={handleArchUpload} onRemove={removeVideo} onRemoveArch={removeArch} go={go} onEdit={()=>{setEditUC(selUC);setAdmin(true);}} />}
        {view==="dashboard" && <DashboardPage t={t} dk={dk} ucs={ucs} go={go} />}
        {view==="client" && <ClientSpeaksPage t={t} dk={dk} />}
      </div>
      <Footer t={t} isAdmin={isAdmin} />
      {showAdmin && isAdmin && <AdminModal t={t} uc={editUC} ucs={ucs} onSave={saveUC} onDelete={deleteUC} onClose={()=>{setAdmin(false);setEditUC(null);}} videos={videos} archs={archs} onUpload={handleUpload} onArchUpload={handleArchUpload} onRemoveVideo={removeVideo} onRemoveArch={removeArch} />}
      {chatOpen && <ChatPanel t={t} ucs={ucs} onClose={()=>setChat(false)} />}
      <input ref={fileRef} type="file" accept="video/*,image/*,.pdf" style={{ display:"none" }} onChange={handleFile} />
    </div>
  );
}

// ── BEQ LOGOS ──────────────────────────────────────────────────────────────
function BEQLogo({ style: sx = {} }) {
  return <svg xmlns="http://www.w3.org/2000/svg" width="100" height="28" viewBox="0 0 330 91" style={sx}><path fill="#fff" transform="translate(112.232 1.51061)" d="M71.761124 56.032986C70.371117 59.68837 68.147919 63.251694 65.082092 66.706711C59.395348 61.479507 53.345936 57.447754 46.951382 54.631752C40.599968 51.821171 34.251251 50.429417 27.916016 50.429417C24.966135 50.429417 22.36544 50.651447 20.13685 51.11311C17.889385 51.558521 15.811795 52.262524 13.958008 53.240002C13.521189 51.603199 13.215145 50.04763 12.989994 48.546215C12.768888 47.081352 12.685299 45.662521 12.685299 44.339817C12.685299 39.995323 13.480742 35.834953 15.106683 31.845169C16.68948 27.859446 19.013792 24.315077 22.029736 21.21883C24.829966 18.335138 28.022526 16.125662 31.641117 14.618831C35.243534 13.114708 39.037392 12.311877 43.029438 12.311877C47.521671 12.311877 51.624271 13.159385 55.292747 14.816492C58.953136 16.479015 62.372196 19.048615 65.540489 22.502277C68.251732 25.426584 70.322586 28.700184 71.742249 32.310894C73.14843 35.899937 73.864326 39.686646 73.864326 43.607384C73.864326 48.236183 73.14843 52.399261 71.761124 56.032986M49.507584 75.673233C47.521671 76.098335 45.604519 76.313599 43.735901 76.313599C38.623493 76.313599 33.849483 75.116798 29.443537 72.777351C25.010626 70.381042 21.281479 67.01403 18.260143 62.634338C19.585432 62.210583 20.930944 61.876186 22.292637 61.67717C23.663765 61.479507 25.115786 61.344124 26.579941 61.344124C31.734144 61.344124 36.812847 62.410954 41.790436 64.491814C46.773415 66.617355 51.428783 69.651321 55.768665 73.635689C53.567043 74.541412 51.469227 75.229172 49.507584 75.673233M80.676826 74.984123C79.089989 74.640244 77.516624 74.102768 76.013374 73.393356C79.591522 69.314217 82.243446 64.914215 83.998817 60.192001C85.715088 55.475201 86.610298 50.318401 86.610298 44.758152C86.610298 38.359879 85.499374 32.463879 83.320663 27.063385C81.136566 21.616861 77.876602 16.768738 73.511101 12.445908C69.337044 8.3058462 64.707291 5.181169 59.660946 3.1003077C54.584938 1.0208 49.093685 0 43.15617 0C37.380444 0 31.975473 1.0208 26.968225 3.1003077C21.948843 5.181169 17.354147 8.2855387 13.255591 12.311877C8.9332333 16.696985 5.6206837 21.526154 3.3718708 26.838646C1.1311474 32.180923 0 37.802094 0 43.718399C0 50.891075 1.4048338 57.537109 4.2158499 63.602337C7.0376511 69.693291 11.087671 74.898834 16.341642 79.15126C20.13685 82.205536 24.32304 84.52874 28.8692 86.127632C33.434235 87.718399 38.177235 88.518524 43.15617 88.518524C47.461002 88.518524 51.583828 87.943138 55.504417 86.769356C59.439838 85.617233 63.179771 83.865356 66.712082 81.58683C70.086647 83.4944 73.414024 84.9552 76.655121 85.948921C79.92318 86.90609 83.121132 87.393478 86.248978 87.393478L87.361252 87.393478L87.361252 75.498581L85.787888 75.498581C83.979942 75.498581 82.258278 75.342896 80.676826 74.984123" fillRule="evenodd"/><path fill="#fff" transform="translate(206.647 2.83995)" d="M45.340271 71.175751C42.651939 73.328369 38.44418 74.410095 32.729122 74.410095L12.148712 74.410095L12.148712 46.329967L32.729122 46.329967C38.223076 46.329967 42.363426 47.614769 45.185226 50.118031C47.990849 52.644306 49.401077 56.340309 49.401077 61.211445C49.401077 65.730583 48.054214 69.032616 45.340271 71.175751L45.340271 71.175751ZM12.260613 11.713477L29.72801 11.713477C34.821545 11.713477 38.612705 12.670646 41.109589 14.597169C43.576813 16.51963 44.809074 19.448 44.809074 23.4256C44.809074 27.947447 43.448734 31.177723 40.737484 33.129971C37.975002 35.079506 33.412666 36.052921 27.008671 36.052921L12.260613 36.052921L12.260613 11.713477ZM48.013767 39.732677C51.012184 37.955078 53.267738 35.702278 54.850536 32.998646C56.398281 30.274708 57.161366 27.152739 57.161366 23.585354C57.161366 15.904984 54.781776 10.052308 50.040127 6.0219078C45.272861 2.015877 38.347111 0 29.179289 0L0 0L0 86.039627L30.538282 86.039627C36.494671 86.039627 41.132511 85.577972 44.392479 84.619446C47.660538 83.670403 50.607723 82.09317 53.194935 79.905357C55.822594 77.580803 57.893444 74.633476 59.371082 71.132431C60.84737 67.612434 61.598324 63.829784 61.598324 59.81834C61.598324 54.8592 60.403809 50.581047 57.937935 46.993355C55.534081 43.407017 52.197262 40.994461 48.013767 39.732677L48.013767 39.732677Z" fillRule="evenodd"/><path fill="#fff" transform="translate(274.718 2.88625)" d="M54.211487 11.488738L54.211487 0L0 0L0 86.038277L54.211487 86.038277L54.211487 74.169106L12.419702 74.169106L12.419702 48.389168L51.176666 48.389168L51.176666 37.210461L12.419702 37.210461L12.419702 11.488738L54.211487 11.488738Z" fillRule="evenodd"/><path fill="#009AE4" transform="translate(1.60645 2.7122)" d="M32.660847 67.719872L44.595196 46.946461L37.695061 34.986584L22.336264 61.716919C20.684708 64.57489 21.655416 68.249229 24.50688 69.890091C27.371824 71.57563 31.003899 70.576492 32.660847 67.719872L32.660847 67.719872ZM19.39447 60.055752L26.442907 47.830521C16.166859 48.094521 7.9158192 56.553352 7.9158192 66.923813C7.9158192 77.487877 16.458071 86.052307 26.974102 86.052307L66.097778 86.052307C74.39196 86.052307 81.466019 80.719505 84.05188 73.255753C78.227615 76.199013 71.593079 76.312737 65.851059 74.072121L27.611805 74.072121C26.000694 74.097847 24.324871 73.697105 22.822966 72.8144C20.59977 71.528244 19.124828 69.44603 18.487125 67.141785C17.888521 64.83889 18.124458 62.293659 19.39447 60.055752L19.39447 60.055752ZM35.090321 23.69009L47.021969 44.420181L60.80471 44.420181L45.410862 17.691198C43.776833 14.835936 40.113747 13.858459 37.291946 15.495259C34.427002 17.159136 33.432022 20.813168 35.090321 23.69009L35.090321 23.69009ZM48.31625 15.985352L55.335026 28.209229C60.229027 19.131689 57.076912 7.7458439 48.122108 2.5619669C39.010914 -2.7126179 27.371824 0.41747451 22.123245 9.5613518L2.5620809 43.579445C-1.6065814 50.796799 -0.52262139 59.610336 4.6113586 65.639015C5.014473 59.056614 8.185461 53.232368 12.995871 49.379322L32.133698 16.116674C32.90757 14.697844 34.080513 13.459075 35.595898 12.575013C37.820442 11.291567 40.380692 11.024859 42.671299 11.642213C44.963257 12.264982 47.021969 13.744736 48.31625 15.985352L48.31625 15.985352ZM71.829018 47.808861L47.969761 47.808861L41.088501 59.790398L71.829018 59.790398C75.141563 59.790398 77.785408 57.109783 77.785408 53.813168C77.785408 50.490829 75.141563 47.808861 71.829018 47.808861L71.829018 47.808861ZM71.872162 63.156059C74.432411 63.156059 76.748634 62.094643 78.448723 60.411812C80.120506 58.727627 81.159973 56.378704 81.159973 53.813168C81.159973 52.038273 80.698883 50.401474 79.853554 49.005661L60.734604 15.766028C59.786816 9.6520596 56.394718 3.9361207 50.919643 0.34707451C58.644882 -1.1353871 66.798851 2.3439975 70.947289 9.5613518L90.509804 43.579445C95.781296 52.72332 92.650757 64.419197 83.539558 69.71138C74.569923 74.896614 63.182953 71.945229 57.806293 63.156059L71.872162 63.156059Z" fillRule="evenodd"/></svg>;
}
function BEQMark() {
  return <svg xmlns="http://www.w3.org/2000/svg" width="80" height="22" viewBox="0 0 330 91"><path fill="#fff" transform="translate(112.232 1.51061)" d="M71.761124 56.032986C70.371117 59.68837 68.147919 63.251694 65.082092 66.706711C59.395348 61.479507 53.345936 57.447754 46.951382 54.631752C40.599968 51.821171 34.251251 50.429417 27.916016 50.429417C24.966135 50.429417 22.36544 50.651447 20.13685 51.11311C17.889385 51.558521 15.811795 52.262524 13.958008 53.240002C13.521189 51.603199 13.215145 50.04763 12.989994 48.546215C12.768888 47.081352 12.685299 45.662521 12.685299 44.339817C12.685299 39.995323 13.480742 35.834953 15.106683 31.845169C16.68948 27.859446 19.013792 24.315077 22.029736 21.21883C24.829966 18.335138 28.022526 16.125662 31.641117 14.618831C35.243534 13.114708 39.037392 12.311877 43.029438 12.311877C47.521671 12.311877 51.624271 13.159385 55.292747 14.816492C58.953136 16.479015 62.372196 19.048615 65.540489 22.502277C68.251732 25.426584 70.322586 28.700184 71.742249 32.310894C73.14843 35.899937 73.864326 39.686646 73.864326 43.607384C73.864326 48.236183 73.14843 52.399261 71.761124 56.032986M49.507584 75.673233C47.521671 76.098335 45.604519 76.313599 43.735901 76.313599C38.623493 76.313599 33.849483 75.116798 29.443537 72.777351C25.010626 70.381042 21.281479 67.01403 18.260143 62.634338C19.585432 62.210583 20.930944 61.876186 22.292637 61.67717C23.663765 61.479507 25.115786 61.344124 26.579941 61.344124C31.734144 61.344124 36.812847 62.410954 41.790436 64.491814C46.773415 66.617355 51.428783 69.651321 55.768665 73.635689C53.567043 74.541412 51.469227 75.229172 49.507584 75.673233M80.676826 74.984123C79.089989 74.640244 77.516624 74.102768 76.013374 73.393356C79.591522 69.314217 82.243446 64.914215 83.998817 60.192001C85.715088 55.475201 86.610298 50.318401 86.610298 44.758152C86.610298 38.359879 85.499374 32.463879 83.320663 27.063385C81.136566 21.616861 77.876602 16.768738 73.511101 12.445908C69.337044 8.3058462 64.707291 5.181169 59.660946 3.1003077C54.584938 1.0208 49.093685 0 43.15617 0C37.380444 0 31.975473 1.0208 26.968225 3.1003077C21.948843 5.181169 17.354147 8.2855387 13.255591 12.311877C8.9332333 16.696985 5.6206837 21.526154 3.3718708 26.838646C1.1311474 32.180923 0 37.802094 0 43.718399C0 50.891075 1.4048338 57.537109 4.2158499 63.602337C7.0376511 69.693291 11.087671 74.898834 16.341642 79.15126C20.13685 82.205536 24.32304 84.52874 28.8692 86.127632C33.434235 87.718399 38.177235 88.518524 43.15617 88.518524C47.461002 88.518524 51.583828 87.943138 55.504417 86.769356C59.439838 85.617233 63.179771 83.865356 66.712082 81.58683C70.086647 83.4944 73.414024 84.9552 76.655121 85.948921C79.92318 86.90609 83.121132 87.393478 86.248978 87.393478L87.361252 87.393478L87.361252 75.498581L85.787888 75.498581C83.979942 75.498581 82.258278 75.342896 80.676826 74.984123" fillRule="evenodd"/><path fill="#fff" transform="translate(206.647 2.83995)" d="M45.340271 71.175751C42.651939 73.328369 38.44418 74.410095 32.729122 74.410095L12.148712 74.410095L12.148712 46.329967L32.729122 46.329967C38.223076 46.329967 42.363426 47.614769 45.185226 50.118031C47.990849 52.644306 49.401077 56.340309 49.401077 61.211445C49.401077 65.730583 48.054214 69.032616 45.340271 71.175751L45.340271 71.175751ZM12.260613 11.713477L29.72801 11.713477C34.821545 11.713477 38.612705 12.670646 41.109589 14.597169C43.576813 16.51963 44.809074 19.448 44.809074 23.4256C44.809074 27.947447 43.448734 31.177723 40.737484 33.129971C37.975002 35.079506 33.412666 36.052921 27.008671 36.052921L12.260613 36.052921L12.260613 11.713477ZM48.013767 39.732677C51.012184 37.955078 53.267738 35.702278 54.850536 32.998646C56.398281 30.274708 57.161366 27.152739 57.161366 23.585354C57.161366 15.904984 54.781776 10.052308 50.040127 6.0219078C45.272861 2.015877 38.347111 0 29.179289 0L0 0L0 86.039627L30.538282 86.039627C36.494671 86.039627 41.132511 85.577972 44.392479 84.619446C47.660538 83.670403 50.607723 82.09317 53.194935 79.905357C55.822594 77.580803 57.893444 74.633476 59.371082 71.132431C60.84737 67.612434 61.598324 63.829784 61.598324 59.81834C61.598324 54.8592 60.403809 50.581047 57.937935 46.993355C55.534081 43.407017 52.197262 40.994461 48.013767 39.732677L48.013767 39.732677Z" fillRule="evenodd"/><path fill="#fff" transform="translate(274.718 2.88625)" d="M54.211487 11.488738L54.211487 0L0 0L0 86.038277L54.211487 86.038277L54.211487 74.169106L12.419702 74.169106L12.419702 48.389168L51.176666 48.389168L51.176666 37.210461L12.419702 37.210461L12.419702 11.488738L54.211487 11.488738Z" fillRule="evenodd"/><path fill="#009AE4" transform="translate(1.60645 2.7122)" d="M32.660847 67.719872L44.595196 46.946461L37.695061 34.986584L22.336264 61.716919C20.684708 64.57489 21.655416 68.249229 24.50688 69.890091C27.371824 71.57563 31.003899 70.576492 32.660847 67.719872L32.660847 67.719872ZM19.39447 60.055752L26.442907 47.830521C16.166859 48.094521 7.9158192 56.553352 7.9158192 66.923813C7.9158192 77.487877 16.458071 86.052307 26.974102 86.052307L66.097778 86.052307C74.39196 86.052307 81.466019 80.719505 84.05188 73.255753C78.227615 76.199013 71.593079 76.312737 65.851059 74.072121L27.611805 74.072121C26.000694 74.097847 24.324871 73.697105 22.822966 72.8144C20.59977 71.528244 19.124828 69.44603 18.487125 67.141785C17.888521 64.83889 18.124458 62.293659 19.39447 60.055752L19.39447 60.055752ZM35.090321 23.69009L47.021969 44.420181L60.80471 44.420181L45.410862 17.691198C43.776833 14.835936 40.113747 13.858459 37.291946 15.495259C34.427002 17.159136 33.432022 20.813168 35.090321 23.69009L35.090321 23.69009ZM48.31625 15.985352L55.335026 28.209229C60.229027 19.131689 57.076912 7.7458439 48.122108 2.5619669C39.010914 -2.7126179 27.371824 0.41747451 22.123245 9.5613518L2.5620809 43.579445C-1.6065814 50.796799 -0.52262139 59.610336 4.6113586 65.639015C5.014473 59.056614 8.185461 53.232368 12.995871 49.379322L32.133698 16.116674C32.90757 14.697844 34.080513 13.459075 35.595898 12.575013C37.820442 11.291567 40.380692 11.024859 42.671299 11.642213C44.963257 12.264982 47.021969 13.744736 48.31625 15.985352L48.31625 15.985352ZM71.829018 47.808861L47.969761 47.808861L41.088501 59.790398L71.829018 59.790398C75.141563 59.790398 77.785408 57.109783 77.785408 53.813168C77.785408 50.490829 75.141563 47.808861 71.829018 47.808861L71.829018 47.808861ZM71.872162 63.156059C74.432411 63.156059 76.748634 62.094643 78.448723 60.411812C80.120506 58.727627 81.159973 56.378704 81.159973 53.813168C81.159973 52.038273 80.698883 50.401474 79.853554 49.005661L60.734604 15.766028C59.786816 9.6520596 56.394718 3.9361207 50.919643 0.34707451C58.644882 -1.1353871 66.798851 2.3439975 70.947289 9.5613518L90.509804 43.579445C95.781296 52.72332 92.650757 64.419197 83.539558 69.71138C74.569923 74.896614 63.182953 71.945229 57.806293 63.156059L71.872162 63.156059Z" fillRule="evenodd"/></svg>;
}

// ── NAV ───────────────────────────────────────────────────────────────────
function Nav({ t, dk, setDk, view, go, isCat, isAdmin, onAdmin, search, setSearch, chatOpen, setChat, spStatus }) {
  const [sf, setSf] = useState(false);
  const NL = (label, v, iconName, match) => { const active = match ? match() : view === v; return <button onClick={()=>go(v)} style={{ background:"none", border:"none", fontSize:15, fontWeight:active?600:400, color:active?t.navActive:t.navTx2, display:"flex", alignItems:"center", gap:6, padding:"4px 2px", borderBottom:`2px solid ${active?t.navActive:"transparent"}`, transition:"color 0.15s" }}><Icon name={iconName} size={15} color={active?t.navActive:t.navTx2} />{label}</button>; };
  const spDot = spStatus==="synced"?t.green:spStatus==="saving"?t.amber:spStatus==="error"?t.red:null;
  return (
    <nav style={{ background:t.nav, borderBottom:`1px solid ${t.navBd}`, padding:"0 clamp(16px,3vw,40px)", height:60, display:"flex", alignItems:"center", justifyContent:"space-between", position:"sticky", top:0, zIndex:30 }}>
      <div style={{ display:"flex", alignItems:"center", gap:10 }}><BEQMark />{spDot && <span title={spStatus==="synced"?"Data synced":spStatus==="saving"?"Saving…":"Sync error"} style={{ width:7, height:7, borderRadius:"50%", background:spDot, display:"inline-block", marginLeft:6, animation:spStatus==="saving"?"pulse 1.2s infinite":"none" }} />}</div>
      <div style={{ display:"flex", alignItems:"center", gap:20 }}>{NL("Home","home","home")}{NL("Journey","journey","journey",()=>view==="journey")}{NL("Catalog","catalog","catalog",()=>isCat)}{NL("Impact","dashboard","dashboard",()=>view==="dashboard")}{NL("Client Speaks","client","chat",()=>view==="client")}</div>
      <div style={{ display:"flex", alignItems:"center", gap:7 }}>
        <div style={{ position:"relative", display:"flex", alignItems:"center" }}><span style={{ position:"absolute", left:9, pointerEvents:"none" }}><Icon name="search" size={13} color={t.navTx2} /></span><input value={search} onChange={e=>setSearch(e.target.value)} onFocus={()=>setSf(true)} onBlur={()=>setSf(false)} placeholder="Search…" style={{ background:"rgba(255,255,255,0.08)", border:`1px solid ${sf?"rgba(0,154,228,0.5)":t.navBd}`, borderRadius:20, padding:"6px 28px 6px 28px", fontSize:13, color:t.navTx, width:150, transition:"all 0.2s", outline:"none" }} />{search && <button onClick={()=>setSearch("")} style={{ position:"absolute", right:8, background:"none", border:"none", color:t.navTx2, fontSize:11, padding:0 }}><Icon name="close" size={11} color={t.navTx2} /></button>}</div>
        <button onClick={()=>setChat(o=>!o)} style={{ background:chatOpen?"rgba(0,154,228,0.15)":"transparent", border:`1px solid ${chatOpen?"rgba(0,154,228,0.3)":t.navBd}`, borderRadius:20, padding:"6px 13px", fontSize:13, color:chatOpen?t.navActive:t.navTx2, display:"flex", alignItems:"center", gap:5 }}><Icon name="chat" size={14} color={chatOpen?t.navActive:t.navTx2} />Ask AI</button>
        {isAdmin && isCat && <button onClick={onAdmin} style={{ background:"transparent", border:`1px solid ${t.navBd}`, borderRadius:20, padding:"6px 13px", fontSize:13, color:t.navTx2, display:"flex", alignItems:"center", gap:5 }}><Icon name="add" size={14} color={t.navTx2} />Add / Edit</button>}
        <div style={{ display:"flex", alignItems:"center", gap:4, background:isAdmin?"rgba(0,154,228,0.12)":"rgba(255,255,255,0.06)", border:`1px solid ${isAdmin?"rgba(0,154,228,0.25)":t.navBd}`, borderRadius:20, padding:"6px 12px", fontSize:12, color:isAdmin?t.navActive:t.navTx2 }}><Icon name={isAdmin?"shield":"lock"} size={13} color={isAdmin?t.navActive:t.navTx2} />{isAdmin?"Admin":"Read-only"}</div>
        <button onClick={()=>setDk(d=>!d)} style={{ background:"transparent", border:`1px solid ${t.navBd}`, borderRadius:20, padding:"7px 10px", display:"flex", alignItems:"center" }}><Icon name={dk?"sun":"moon"} size={15} color={t.navTx2} /></button>
      </div>
    </nav>
  );
}

// ── SOLUTIONS BY ROLE — HX-STYLE ACCORDION ────────────────────────────────
function SolutionsByRole({ t, dk, go }) {
  const [active, setActive] = useState(0);
  const pillBg = dk ? "rgba(0,48,87,0.85)" : "rgba(0,48,87,0.7)";
  const txtBg = dk ? t.bgCard : t.bgMuted;
  const btnBd = dk ? t.bdStrong : t.bd;
  return (
    <div style={{ marginBottom: 40 }} className="fade">
      <SLabel t={t}>{toTitleCase("Solutions Tailored for Every Function")}</SLabel>
      <div style={{ display:"flex", gap:8, height:520, marginTop:14 }}>
        {ROLE_CARDS.map((rc, i) => {
          const isActive = i === active;
          return (
            <React.Fragment key={rc.id}>
              <div style={{ borderRadius:16, background:txtBg, overflow:"hidden", display:"flex", flexDirection:"column", justifyContent:"center", transition:"width 0.6s cubic-bezier(.4,0,.2,1),min-width 0.6s cubic-bezier(.4,0,.2,1),opacity 0.4s 0.1s,padding 0.6s cubic-bezier(.4,0,.2,1)", width:isActive?310:0, minWidth:isActive?310:0, opacity:isActive?1:0, padding:isActive?"38px 30px":0, flexShrink:0 }}>
                <div style={{ opacity:isActive?1:0, transform:isActive?"translateY(0)":"translateY(6px)", transition:"opacity 0.3s 0.18s,transform 0.3s 0.18s" }}>
                  <h3 style={{ fontSize:25, fontWeight:700, lineHeight:1.18, letterSpacing:"-0.02em", marginBottom:20 }}>{rc.headline}</h3>
                  <p style={{ fontSize:14, color:t.tx2, lineHeight:1.78, marginBottom:12 }}>{rc.p1}</p>
                  <p style={{ fontSize:14, color:t.tx2, lineHeight:1.78, marginBottom:0 }}>{rc.p2}</p>
                  <div style={{ flex:1, minHeight:16 }} />
                  <button onClick={()=>go("catalog")} style={{ display:"inline-flex", alignItems:"center", gap:8, padding:"11px 22px", borderRadius:24, fontSize:13, fontWeight:600, color:t.tx1, border:`1.5px solid ${btnBd}`, cursor:"pointer", background:"transparent", marginTop:20 }}>Learn how <Icon name="roi" size={14} color={t.tx1} /></button>
                </div>
              </div>
              <div onMouseEnter={()=>setActive(i)} onClick={()=>setActive(i)} style={{ position:"relative", borderRadius:16, overflow:"hidden", cursor:"pointer", minWidth:0, flex:isActive?"3.5 1 0%":"1.2 1 0%", transition:"flex 0.6s cubic-bezier(.4,0,.2,1)" }}>
                <div className="role-img" style={{ position:"absolute", inset:0, backgroundSize:"cover", backgroundPosition:"center", backgroundImage:`url('${rc.img}')`, transition:"transform 0.7s cubic-bezier(.4,0,.2,1)" }} />
                <div style={{ position:"absolute", inset:0, pointerEvents:"none", background:isActive?"linear-gradient(0deg,rgba(0,20,40,0.25) 0%,rgba(0,20,40,0) 35%)":"linear-gradient(0deg,rgba(0,20,40,0.5) 0%,rgba(0,20,40,0.03) 45%)", transition:"background 0.4s" }} />
                <div style={{ position:"absolute", top:18, left:"50%", transform:"translateX(-50%)", background:pillBg, color:"#fff", fontSize:13, fontWeight:600, padding:"8px 20px", borderRadius:24, zIndex:3, whiteSpace:"nowrap", backdropFilter:"blur(8px)", WebkitBackdropFilter:"blur(8px)", transition:"opacity 0.35s", opacity:isActive?1:0, pointerEvents:isActive?"auto":"none" }}>{rc.label}</div>
                <div style={{ position:"absolute", top:"50%", left:"50%", transform:"translate(-50%,-50%) rotate(-90deg)", background:pillBg, color:"#fff", fontSize:13, fontWeight:600, padding:"8px 20px", borderRadius:24, zIndex:3, whiteSpace:"nowrap", backdropFilter:"blur(8px)", WebkitBackdropFilter:"blur(8px)", transition:"opacity 0.35s", opacity:isActive?0:1, pointerEvents:isActive?"none":"auto" }}>{rc.label}</div>
              </div>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

// ── HOME PAGE ─────────────────────────────────────────────────────────────
function HomePage({ t, dk, ucs, videos, archs, isAdmin, onUpload, onArchUpload, go }) {
  const live = ucs.filter(u => u.status === "Live");
  const liveCount = live.length, inDevCount = ucs.filter(u => u.status === "In development").length, roadmapCount = ucs.filter(u => u.status === "Roadmap").length, totalCount = ucs.length;
  return (
    <div style={{ paddingBottom:60 }}>
      <div className="fade" style={{ padding:"clamp(24px,4vw,48px) 0 clamp(20px,3vw,36px)", textAlign:"center" }}>
        <h1 style={{ fontSize:"clamp(32px,5vw,56px)", fontWeight:800, lineHeight:1.08, letterSpacing:"-0.03em", maxWidth:680, margin:"0 auto 14px" }}><span style={{ color:t.accent }}>BEQ</span> AI Innovation Studio</h1>
        <p style={{ fontSize:"clamp(15px,1.8vw,19px)", color:t.tx2, lineHeight:1.55, maxWidth:700, margin:"0 auto" }}>Generating measurable value across the insurance value chain and technology delivery — from underwriting to claims to autonomous ops.</p>
      </div>
      <div style={{ overflow:"hidden", borderTop:`1px solid ${t.bd}`, borderBottom:`1px solid ${t.bd}`, marginBottom:40, padding:"14px 0", background:t.bgMuted }}>
        <div style={{ display:"flex", width:"max-content", animation:"ticker 30s linear infinite" }} onMouseEnter={e=>e.currentTarget.style.animationPlayState="paused"} onMouseLeave={e=>e.currentTarget.style.animationPlayState="running"}>
          {[...Array(2)].flatMap((_,rep) => [
            { value: totalCount, label: "Total use cases", icon: "catalog", color: t.accent },
            { value: liveCount, label: "Live in production", icon: "check", color: t.green },
            { value: inDevCount, label: "In development", icon: "bolt", color: t.blue },
            { value: roadmapCount, label: "On roadmap", icon: "journey", color: t.purple },
            { value: "55%", label: "Increase in bound policies, NA", icon: "speed", color: t.blue },
            { value: "~$10M", label: "NB GWP uplift, Cyber", icon: "cost", color: t.green },
            { value: "94%", label: "CSAT score (+9 pt uplift)", icon: "star", color: t.amber },
            { value: "112.75", label: "FTE productivity savings", icon: "person", color: t.green },
          ].map((m,i) => <div key={rep+"_"+i} style={{ display:"flex", alignItems:"center", gap:10, padding:"0 36px", borderRight:`1px solid ${t.bd}` }}><Icon name={m.icon} size={16} color={m.color} /><span style={{ fontSize:24, fontWeight:800, color:m.color }}>{m.value}</span><span style={{ fontSize:13, color:t.tx2, maxWidth:140, lineHeight:1.4 }}>{m.label}</span></div>))}
        </div>
      </div>
      <SolutionsByRole t={t} dk={dk} go={go} />
      <div className="fade">
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}><SLabel t={t}>{toTitleCase("Live Solutions")}</SLabel><button onClick={()=>go("catalog")} style={{ background:"none", border:"none", fontSize:13, color:t.accent, fontWeight:600, display:"flex", alignItems:"center", gap:4 }}>View all <Icon name="catalog" size={13} color={t.accent} /></button></div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))", gap:12 }}>
          {live.map((uc,i) => <UCCard key={uc.id} uc={uc} t={t} dk={dk} hasVideo={!!videos[uc.id]} hasArch={!!archs[uc.id]} isAdmin={isAdmin} onUpload={onUpload} onArchUpload={onArchUpload} onClick={()=>go("detail",uc.id)} idx={i} />)}
        </div>
      </div>
    </div>
  );
}

// ── JOURNEY PAGE ──────────────────────────────────────────────────────────
function JourneyPage({ t, dk, go }) {
  const [active, setActive] = useState(0);
  const j = JOURNEY[active]; const phC = [t.green, t.blue, t.purple];
  const phB = dk ? ["rgba(62,203,160,0.1)","rgba(107,173,245,0.1)","rgba(158,128,245,0.1)"] : ["#E7F7F3","#E8F0FC","#EEE9FC"];
  return (
    <div style={{ padding:"28px 0 60px" }} className="fade">
      <button onClick={()=>go("home")} style={{ background:t.bgCard, border:`1px solid ${t.bd}`, borderRadius:20, padding:"7px 16px", fontSize:13, color:t.tx2, display:"flex", alignItems:"center", gap:5, marginBottom:24 }}><Icon name="back" size={15} color={t.tx2} />Back</button>
      <div style={{ fontSize:12, fontWeight:600, color:t.accent, letterSpacing:"0.12em", textTransform:"uppercase", marginBottom:8 }}>Enterprise AI Journey</div>
      <h2 style={{ fontSize:"clamp(26px,4vw,44px)", fontWeight:800, letterSpacing:"-0.03em", marginBottom:8 }}>{toTitleCase("From Experimentation to Exponential Impact")}</h2>
      <p style={{ fontSize:16, color:t.tx2, marginBottom:32, maxWidth:600, lineHeight:1.65 }}>BEQ's progression from early AI pilots to scalable, agentic solutions delivering measurable impact across the enterprise.</p>
      <div className="card" style={{ padding:"24px clamp(16px,3vw,32px) 20px", marginBottom:22 }}>
        <div style={{ position:"relative", height:5, background:t.bgDeep, borderRadius:3, margin:"0 8% 22px" }}><div style={{ position:"absolute", top:0, left:0, height:"100%", borderRadius:3, background:`linear-gradient(90deg,${t.green},${active>=1?t.blue:t.green},${active>=2?t.purple:t.green})`, width:active===0?"0%":active===1?"50%":"100%", transition:"width 0.6s cubic-bezier(.4,0,.2,1)" }} />{JOURNEY.map((_,i) => { const pos=i===0?0:i===1?50:100; return <div key={i} onClick={()=>setActive(i)} style={{ position:"absolute", top:"50%", left:`${pos}%`, transform:"translate(-50%,-50%)", cursor:"pointer", zIndex:2 }}><div style={{ width:18, height:18, borderRadius:"50%", background:i<=active?phC[i]:t.bgDeep, border:`3px solid ${t.bgCard}`, transition:"all 0.4s", boxShadow:i<=active?`0 0 0 3px ${phC[i]}33`:"none" }} /></div>; })}</div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10 }}>{JOURNEY.map((ph,i) => <button key={i} onClick={()=>setActive(i)} style={{ background:active===i?phB[i]:t.bgMuted, border:`1.5px solid ${active===i?phC[i]+"66":t.bd}`, borderRadius:12, padding:"18px 18px 16px", textAlign:"left", transition:"all 0.2s" }}><div style={{ marginBottom:12 }}><PhaseIcon phase={i} color={phC[i]} size={32} /></div><div style={{ fontSize:14, fontWeight:700, color:phC[i], marginBottom:3 }}>{ph.phase}</div><div style={{ fontSize:16, fontWeight:700, color:t.tx1, marginBottom:3, lineHeight:1.3 }}>{ph.label}</div><div style={{ fontSize:13, color:t.tx3, fontStyle:"italic" }}>{ph.sub}</div></button>)}</div>
      </div>
      <div key={active} className="fade">
        <div className="card" style={{ padding:"20px 24px", marginBottom:14 }}><div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:14 }}><Icon name="star" size={15} color={phC[active]} /><span style={{ fontSize:12, fontWeight:600, color:phC[active], letterSpacing:"0.1em", textTransform:"uppercase" }}>Strategic Milestones</span></div>{j.milestones.map((m,i) => <div key={i} style={{ display:"flex", gap:10, alignItems:"flex-start", marginBottom:i<j.milestones.length-1?12:0 }}><div style={{ width:24, height:24, borderRadius:"50%", background:phB[active], color:phC[active], display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:700, flexShrink:0, marginTop:1 }}>{i+1}</div><div style={{ fontSize:14, color:t.tx2, lineHeight:1.6, paddingTop:2 }}>{m}</div></div>)}</div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(240px,1fr))", gap:12, marginBottom:28 }}>{j.highlights.map((h,i) => <div key={i} className="card" style={{ padding:"17px 19px", borderLeft:`3px solid ${phC[active]}`, borderRadius:0 }}><div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:9 }}><span style={{ background:phB[active], padding:"3px 10px", borderRadius:20, display:"flex", alignItems:"center", gap:4 }}><Icon name={h.icon} size={12} color={phC[active]} /><span style={{ fontSize:11, fontWeight:600, color:phC[active] }}>{h.tag}</span></span></div><div style={{ fontSize:15, fontWeight:600, marginBottom:5 }}>{h.title}</div><div style={{ fontSize:13, color:t.tx2, lineHeight:1.55 }}>{h.desc}</div></div>)}</div>
      </div>
      <div style={{ background:`linear-gradient(135deg,${dk?"#0A1E35":"#003057"}ee,${t.blue}cc)`, borderRadius:14, padding:"24px 28px", color:"#fff", marginBottom:26 }}><div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}><Icon name="bolt" size={17} color="#fff" /><span style={{ fontSize:17, fontWeight:700 }}>AI-First Talent Transformation</span></div><div style={{ fontSize:14, lineHeight:1.7, opacity:0.92 }}>BEQ and Accenture are embedding AI capability at every level of the organisation — from executive GenAI literacy programmes to hands-on delivery teams co-building agentic solutions. This ensures AI adoption is sustained, governed and commercially impactful at scale.</div></div>
      <SLabel t={t}>Cumulative Impact</SLabel>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(155px,1fr))", gap:10, marginTop:12, marginBottom:24 }}>{METRICS.map((m,i) => { const c=PC(t,m.pillar); return <div key={i} className="card" style={{ padding:"16px 18px", textAlign:"center" }}><Icon name={m.icon||(m.pillar==="speed"?"speed":m.pillar==="cost"?"cost":"quality")} size={17} color={c.tx} style={{ margin:"0 auto 7px" }} /><div style={{ fontSize:24, fontWeight:800, color:c.tx, marginBottom:4 }}>{m.value}</div><div style={{ fontSize:12, color:t.tx2, lineHeight:1.4 }}>{m.label}</div></div>; })}</div>
    </div>
  );
}

// ── DASHBOARD PAGE ────────────────────────────────────────────────────────
function DashboardPage({ t, dk, ucs, go }) {
  const live=ucs.filter(u=>u.status==="Live").length, inDev=ucs.filter(u=>u.status==="In development").length, roadmap=ucs.filter(u=>u.status==="Roadmap").length;

  function extractPct(impact) { if (!impact) return 0; const m = impact.match(/(\d+)\s*%/); return m ? parseInt(m[1], 10) : 0; }
  function buildRoiRows(ucsList) {
    return ucsList.filter(u => u.status === "Live").map(u => ({
      id: u.id, label: u.title, pillar: u.pillar, timeFrom: u.fromTime || "—", timeTo: u.toTime || "—", pct: extractPct(u.impact),
    }));
  }
  const [roiRows, setRoiRows] = useState([]);
  const [editingRoi, setEditingRoi] = useState(null);
  useEffect(() => { setRoiRows(buildRoiRows(ucs)); }, [ucs]);
  const updateRoi = (id, k, v) => setRoiRows(p => p.map(r => r.id === id ? { ...r, [k]: v } : r));
  const addRoiRow = () => { const id = "roi_" + Date.now(); setRoiRows(p => [...p, { id, label: "New solution", timeFrom: "—", timeTo: "—", pct: 0, pillar: "speed" }]); setEditingRoi(id); };
  const removeRoiRow = id => { setRoiRows(p => p.filter(r => r.id !== id)); if (editingRoi === id) setEditingRoi(null); };
  const roiSorted = useMemo(() => [...roiRows].sort((a, b) => {
    const po = { cost: 0, speed: 1, quality: 2 };
    const pa = po[a.pillar] ?? 99, pb = po[b.pillar] ?? 99;
    if (pa !== pb) return pa - pb;
    return (a.label || "").localeCompare(b.label || "");
  }), [roiRows]);

  const [fteRows,setFteRows]=useState(INIT_FTE_ROWS.map(r=>({...r})));
  const [editingFte,setEditingFte]=useState(null);
  const totalFte=fteRows.reduce((s,r)=>s+Number(r.fte||0),0);
  const addFteRow=()=>{const id="fte_"+Date.now();setFteRows(p=>[...p,{id,label:"New area",fte:0}]);setEditingFte(id);};
  const removeFteRow=id=>setFteRows(p=>p.filter(r=>r.id!==id));
  const updateFte=(id,k,v)=>setFteRows(p=>p.map(r=>r.id===id?{...r,[k]:v}:r));

  return (
    <div style={{ padding:"28px 0 60px" }} className="fade">
      <div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:6 }}><Icon name="dashboard" size={19} color={t.accent} /><span style={{ fontSize:12, fontWeight:600, color:t.accent, letterSpacing:"0.12em", textTransform:"uppercase" }}>Impact Dashboard</span></div>
      <h2 style={{ fontSize:"clamp(26px,4vw,42px)", fontWeight:800, letterSpacing:"-0.02em", marginBottom:8 }}>AI Value Realization at BEQ</h2>
      <p style={{ fontSize:16, color:t.tx2, marginBottom:28, maxWidth:580, lineHeight:1.6 }}>Aggregate impact across all live AI initiatives — measuring financial return, operational efficiency and portfolio maturity.</p>
      <SLabel t={t}>Portfolio Summary</SLabel>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(145px,1fr))", gap:10, marginTop:12, marginBottom:32 }}>{[{label:"Total Use Cases",value:ucs.length,icon:"catalog",color:t.accent},{label:"Live in Production",value:live,icon:"check",color:t.green},{label:"In Development",value:inDev,icon:"bolt",color:t.blue},{label:"On Roadmap",value:roadmap,icon:"journey",color:t.purple},{label:"NB GWP Uplift",value:"~$10M",icon:"cost",color:t.green},{label:"CSAT Score",value:"94%",icon:"star",color:t.amber}].map((k,i)=><div key={i} className="card" style={{ padding:"18px 16px", textAlign:"center" }}><div style={{ display:"flex", justifyContent:"center", marginBottom:8 }}><Icon name={k.icon} size={19} color={k.color} /></div><div style={{ fontSize:26, fontWeight:800, color:k.color, marginBottom:4 }}>{k.value}</div><div style={{ fontSize:12, color:t.tx2, lineHeight:1.4 }}>{k.label}</div></div>)}</div>

      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}><SLabel t={t}>ROI Breakdown — Live Solutions</SLabel><button onClick={addRoiRow} style={{ background:t.bgMuted, border:`1px solid ${t.bd}`, borderRadius:20, padding:"6px 14px", fontSize:13, color:t.tx2, display:"flex", alignItems:"center", gap:5 }}><Icon name="add" size={14} color={t.tx3} />Add Row</button></div>
      <div style={{ marginBottom:32, overflowX:"auto" }}><table style={{ width:"100%", borderCollapse:"collapse", fontSize:14 }}><thead><tr style={{ background:t.bgMuted }}>{["Solution","Pillar","Time: Before","Time: After","Time Saved %",""].map((h,i)=><th key={i} style={{ padding:"11px 14px", textAlign:i===0?"left":"center", fontWeight:600, color:t.tx2, fontSize:12, whiteSpace:"nowrap", borderBottom:`1px solid ${t.bd}` }}>{h}</th>)}</tr></thead><tbody>{roiSorted.map(r=>{const pc=PC(t,r.pillar);const pil=PILLARS.find(p=>p.id===r.pillar);const isEditing=editingRoi===r.id;const inpS={padding:"5px 8px",border:`1px solid ${t.accent}`,borderRadius:6,fontSize:13,background:t.bgMuted,color:t.tx1,outline:"none",width:"100%"};return isEditing?<tr key={r.id} style={{ borderBottom:`1px solid ${t.bd}`, background:t.accentBg }}><td style={{ padding:"8px 10px" }}><input value={r.label} onChange={e=>updateRoi(r.id,"label",e.target.value)} style={{ ...inpS, minWidth:120 }} /></td><td style={{ padding:"8px 10px" }}><select value={r.pillar} onChange={e=>updateRoi(r.id,"pillar",e.target.value)} style={{ ...inpS, minWidth:90 }}>{PILLARS.map(p=><option key={p.id} value={p.id}>{p.label}</option>)}</select></td><td style={{ padding:"8px 10px" }}><input value={r.timeFrom} onChange={e=>updateRoi(r.id,"timeFrom",e.target.value)} style={{ ...inpS, minWidth:70 }} /></td><td style={{ padding:"8px 10px" }}><input value={r.timeTo} onChange={e=>updateRoi(r.id,"timeTo",e.target.value)} style={{ ...inpS, minWidth:70 }} /></td><td style={{ padding:"8px 10px" }}><input type="number" min="0" max="100" value={r.pct} onChange={e=>updateRoi(r.id,"pct",Number(e.target.value))} style={{ ...inpS, minWidth:60 }} /></td><td style={{ padding:"8px 10px", textAlign:"center", whiteSpace:"nowrap" }}><button onClick={()=>setEditingRoi(null)} style={{ background:t.green, border:"none", borderRadius:20, padding:"5px 12px", fontSize:12, color:"#fff", fontWeight:600, marginRight:4 }}>Done</button><button onClick={()=>removeRoiRow(r.id)} style={{ background:"none", border:`1px solid ${t.red}`, borderRadius:20, padding:"5px 9px", fontSize:12, color:t.red }}><Icon name="trash" size={12} color={t.red} /></button></td></tr>:<tr key={r.id} style={{ borderBottom:`1px solid ${t.bd}` }} onMouseEnter={e=>e.currentTarget.style.background=t.bgMuted} onMouseLeave={e=>e.currentTarget.style.background="transparent"}><td style={{ padding:"12px 14px", fontWeight:600 }}>{r.label}</td><td style={{ padding:"12px 14px", textAlign:"center" }}><span style={{ background:pc.bg, color:pc.tx, fontSize:11, fontWeight:500, padding:"3px 11px", borderRadius:20, display:"inline-flex", alignItems:"center", gap:4, whiteSpace:"nowrap" }}><Icon name={pil?.iconName||"star"} size={11} color={pc.tx} />{pil?.label}</span></td><td style={{ padding:"12px 14px", textAlign:"center", color:t.tx3, fontSize:13 }}>{r.timeFrom}</td><td style={{ padding:"12px 14px", textAlign:"center", color:t.green, fontWeight:600, fontSize:13 }}>{r.timeTo}</td><td style={{ padding:"12px 14px", textAlign:"center" }}>{r.pct>0?<div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:4 }}><div style={{ width:60, height:6, borderRadius:3, background:t.bgDeep, overflow:"hidden" }}><div style={{ width:`${r.pct}%`, height:"100%", background:t.green, borderRadius:3 }} /></div><span style={{ fontSize:12, color:t.green, fontWeight:600 }}>{r.pct}%</span></div>:<span style={{ fontSize:12, color:t.tx3 }}>—</span>}</td><td style={{ padding:"12px 14px", textAlign:"center" }}><button onClick={()=>setEditingRoi(r.id)} style={{ background:"none", border:`1px solid ${t.bd}`, borderRadius:20, padding:"4px 11px", fontSize:11, color:t.tx3, display:"inline-flex", alignItems:"center", gap:4 }}><Icon name="edit" size={12} color={t.tx3} />Edit</button></td></tr>;})}</tbody></table></div>

      <SLabel t={t}>FTE Productivity Savings</SLabel>
      <div className="card" style={{ padding:"20px 22px", marginTop:12, marginBottom:32 }}><div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}><div style={{ display:"flex", alignItems:"center", gap:10 }}><div style={{ width:46, height:46, borderRadius:12, background:t.greenBg, display:"flex", alignItems:"center", justifyContent:"center" }}><Icon name="person" size={24} color={t.green} /></div><div><div style={{ fontSize:30, fontWeight:800, color:t.green, lineHeight:1 }}>{totalFte}</div><div style={{ fontSize:12, color:t.tx3, marginTop:2 }}>total FTEs freed</div></div></div><button onClick={addFteRow} style={{ background:t.bgMuted, border:`1px solid ${t.bd}`, borderRadius:20, padding:"6px 14px", fontSize:13, color:t.tx2, display:"flex", alignItems:"center", gap:5 }}><Icon name="add" size={14} color={t.tx3} />Add Row</button></div><div style={{ borderTop:`1px solid ${t.bd}`, paddingTop:12 }}>{fteRows.map((row,i) => { const pct=totalFte>0?Math.round((row.fte/totalFte)*100):0; const isEditing=editingFte===row.id; return <div key={row.id} style={{ display:"flex", alignItems:"center", gap:10, marginBottom:i<fteRows.length-1?10:0 }}>{isEditing?<><input value={row.label} onChange={e=>updateFte(row.id,"label",e.target.value)} style={{ flex:1, padding:"6px 9px", border:`1px solid ${t.accent}`, borderRadius:6, fontSize:13, background:t.bgMuted, color:t.tx1, outline:"none" }} /><input type="number" step="0.25" value={row.fte} onChange={e=>updateFte(row.id,"fte",parseFloat(e.target.value)||0)} style={{ width:76, padding:"6px 9px", border:`1px solid ${t.accent}`, borderRadius:6, fontSize:13, background:t.bgMuted, color:t.tx1, textAlign:"center", outline:"none" }} /><button onClick={()=>setEditingFte(null)} style={{ background:t.green, border:"none", borderRadius:20, padding:"6px 12px", fontSize:12, color:"#fff", fontWeight:600 }}>Done</button></>:<><span style={{ fontSize:13, color:t.tx2, flex:1 }}>{row.label}</span><div style={{ width:80, height:6, borderRadius:3, background:t.bgDeep, overflow:"hidden" }}><div style={{ width:`${pct}%`, height:"100%", background:t.green, borderRadius:3 }} /></div><span style={{ fontSize:13, fontWeight:700, color:t.green, minWidth:40, textAlign:"right" }}>{row.fte}</span><button onClick={()=>setEditingFte(row.id)} style={{ background:"none", border:`1px solid ${t.bd}`, borderRadius:20, padding:"3px 9px", fontSize:11, color:t.tx3, display:"flex", alignItems:"center" }}><Icon name="edit" size={11} color={t.tx3} /></button><button onClick={()=>removeFteRow(row.id)} style={{ background:"none", border:"none", padding:"3px 4px", color:t.tx4, display:"flex", alignItems:"center" }}><Icon name="close" size={11} color={t.tx4} /></button></>}</div>; })}</div></div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:32 }}>
        <div className="card" style={{ padding:"22px 24px" }}><div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:5 }}><Icon name="chart" size={16} color={t.accent} /><span style={{ fontSize:15, fontWeight:600 }}>Effort Reduction — Before vs. After AI</span></div><p style={{ fontSize:13, color:t.tx3, marginBottom:16 }}>Normalised to 100% = pre-AI baseline</p>{BAR_DATA.map((d,i) => <div key={i} style={{ marginBottom:14 }}><div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}><span style={{ fontSize:13, color:t.tx2, fontWeight:500 }}>{d.label}</span><span style={{ fontSize:12, color:t.tx3 }}>{d.desc}</span></div><div style={{ display:"flex", gap:4, alignItems:"center" }}><div style={{ flex:1, height:10, borderRadius:5, background:t.bgDeep, overflow:"hidden" }}><div style={{ width:`${d.after}%`, height:"100%", background:t.green, borderRadius:5 }} /></div><span style={{ fontSize:12, fontWeight:700, color:t.green, minWidth:34, textAlign:"right" }}>{d.after}%</span></div></div>)}<div style={{ display:"flex", gap:12, marginTop:4 }}><div style={{ display:"flex", alignItems:"center", gap:5 }}><div style={{ width:10, height:10, borderRadius:2, background:t.bgDeep, border:`1px solid ${t.bd}` }} /><span style={{ fontSize:12, color:t.tx3 }}>Before (100%)</span></div><div style={{ display:"flex", alignItems:"center", gap:5 }}><div style={{ width:10, height:10, borderRadius:2, background:t.green }} /><span style={{ fontSize:12, color:t.tx3 }}>After AI</span></div></div></div>
        <div className="card" style={{ padding:"22px 24px" }}><div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:5 }}><Icon name="target" size={16} color={t.accent} /><span style={{ fontSize:15, fontWeight:600 }}>Portfolio Status</span></div><p style={{ fontSize:13, color:t.tx3, marginBottom:16 }}>{ucs.length} use cases across business & technology</p><DonutChart t={t} live={live} inDev={inDev} roadmap={roadmap} /><div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8, marginTop:16 }}>{[{label:"Live",count:live,color:t.green},{label:"In Development",count:inDev,color:t.blue},{label:"Roadmap",count:roadmap,color:t.purple}].map(s=><div key={s.label} style={{ textAlign:"center", background:t.bgMuted, borderRadius:8, padding:"10px 6px" }}><div style={{ fontSize:22, fontWeight:800, color:s.color, marginBottom:2 }}>{s.count}</div><div style={{ fontSize:11, color:t.tx2, lineHeight:1.4 }}>{s.label}</div></div>)}</div></div>
      </div>
      <SLabel t={t}>Use Cases by Value Pillar</SLabel>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12, marginTop:12, marginBottom:32 }}>{PILLARS.map(p => { const c=PC(t,p.id); const cnt=ucs.filter(u=>u.pillar===p.id).length; const liveCnt=ucs.filter(u=>u.pillar===p.id&&u.status==="Live").length; const pct=Math.round((liveCnt/cnt)*100)||0; return <div key={p.id} className="card" style={{ padding:"20px 22px" }}><div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:12 }}><div style={{ width:38, height:38, borderRadius:10, background:c.bg, display:"flex", alignItems:"center", justifyContent:"center" }}><Icon name={p.iconName} size={18} color={c.tx} /></div><span style={{ fontSize:24, fontWeight:800, color:c.tx }}>{cnt}</span></div><div style={{ fontSize:16, fontWeight:600, marginBottom:3 }}>{p.label}</div><div style={{ fontSize:13, color:t.tx3, marginBottom:10 }}>{liveCnt} live · {cnt-liveCnt} pipeline</div><div style={{ height:5, borderRadius:3, background:t.bgDeep, overflow:"hidden" }}><div style={{ height:"100%", width:`${pct}%`, background:c.tx, borderRadius:3 }} /></div><div style={{ fontSize:11, color:c.tx, marginTop:4, fontWeight:600 }}>{pct}% live</div></div>; })}</div>
      <SLabel t={t}>Deployment Footprint</SLabel>
      <div style={{ display:"grid", gridTemplateColumns:`repeat(${DEPLOYMENT.length},1fr)`, gap:12, marginTop:12 }}>{DEPLOYMENT.map((d,i) => { const sc=SC(t,d.status); return <div key={i} className="card" style={{ padding:"18px 20px" }}><div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10 }}><div style={{ display:"flex", alignItems:"center", gap:6 }}><Icon name="globe" size={15} color={t.accent} /><span style={{ fontSize:14, fontWeight:600 }}>{d.region}</span></div><span style={{ background:sc.bg, color:sc.tx, fontSize:11, fontWeight:500, padding:"3px 10px", borderRadius:20, display:"flex", alignItems:"center", gap:4 }}>{d.status==="Live"&&<span style={{ width:5, height:5, borderRadius:"50%", background:sc.tx, animation:"pulse 2s infinite" }} />}{d.status}</span></div>{d.ucs.map((u,j)=><div key={j} style={{ display:"flex", alignItems:"center", gap:5, marginBottom:5, fontSize:13, color:t.tx2 }}><Icon name="check" size={12} color={d.status==="Live"?t.green:t.blue} />{u}</div>)}</div>; })}</div>
    </div>
  );
}

// ── DONUT CHART ───────────────────────────────────────────────────────────
function DonutChart({ t, live, inDev, roadmap }) {
  const total=live+inDev+roadmap, r=52, cx=70, cy=70, stroke=20, circ=2*Math.PI*r;
  const segs=[{count:live,color:t.green},{count:inDev,color:t.blue},{count:roadmap,color:t.purple}]; let off=0;
  const rendered=segs.map(seg=>{const pct=seg.count/total,dash=pct*circ,s={...seg,da:`${dash} ${circ-dash}`,do:-off*circ};off+=pct;return s;});
  return <div style={{ display:"flex", alignItems:"center", gap:20 }}><svg width={140} height={140} viewBox="0 0 140 140"><circle cx={cx} cy={cy} r={r} fill="none" stroke={t.bgDeep} strokeWidth={stroke} />{rendered.map((s,i)=><circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={s.color} strokeWidth={stroke} strokeDasharray={s.da} strokeDashoffset={s.do} transform={`rotate(-90 ${cx} ${cy})`} />)}<text x={cx} y={cy-6} textAnchor="middle" fill={t.tx1} fontSize="24" fontWeight="800">{total}</text><text x={cx} y={cy+12} textAnchor="middle" fill={t.tx3} fontSize="11">total</text></svg><div style={{ flex:1 }}>{[{label:"Live",count:live,color:t.green},{label:"In dev",count:inDev,color:t.blue},{label:"Roadmap",count:roadmap,color:t.purple}].map((s,i)=><div key={i} style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}><div style={{ width:10, height:10, borderRadius:2, background:s.color, flexShrink:0 }} /><span style={{ fontSize:13, color:t.tx2, flex:1 }}>{s.label}</span><span style={{ fontSize:13, fontWeight:600, color:s.color }}>{s.count}</span></div>)}</div></div>;
}

// ── CATALOG PAGE ──────────────────────────────────────────────────────────
function CatalogPage({ t, dk, ucs, allUcs, videos, archs, isAdmin, onUpload, onArchUpload, search, setSearch, fDomain, setFD, fPillar, setFP, fStatus, setFS, go, onEdit }) {
  const [tableMode,setTableMode]=useState(false);
  return (
    <div style={{ padding:"28px 0 60px" }} className="fade">
      <h2 style={{ fontSize:24, fontWeight:700, letterSpacing:"-0.02em", marginBottom:6 }}>Use Case Catalog</h2>
      <p style={{ fontSize:16, color:t.tx2, marginBottom:20 }}>All AI initiatives across BEQ — filter by domain, pillar or status.</p>

      <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:10, alignItems:"center" }}>
        <span style={{ fontSize:13, fontWeight:700, color:t.tx1, marginRight:2 }}>Domain:</span>
        {[["all","All"],["business","Business"],["technology","Technology"]].map(([v,l])=><button key={v} className={`tbtn${fDomain===v?" on":""}`} onClick={()=>setFD(v)}>{l}</button>)}
      </div>

      <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:10, alignItems:"center" }}>
        <span style={{ fontSize:13, fontWeight:700, color:t.tx1, marginRight:2 }}>Pillar:</span>
        {[["all","All"],...PILLARS.map(p=>[p.id,p.label])].map(([v,l])=>{const isAll=v==="all";const active=isAll?fPillar.length===0||fPillar[0]==="all":Array.isArray(fPillar)&&fPillar.includes(v);const handlePillar=()=>{if(isAll){setFP(["all"]);return;}const cur=Array.isArray(fPillar)&&fPillar[0]!=="all"?fPillar:[];const next=cur.includes(v)?cur.filter(x=>x!==v):[...cur,v];setFP(next.length?next:["all"]);};return <button key={v} className={`tbtn${active?" on":""}`} onClick={handlePillar}>{l}</button>;})}
      </div>

      <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:14, alignItems:"center" }}>
        <span style={{ fontSize:13, fontWeight:700, color:t.tx1, marginRight:2 }}>Status:</span>
        {["all","Live","In development","Roadmap"].map(s=><button key={s} className={`tbtn${fStatus===s?" on":""}`} onClick={()=>setFS(s)}>{s==="all"?"All":s}</button>)}
        <div style={{ flex:1 }} />
        <button onClick={()=>setTableMode(m=>!m)} style={{ background:"transparent", border:`1px solid ${t.bd}`, borderRadius:20, padding:"6px 12px", fontSize:13, color:t.tx2, display:"flex", alignItems:"center", gap:5 }}><Icon name={tableMode?"grid":"table"} size={14} color={t.tx3} />{tableMode?"Cards":"Table"}</button>
      </div>

      <div style={{ fontSize:13, color:t.tx3, marginBottom:14 }}>{ucs.length} of {allUcs.length} use cases</div>
      {ucs.length===0?<div className="card" style={{ padding:44, textAlign:"center" }}><Icon name="search" size={26} color={t.tx4} style={{ margin:"0 auto 10px" }} /><div style={{ fontSize:15, color:t.tx3 }}>No use cases match the current filters.</div></div>
      :tableMode?<div style={{ overflowX:"auto" }}><table style={{ width:"100%", borderCollapse:"collapse", fontSize:14 }}><thead><tr style={{ borderBottom:`1px solid ${t.bd}` }}>{["Title","Department","Status","Pillar","Impact"].map((l,ki)=><th key={ki} style={{ padding:"11px 14px", textAlign:"left", fontWeight:600, color:t.tx2, whiteSpace:"nowrap", userSelect:"none" }}>{l}</th>)}{isAdmin&&<th style={{ padding:"11px 14px" }}></th>}</tr></thead><tbody>{ucs.map(uc=>{const sc=SC(t,uc.status);const pc=PC(t,uc.pillar);const pil=PILLARS.find(p=>p.id===uc.pillar);return<tr key={uc.id} onClick={()=>go("detail",uc.id)} style={{ borderBottom:`1px solid ${t.bd}`, cursor:"pointer", transition:"background 0.15s" }} onMouseEnter={e=>e.currentTarget.style.background=t.bgMuted} onMouseLeave={e=>e.currentTarget.style.background="transparent"}><td style={{ padding:"11px 14px", fontWeight:500 }}>{uc.title}</td><td style={{ padding:"11px 14px", color:t.tx2 }}>{uc.dept}</td><td style={{ padding:"11px 14px" }}><span style={{ background:sc.bg, color:sc.tx, fontSize:11, fontWeight:500, padding:"3px 11px", borderRadius:20, display:"inline-flex", alignItems:"center", gap:5, whiteSpace:"nowrap" }}>{uc.status==="Live"&&<span style={{ width:5, height:5, borderRadius:"50%", background:sc.tx, animation:"pulse 2s infinite" }} />}{uc.status}</span></td><td style={{ padding:"11px 14px" }}><span style={{ background:pc.bg, color:pc.tx, fontSize:11, fontWeight:500, padding:"3px 11px", borderRadius:20, display:"inline-flex", alignItems:"center", gap:4, whiteSpace:"nowrap" }}><Icon name={pil?.iconName||"star"} size={11} color={pc.tx} />{pil?.label}</span></td><td style={{ padding:"11px 14px", color:t.tx2, fontSize:13 }}>{uc.impact}</td>{isAdmin&&<td style={{ padding:"11px 14px" }}><button onClick={e=>{e.stopPropagation();onEdit(uc);}} style={{ background:"none", border:`1px solid ${t.bd}`, borderRadius:20, padding:"4px 11px", fontSize:11, color:t.tx3, display:"flex", alignItems:"center", gap:4 }}><Icon name="edit" size={12} color={t.tx3} />Edit</button></td>}</tr>;})}</tbody></table></div>
      :<div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))", gap:12 }}>{ucs.map((uc,i)=><UCCard key={uc.id} uc={uc} t={t} dk={dk} hasVideo={!!videos[uc.id]} hasArch={!!archs[uc.id]} isAdmin={isAdmin} onUpload={onUpload} onArchUpload={onArchUpload} onClick={()=>go("detail",uc.id)} idx={i} onEdit={isAdmin?()=>onEdit(uc):null} />)}</div>}
    </div>
  );
}

// ── UC CARD ───────────────────────────────────────────────────────────────
function UCCard({ uc, t, dk, onClick, idx, onEdit, isAdmin, hasVideo, hasArch, onUpload, onArchUpload }) {
  const sc=SC(t,uc.status); const pc=PC(t,uc.pillar); const pil=PILLARS.find(p=>p.id===uc.pillar);
  return (
    <div onClick={onClick} className="card card-hover" style={{ padding:22, display:"flex", flexDirection:"column", animation:`fadeIn 0.3s ease ${Math.min(idx*0.03,0.3)}s both` }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:8, gap:6 }}><span style={{ fontSize:12, color:t.tx3, fontWeight:500 }}>{uc.dept}</span><span style={{ background:sc.bg, color:sc.tx, fontSize:11, fontWeight:500, padding:"3px 11px", borderRadius:20, display:"flex", alignItems:"center", gap:5, whiteSpace:"nowrap" }}>{uc.status==="Live"&&<span style={{ width:5, height:5, borderRadius:"50%", background:sc.tx, animation:"pulse 2s infinite" }} />}{uc.status}</span></div>
      <h3 style={{ fontSize:16, fontWeight:600, marginBottom:7, lineHeight:1.3 }}>{uc.title}</h3>
      <div style={{ display:"flex", gap:5, marginBottom:9, flexWrap:"wrap" }}><span style={{ background:pc.bg, color:pc.tx, fontSize:11, fontWeight:500, padding:"3px 11px", borderRadius:20, display:"inline-flex", alignItems:"center", gap:4 }}><Icon name={pil?.iconName||"star"} size={11} color={pc.tx} />{pil?.label}</span>{uc.impact&&<span style={{ background:t.bgMuted, color:t.tx2, fontSize:11, padding:"3px 11px", borderRadius:20 }}>{uc.impact}</span>}</div>
      <p style={{ fontSize:14, color:t.tx2, lineHeight:1.6, flex:1, marginBottom:14 }}>{uc.summary}</p>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <span style={{ fontSize:13, fontWeight:600, color:t.accent, display:"flex", alignItems:"center", gap:4 }}>View details <Icon name="roi" size={13} color={t.accent} /></span>
        <div style={{ display:"flex", gap:5, flexWrap:"wrap" }}>
          {hasVideo&&<span style={{ fontSize:10, background:t.accentBg, color:t.accent, borderRadius:4, padding:"2px 7px", display:"flex", alignItems:"center", gap:3 }}><Icon name="video" size={10} color={t.accent} />Video</span>}
          {hasArch&&<span style={{ fontSize:10, background:t.amberBg, color:t.amber, borderRadius:4, padding:"2px 7px", display:"flex", alignItems:"center", gap:3 }}><Icon name="image" size={10} color={t.amber} />Arch</span>}
          {isAdmin&&onUpload&&<button onClick={e=>onUpload(e,uc.id)} style={{ background:"none", border:`1px solid ${t.bd}`, borderRadius:20, padding:"3px 8px", fontSize:10, color:t.tx3, display:"flex", alignItems:"center", gap:3 }}><Icon name="video" size={10} color={t.tx3} />{hasVideo?"Replace":"Video"}</button>}
          {isAdmin&&onArchUpload&&<button onClick={e=>onArchUpload(e,uc.id)} style={{ background:"none", border:`1px solid ${t.bd}`, borderRadius:20, padding:"3px 8px", fontSize:10, color:t.tx3, display:"flex", alignItems:"center", gap:3 }}><Icon name="attach" size={10} color={t.tx3} />{hasArch?"Replace":"Arch"}</button>}
          {isAdmin&&onEdit&&<button onClick={e=>{e.stopPropagation();onEdit();}} style={{ background:"none", border:`1px solid ${t.bd}`, borderRadius:20, padding:"3px 8px", fontSize:10, color:t.tx3, display:"flex", alignItems:"center", gap:3 }}><Icon name="edit" size={10} color={t.tx3} />Edit</button>}
        </div>
      </div>
    </div>
  );
}

// ── DETAIL PAGE ───────────────────────────────────────────────────────────
function DetailPage({ t, dk, uc, videos={}, archs={}, isAdmin, onUpload, onArchUpload, onRemove, onRemoveArch, go, onEdit }) {
  const pc=PC(t,uc.pillar); const sc=SC(t,uc.status); const hasPT=uc.fromSteps?.length>0; const pil=PILLARS.find(p=>p.id===uc.pillar);
  return (
    <div style={{ padding:"28px 0 60px", maxWidth:840 }} className="fade">
      <div style={{ display:"flex", gap:8, marginBottom:20 }}><button onClick={()=>go("catalog")} style={{ background:t.bgCard, border:`1px solid ${t.bd}`, borderRadius:20, padding:"7px 16px", fontSize:13, color:t.tx2, display:"flex", alignItems:"center", gap:5 }}><Icon name="back" size={14} color={t.tx2} />Back</button>{isAdmin&&<button onClick={onEdit} style={{ background:t.bgCard, border:`1px solid ${t.bd}`, borderRadius:20, padding:"7px 16px", fontSize:13, color:t.tx2, display:"flex", alignItems:"center", gap:5 }}><Icon name="edit" size={14} color={t.tx2} />Edit</button>}</div>
      <div style={{ display:"flex", gap:7, alignItems:"center", marginBottom:10, flexWrap:"wrap" }}><span style={{ background:sc.bg, color:sc.tx, fontSize:12, fontWeight:500, padding:"4px 12px", borderRadius:20, display:"flex", alignItems:"center", gap:5 }}>{uc.status==="Live"&&<span style={{ width:6, height:6, borderRadius:"50%", background:sc.tx, animation:"pulse 2s infinite" }} />}{uc.status}</span><span style={{ background:pc.bg, color:pc.tx, fontSize:12, fontWeight:500, padding:"4px 12px", borderRadius:20, display:"inline-flex", alignItems:"center", gap:4 }}><Icon name={pil?.iconName||"star"} size={12} color={pc.tx} />{pil?.label}</span><span style={{ fontSize:13, color:t.tx3 }}>{uc.dept}</span></div>
      <h1 style={{ fontSize:"clamp(24px,3.5vw,40px)", fontWeight:700, letterSpacing:"-0.02em", marginBottom:8 }}>{uc.title}</h1>
      {uc.impact&&<div style={{ display:"inline-block", background:pc.bg, color:pc.tx, fontSize:15, fontWeight:600, padding:"6px 18px", borderRadius:20, marginBottom:18 }}>{uc.impact}</div>}
      <p style={{ fontSize:16, color:t.tx2, lineHeight:1.7, marginBottom:26 }}>{uc.summary}</p>
      {uc.outcomes?.length>0&&<div style={{ marginBottom:24 }}><SLabel t={t}>Key Outcomes</SLabel><div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(210px,1fr))", gap:10, marginTop:12 }}>{uc.outcomes.map((o,i)=><div key={i} className="card" style={{ padding:"13px 16px", borderLeft:`3px solid ${pc.tx}`, borderRadius:0, display:"flex", alignItems:"flex-start", gap:8 }}><Icon name="check" size={15} color={pc.tx} style={{ marginTop:2, flexShrink:0 }} /><div style={{ fontSize:14, color:t.tx2, lineHeight:1.5 }}>{o}</div></div>)}</div></div>}
      {hasPT&&<div className="card" style={{ padding:"22px 24px", marginBottom:20 }}><div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:14 }}><Icon name="journey" size={15} color={pc.tx} /><SLabel t={t} color={pc.tx}>Process Transformation</SLabel></div>{[{label:"Before",time:uc.fromTime,steps:uc.fromSteps.map(s=>({l:s,a:false})),tc:t.tx3,bg:"transparent",bd:t.bd},{label:"After — Agentic AI",time:uc.toTime,steps:uc.toSteps,tc:pc.tx,bg:pc.bg,bd:pc.bd}].map((row,ri)=><div key={ri} style={{ marginBottom:ri===0?16:0 }}><div style={{ display:"flex", justifyContent:"space-between", marginBottom:7, alignItems:"center" }}><span style={{ fontSize:11, fontWeight:600, color:row.tc, letterSpacing:"0.1em", textTransform:"uppercase" }}>{row.label}</span>{row.time&&<span style={{ fontSize:13, fontWeight:600, color:row.tc, background:row.bg||t.bgMuted, padding:"3px 12px", borderRadius:20, border:`1px solid ${row.bd}` }}>{row.time}</span>}</div><div style={{ display:"flex", gap:4, overflowX:"auto" }}>{row.steps.map((s,i)=><div key={i} style={{ flex:1, minWidth:95, background:s.a?pc.bg:"transparent", border:`1px solid ${s.a?pc.bd:t.bd}`, borderRadius:8, padding:"10px 11px", fontSize:12, color:s.a?pc.tx:t.tx2, lineHeight:1.45 }}>{s.a&&<div style={{ display:"flex", alignItems:"center", gap:3, marginBottom:3 }}><Icon name="agent" size={11} color={pc.tx} /><span style={{ fontSize:10, fontWeight:600, opacity:0.75 }}>AI agent</span></div>}{s.l}</div>)}</div></div>)}</div>}
      {(uc.financial?.length>0||uc.impactBadges?.length>0)&&<div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:20 }}>{(uc.financial?.length>0||uc.operational?.length>0||uc.governance?.length>0)&&<div className="card" style={{ padding:20 }}><div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:12 }}><Icon name="roi" size={15} color={t.accent} /><SLabel t={t}>Value Outcomes</SLabel></div>{[["Financial",uc.financial],["Operational",uc.operational],["Governance",uc.governance]].map(([title,items])=>items?.length>0&&<div key={title} style={{ marginBottom:12 }}><div style={{ fontSize:13, fontWeight:600, marginBottom:5 }}>{title}</div>{items.map((f,i)=><div key={i} style={{ display:"flex", gap:7, marginBottom:5, fontSize:13, color:t.tx2, lineHeight:1.5 }}><span style={{ color:pc.tx, flexShrink:0 }}>›</span><span>{f}</span></div>)}</div>)}</div>}{uc.impactBadges?.length>0&&<div className="card" style={{ padding:20 }}><div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:12 }}><Icon name="chart" size={15} color={t.accent} /><SLabel t={t}>Impact Indicators</SLabel></div>{uc.impactBadges.map((im,i)=><div key={i} style={{ display:"flex", alignItems:"center", gap:10, background:t.bgMuted, border:`1px solid ${t.bd}`, borderRadius:8, padding:"10px 14px", marginBottom:7 }}><Icon name={im.d==="up"?"arrowUp":"arrowDn"} size={17} color={im.d==="up"?t.green:t.red} /><span style={{ fontSize:14, color:t.tx2 }}>{im.l}</span></div>)}</div>}</div>}
      <div className="card" style={{ padding:22, marginBottom:16 }}><div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:14 }}><Icon name="attach" size={15} color={t.amber} /><SLabel t={t}>Solution Architecture</SLabel></div>{archs[uc.id]?<div>{archs[uc.id].mime?.startsWith("image")?<img src={archs[uc.id].url} alt="Architecture diagram" style={{ width:"100%", borderRadius:8, border:`1px solid ${t.bd}`, display:"block" }} />:<div style={{ display:"flex", alignItems:"center", gap:10, background:t.amberBg, border:`1px solid ${t.amberBd}`, borderRadius:8, padding:"12px 16px" }}><Icon name="attach" size={18} color={t.amber} /><span style={{ fontSize:14, color:t.tx1, fontWeight:500 }}>{archs[uc.id].name}</span></div>}<div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:10 }}><span style={{ fontSize:12, color:t.tx3 }}>{archs[uc.id].name}</span>{isAdmin&&<div style={{ display:"flex", gap:8 }}><button onClick={e=>onArchUpload(e,uc.id)} style={{ fontSize:12, color:t.tx2, background:"none", border:`1px solid ${t.bd}`, borderRadius:20, padding:"5px 14px", display:"flex", alignItems:"center", gap:4 }}><Icon name="upload" size={12} color={t.tx2} />Replace</button><button onClick={e=>onRemoveArch(e,uc.id)} style={{ fontSize:12, color:t.red, background:"none", border:`1px solid ${t.red}55`, borderRadius:20, padding:"5px 14px", display:"flex", alignItems:"center", gap:4 }}><Icon name="trash" size={12} color={t.red} />Remove</button></div>}</div></div>:isAdmin?<div onClick={e=>onArchUpload(e,uc.id)} style={{ border:`2px dashed ${t.bd}`, borderRadius:10, padding:"30px 24px", textAlign:"center", cursor:"pointer" }} onMouseEnter={e=>e.currentTarget.style.borderColor=t.amber} onMouseLeave={e=>e.currentTarget.style.borderColor=t.bd}><Icon name="image" size={28} color={t.tx4} style={{ margin:"0 auto 10px" }} /><div style={{ fontSize:14, color:t.tx3, marginBottom:4 }}>No architecture diagram uploaded yet</div><div style={{ fontSize:13, fontWeight:600, color:t.amber, display:"flex", alignItems:"center", justifyContent:"center", gap:4 }}><Icon name="attach" size={13} color={t.amber} />Upload image or PDF</div></div>:<div style={{ padding:"30px 24px", textAlign:"center", color:t.tx3, fontSize:14 }}>No architecture diagram available.</div>}</div>
      <div className="card" style={{ padding:22 }}><div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:14 }}><Icon name="video" size={15} color={t.accent} /><SLabel t={t}>Demonstration Video</SLabel></div>{videos[uc.id]?<div><video src={videos[uc.id].url} controls style={{ width:"100%", borderRadius:8, border:`1px solid ${t.bd}` }} /><div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:10 }}><span style={{ fontSize:12, color:t.tx3 }}>{videos[uc.id].name}</span>{isAdmin&&<div style={{ display:"flex", gap:8 }}><button onClick={e=>onUpload(e,uc.id)} style={{ fontSize:12, color:t.tx2, background:"none", border:`1px solid ${t.bd}`, borderRadius:20, padding:"5px 14px", display:"flex", alignItems:"center", gap:4 }}><Icon name="upload" size={12} color={t.tx2} />Replace</button><button onClick={e=>onRemove(e,uc.id)} style={{ fontSize:12, color:t.red, background:"none", border:`1px solid ${t.red}55`, borderRadius:20, padding:"5px 14px", display:"flex", alignItems:"center", gap:4 }}><Icon name="trash" size={12} color={t.red} />Remove</button></div>}</div></div>:isAdmin?<div onClick={e=>onUpload(e,uc.id)} style={{ border:`2px dashed ${t.bd}`, borderRadius:10, padding:"32px 24px", textAlign:"center", cursor:"pointer" }} onMouseEnter={e=>e.currentTarget.style.borderColor=t.accent} onMouseLeave={e=>e.currentTarget.style.borderColor=t.bd}><Icon name="play" size={30} color={t.tx4} style={{ margin:"0 auto 10px" }} /><div style={{ fontSize:14, color:t.tx3, marginBottom:4 }}>No video uploaded yet</div><div style={{ fontSize:13, fontWeight:600, color:t.accent, display:"flex", alignItems:"center", justifyContent:"center", gap:4 }}><Icon name="upload" size={13} color={t.accent} />Click to upload</div></div>:<div style={{ padding:"32px 24px", textAlign:"center", color:t.tx3, fontSize:14 }}>No demonstration video available.</div>}</div>
    </div>
  );
}

// ── CLIENT SPEAKS PAGE ────────────────────────────────────────────────────
function ClientSpeaksPage({ t }) {
  const quotes=[{name:"Andrew Horton",title:"Group CEO, BEQ",initials:"AH",context:"Mar 2024 — speaking about the Cyber GenAI Underwriting solution built by Accenture, after the FY23 earnings report in an interview with the Insurance Business publication.",highlight:"Cyber GenAI Underwriting solution",quote:"\u201C65% improvement speed-wise, with the process spanning from the initial submission to getting the quote out\u2026. It\u2019s a really good position to be in, and then it\u2019s scalable\u2026. We\u2019re really excited about it.\u201D",pillar:"speed",tag:"Cyber UW Assistant"}];
  return (
    <div style={{ padding:"28px 0 60px" }} className="fade">
      <div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:6 }}><Icon name="chat" size={18} color={t.accent} /><span style={{ fontSize:12, fontWeight:600, color:t.accent, letterSpacing:"0.12em", textTransform:"uppercase" }}>Client Speaks</span></div>
      <h2 style={{ fontSize:"clamp(26px,4vw,42px)", fontWeight:800, letterSpacing:"-0.02em", marginBottom:8 }}>In Their Own Words</h2>
      <p style={{ fontSize:16, color:t.tx2, marginBottom:36, maxWidth:580, lineHeight:1.6 }}>BEQ leadership on the real-world impact of AI — unscripted and on the record.</p>
      {quotes.map((q,i)=>{const pc=PC(t,q.pillar);return<div key={i} style={{ marginBottom:28 }}><div className="card" style={{ padding:"clamp(26px,3vw,44px)", borderLeft:`4px solid ${pc.tx}`, borderRadius:0, overflow:"hidden", position:"relative" }}><div style={{ position:"absolute", top:-10, right:24, fontSize:180, color:pc.tx, opacity:0.04, fontFamily:"Georgia,serif", lineHeight:1, userSelect:"none", pointerEvents:"none" }}>"</div><div style={{ display:"flex", alignItems:"flex-start", gap:16, marginBottom:24 }}><div style={{ width:68, height:68, borderRadius:12, background:pc.bg, display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, fontWeight:700, color:pc.tx, flexShrink:0, border:`1px solid ${pc.bd}` }}>{q.initials}</div><div style={{ flex:1 }}><div style={{ fontSize:17, fontWeight:700, marginBottom:2 }}>{q.name}</div><div style={{ fontSize:14, color:t.tx2, marginBottom:8 }}>{q.title}</div><span style={{ background:pc.bg, color:pc.tx, fontSize:11, fontWeight:600, padding:"3px 11px", borderRadius:20, display:"inline-flex", alignItems:"center", gap:4 }}><Icon name="speed" size={11} color={pc.tx} />{q.tag}</span></div></div><div style={{ fontSize:14, color:t.tx3, fontStyle:"italic", lineHeight:1.65, marginBottom:24, paddingBottom:20, borderBottom:`1px solid ${t.bd}` }}>{q.context.split(q.highlight).map((part,pi,arr)=><span key={pi}>{part}{pi<arr.length-1&&<strong style={{ color:t.tx1, fontStyle:"normal", fontWeight:600 }}>{q.highlight}</strong>}</span>)}</div><blockquote style={{ margin:0, fontSize:"clamp(19px,2.2vw,26px)", fontWeight:700, lineHeight:1.5, color:t.tx1, fontStyle:"italic", letterSpacing:"-0.01em" }}>{q.quote}</blockquote></div></div>;})}
      <div className="card" style={{ padding:"30px 26px", textAlign:"center", border:`1px dashed ${t.bd}` }}><Icon name="add" size={24} color={t.tx4} style={{ margin:"0 auto 10px" }} /><div style={{ fontSize:14, fontWeight:600, color:t.tx3, marginBottom:4 }}>More client testimonials coming soon</div><div style={{ fontSize:13, color:t.tx4 }}>Additional BEQ leadership quotes will appear here as the programme scales.</div></div>
    </div>
  );
}

// ── CHAT PANEL ────────────────────────────────────────────────────────────
function ChatPanel({ t, ucs, onClose }) {
  const [msgs,setMsgs]=useState([{role:"assistant",text:"Hi — I have full context on all BEQ AI use cases. Ask me how a solution works, which ones drive cost savings, what's on the roadmap, or anything else."}]);
  const [input,setInput]=useState(""); const [loading,setLoading]=useState(false); const endRef=useRef(null);
  useEffect(()=>{endRef.current?.scrollIntoView({behavior:"smooth"});},[msgs]);
  const send=async()=>{
    const txt=input.trim(); if(!txt||loading)return; setInput(""); setLoading(true);
    const next=[...msgs,{role:"user",text:txt}]; setMsgs(next);
    try {
      const ctx=ucs.map(u=>`**${u.title}** (${u.dept}, ${u.status}, ${u.pillar} pillar): ${u.summary} Impact: ${u.impact||"n/a"}. Outcomes: ${(u.outcomes||[]).join("; ")}.`).join("\n");
      const sys=`You are an AI assistant embedded in BEQ's AI Innovation Studio. Help stakeholders understand BEQ's AI portfolio.\n\nUse cases:\n${ctx}\n\nBe concise and specific.`;
      const res=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:1000,system:sys,messages:next.map(m=>({role:m.role==="assistant"?"assistant":"user",content:m.text}))})});
      const data=await res.json();
      setMsgs(p=>[...p,{role:"assistant",text:data.content?.map(b=>b.text||"").join("")||"Sorry, something went wrong."}]);
    } catch { setMsgs(p=>[...p,{role:"assistant",text:"Something went wrong. Please try again."}]); }
    finally { setLoading(false); }
  };
  return (
    <div style={{ position:"fixed", right:24, bottom:24, width:370, height:500, background:t.bgCard, border:`1px solid ${t.bdStrong}`, borderRadius:16, boxShadow:t.shadow, display:"flex", flexDirection:"column", zIndex:50, overflow:"hidden" }}>
      <div style={{ padding:"14px 16px", borderBottom:`1px solid ${t.bd}`, display:"flex", justifyContent:"space-between", alignItems:"center", background:t.bgMuted }}><div style={{ display:"flex", alignItems:"center", gap:8 }}><Icon name="chat" size={16} color={t.accent} /><div><div style={{ fontSize:14, fontWeight:600 }}>Ask AI</div><div style={{ fontSize:11, color:t.tx3 }}>Powered by Claude · full use case context</div></div></div><button onClick={onClose} style={{ background:"none", border:"none" }}><Icon name="close" size={15} color={t.tx3} /></button></div>
      <div style={{ flex:1, overflowY:"auto", padding:"12px 12px 6px" }}>{msgs.map((m,i)=><div key={i} style={{ marginBottom:10, display:"flex", justifyContent:m.role==="user"?"flex-end":"flex-start" }}><div style={{ maxWidth:"85%", background:m.role==="user"?t.accent:t.bgMuted, color:m.role==="user"?"#fff":t.tx1, borderRadius:m.role==="user"?"12px 12px 3px 12px":"12px 12px 12px 3px", padding:"9px 13px", fontSize:13.5, lineHeight:1.6 }}>{m.text}</div></div>)}{loading&&<div style={{ display:"flex", justifyContent:"flex-start", marginBottom:10 }}><div style={{ background:t.bgMuted, borderRadius:"12px 12px 12px 3px", padding:"9px 13px", fontSize:13.5, color:t.tx3 }}>Thinking…</div></div>}<div ref={endRef} /></div>
      <div style={{ padding:"10px 12px", borderTop:`1px solid ${t.bd}`, display:"flex", gap:7 }}><input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&send()} placeholder="Ask about any use case…" style={{ flex:1, background:t.bgMuted, border:`1px solid ${t.bd}`, borderRadius:20, padding:"8px 14px", fontSize:13, color:t.tx1, outline:"none" }} /><button onClick={send} disabled={loading||!input.trim()} style={{ background:t.accent, color:"#fff", border:"none", borderRadius:20, padding:"8px 14px", opacity:loading||!input.trim()?0.5:1, display:"flex", alignItems:"center" }}><Icon name="send" size={14} color="#fff" /></button></div>
    </div>
  );
}

// ── ADMIN MODAL ───────────────────────────────────────────────────────────
function AdminModal({ t, uc, ucs, onSave, onDelete, onClose, videos, archs, onUpload, onArchUpload, onRemoveVideo, onRemoveArch }) {
  const blank={id:"uc_"+Date.now(),title:"",dept:"",domain:"business",pillars:["speed"],status:"Live",impact:"",summary:"",outcomes:[],fromSteps:[],toSteps:[],fromTime:"",toTime:"",financial:[],operational:[],governance:[],impactBadges:[],fteBefore:"",fteAfter:"",fteSavings:"",productivity:""};
  const [form,setForm]=useState(()=>{if(!uc)return blank;return{...uc,pillars:uc.pillars||(uc.pillar?[uc.pillar]:["speed"])};});
  const [oT,setOT]=useState((uc?.outcomes||[]).join("\n")); const [fT,setFT]=useState((uc?.financial||[]).join("\n"));
  const [opT,setOpT]=useState((uc?.operational||[]).join("\n")); const [gT,setGT]=useState((uc?.governance||[]).join("\n"));
  const [fsT,setFsT]=useState((uc?.fromSteps||[]).join("\n")); const [tsT,setTsT]=useState((uc?.toSteps||[]).map(s=>(s.a?"AGENT: ":"")+s.l).join("\n"));
  const s=(k,v)=>setForm(p=>({...p,[k]:v})); const ln=txt=>txt.split("\n").map(l=>l.trim()).filter(Boolean);
  const parseToSteps=txt=>ln(txt).map(line=>{const a=line.toUpperCase().startsWith("AGENT:");return{l:a?line.slice(6).trim():line,a};});
  const togglePillar=pid=>setForm(p=>{const cur=p.pillars||[];const next=cur.includes(pid)?cur.filter(x=>x!==pid):[...cur,pid];return{...p,pillars:next.length?next:cur};});
  const load=id=>{const u=ucs.find(x=>x.id===id);if(!u)return;setForm({...u,pillars:u.pillars||(u.pillar?[u.pillar]:["speed"])});setOT((u.outcomes||[]).join("\n"));setFT((u.financial||[]).join("\n"));setOpT((u.operational||[]).join("\n"));setGT((u.governance||[]).join("\n"));setFsT((u.fromSteps||[]).join("\n"));setTsT((u.toSteps||[]).map(s=>(s.a?"AGENT: ":"")+s.l).join("\n"));};
  const save=()=>onSave({...form,pillar:form.pillars?.[0]||"speed",pillars:form.pillars||["speed"],outcomes:ln(oT),financial:ln(fT),operational:ln(opT),governance:ln(gT),fromSteps:ln(fsT),toSteps:parseToSteps(tsT)});
  const inp={width:"100%",padding:"9px 12px",border:`1px solid ${t.bd}`,borderRadius:8,fontSize:14,background:t.bgMuted,color:t.tx1,outline:"none"};
  const lbl={display:"block",fontSize:12,fontWeight:600,color:t.tx3,marginBottom:4,textTransform:"uppercase",letterSpacing:"0.06em"};
  const hasVideo=!!(videos&&videos[form.id]); const hasArch=!!(archs&&archs[form.id]);
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.45)", zIndex:100, display:"flex", alignItems:"flex-start", justifyContent:"center", paddingTop:32, overflowY:"auto" }} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} className="card fade" style={{ width:"100%", maxWidth:580, margin:"0 16px 40px", padding:28 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:18 }}><div style={{ display:"flex", alignItems:"center", gap:7 }}><Icon name="edit" size={17} color={t.accent} /><h3 style={{ fontSize:18, fontWeight:700 }}>{uc?"Edit Use Case":"Add / Edit Use Case"}</h3></div><button onClick={onClose} style={{ background:"none", border:"none" }}><Icon name="close" size={17} color={t.tx3} /></button></div>
        {!uc&&<div style={{ marginBottom:14 }}><label style={lbl}>Select existing to edit</label><select onChange={e=>{if(e.target.value){load(e.target.value);}else{setForm({...blank,id:"uc_"+Date.now()});setOT("");setFT("");setOpT("");setGT("");setFsT("");setTsT("");}}} style={inp}><option value="">— New use case —</option>{ucs.map(u=><option key={u.id} value={u.id}>{u.title}</option>)}</select></div>}
        <div style={{ marginBottom:11 }}><label style={lbl}>Title</label><input value={form.title||""} onChange={e=>s("title",e.target.value)} style={inp} /></div>
        <div style={{ marginBottom:11 }}><label style={lbl}>Department</label><input value={form.dept||""} onChange={e=>s("dept",e.target.value)} style={inp} /></div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:11 }}><div><label style={lbl}>Domain</label><select value={form.domain} onChange={e=>s("domain",e.target.value)} style={inp}><option value="business">Business</option><option value="technology">Technology</option></select></div><div><label style={lbl}>Status</label><select value={form.status} onChange={e=>s("status",e.target.value)} style={inp}><option value="Live">Live</option><option value="In development">In development</option><option value="Roadmap">Roadmap</option></select></div></div>
        <div style={{ marginBottom:11 }}><label style={lbl}>Value pillars (select all that apply)</label><div style={{ display:"flex", gap:6, flexWrap:"wrap", marginTop:2 }}>{PILLARS.map(p=>{const c=PC(t,p.id);const on=(form.pillars||[]).includes(p.id);return<button key={p.id} onClick={()=>togglePillar(p.id)} style={{ background:on?c.bg:"transparent", border:`1px solid ${on?c.tx:t.bd}`, borderRadius:20, padding:"6px 15px", fontSize:13, color:on?c.tx:t.tx2, fontWeight:on?600:400, display:"flex", alignItems:"center", gap:5, transition:"all 0.15s" }}><Icon name={p.iconName} size={12} color={on?c.tx:t.tx3} />{p.label}</button>;})}</div></div>
        <div style={{ marginBottom:11 }}><label style={lbl}>Impact label</label><input value={form.impact||""} onChange={e=>s("impact",e.target.value)} style={inp} placeholder="e.g. 65% faster · 55% more bound" /></div>
        <div style={{ marginBottom:11 }}><label style={lbl}>Summary</label><textarea value={form.summary||""} onChange={e=>s("summary",e.target.value)} rows={3} style={{ ...inp, resize:"vertical", lineHeight:1.5 }} /></div>
        <div style={{ marginBottom:11 }}><label style={lbl}>Outcomes (one per line)</label><textarea value={oT} onChange={e=>setOT(e.target.value)} rows={3} style={{ ...inp, resize:"vertical", lineHeight:1.5 }} /></div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:11 }}><div><label style={lbl}>Time before</label><input value={form.fromTime||""} onChange={e=>s("fromTime",e.target.value)} style={inp} placeholder="e.g. 3–5 days" /></div><div><label style={lbl}>Time after</label><input value={form.toTime||""} onChange={e=>s("toTime",e.target.value)} style={inp} placeholder="e.g. < 1 hr" /></div></div>
        <div style={{ marginBottom:11 }}><label style={lbl}>Before steps (one per line)</label><textarea value={fsT} onChange={e=>setFsT(e.target.value)} rows={3} placeholder={"Manual review\nData entry\nJudgment applied"} style={{ ...inp, resize:"vertical", lineHeight:1.5 }} /></div>
        <div style={{ marginBottom:11 }}><label style={lbl}>After steps — prefix "AGENT: " for AI steps</label><textarea value={tsT} onChange={e=>setTsT(e.target.value)} rows={4} placeholder={"Submission received\nAGENT: AI extracts data\nAGENT: Risk scored\nReview and issue"} style={{ ...inp, resize:"vertical", lineHeight:1.5 }} /></div>
        <div style={{ marginBottom:11 }}><label style={lbl}>Financial outcomes</label><textarea value={fT} onChange={e=>setFT(e.target.value)} rows={2} style={{ ...inp, resize:"vertical" }} /></div>
        <div style={{ marginBottom:11 }}><label style={lbl}>Operational outcomes</label><textarea value={opT} onChange={e=>setOpT(e.target.value)} rows={2} style={{ ...inp, resize:"vertical" }} /></div>
        <div style={{ marginBottom:11 }}><label style={lbl}>Governance outcomes</label><textarea value={gT} onChange={e=>setGT(e.target.value)} rows={2} style={{ ...inp, resize:"vertical" }} /></div>

        <div style={{ background:t.bgMuted, border:`1px solid ${t.bd}`, borderRadius:10, padding:"14px 16px", marginBottom:14 }}>
          <label style={{ ...lbl, marginBottom:10 }}>FTE Metrics</label>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
            <div><label style={{ ...lbl, fontSize:11 }}>FTE Before</label><input value={form.fteBefore||""} onChange={e=>s("fteBefore",e.target.value)} style={inp} placeholder="e.g. 20" /></div>
            <div><label style={{ ...lbl, fontSize:11 }}>FTE After</label><input value={form.fteAfter||""} onChange={e=>s("fteAfter",e.target.value)} style={inp} placeholder="e.g. 5" /></div>
            <div><label style={{ ...lbl, fontSize:11 }}>FTE Savings</label><input value={form.fteSavings||""} onChange={e=>s("fteSavings",e.target.value)} style={inp} placeholder="e.g. 15" /></div>
            <div><label style={{ ...lbl, fontSize:11 }}>Productivity %</label><input value={form.productivity||""} onChange={e=>s("productivity",e.target.value)} style={inp} placeholder="e.g. 75%" /></div>
          </div>
        </div>

        <div style={{ marginBottom:12 }}><label style={lbl}>Solution architecture</label>{hasArch?<div style={{ display:"flex", alignItems:"center", gap:8, background:t.amberBg, border:`1px solid ${t.amberBd}`, borderRadius:8, padding:"10px 13px" }}><Icon name="image" size={15} color={t.amber} /><span style={{ fontSize:13, color:t.tx1, flex:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{archs[form.id]?.name}</span><button onClick={e=>onArchUpload(e,form.id)} style={{ fontSize:12, color:t.tx2, background:"none", border:`1px solid ${t.bd}`, borderRadius:20, padding:"4px 11px", flexShrink:0 }}>Replace</button><button onClick={e=>onRemoveArch(e,form.id)} style={{ fontSize:12, color:t.red, background:"none", border:`1px solid ${t.red}44`, borderRadius:20, padding:"4px 11px", flexShrink:0 }}>Remove</button></div>:<div onClick={e=>onArchUpload(e,form.id)} style={{ border:`2px dashed ${t.bd}`, borderRadius:8, padding:"16px 18px", textAlign:"center", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:8 }} onMouseEnter={e=>e.currentTarget.style.borderColor=t.amber} onMouseLeave={e=>e.currentTarget.style.borderColor=t.bd}><Icon name="attach" size={15} color={t.amber} /><span style={{ fontSize:13, color:t.amber, fontWeight:600 }}>Upload image or PDF</span></div>}</div>
        <div style={{ marginBottom:18 }}><label style={lbl}>Demonstration video</label>{hasVideo?<div style={{ display:"flex", alignItems:"center", gap:8, background:t.accentBg, border:`1px solid ${t.accentBd}`, borderRadius:8, padding:"10px 13px" }}><Icon name="video" size={15} color={t.accent} /><span style={{ fontSize:13, color:t.tx1, flex:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{videos[form.id]?.name}</span><button onClick={e=>onUpload(e,form.id)} style={{ fontSize:12, color:t.tx2, background:"none", border:`1px solid ${t.bd}`, borderRadius:20, padding:"4px 11px", flexShrink:0 }}>Replace</button><button onClick={e=>onRemoveVideo(e,form.id)} style={{ fontSize:12, color:t.red, background:"none", border:`1px solid ${t.red}44`, borderRadius:20, padding:"4px 11px", flexShrink:0 }}>Remove</button></div>:<div onClick={e=>onUpload(e,form.id)} style={{ border:`2px dashed ${t.bd}`, borderRadius:8, padding:"16px 18px", textAlign:"center", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:8 }} onMouseEnter={e=>e.currentTarget.style.borderColor=t.accent} onMouseLeave={e=>e.currentTarget.style.borderColor=t.bd}><Icon name="video" size={15} color={t.accent} /><span style={{ fontSize:13, color:t.accent, fontWeight:600 }}>Upload video</span></div>}</div>
        <div style={{ display:"flex", gap:8 }}><button onClick={save} style={{ flex:1, background:t.accent, color:"#fff", border:"none", borderRadius:24, padding:"11px 0", fontSize:15, fontWeight:600 }}>Save</button>{uc&&<button onClick={()=>onDelete(form.id)} style={{ background:"none", border:`1px solid ${t.red}`, borderRadius:24, padding:"11px 16px", fontSize:14, color:t.red, display:"flex", alignItems:"center", gap:5 }}><Icon name="trash" size={14} color={t.red} />Delete</button>}<button onClick={onClose} style={{ background:"none", border:`1px solid ${t.bd}`, borderRadius:24, padding:"11px 16px", fontSize:14, color:t.tx2 }}>Cancel</button></div>
      </div>
    </div>
  );
}

// ── FOOTER ────────────────────────────────────────────────────────────────
function Footer({ t, isAdmin }) {
  return <div style={{ borderTop:`1px solid ${t.bd}`, padding:"14px clamp(16px,3vw,40px)", display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:20 }}><span style={{ fontSize:12, color:t.tx3 }}>BEQ AI Innovation Studio V5.0</span><div style={{ display:"flex", alignItems:"center", gap:10 }}>{isAdmin&&<span style={{ fontSize:11, color:t.accent, fontWeight:600, letterSpacing:"0.08em" }}>ADMIN SESSION</span>}</div></div>;
}