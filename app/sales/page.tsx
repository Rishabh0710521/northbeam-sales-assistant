"use client";

import { useCallback, useEffect, useState } from "react";

const channelNames: Record<string, string> = { whatsapp: "WhatsApp", instagram: "Instagram", email: "Email" };
const statusNames: Record<string, string> = {
  new: "New",
  needs_info: "Needs info",
  qualified: "Qualified",
  not_qualified: "Not qualified"
};
const meetingNames: Record<string, string> = {
  none: "No meeting",
  offered: "Times offered",
  booked: "Booked",
  uncertain: "Booking uncertain",
  failed: "Booking failed"
};

function time(value: string) {
  return new Date(value).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export default function SalesPage() {
  const [list, setList] = useState<any[]>([]);
  const [health, setHealth] = useState<any[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [detail, setDetail] = useState<any>(null);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  const loadList = useCallback(async () => {
    const [a, b] = await Promise.all([fetch("/api/conversations"), fetch("/api/health")]);
    if (a.ok) setList((await a.json()).conversations);
    if (b.ok) setHealth((await b.json()).items);
  }, []);

  const loadDetail = useCallback(async () => {
    if (!selected) return;
    const response = await fetch(`/api/conversations/${selected}`);
    if (response.ok) setDetail(await response.json());
  }, [selected]);

  useEffect(() => {
    loadList();
    const timer = setInterval(loadList, 4000);
    return () => clearInterval(timer);
  }, [loadList]);

  useEffect(() => {
    setDetail(null);
    loadDetail();
    const timer = setInterval(loadDetail, 3000);
    return () => clearInterval(timer);
  }, [loadDetail]);

  async function checkInbox() {
    setBusy(true);
    setNotice("");
    const response = await fetch("/api/poll/email", { method: "POST" });
    const data = await response.json();
    setNotice(response.ok ? `Inbox checked. ${data.received} new email(s).` : `Inbox check failed: ${data.error}`);
    setBusy(false);
    loadList();
  }

  async function toggleTakeover() {
    await fetch(`/api/conversations/${selected}/takeover`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ on: !detail.conversation.takeover })
    });
    loadDetail();
    loadList();
  }

  async function sendReply() {
    if (!draft.trim()) return;
    setBusy(true);
    const response = await fetch(`/api/conversations/${selected}/reply`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: draft })
    });
    if (response.ok) setDraft("");
    else setNotice("The message could not be sent. See the action log.");
    setBusy(false);
    loadDetail();
  }

  const conversation = detail?.conversation;
  const problems = health.filter((item) => item.status === "problem");

  return (
    <div className="shell">
      <header className="topbar">
        <h1>Northbeam sales assistant</h1>
        <div className="pills">
          {health.map((item) => (
            <span key={item.name} className={`pill ${item.status}`} title={item.detail ?? ""}>
              {item.name === "calendar" ? "Calendar" : channelNames[item.name]}:{" "}
              {item.status === "not_configured" ? "not set up" : item.status}
            </span>
          ))}
          <button onClick={checkInbox} disabled={busy}>Check email inbox</button>
        </div>
      </header>

      <div className="body">
        <nav className="list" aria-label="Conversations">
          {list.length === 0 && (
            <p className="empty">No inquiries yet. Send a message to the connected WhatsApp number, Instagram account or email address.</p>
          )}
          {list.map((item) => (
            <button
              key={item.id}
              className={`item ${item.channel} ${selected === item.id ? "active" : ""}`}
              onClick={() => setSelected(item.id)}
            >
              <span className="row">
                <span>{item.sender_name ?? item.external_id}</span>
                <span>{channelNames[item.channel]}</span>
              </span>
              <span className="preview" style={{ display: "block" }}>{item.last_message}</span>
              <span className="tags">
                <span className={`tag ${item.status}`}>{statusNames[item.status]}</span>
                <span className={`tag ${item.meeting_result}`}>{meetingNames[item.meeting_result]}</span>
                {item.takeover && <span className="tag takeover">Human in control</span>}
              </span>
            </button>
          ))}
        </nav>

        <main className="detail">
          {notice && <div className="alert">{notice}</div>}
          {problems.map((item) => (
            <div key={item.name} className="alert">
              {item.name} needs attention: {item.detail}
            </div>
          ))}

          {!conversation && (
            <p className="empty">Select a conversation to see its history, qualification evidence and booking.</p>
          )}

          {conversation && (
            <>
              <div className="head">
                <div>
                  <h2>{conversation.sender_name ?? conversation.external_id}</h2>
                  <div className="sub">
                    {channelNames[conversation.channel]} · {conversation.external_id}
                  </div>
                </div>
                <button className={conversation.takeover ? "" : "danger"} onClick={toggleTakeover}>
                  {conversation.takeover ? "Hand back to assistant" : "Take over conversation"}
                </button>
              </div>

              <div className="summary">
                <div><small>Lead status</small><strong>{statusNames[conversation.status]}</strong></div>
                <div>
                  <small>Assigned to</small>
                  <strong>{conversation.assigned_rep ?? "Not assigned"}</strong>
                  {conversation.assignment_rule && <small>{conversation.assignment_rule}</small>}
                </div>
                <div>
                  <small>Meeting</small>
                  <strong>{meetingNames[conversation.meeting_result]}</strong>
                  {detail.booking && (
                    <small>
                      {time(detail.booking.slot_start)} ({detail.booking.status})
                    </small>
                  )}
                </div>
                <div>
                  <small>Automation</small>
                  <strong>{conversation.takeover ? "Stopped" : "Running"}</strong>
                </div>
              </div>

              <div className="columns">
                <section className="panel">
                  <h3>Conversation</h3>
                  <div className="thread">
                    {detail.messages.map((m: any) => (
                      <div key={m.id} className={`bubble ${m.author}`}>
                        <small>
                          {m.author === "lead" ? "Lead" : m.author === "human" ? "Team member" : "Assistant"} · {time(m.created_at)}
                        </small>
                        {m.body}
                      </div>
                    ))}
                  </div>
                  <div className="compose">
                    <textarea
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      placeholder="Write a reply as a team member"
                      aria-label="Reply as a team member"
                    />
                    <button className="primary" onClick={sendReply} disabled={busy || !draft.trim()}>
                      Send reply
                    </button>
                  </div>
                </section>

                <div style={{ display: "grid", gap: 16 }}>
                  <section className="panel">
                    <h3>Qualification evidence</h3>
                    {conversation.evidence.length === 0 && <div className="sub">Nothing assessed yet.</div>}
                    <div className="evidence">
                      {conversation.evidence.map((e: any, index: number) => (
                        <div key={index}>
                          <span className={`mark ${e.pass ? "pass" : "fail"}`}>{e.pass ? "✓" : "✗"}</span>
                          <span>
                            {e.rule}: <strong>{e.value}</strong>
                          </span>
                        </div>
                      ))}
                    </div>
                  </section>

                  <section className="panel">
                    <h3>Action log</h3>
                    <div className="log">
                      {detail.actions.map((a: any) => (
                        <div key={a.id} className={a.ok ? "" : "bad"}>
                          <time>{time(a.created_at)}</time>
                          {a.detail}
                        </div>
                      ))}
                    </div>
                  </section>
                </div>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
